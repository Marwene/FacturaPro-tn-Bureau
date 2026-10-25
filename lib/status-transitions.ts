// ─── Effet Status Transitions ─────────────────────────────────────────────────

export const VALID_EFFET_TRANSITIONS: Record<string, string[]> = {
    EN_PORTEFEUILLE: ["REMIS_ESCOMPTE", "ENDOSSE", "IMPAYE", "PAYE", "ANNULE"],
    REMIS_ESCOMPTE: ["PAYE", "IMPAYE", "ANNULE"],
    ENDOSSE: ["PAYE", "IMPAYE", "ANNULE"],
    IMPAYE: ["PAYE", "ANNULE"],
    PAYE: [],
    ANNULE: [],
};

export function isValidEffetTransition(current: string, next: string): boolean {
    return VALID_EFFET_TRANSITIONS[current]?.includes(next) ?? false;
}

// ─── Invoice Status Transitions ───────────────────────────────────────────────

export const VALID_INVOICE_TRANSITIONS: Record<string, string[]> = {
    BROUILLON: ["ENVOYEE", "ANNULEE"],
    ENVOYEE: ["PAYEE", "PARTIELLE", "EN_RETARD", "ANNULEE"],
    PARTIELLE: ["PAYEE", "EN_RETARD", "ANNULEE"],
    EN_RETARD: ["PAYEE", "ANNULEE"],
    PAYEE: [],
    ANNULEE: [],
};

export function isValidInvoiceTransition(current: string, next: string): boolean {
    return VALID_INVOICE_TRANSITIONS[current]?.includes(next) ?? false;
}

// ─── Generic Helper ───────────────────────────────────────────────────────────

export function getAllowedTransitions(
    currentStatus: string,
    transitionMap: Record<string, string[]>,
): string[] {
    return transitionMap[currentStatus] ?? [];
}
