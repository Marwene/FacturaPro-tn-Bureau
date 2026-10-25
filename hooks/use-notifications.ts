"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { markNotificationsRead } from "@/app/actions/notifications";
import { queryKeys } from "@/lib/query-keys";
import { notify } from "@/lib/notify";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  lue: boolean;
  effetId: string | null;
  createdAt: string;
}

export interface UnreadNotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  nonLues: number;
}

/** Dernières notifications non lues (badge + popover). Clé `["notifications","unread"]` et `refetchInterval` 60 s identiques à l'ancien inline. */
export function useUnreadNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: async () => {
      const res = await fetch("/api/notifications?unread=true&limit=20");
      if (!res.ok) throw new Error("Erreur");
      return res.json() as Promise<UnreadNotificationsResponse>;
    },
    refetchInterval: 60000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      return markNotificationsRead(notificationIds);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
    onError: (err: unknown) => {
      notify.error({
        title: "Marquage des notifications impossible",
        error: err,
        context: "lors du marquage des notifications comme lues",
      });
    },
  });
}
