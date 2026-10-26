// Façade : l'implémentation est découpée (audit 2026-10, lot I) mais le
// contrat public reste strictement identique — les consommateurs continuent
// d'importer depuis "@/lib/packing-list/pdf".
export type { PackingDetail, PackingListPDFData, EtiquetteFormat } from "./pdf-shared"
export { genererPackingListPDF } from "./pdf-packing-list"
export { genererEtiquettesPDF } from "./pdf-etiquettes"
