"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { notify } from "@/lib/notify";
import { registerSchema } from "@/lib/schemas/auth";
import { Building2, Loader2, ShieldCheck } from "lucide-react";
import { useRegister } from "@/hooks/use-auth";

export function RegisterForm() {
    const router = useRouter();
    const { mutateAsync, isPending } = useRegister();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const parsed = registerSchema.safeParse({ name, email, password });
        if (!parsed.success) {
            notify.warning({
                title: "Formulaire incomplet",
                description: parsed.error.issues[0]?.message ?? "Vérifiez les champs saisis.",
            });
            return;
        }

        try {
            const data = await mutateAsync(parsed.data);

            notify.success({
                title: "Compte administrateur créé",
                description: data.emailSent
                    ? "Un code de vérification vous a été envoyé par email"
                    : `Votre code de vérification : ${data.verificationCode}`,
            });
            router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        } catch (err: unknown) {
            notify.error({ title: "Création du compte impossible", error: err, context: "création du compte" });
        }
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
                    <Building2 className="h-6 w-6 text-background" />
                </div>
                <CardTitle className="text-xl">Configurer FacturaPro TN</CardTitle>
                <CardDescription>
                    Créez le compte administrateur
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                        Ce premier compte sera le <strong>administrateur</strong>. Après vérification de
                        votre email, vous pourrez configurer votre entreprise et inviter vos équipes.
                    </span>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom</Label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Votre nom"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="vous@exemple.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Mot de passe</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="6 caractères minimum"
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Création...
                            </>
                        ) : (
                            "Créer mon compte"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
