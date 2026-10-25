"use client";

import { useCategoriesFlat, useCategorieMutations } from "@/hooks/use-categories";
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

interface CategoryTreeSelectProps {
    value?: string | null;
    onValueChange: (value: string | null) => void;
    placeholder?: string;
}

export function CategoryTreeSelect({ value, onValueChange, placeholder = "Sélectionner une catégorie" }: CategoryTreeSelectProps) {
    const { data: categories, isLoading } = useCategoriesFlat();
    const { createCategorie, deleteCategorie } = useCategorieMutations();
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState("");

    const handleCreate = () => {
        const nom = newName.trim();
        if (!nom) return;
        createCategorie.mutate({ nom }, {
            onSuccess: (res) => {
                onValueChange(res.categorie.id);
                setNewName("");
                setShowNew(false);
                notify.success({
                    title: `Catégorie « ${nom} » créée`,
                    description: "Elle est sélectionnée pour ce produit.",
                });
            },
            onError: (err: unknown) =>
                notify.error({
                    title: "Création de la catégorie impossible",
                    error: err,
                    context: "lors de la création d'une catégorie depuis le formulaire produit",
                }),
        });
    };

    const NULL_VALUE = "__null__";

    return (
        <div className="space-y-1">
            <div className="flex gap-1">
                <Select
                    value={value ?? NULL_VALUE}
                    onValueChange={(v) => onValueChange(v === NULL_VALUE ? null : v)}
                    disabled={isLoading}
                >
                    <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NULL_VALUE}>Aucune</SelectItem>
                        {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="text-sm">
                                {cat.label}
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
                        placeholder="Nouvelle catégorie..."
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
