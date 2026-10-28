export type ChequeType = "RECU" | "EMIS"

export function makeDefaultForm() {
    return {
        numero: "",
        banque: "",
        type: "RECU" as ChequeType,
        tiersId: "",
        invoiceId: "",
        beneficiaire: "",
        montant: "",
        dateReception: new Date().toISOString().split("T")[0],
        dateEncaissement: "",
        banqueBeneficiaire: "",
        isPaye: false,
        notes: "",
    }
}

export type ChequeForm = ReturnType<typeof makeDefaultForm>

export function sanitizeMontantInput(value: string): string {
    // Strip non-numeric chars except . and ,
    return value.replace(/[^\d.,]/g, "").replace(",", ".")
}

export interface TiersSearchable {
    raisonSociale: string
    code: string
}

export function filterTiers<T extends TiersSearchable>(items: T[], search: string): T[] {
    const query = search.toLowerCase()
    return items.filter(
        (item) =>
            item.raisonSociale.toLowerCase().includes(query) ||
            item.code.toLowerCase().includes(query)
    )
}

export interface ChequeFormError {
    title: string
    message: string
}

export function validateChequeForm(form: ChequeForm, beneficiaire: string): ChequeFormError | null {
    if (!form.numero || !beneficiaire || !form.montant || !form.dateReception) {
        return {
            title: "Chèque non enregistré",
            message:
                "Remplissez tous les champs obligatoires : numéro, bénéficiaire, montant et date de réception.",
        }
    }

    if (form.type === "RECU" && !form.tiersId) {
        return {
            title: "Client requis",
            message: "Sélectionnez le client émetteur du chèque reçu.",
        }
    }

    if (form.type === "EMIS" && !form.tiersId) {
        return {
            title: "Fournisseur requis",
            message: "Sélectionnez le fournisseur bénéficiaire du chèque émis.",
        }
    }

    return null
}

export interface CreateChequePayload {
    numero: string
    banque?: string
    type: ChequeType
    tiersId?: string
    invoiceId?: string
    beneficiaire: string
    montant: number
    dateEmission: string
    dateEcheance: string
    banqueBeneficiaire?: string
    notes?: string
}

export function buildCreateChequePayload(form: ChequeForm, beneficiaire: string): CreateChequePayload {
    return {
        numero: form.numero,
        banque: form.banque || undefined,
        type: form.type,
        tiersId: form.tiersId || undefined,
        invoiceId: form.invoiceId || undefined,
        beneficiaire,
        montant: parseFloat(form.montant),
        dateEmission: form.dateReception,
        dateEcheance: form.dateEncaissement || form.dateReception,
        banqueBeneficiaire: form.banqueBeneficiaire || undefined,
        notes: form.notes || undefined,
    }
}
