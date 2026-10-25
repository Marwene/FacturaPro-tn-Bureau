import Big from "big.js";
import { prisma } from "@/lib/prisma";
import { sendMail, buildEcartBonCommandeEmail } from "@/lib/mail";

const NOTIFICATION_TYPE_ECART = "ECART_BC_QUANTITE";

export type ReconciliationResult = {
    bonCommandeLineId: string;
    quantiteCommandee: string;
    quantiteDetaillee: string;
    ecart: string;
    statutRapprochement: "EN_ATTENTE_DETAIL" | "ECART_DETECTE" | "RECONCILIE";
};

/**
 * Recalcule le rapprochement d'une ligne de Bon de Commande à partir de ses
 * BonCommandeLigneDetail, met à jour le statut, et gère les alertes
 * (notification in-app persistante + email) tant que l'écart n'est pas résorbé.
 *
 * À appeler après tout import/modification/suppression de détail sur la ligne.
 */
export async function reconcileBonCommandeLine(
    bonCommandeLineId: string
): Promise<ReconciliationResult> {
    const ligne = await prisma.bonCommandeLine.findUnique({
        where: { id: bonCommandeLineId },
        include: {
            details: true,
            bonCommande: {
                select: {
                    id: true,
                    numero: true,
                    companyId: true,
                },
            },
        },
    });

    if (!ligne) {
        throw new Error(`Ligne de bon de commande introuvable: ${bonCommandeLineId}`);
    }

    const quantiteCommandee = new Big(ligne.quantite.toString());
    const quantiteDetaillee = ligne.details.reduce(
        (total, d) => total.plus(new Big(d.quantite.toString())),
        new Big(0)
    );
    const ecart = quantiteCommandee.minus(quantiteDetaillee);

    const hasDetails = ligne.details.length > 0;
    const statutRapprochement: ReconciliationResult["statutRapprochement"] = !hasDetails
        ? "EN_ATTENTE_DETAIL"
        : ecart.eq(0)
            ? "RECONCILIE"
            : "ECART_DETECTE";

    await prisma.bonCommandeLine.update({
        where: { id: bonCommandeLineId },
        data: {
            quantiteDetaillee: quantiteDetaillee.toString(),
            statutRapprochement,
            derniereVerification: new Date(),
        },
    });

    if (statutRapprochement === "ECART_DETECTE") {
        await ouvrirAlerteEcart({
            bonCommandeLineId,
            bonCommandeId: ligne.bonCommande.id,
            bonCommandeNumero: ligne.bonCommande.numero,
            companyId: ligne.bonCommande.companyId,
            articleDescription: ligne.description,
            quantiteCommandee: quantiteCommandee.toString(),
            quantiteDetaillee: quantiteDetaillee.toString(),
            ecart: ecart.toString(),
        });
    } else if (statutRapprochement === "RECONCILIE") {
        await resoudreAlerteEcart(bonCommandeLineId);
    }

    return {
        bonCommandeLineId,
        quantiteCommandee: quantiteCommandee.toString(),
        quantiteDetaillee: quantiteDetaillee.toString(),
        ecart: ecart.toString(),
        statutRapprochement,
    };
}

/**
 * Recalcule toutes les lignes d'un Bon de Commande d'un coup (ex: après import
 * d'un document détaillé qui couvre plusieurs articles).
 */
export async function reconcileBonCommande(bonCommandeId: string): Promise<ReconciliationResult[]> {
    const lignes = await prisma.bonCommandeLine.findMany({
        where: { bonCommandeId },
        select: { id: true },
    });

    const results: ReconciliationResult[] = [];
    for (const ligne of lignes) {
        results.push(await reconcileBonCommandeLine(ligne.id));
    }
    return results;
}

/**
 * Un Bon de Commande est "honorable" (OF / BL autorisés) uniquement si toutes
 * ses lignes de type PRODUCTION sont RECONCILIE. Les lignes STOCK ne bloquent
 * jamais le rapprochement global (elles sont réservées directement en stock).
 */
export async function peutHonorerBonCommande(bonCommandeId: string): Promise<{
    honorable: boolean;
    lignesBloquantes: { id: string; description: string; statutRapprochement: string }[];
}> {
    const lignes = await prisma.bonCommandeLine.findMany({
        where: { bonCommandeId, typeSource: "PRODUCTION" },
        select: { id: true, description: true, statutRapprochement: true },
    });

    const lignesBloquantes = lignes.filter((l) => l.statutRapprochement !== "RECONCILIE");

    return {
        honorable: lignesBloquantes.length === 0,
        lignesBloquantes,
    };
}

async function ouvrirAlerteEcart(params: {
    bonCommandeLineId: string;
    bonCommandeId: string;
    bonCommandeNumero: string;
    companyId: string;
    articleDescription: string;
    quantiteCommandee: string;
    quantiteDetaillee: string;
    ecart: string;
}) {
    const {
        bonCommandeLineId,
        bonCommandeNumero,
        companyId,
        articleDescription,
        quantiteCommandee,
        quantiteDetaillee,
        ecart,
    } = params;

    const destinataires = await prisma.userCompany.findMany({
        where: { companyId },
        include: { user: { select: { id: true, name: true, email: true, actif: true } } },
    });

    const utilisateursActifs = destinataires
        .map((d) => d.user)
        .filter((u) => u.actif && !!u.email);

    const message = `Écart de ${ecart} sur "${articleDescription}" (commandé: ${quantiteCommandee}, détaillé: ${quantiteDetaillee}) — BC ${bonCommandeNumero}.`;

    for (const user of utilisateursActifs) {
        const dejaOuverte = await prisma.notification.findFirst({
            where: {
                userId: user.id,
                bonCommandeLineId,
                type: NOTIFICATION_TYPE_ECART,
                lue: false,
            },
        });

        if (dejaOuverte) {
            // L'alerte existe déjà et reste ouverte tant que l'écart persiste — on
            // met simplement le message à jour si les quantités ont bougé.
            if (dejaOuverte.message !== message) {
                await prisma.notification.update({
                    where: { id: dejaOuverte.id },
                    data: { message },
                });
            }
            continue;
        }

        await prisma.notification.create({
            data: {
                userId: user.id,
                type: NOTIFICATION_TYPE_ECART,
                title: `Écart de quantité — BC ${bonCommandeNumero}`,
                message,
                bonCommandeLineId,
                lue: false,
            },
        });

        if (user.email) {
            const email = buildEcartBonCommandeEmail({
                name: user.name || "Utilisateur",
                bonCommandeNumero,
                articleDescription,
                quantiteCommandee,
                quantiteDetaillee,
                ecart,
                lienBonCommande: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/bons-commande/${params.bonCommandeId}`,
            });
            await sendMail({ to: user.email, subject: email.subject, html: email.html });
        }
    }
}

async function resoudreAlerteEcart(bonCommandeLineId: string) {
    await prisma.notification.updateMany({
        where: {
            bonCommandeLineId,
            type: NOTIFICATION_TYPE_ECART,
            lue: false,
        },
        data: { lue: true },
    });
}

/**
 * Relance par email les alertes d'écart toujours ouvertes après `delaiHeures`.
 * Destinée à être appelée par un job cron (voir app/api/cron/relance-ecarts-bc/route.ts).
 * Ne recrée pas de notification in-app (elle existe déjà et reste affichée tant
 * qu'elle n'est pas résolue) — se contente de renvoyer l'email de rappel.
 */
export async function relancerAlertesEcartOuvertes(delaiHeures = 48): Promise<number> {
    const seuil = new Date(Date.now() - delaiHeures * 60 * 60 * 1000);

    const alertesOuvertes = await prisma.notification.findMany({
        where: {
            type: NOTIFICATION_TYPE_ECART,
            lue: false,
            createdAt: { lte: seuil },
            bonCommandeLineId: { not: null },
        },
        include: {
            user: { select: { id: true, name: true, email: true, actif: true } },
            bonCommandeLine: {
                include: {
                    bonCommande: { select: { id: true, numero: true } },
                },
            },
        },
    });

    let relances = 0;

    for (const alerte of alertesOuvertes) {
        if (!alerte.user.actif || !alerte.user.email || !alerte.bonCommandeLine) continue;

        const ligne = alerte.bonCommandeLine;
        const email = buildEcartBonCommandeEmail({
            name: alerte.user.name || "Utilisateur",
            bonCommandeNumero: ligne.bonCommande.numero,
            articleDescription: ligne.description,
            quantiteCommandee: ligne.quantite.toString(),
            quantiteDetaillee: ligne.quantiteDetaillee.toString(),
            ecart: new Big(ligne.quantite.toString()).minus(new Big(ligne.quantiteDetaillee.toString())).toString(),
            lienBonCommande: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/bons-commande/${ligne.bonCommande.id}`,
        });

        const envoye = await sendMail({ to: alerte.user.email, subject: `[Rappel] ${email.subject}`, html: email.html });
        if (envoye) relances += 1;
    }

    return relances;
}
