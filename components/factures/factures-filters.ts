import type { FacetedFilterDef } from "@/components/data-table/types";

const statusFilterDef: FacetedFilterDef = {
    columnId: "status",
    title: "Statut",
    options: [
        { label: "Brouillon", value: "BROUILLON" },
        { label: "Envoyée", value: "ENVOYEE" },
        { label: "Partielle", value: "PARTIELLE" },
        { label: "Payée", value: "PAYEE" },
        { label: "En retard", value: "EN_RETARD" },
        { label: "Annulée", value: "ANNULEE" },
    ],
};

export { statusFilterDef };
