"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { createUserSchema } from "@/lib/schemas/user";
import { User } from "lucide-react";

export type CreateUserLoginFormValues = z.input<typeof createUserSchema>;

interface CreateUserLoginFieldsProps {
    form: UseFormReturn<CreateUserLoginFormValues>;
}

export function CreateUserLoginFields({ form }: CreateUserLoginFieldsProps) {
    const errors = form.formState.errors;

    return (
        <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                    <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-foreground">
                    Informations de connexion
                </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                        Nom <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        {...form.register("name")}
                        className={cn("h-9 text-sm", errors.name && "border-red-500")}
                        placeholder="Nom complet"
                    />
                    {errors.name && (
                        <p className="text-[11px] text-red-500">{errors.name.message}</p>
                    )}
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                        Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        {...form.register("email", {
                            pattern: { value: /^\S+@\S+$/i, message: "Email invalide" },
                        })}
                        type="email"
                        className={cn("h-9 text-sm", errors.email && "border-red-500")}
                        placeholder="utilisateur@exemple.com"
                    />
                    {errors.email && (
                        <p className="text-[11px] text-red-500">{errors.email.message}</p>
                    )}
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                        Mot de passe <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        {...form.register("password")}
                        type="password"
                        className={cn("h-9 text-sm", errors.password && "border-red-500")}
                        placeholder="6 caractères minimum"
                    />
                    {errors.password && (
                        <p className="text-[11px] text-red-500">{errors.password.message}</p>
                    )}
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Rôle</Label>
                    <Controller
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USER">Utilisateur</SelectItem>
                                    <SelectItem value="ADMIN">Administrateur</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    <p className="text-[11px] text-muted-foreground">
                        Les administrateurs ont accès à tout
                    </p>
                </div>
            </div>
        </div>
    );
}
