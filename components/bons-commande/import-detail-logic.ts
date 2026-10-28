import type { ExtractedDetailLine } from "@/hooks/use-bc-rapprochement";
import type { SaveDetailInput } from "@/lib/schemas/bon-commande";

export interface DetailLine {
    id: string;
    taille: string;
    couleur: string;
    broderie: string;
    impressionDtf: string;
    quantite: string;
}

export interface ArticleGroup {
    id: string;
    bonCommandeLineId: string;
    lines: DetailLine[];
}

export type SaveDetailRow = SaveDetailInput["rows"][number];

export const emptyDetailLine = (): DetailLine => ({
    id: crypto.randomUUID(),
    taille: "",
    couleur: "",
    broderie: "",
    impressionDtf: "",
    quantite: "1",
});

export const emptyGroup = (bonCommandeLineId = ""): ArticleGroup => ({
    id: crypto.randomUUID(),
    bonCommandeLineId,
    lines: [emptyDetailLine()],
});

// Regroupe les lignes extraites par article : par bonCommandeLineId déjà
// rapproché, sinon par description brute (l'OCR répète la même description
// pour chaque taille/couleur d'un même article non reconnu).
export function groupExtractedLines(lines: ExtractedDetailLine[]): ArticleGroup[] {
    const groups = new Map<string, ArticleGroup>();
    for (const l of lines) {
        const key = l.bonCommandeLineId || `desc:${l.description}`;
        let group = groups.get(key);
        if (!group) {
            group = { id: crypto.randomUUID(), bonCommandeLineId: l.bonCommandeLineId ?? "", lines: [] };
            groups.set(key, group);
        }
        group.lines.push({
            id: l.id,
            taille: l.taille ?? "",
            couleur: l.couleur ?? "",
            broderie: l.broderie ?? "",
            impressionDtf: l.impressionDtf ?? "",
            quantite: l.quantite,
        });
    }
    return Array.from(groups.values());
}

export const totalGroupe = (g: ArticleGroup) =>
    g.lines.reduce((s, l) => s + (Number(l.quantite) || 0), 0);

export function buildDetailRows(groups: ArticleGroup[]): SaveDetailRow[] {
    return groups.flatMap((g) =>
        g.lines
            .filter((l) => Number(l.quantite) > 0)
            .map((l) => ({
                bonCommandeLineId: g.bonCommandeLineId,
                taille: l.taille || null,
                couleur: l.couleur || null,
                broderie: l.broderie || null,
                impressionDtf: l.impressionDtf || null,
                quantite: Number(l.quantite),
            }))
    );
}
