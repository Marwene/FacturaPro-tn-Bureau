import { PaiementsClient } from "@/components/paiements/paiements-client";

export default function VirementsPage() {
    return (
        <PaiementsClient defaultMethod="VIREMENT" />
    );
}
