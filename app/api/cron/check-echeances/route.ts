import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { guardCronRequest } from "@/lib/cron-auth";

function daysUntil(date: Date): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
    // Garde échec fermé (audit S-8) : exécutée AVANT toute requête DB.
    const refused = guardCronRequest(request, "check-echeances");
    if (refused) return refused;

    try {
        const effets = await prisma.effet.findMany({
            where: {
                status: { notIn: ["PAYE", "ANNULE"] },
                dateEcheance: { gte: new Date() },
            },
            select: {
                id: true,
                numero: true,
                dateEcheance: true,
                rappel15jEnvoye: true,
                rappel10jEnvoye: true,
                rappel5jEnvoye: true,
                rappelJourEnvoye: true,
                companyId: true,
                beneficiaire: true,
            },
        });

        const alerts: {
            effetId: string;
            numero: string;
            joursRestants: number;
            type: string;
        }[] = [];

        for (const e of effets) {
            const jours = daysUntil(e.dateEcheance);
            let type: string | null = null;

            if (jours <= 15 && !e.rappel15jEnvoye) { type = "15j"; }
            else if (jours <= 10 && !e.rappel10jEnvoye) { type = "10j"; }
            else if (jours <= 5 && !e.rappel5jEnvoye) { type = "5j"; }
            else if (jours <= 0 && !e.rappelJourEnvoye) { type = "0j"; }

            if (type) {
                const alertKey = `rappel${type === "0j" ? "Jour" : type}Envoye` as const;
                await prisma.effet.update({ where: { id: e.id }, data: { [alertKey]: true } });

                const label = jours <= 0 ? "échéance aujourd'hui" : `J-${jours}`;
                const title = `Échéance effet ${e.numero}`;
                const message = `L'effet ${e.numero} (${e.beneficiaire}) arrive à ${label}.`;

                // Create in-app notification for all users of the company
                const users = await prisma.user.findMany({
                    where: { companyId: e.companyId ?? undefined, actif: true },
                    select: { id: true, email: true },
                });

                if (users.length > 0) {
                    await prisma.notification.createMany({
                        data: users.map((u) => ({
                            userId: u.id,
                            type: "ALERTE_ECHEANCE",
                            title,
                            message,
                            effetId: e.id,
                        })),
                    });

                    for (const u of users) {
                        if (u.email) {
                            await sendEmail({
                                to: u.email,
                                subject: title,
                                text: message,
                            });
                        }
                    }
                }

                alerts.push({ effetId: e.id, numero: e.numero, joursRestants: jours, type });
            }
        }

        return NextResponse.json({ alerts, total: alerts.length });
    } catch (error) {
        console.error("[cron/check-echeances]", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
