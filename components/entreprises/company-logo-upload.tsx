"use client";

import { useRef } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { useCompanyLogoUpload } from "@/hooks/use-company-logo-upload";
import { notify } from "@/lib/notify";

interface CompanyLogoUploadProps {
    companyId: string;
    logo: string | null;
}

export function CompanyLogoUpload({ companyId, logo }: CompanyLogoUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, remove } = useCompanyLogoUpload(companyId);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            notify.warning({ title: `« ${file.name} » trop volumineux`, description: "Taille maximale acceptée : 2 Mo." });
            return;
        }
        const formData = new FormData();
        formData.append("logo", file);
        upload.mutate(formData);
        if (inputRef.current) inputRef.current.value = "";
    };

    const handleClear = () => remove.mutate();

    const isPending = upload.isPending || remove.isPending;

    return (
        <div className="shrink-0">
            <div
                className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors overflow-hidden"
                onClick={() => inputRef.current?.click()}
            >
                {isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : logo ? (
                    <img src={logo} alt="Logo" loading="lazy" className="h-full w-full object-contain" />
                ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                )}
            </div>
            {logo && (
                <button
                    type="button"
                    className="flex items-center gap-1 text-[10px] text-red-500 mt-1 mx-auto hover:underline"
                    onClick={handleClear}
                >
                    <X className="h-3 w-3" /> Supprimer
                </button>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
    );
}
