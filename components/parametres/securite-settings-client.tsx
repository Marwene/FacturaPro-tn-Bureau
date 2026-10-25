"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { notify } from "@/lib/notify";
import { changePasswordSchema } from "@/lib/schemas/user";
import { Lock, Loader2, Check } from "lucide-react";
import { useChangePassword } from "@/hooks/use-users-mutations";

export function SecuriteSettingsClient() {
    const formRef = useRef<HTMLFormElement>(null);
    const { mutateAsync, isPending } = useChangePassword();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (newPassword !== confirmPassword) {
            notify.error({ title: "Mots de passe différents", error: "Les mots de passe saisis ne correspondent pas." });
            return;
        }

        const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
        if (!parsed.success) {
            notify.warning({
                title: "Formulaire incomplet",
                description: parsed.error.issues[0]?.message ?? "Vérifiez les champs saisis.",
            });
            return;
        }

        try {
            await mutateAsync(parsed.data);
            notify.success({ title: "Mot de passe modifié" });
            formRef.current?.reset();
        } catch (err) {
            notify.error({ title: "Modification impossible", error: err, context: "changement de mot de passe" });
        }
    }

    return (
        <div className="p-4 max-w-2xl space-y-4">
            <div>
                <h1 className="text-lg font-semibold">Sécurité</h1>
                <p className="text-xs text-muted-foreground">
                    Gérez votre mot de passe
                </p>
            </div>

            <form ref={formRef} onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Changer le mot de passe
                        </CardTitle>
                        <CardDescription>
                            Assurez-vous d&apos;utiliser un mot de passe fort
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Mot de passe actuel</Label>
                            <Input
                                name="currentPassword"
                                type="password"
                                className="h-9 text-sm"
                            />
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Nouveau mot de passe</Label>
                                <Input
                                    name="newPassword"
                                    type="password"
                                    className="h-9 text-sm"
                                    // justifié : le schéma porte la règle (newPassword min 6) + contrôle d'égalité côté formulaire — HTML plus strict que le schéma
                                    minLength={6}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Confirmer</Label>
                                <Input
                                    name="confirmPassword"
                                    type="password"
                                    className="h-9 text-sm"
                                    // justifié : confirmation obligatoire (le contrôle d'égalité est porté par le formulaire, le schéma ne porte que newPassword) — `required` HTML plus strict que le schéma
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" size="sm" className="gap-1.5 text-xs" disabled={isPending}>
                                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                Modifier
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
