"use client";

import { useState, useRef } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companyCreateSchema, type CompanyCreateInput } from "@/lib/schemas/company";
import { useCreateCompany } from "@/hooks/use-companies";
import { useFileUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FieldError } from "@/components/ui/field";
import { notify } from "@/lib/notify";
import { Loader2, Upload, X, Building2, Globe } from "lucide-react";

export function CreateCompanyDialog({
    open,
    onOpenChange,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const [logo, setLogo] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileUpload = useFileUpload();
    const createCompany = useCreateCompany();

    const form = useForm<CompanyCreateInput>({
        resolver: zodResolver(companyCreateSchema) as Resolver<CompanyCreateInput>,
        defaultValues: {
            name: "",
            type: "LOCALE",
            devise: "TND",
            matriculeFiscal: "",
            adresse: "",
            ville: "",
            codePostal: "",
            telephone: "",
            email: "",
            siteWeb: "",
        },
    });

    const isOffshore = form.watch("type") === "OFFSHORE";

    function resetForm() {
        form.reset();
        setLogo(null);
    }

    function onSubmit(values: CompanyCreateInput) {
        createCompany.mutate(
            { ...values, matriculeFiscal: values.matriculeFiscal || null, adresse: values.adresse || null, ville: values.ville || null, codePostal: values.codePostal || null, telephone: values.telephone || null, email: values.email || null, siteWeb: values.siteWeb || null, logo },
            {
                onSuccess: () => { notify.success({ title: `Entreprise « ${values.name} » créée` }); resetForm(); onSuccess(); },
                onError: (err) => notify.error({ title: "Entreprise non créée", error: err, context: "création de l'entreprise" }),
            }
        );
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            notify.warning({ title: `« ${file.name} » trop volumineux`, description: "Taille maximale acceptée : 2 Mo." });
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const result = await fileUpload.mutateAsync(fd);
            if (result?.url) setLogo(result.url);
        } catch {
            // L'erreur est déjà notifiée par le hook useFileUpload (lib/notify).
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle>Nouvelle entreprise</DialogTitle>
                    <DialogDescription>Renseignez les informations de l&apos;entreprise</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[55vh] px-6">
                    <form id="create-company-form" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="space-y-6 pb-4">
                            <div className="flex gap-6">
                                <div className="shrink-0">
                                    <div
                                        className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors overflow-hidden"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {uploading ? (
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
                                            onClick={() => setLogo(null)}
                                        >
                                            <X className="h-3 w-3" /> Supprimer
                                        </button>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Nom *</Label>
                                        <Input {...form.register("name")} className="h-9 text-sm" placeholder="Nom de l'entreprise" />
                                        {form.formState.errors.name && (
                                            <FieldError className="text-[11px]">{form.formState.errors.name.message}</FieldError>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Type</Label>
                                            <Controller control={form.control} name="type" render={({ field }) => (
                                                <Select value={field.value} onValueChange={(v) => { field.onChange(v); if (v === "LOCALE") form.setValue("devise", "TND"); }}>
                                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="LOCALE"><span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Locale</span></SelectItem>
                                                        <SelectItem value="OFFSHORE"><span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Offshore</span></SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Devise</Label>
                                            {isOffshore ? (
                                                <Controller control={form.control} name="devise" render={({ field }) => (
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="TND">TND (Dinars)</SelectItem>
                                                            <SelectItem value="EUR">EUR (Euros)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )} />
                                            ) : (
                                                <div className="flex h-9 items-center px-3 rounded-md border border-input bg-muted/30 text-sm text-muted-foreground">TND (Dinars)</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Matricule Fiscal</Label><Input {...form.register("matriculeFiscal")} className="h-9 text-sm font-mono" placeholder="12345678/A" /></div>
                                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Email</Label><Input {...form.register("email")} type="email" className="h-9 text-sm" placeholder="contact@entreprise.tn" /></div>
                                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Téléphone</Label><Input {...form.register("telephone")} className="h-9 text-sm" placeholder="+216 XX XXX XXX" /></div>
                                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Site Web</Label><Input {...form.register("siteWeb")} className="h-9 text-sm" placeholder="https://" /></div>
                                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Ville</Label><Input {...form.register("ville")} className="h-9 text-sm" placeholder="Tunis" /></div>
                                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Code Postal</Label><Input {...form.register("codePostal")} className="h-9 text-sm" placeholder="1000" /></div>
                                <div className="space-y-1.5 col-span-2"><Label className="text-xs text-muted-foreground">Adresse</Label><Input {...form.register("adresse")} className="h-9 text-sm" placeholder="Rue, numéro" /></div>
                            </div>
                        </div>
                    </form>
                </ScrollArea>
                <DialogFooter className="px-6 py-4 border-t">
                    <Button type="button" variant="outline" size="sm" onClick={() => { resetForm(); onOpenChange(false); }}>Annuler</Button>
                    <Button type="submit" form="create-company-form" size="sm" disabled={createCompany.isPending}>
                        {createCompany.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Création...</> : "Créer l'entreprise"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
