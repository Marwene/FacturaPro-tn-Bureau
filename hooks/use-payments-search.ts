import { usePaymentsStore } from "@/lib/stores/payments-store";

export function usePaymentsSearch() {
    const searchInput = usePaymentsStore((s) => s.searchInput);
    const setSearchInput = usePaymentsStore((s) => s.setSearchInput);
    const methodFilter = usePaymentsStore((s) => s.methodFilter);
    const setMethodFilter = usePaymentsStore((s) => s.setMethodFilter);

    return { searchInput, setSearchInput, methodFilter, setMethodFilter };
}
