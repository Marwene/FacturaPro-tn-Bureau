import type { EffetFormData } from "@/lib/stores/effet-form-store";

export interface EffetCompanyContext {
    name: string;
    adresse?: string;
    banque?: string;
}

export const formatAdresse = (parts: (string | null | undefined)[]) => {
    const p = parts.filter((x): x is string => !!x)
    return p.length > 0 ? p.join(", ") : "—"
}

/**
 * Dérivé pur de rendu — remplace l'ancien effet de bord qui écrivait dans le store
 * pendant le render (`if (companyName && isEMIS) set({ tire, tireAdresse, ... })`).
 *
 * Équivalences strictes avec l'ancien code :
 * - EMIS : `tire = company.name`, `tireAdresse = company.adresse` (écrasées systématiquement),
 *   `tireBanque = form.tireBanque || company.banque` (l'ancien ne remplit que si vide).
 * - RECU : `beneficiaire = company.name` si et seulement si aucun tireur n'est sélectionné et
 *   que `beneficiaire` est vide. `!form.tireurId` ≡ l'ancien `!selectedTireur` car
 *   `handleTireurSelect` écrit `tireurId` et `selectedTireur` ensemble, et
 *   `handleTypeChange` les remet à zéro ensemble (aucun chemin ne désynchronise les deux
 *   quand `type === "RECU"`).
 * - `company.name` null → le formulaire est retourné tel quel (forme inchangée).
 */
export function resolveEffetForm(
    form: EffetFormData,
    company: EffetCompanyContext | null | undefined,
): EffetFormData {
    if (!company) return form
    const companyName = company.name
    if (!companyName) return form
    if (form.type === "EMIS") {
        const companyAdresse = company.adresse ?? ""
        const companyBanque = company.banque ?? ""
        return {
            ...form,
            tire: companyName,
            tireAdresse: companyAdresse,
            tireBanque: form.tireBanque || companyBanque,
        }
    }
    if (form.type === "RECU" && !form.tireurId && !form.beneficiaire) {
        return { ...form, beneficiaire: companyName }
    }
    return form
}
