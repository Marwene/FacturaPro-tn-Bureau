"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationsRead(notificationIds: string[]) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Non authentifié");
    await prisma.notification.updateMany({
        where: { id: { in: notificationIds }, userId: session.user.id },
        data: { lue: true },
    });
    return { success: true };
}
