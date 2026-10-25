import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { markNotificationsReadSchema } from "@/lib/schemas/notification";

// justifié : notifications strictement scopées `session.id` (userId) dans le
// handler — aucune PermissionKey ne gouverne « ses propres notifications ».
export const GET = apiRoute.get({ authOnly: true }, async (request, { session }) => {
    const { searchParams } = new URL(request.url);
    const onlyUnread = searchParams.get("unread") === "true";
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    const where = { userId: session.id, ...(onlyUnread ? { lue: false } : {}) };

    const [notifications, total, nonLues] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
        }),
        prisma.notification.count({ where: { userId: session.id } }),
        prisma.notification.count({ where: { userId: session.id, lue: false } }),
    ]);

    return { notifications, total, nonLues };
});

// justifié : écriture (marquer lu) strictement scopée `session.id` (userId)
// dans le handler — aucune PermissionKey ne gouverne « ses propres notifications ».
export const PATCH = apiRoute.patch({ authOnly: true, schema: markNotificationsReadSchema }, async (_request, { session, body }) => {
    const { ids, all } = body;

    if (all) {
        await prisma.notification.updateMany({
            where: { userId: session.id, lue: false },
            data: { lue: true },
        });
    } else if (ids?.length) {
        await prisma.notification.updateMany({
            where: { id: { in: ids }, userId: session.id },
            data: { lue: true },
        });
    }

    return { success: true };
});
