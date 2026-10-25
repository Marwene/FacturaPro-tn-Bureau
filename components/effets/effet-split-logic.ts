import type { DocumentLie } from "@/hooks/use-effets";
import { formatTND } from "@/lib/decimal";

export interface SplitAllocation {
    achatId: string;
    montant: string;
}

export interface SplitRow {
    id: string;
    ordrePaiementNumero: string;
    dateEcheance: string;
    allocations: SplitAllocation[];
}

export const round3 = (n: number) => Math.round(n * 1000) / 1000

export interface GenerateSplitParams {
    selectedDocIds: string[];
    documents: DocumentLie[];
    dateEcheance: string;
    seuilSplitEffet: string | undefined;
}

export function generateSplit({ selectedDocIds, documents, dateEcheance, seuilSplitEffet }: GenerateSplitParams): SplitRow[] {
    const rows: SplitRow[] = []
    const defaultDate = dateEcheance || new Date().toISOString().split("T")[0]
    const seuil = parseFloat(seuilSplitEffet ?? "") || 11500
    for (const docId of selectedDocIds) {
        const doc = documents.find((d) => d.id === docId)
        if (!doc) continue
        const reste = parseFloat(doc.resteAPayer ?? doc.totalTTC)
        if (!reste || reste <= 0) continue
        const k = Math.max(1, Math.ceil(reste / seuil))
        for (let i = 0; i < k; i++) {
            const montant = i < k - 1 ? seuil : reste - seuil * (k - 1)
            rows.push({
                id: crypto.randomUUID(),
                ordrePaiementNumero: String(rows.length + 1),
                dateEcheance: defaultDate,
                allocations: [{ achatId: docId, montant: round3(montant).toFixed(3) }],
            })
        }
    }
    return rows
}

export interface AppendSplitRowParams {
    selectedDocIds: string[];
    documents: DocumentLie[];
    dateEcheance: string;
}

export function appendSplitRow(rows: SplitRow[], params: AppendSplitRowParams): SplitRow[] {
    const { selectedDocIds, documents, dateEcheance } = params
    const today = new Date().toISOString().split("T")[0]
    const uncoveredId = selectedDocIds.find((docId) => {
        const doc = documents.find((d) => d.id === docId)
        const reste = parseFloat(doc?.resteAPayer ?? doc?.totalTTC ?? "0")
        const allocated = rows.reduce((sum, row) =>
            sum + row.allocations.filter((a) => a.achatId === docId).reduce((s, a) => s + (parseFloat(a.montant) || 0), 0), 0)
        return reste - allocated > 0.001
    })
    return [
        ...rows,
        {
            id: crypto.randomUUID(),
            ordrePaiementNumero: String(rows.length + 1),
            dateEcheance: dateEcheance || today,
            allocations: uncoveredId ? [{ achatId: uncoveredId, montant: "" }] : [],
        },
    ]
}

export function setSplitRowField(rows: SplitRow[], rowId: string, field: "ordrePaiementNumero" | "dateEcheance", value: string): SplitRow[] {
    return rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
}

export function removeSplitRow(rows: SplitRow[], rowId: string): SplitRow[] {
    return rows.filter((row) => row.id !== rowId)
}

export function setSplitAllocField(rows: SplitRow[], rowId: string, allocIdx: number, field: "achatId" | "montant", value: string): SplitRow[] {
    return rows.map((row) =>
        row.id === rowId
            ? { ...row, allocations: row.allocations.map((a, ai) => (ai === allocIdx ? { ...a, [field]: value } : a)) }
            : row,
    )
}

export function removeSplitAlloc(rows: SplitRow[], rowId: string, allocIdx: number): SplitRow[] {
    return rows.map((row) =>
        row.id === rowId
            ? { ...row, allocations: row.allocations.filter((_, ai) => ai !== allocIdx) }
            : row,
    )
}

export function appendSplitAlloc(rows: SplitRow[], rowId: string): SplitRow[] {
    return rows.map((row) =>
        row.id === rowId ? { ...row, allocations: [...row.allocations, { achatId: "", montant: "" }] } : row,
    )
}

export interface SplitStateParams {
    splitRows: SplitRow[];
    selectedDocIds: string[];
    selectedDocs: DocumentLie[];
}

export interface SplitState {
    totalACouvrir: number;
    totalReparti: number;
    uncoveredAchats: DocumentLie[];
    rowsValid: boolean;
    splitValid: boolean;
    splitErrors: string[];
}

export function computeSplitState({ splitRows, selectedDocIds, selectedDocs }: SplitStateParams): SplitState {
    const allocSumByAchat = (achatId: string) =>
        splitRows.reduce((sum, row) =>
            sum + row.allocations.filter((a) => a.achatId === achatId).reduce((s, a) => s + (parseFloat(a.montant) || 0), 0), 0)
    const totalACouvrir = selectedDocs.reduce((sum, d) => sum + parseFloat(d.resteAPayer ?? d.totalTTC), 0)
    const totalReparti = splitRows.reduce((sum, row) =>
        sum + row.allocations.reduce((s, a) => s + (parseFloat(a.montant) || 0), 0), 0)
    const uncoveredAchats = selectedDocs.filter((d) =>
        Math.abs(allocSumByAchat(d.id) - parseFloat(d.resteAPayer ?? d.totalTTC)) > 0.001)
    const rowsValid = splitRows.length > 0 && splitRows.every((row) =>
        row.allocations.length >= 1
        && row.allocations.every((a) => (parseFloat(a.montant) || 0) > 0)
        && row.dateEcheance)
    const splitValid = selectedDocIds.length > 0 && rowsValid && uncoveredAchats.length === 0
    const splitErrors: string[] = []
    if (selectedDocIds.length > 0) {
        if (!rowsValid) {
            if (splitRows.some((row) => row.allocations.length === 0)) splitErrors.push("Chaque effet doit avoir au moins un achat alloué.")
            if (splitRows.some((row) => row.allocations.some((a) => (parseFloat(a.montant) || 0) <= 0))) splitErrors.push("Chaque montant alloué doit être strictement positif.")
            if (splitRows.some((row) => !row.dateEcheance)) splitErrors.push("Chaque effet doit avoir une date d'échéance.")
        }
        if (uncoveredAchats.length > 0) {
            splitErrors.push(`Montants restants non couverts : ${uncoveredAchats.map((d) => `${d.numero} (${formatTND((parseFloat(d.resteAPayer ?? d.totalTTC) - allocSumByAchat(d.id)).toFixed(3))})`).join(", ")}`)
        }
    }
    return { totalACouvrir, totalReparti, uncoveredAchats, rowsValid, splitValid, splitErrors }
}
