"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { notify } from "@/lib/notify";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useVerifyEmail, useResendCode } from "@/hooks/use-auth";

function VerifyEmailForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session, update } = useSession();
    const emailParam = searchParams.get("email") ?? session?.user?.email ?? "";
    const [code, setCode] = useState("");
    const [verified, setVerified] = useState(false);
    const verify = useVerifyEmail();
    const resend = useResendCode();
    const loading = verify.isPending || resend.isPending;

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code || code.length < 4) {
            notify.error({ title: "Code invalide", error: "Le code saisi est trop court (4 caractères minimum)." });
            return;
        }
        try {
            await verify.mutateAsync({ email: emailParam, code });
            setVerified(true);
            notify.success({ title: "Email vérifié" });
            update(); // Refresh session
            setTimeout(() => router.push("/login"), 2000);
        } catch (err: unknown) {
            notify.error({ title: "Vérification impossible", error: err, context: "vérification du code" });
        }
    };

    const handleResend = async () => {
        try {
            const data = await resend.mutateAsync({ email: emailParam });
            notify.success({
                title: "Code renvoyé",
                description: data.emailSent
                    ? "Un nouveau code vous a été envoyé par email"
                    : `Votre nouveau code : ${data.verificationCode}`,
            });
        } catch (err: unknown) {
            notify.error({ title: "Renvoi impossible", error: err, context: "renvoi du code de vérification" });
        }
    };

    if (verified) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="max-w-sm w-full">
                    <CardContent className="py-8 text-center space-y-3">
                        <div className="flex justify-center">
                            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                <ShieldCheck className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-sm font-medium">Email vérifié avec succès !</p>
                        <p className="text-xs text-muted-foreground">Vous allez être redirigé vers la connexion...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <Card className="max-w-sm w-full">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <MailCheck className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-sm">Vérification email</CardTitle>
                    <CardDescription className="text-xs">
                        Un code de vérification a été envoyé à <strong>{emailParam}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleVerify} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Code de vérification</Label>
                            <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                className="h-12 text-center text-lg font-mono tracking-widest"
                                placeholder="••••••"
                                maxLength={6}
                                autoFocus
                            />
                        </div>
                        <Button type="submit" className="w-full h-9" disabled={loading || code.length < 4}>
                            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                            Vérifier
                        </Button>
                        <p className="text-center">
                            <button
                                type="button"
                                onClick={handleResend}
                                className="text-xs text-muted-foreground hover:text-foreground underline"
                            >
                                Renvoyer le code
                            </button>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
            <VerifyEmailForm />
        </Suspense>
    );
}
