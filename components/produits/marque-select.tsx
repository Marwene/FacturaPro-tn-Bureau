"use client";

import { useMarques, useMarqueMutations } from "@/hooks/use-marques";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { notify } from "@/lib/notify";

interface MarqueSelectProps {
    value?: string | null;
    onValueChange: (value: string | null) => void;
}

export function MarqueSelect({ value, onValueChange }: MarqueSelectProps) {
    const { data, isLoading } = useMarques();
    const { createMarque, deleteMarque } = useMarqueMutations();
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState("");

    const NULL_VALUE = "__null__";

    const handleCreate = () => {
        const nom = newName.trim();
        if (!nom) return;
        createMarque.mutate({ nom }, {
            onSuccess: (res) => {
                onValueChange(res.marque.id);
                setNewName("");
                setShowNew(false);
                notify.success({
                    title: `Marque « ${nom} » créée`,
                    description: "Elle est sélectionnée pour ce produit.",
                });
            },
            onError: (err: unknown) =>
                notify.error({
                    title: "Création de la marque impossible",
                    error: err,
                    context: "lors de la création d'une marque depuis le formulaire produit",
                }),
        });
    };

    return (
        <div className="space-y-1">
            <div className="flex gap-1">
                <Select
                    value={value ?? NULL_VALUE}
                    onValueChange={(v) => onValueChange(v === NULL_VALUE ? null : v)}
                    disabled={isLoading}
                >
                    <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue placeholder="Sélectionner une marque" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NULL_VALUE}>Aucune</SelectItem>
                        {data?.marques?.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="text-sm">
                                {m.nom}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowNew(!showNew)}>
                    <Plus className="size-3.5" />
                </Button>
            </div>
            {showNew && (
                <div className="flex gap-1">
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nouvelle marque..."
                        className="h-7 text-xs flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                    <Button type="button" size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={!newName.trim()}>
                        Ajouter
                    </Button>
                </div>
            )}
        </div>
    );
}
