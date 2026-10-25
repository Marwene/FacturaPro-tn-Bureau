"use client"

import { useSession } from "next-auth/react"
import { useUserCompanies } from "@/hooks/use-user-companies"
import { useCompanyStore } from "@/lib/stores/company-store"

export function useActiveCompanyId() {
    const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId)
    const { data: session } = useSession()
    const userId = (session?.user as { id?: string })?.id
    const { data: userCompaniesData } = useUserCompanies(userId)
    return selectedCompanyId ?? userCompaniesData?.primaryCompanyId ?? null
}
