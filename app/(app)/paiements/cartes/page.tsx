import { PaiementsClient } from "@/components/paiements/paiements-client";

export const metadata = {
    title: "Paiements Carte",
};

export default function CartesPage() {
    return (
        <PaiementsClient defaultMethod="CARTE" />
    );
}
