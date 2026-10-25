"use client";
import { useMutation } from "@tanstack/react-query";
import { uploadFile } from "@/app/actions/upload";
import { notify } from "@/lib/notify";

export function useFileUpload() {
    return useMutation({
        mutationFn: async (formData: FormData) => uploadFile(formData),
        onError: (err: unknown) =>
            notify.error({
                title: "Envoi du fichier impossible",
                error: err,
                context: "lors de l'envoi du fichier",
            }),
    });
}
