"use client"

// Façade : l'implémentation est découpée (audit 2026-10, lot I) dans
// components/effets/lettre/ mais le contrat public reste strictement
// identique — les consommateurs continuent d'importer depuis
// "./lettre-de-change".
export { getEffetPrintWarnings, buildLettrePrintOverlayHTML } from "./lettre/print-overlay"
export { buildLettreScreenPreviewHTML } from "./lettre/screen-preview"
export { buildLettrePreviewHTML, buildLettreHTML } from "./lettre/carte"
export { LETTRE_PAGE_WIDTH_MM, LETTRE_PAGE_HEIGHT_MM } from "./lettre/gabarit"
