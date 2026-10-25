"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { meUpdateSchema } from "@/lib/schemas/user";
import { useProfilQuery } from "@/hooks/use-users";
import { useUpdateProfil } from "@/hooks/use-users-mutations";
import { Save, Loader2, Camera } from "lucide-react";

export function ProfilSettingsClient() {
    const { data: session } = useSession();

    const userId = session?.user?.id;

    const { data: user, isLoading } = useProfilQuery(!!userId);

    const updateProfil = useUpdateProfil();

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const parsed = meUpdateSchema.safeParse({
            name: formData.get("name"),
            email: formData.get("email"),
        });
        if (!parsed.success) {
            notify.warning({
                title: "Formulaire incomplet",
                description: parsed.error.issues[0]?.message ?? "Vérifiez les champs saisis.",
            });
            return;
        }

        updateProfil.mutate(parsed.data);
    }

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-2xl space-y-4">
            <div>
                <h1 className="text-lg font-semibold">Mon profil</h1>
                <p className="text-xs text-muted-foreground">
                    Gérez vos informations personnelles
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Photo de profil</CardTitle>
                    <CardDescription>
                        Photo affichée sur votre profil et les documents
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-semibold">
                            {user?.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <Camera className="h-3.5 w-3.5" />
                            Changer la photo
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Informations personnelles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Nom</Label>
                                <Input
                                    name="name"
                                    defaultValue={user?.user?.name ?? undefined}
                                    className="h-9 text-sm"
                                    // justifié : champ toujours envoyé par ce formulaire (échec réel côté schéma), HTML plus strict que le schéma PATCH
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Email</Label>
                                <Input
                                    name="email"
                                    type="email"
                                    defaultValue={user?.user?.email ?? undefined}
                                    className="h-9 text-sm"
                                    // justifié : champ toujours envoyé par ce formulaire (échec réel côté schéma), HTML plus strict que le schéma PATCH
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" size="sm" className="gap-1.5 text-xs" disabled={updateProfil.isPending}>
                                {updateProfil.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Enregistrer
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
