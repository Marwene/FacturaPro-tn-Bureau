import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
let lastRunTime = 0;

function daysUntil(date: Date): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const GET = apiRoute.get(
    { permission: "effets:voir" },
    async (request, { session }) => {
        // Rate limit: don't run more than once per hour
        if (Date.now() - lastRunTime < COOLDOWN_MS) {
            return NextResponse.json({ alerts: [], total: 0, message: "Cooldown actif, réessayez plus tard" });
        }

        const companyId = new URL(request.url).searchParams.get("companyId") ?? session.companyId;

        const effets = await prisma.effet.findMany({
            where: {
                status: { notIn: ["PAYE", "ANNULE"] },
                dateEcheance: { gte: new Date() },
                ...(companyId ? { companyId } : {}),
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

                const users = await prisma.user.findMany({
                    where: { companyId: e.companyId ?? undefined, actif: true },
                    select: { id: true, email: true, role: true },
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

                    // Send ONE email to the first admin user, not all users
                    const adminUser = users.find((u) => u.role === "ADMIN") ?? users[0];
                    if (adminUser?.email) {
                        await sendEmail({ to: adminUser.email, subject: title, text: message }).catch(() => {});
                    }
                }

                alerts.push({ effetId: e.id, numero: e.numero, joursRestants: jours, type });
            }
        }

        lastRunTime = Date.now();
        return NextResponse.json({ alerts, total: alerts.length });
    }
);
