"use client";

import { useForm, Controller } from "react-hook-form";
import { useCompaniesList } from "@/hooks/use-users";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Shield, Building2, User as UserIcon, Key } from "lucide-react";
import { updateUserSchema } from "@/lib/schemas/user";
import { FieldError } from "@/components/ui/field";
import type { User } from "./users-store";
import { PermissionsMatrix } from "./permissions-matrix";
import { CreateUserCompaniesSection } from "./create-user-companies-section";

export function EditUserDialog({
    user, open, onOpenChange, onSubmit, isLoading, error,
}: {
    user: User; open: boolean; onOpenChange: (open: boolean) => void;
    onSubmit: (data: { name?: string; email?: string; role?: string; password?: string; actif?: boolean; permissions?: string[]; companyIds?: string[] }) => void;
    isLoading: boolean; error?: string | null;
}) {
    const { data: companiesData } = useCompaniesList(open);
    const companies = (companiesData?.companies ?? []) as { id: string; name: string }[];

    const form = useForm({
        values: {
            name: user.name, email: user.email, role: user.role, password: "", actif: user.actif,
            permissions: user.permissions ?? [],
            selectedCompanyIds: [...(user.company ? [user.company.id] : []), ...user.userCompanies.map((uc) => uc.company.id)],
        },
    });

    const role = form.watch("role");
    const selectedCompanyIds = form.watch("selectedCompanyIds");
    const selectedCompanies = companies.filter((c) => selectedCompanyIds.includes(c.id));

    function toggleCompany(id: string) {
        const current = form.getValues("selectedCompanyIds");
        form.setValue("selectedCompanyIds", current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
    }

    function handleSubmit(values: { name: string; email: string; role: string; password: string; actif: boolean; permissions: string[]; selectedCompanyIds: string[] }) {
        const data: Parameters<typeof onSubmit>[0] = {};
        if (values.name !== user.name) data.name = values.name;
        if (values.email !== user.email) data.email = values.email;
        if (values.role !== user.role) data.role = values.role;
        if (values.password) data.password = values.password;
        if (values.actif !== user.actif) data.actif = values.actif;
        if (JSON.stringify(values.permissions) !== JSON.stringify(user.permissions ?? [])) data.permissions = values.permissions;
        data.companyIds = values.selectedCompanyIds;

        const parsed = updateUserSchema.safeParse(data);
        if (!parsed.success) {
            for (const issue of parsed.error.issues) {
                const field = issue.path[0];
                if (field === "name" || field === "email" || field === "role" || field === "password" || field === "actif" || field === "permissions") {
                    form.setError(field, { type: "schema", message: issue.message });
                }
            }
            return;
        }
        form.clearErrors();

        onSubmit(parsed.data);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
                    <DialogDescription>{user.email}</DialogDescription>
                </DialogHeader>
                {error && (
                    <Alert variant="destructive" className="mx-6 mb-4 py-2.5">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <ScrollArea className="max-h-[55vh] px-6">
                    <form id="edit-user-form" onSubmit={form.handleSubmit(handleSubmit)}>
                        <div className="space-y-6 pb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informations de connexion</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Nom</Label>
                                        <Input
                                            {...form.register("name")}
                                            className="h-9 text-sm"
                                            // justifié : bloque la saisie vide que le schéma PATCH (optionnel, sans min) laisserait passer ; champ omis du payload si inchangé — HTML plus strict que le schéma PATCH
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Email</Label>
                                        <Input
                                            {...form.register("email")}
                                            type="email"
                                            className="h-9 text-sm"
                                            // justifié : bloque la saisie vide que le schéma PATCH (optionnel, sans min) laisserait passer ; champ omis du payload si inchangé — HTML plus strict que le schéma PATCH
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Rôle</Label>
                                        <Controller control={form.control} name="role" render={({ field }) => (
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="USER">Utilisateur</SelectItem>
                                                    <SelectItem value="ADMIN">Administrateur</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Statut</Label>
                                        <Controller control={form.control} name="actif" render={({ field }) => (
                                            <div className="flex items-center justify-between h-9 px-3 rounded-md border border-input">
                                                <span className="text-sm">{field.value ? "Actif" : "Inactif"}</span>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </div>
                                        )} />
                                    </div>
                                </div>
                            </div>
                            {role === "USER" && (
                                <div>
                                    <Separator className="mb-4" />
                                    <div className="flex items-center gap-2 mb-3">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Autorisations</span>
                                    </div>
                                    <Controller control={form.control} name="permissions" render={({ field }) => (
                                        <PermissionsMatrix value={field.value} onChange={field.onChange} />
                                    )} />
                                </div>
                            )}
                            <div>
                                <Separator className="mb-4" />
                                <CreateUserCompaniesSection
                                    companies={companies}
                                    selectedCompanyIds={selectedCompanyIds}
                                    selectedCompanies={selectedCompanies}
                                    onToggleCompany={toggleCompany}
                                />
                            </div>
                            <div>
                                <Separator className="mb-4" />
                                <div className="flex items-center gap-2 mb-3">
                                    <Key className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mot de passe</span>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Nouveau mot de passe (laisser vide pour conserver)</Label>
                                    <Input {...form.register("password")} type="password" className="h-9 text-sm max-w-xs" placeholder="••••••" />
                                    {form.formState.errors.password && (
                                        <FieldError className="text-[11px]">{form.formState.errors.password.message}</FieldError>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </ScrollArea>
                <DialogFooter className="px-6 py-4 border-t">
                    <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button type="submit" form="edit-user-form" size="sm" disabled={isLoading}>
                        {isLoading ? (
                            <><svg className="h-3.5 w-3.5 animate-spin mr-1.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Enregistrement...</>
                        ) : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
