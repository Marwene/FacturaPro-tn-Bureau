"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema } from "@/lib/schemas/user";
import { useCompaniesList } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PermissionsMatrix } from "./permissions-matrix";
import { CreateUserLoginFields, type CreateUserLoginFormValues } from "./create-user-login-fields";
import { CreateUserCompaniesSection } from "./create-user-companies-section";
import { AlertCircle, Shield, Mail } from "lucide-react";

export function CreateUserDialog({
    open,
    onOpenChange,
    onSubmit,
    isLoading,
    error,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { name: string; email: string; password: string; role: string; permissions?: string[]; companyIds?: string[] }) => void;
    isLoading: boolean;
    error?: string | null;
}) {
    const { data: companiesData } = useCompaniesList(open);
    const companies = companiesData?.companies ?? [];

    const form = useForm<CreateUserLoginFormValues>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: "USER",
            permissions: [],
            companyIds: [],
        },
    });

    const role = form.watch("role");
    const watchedCompanyIds = form.watch("companyIds") ?? [];
    const selectedCompanies = companies.filter((c) => watchedCompanyIds.includes(c.id));

    function toggleCompany(id: string) {
        const current = form.getValues("companyIds") ?? [];
        form.setValue(
            "companyIds",
            current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
            { shouldValidate: true }
        );
    }

    function handleSubmit(values: CreateUserLoginFormValues) {
        const companyIds = values.companyIds ?? [];
        onSubmit({
            name: values.name,
            email: values.email,
            password: values.password,
            role: values.role ?? "USER",
            permissions: values.role === "ADMIN" ? undefined : values.permissions,
            companyIds: companyIds.length > 0 ? companyIds : undefined,
        });
    }

    function handleClose() {
        form.reset();
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={open ? handleClose : onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="text-base">Inviter un utilisateur</DialogTitle>
                    <DialogDescription className="text-xs">
                        Créez un compte et envoyez les accès par email
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive" className="mx-6 mb-4 py-2.5">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                )}

                <ScrollArea className="max-h-[55vh] px-6">
                    <form id="create-user-form" onSubmit={form.handleSubmit(handleSubmit)}>
                        <div className="space-y-6 pb-4">
                            <CreateUserLoginFields form={form} />

                            {role === "USER" && (
                                <div className="rounded-lg border border-border p-4 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                                            <Shield className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs font-semibold text-foreground">
                                                Autorisations
                                            </span>
                                            <p className="text-[11px] text-muted-foreground">
                                                Accorder des accès spécifiques par module
                                            </p>
                                        </div>
                                    </div>
                                    <Controller
                                        control={form.control}
                                        name="permissions"
                                        render={({ field }) => (
                                            <PermissionsMatrix value={field.value ?? []} onChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            )}

                            <CreateUserCompaniesSection
                                companies={companies}
                                selectedCompanies={selectedCompanies}
                                onToggleCompany={toggleCompany}
                            />
                        </div>
                    </form>
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                        Annuler
                    </Button>
                    <Button type="submit" form="create-user-form" size="sm" disabled={isLoading} className="gap-1.5">
                        {isLoading ? (
                            <>
                                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Invitation en cours...
                            </>
                        ) : (
                            <>
                                <Mail className="h-3.5 w-3.5" />
                                Inviter
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
