"use client"

import { useState } from "react"
import { notify } from "@/lib/notify"
import { useClientsList } from "@/hooks/use-clients"
import { useFournisseursList } from "@/hooks/use-fournisseurs"
import {
    useBatchCreateEffets,
    useCompanyBankAccounts,
    useDocumentsLies,
    useEcheancesAvenir,
    useSuggestEcheances,
    type EcheanceAvenir,
} from "@/hooks/use-effets"
import { useCompany } from "@/hooks/use-company-query"
import { useActiveCompanyId } from "@/hooks/use-active-company"
import type { SerializedEffet, SerializedTiers } from "@/lib/types"
import { useEffetFormStore, type EffetFormData } from "@/lib/stores/effet-form-store"
import { resolveEffetForm } from "./effet-form-utils"
import {
    appendSplitAlloc,
    appendSplitRow,
    computeSplitState,
    generateSplit,
    removeSplitAlloc,
    removeSplitRow,
    round3,
    setSplitAllocField,
    setSplitRowField,
    type SplitRow,
} from "./effet-split-logic"

export function useNouvelEffet() {
    const { data: clientsData } = useClientsList()
    const { data: fournisseursData } = useFournisseursList()
    const { data: bankAccountsData } = useCompanyBankAccounts()
    const companyId = useActiveCompanyId()
    const { data: companyData } = useCompany(companyId)
    const clients = clientsData?.clients ?? []
    const fournisseurs = fournisseursData?.fournisseurs ?? []
    const bankAccounts = bankAccountsData?.accounts ?? []

    const [clientSearch, setClientSearch] = useState("")
    const [fournisseurSearch, setFournisseurSearch] = useState("")
    const [selectedTireur, setSelectedTireur] = useState<SerializedTiers | null>(null)
    const [selectedFournisseur, setSelectedFournisseur] = useState<SerializedTiers | null>(null)
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
    const [suggestedDates, setSuggestedDates] = useState<{ date: string; label: string }[]>([])
    const [echeancesOpen, setEcheancesOpen] = useState(false)
    const [horizon, setHorizon] = useState<30 | 60 | 90 | 120 | null>(null)
    const [echeancePage, setEcheancePage] = useState(1)
    const [splitRows, setSplitRows] = useState<SplitRow[]>([])
    const [splitDirty, setSplitDirty] = useState(false)
    const [createdEffets, setCreatedEffets] = useState<SerializedEffet[]>([])
    const [isCreatingSplit, setIsCreatingSplit] = useState(false)
    const [autoRepartirConfirmOpen, setAutoRepartirConfirmOpen] = useState(false)

    const storeForm = useEffetFormStore((s) => s.form)
    const set = useEffetFormStore((s) => s.updateForm)
    const form: EffetFormData = resolveEffetForm(storeForm, companyData?.company)

    const isRECU = form.type === "RECU"
    const isEMIS = form.type === "EMIS"
    const selectedBankAccount = bankAccounts.find((b) => b.id === form.companyBankAccountId)

    const entityId = isRECU ? selectedTireur?.id : selectedFournisseur?.id

    const { data: echeancesData, isLoading: echeancesLoading } = useEcheancesAvenir({ horizon, page: echeancePage, pageSize: 20 })
    const echeances = echeancesData?.echeances ?? []
    const totalEcheances = echeancesData?.total ?? 0
    const pageFrom = totalEcheances === 0 ? 0 : (echeancePage - 1) * 20 + 1
    const pageTo = Math.min(echeancePage * 20, totalEcheances)
    const totalPages = Math.max(1, Math.ceil(totalEcheances / 20))

    const { data: docsData } = useDocumentsLies({ type: form.type, entityId })
    const documents = docsData?.documents ?? []

    const buildSplit = (): SplitRow[] => generateSplit({
        selectedDocIds,
        documents,
        dateEcheance: form.dateEcheance,
        seuilSplitEffet: companyData?.company?.seuilSplitEffet,
    })

    const toggleDoc = (docId: string) => {
        if (isRECU) {
            const wasSelected = selectedDocIds.includes(docId)
            const doc = documents.find((d) => d.id === docId)
            setSelectedDocIds(wasSelected ? [] : [docId])
            set({
                invoiceId: wasSelected ? "" : docId,
                montant: wasSelected ? "" : (doc ? (doc.resteAPayer ?? doc.totalTTC) : ""),
            })
        } else {
            const wasSelected = selectedDocIds.includes(docId)
            const doc = documents.find((d) => d.id === docId)
            const newSelectedDocIds = wasSelected
                ? selectedDocIds.filter((d) => d !== docId)
                : [...selectedDocIds, docId]
            setSelectedDocIds(newSelectedDocIds)
            const newAchatsLies = wasSelected
                ? form.achatsLies.filter((a) => a.achatId !== docId)
                : doc && !form.achatsLies.some((a) => a.achatId === docId)
                    ? [...form.achatsLies, { achatId: doc.id, montantAlloue: doc.resteAPayer ?? doc.totalTTC }]
                    : form.achatsLies
            const newTotal = newSelectedDocIds.reduce((sum, id) => {
                const d = documents.find((x) => x.id === id)
                return sum + parseFloat(d?.resteAPayer ?? d?.totalTTC ?? "0")
            }, 0)
            set({ achatsLies: newAchatsLies, montant: newTotal.toFixed(3) })
        }
    }

    const totalSelected = selectedDocIds.reduce((sum, id) => {
        const doc = documents.find((d) => d.id === id)
        return sum + parseFloat(doc?.resteAPayer ?? doc?.totalTTC ?? "0")
    }, 0)

    const handleTypeChange = (val: "RECU" | "EMIS") => {
        setSelectedTireur(null)
        setSelectedFournisseur(null)
        setSelectedDocIds([])
        setClientSearch("")
        setFournisseurSearch("")
        const companyName = companyData?.company?.name ?? ""
        set({
            type: val, tireurId: "", fournisseurId: "",
            tire: val === "EMIS" ? companyName : "",
            tireAdresse: val === "EMIS" ? (companyData?.company?.adresse ?? "") : "",
            tireBanque: val === "EMIS" ? (companyData?.company?.banque ?? "") : "",
            beneficiaire: val === "RECU" ? companyName : "",
            achatsLies: [], companyBankAccountId: "", invoiceId: "",
        })
    }

    const handleTireurSelect = (tiers: SerializedTiers) => {
        setSelectedTireur(tiers)
        set({ tireurId: tiers.id, fournisseurId: "", tire: tiers.raisonSociale, tireAdresse: tiers.adresse ?? "", tireBanque: tiers.banque ?? "", beneficiaire: companyData?.company?.name ?? "" })
        setClientSearch(tiers.raisonSociale)
    }

    const handleFournisseurSelect = (tiers: SerializedTiers) => {
        setSelectedFournisseur(tiers)
        setSelectedDocIds([])
        set({ fournisseurId: tiers.id, tireurId: tiers.id, beneficiaire: tiers.raisonSociale, achatsLies: [] })
        setFournisseurSearch(tiers.raisonSociale)
    }

    const suggestEcheances = useSuggestEcheances()

    const handleSuggestEcheance = async (echeance?: EcheanceAvenir) => {
        if (isEMIS) {
            if (echeance) {
                set({ dateEcheance: echeance.dateEcheance.split("T")[0] })
                return
            }
            setSplitRows(buildSplit())
            setCreatedEffets([])
            setSplitDirty(false)
            setEcheancesOpen(true)
            return
        }
        try {
            const data = await suggestEcheances.mutateAsync({ montant: form.montant || undefined })
            if (data && data.suggestions.length > 0) {
                set({ dateEcheance: data.suggestions[0].date })
                setSuggestedDates(data.suggestions.slice(0, 3))
            }
        } catch (error) {
            notify.error({
                title: "Suggestions d'échéance indisponibles",
                error,
                context: "lors de la suggestion de dates d'échéance",
            })
        }
    }

    const updateSplitRow = (rowId: string, field: "ordrePaiementNumero" | "dateEcheance", value: string) => {
        setSplitRows((rows) => setSplitRowField(rows, rowId, field, value))
        setSplitDirty(true)
    }

    const removeSplitRowById = (rowId: string) => {
        setSplitRows((rows) => removeSplitRow(rows, rowId))
        setSplitDirty(true)
    }

    const updateSplitAlloc = (rowId: string, allocIdx: number, field: "achatId" | "montant", value: string) => {
        setSplitRows((rows) => setSplitAllocField(rows, rowId, allocIdx, field, value))
        setSplitDirty(true)
    }

    const removeSplitAllocById = (rowId: string, allocIdx: number) => {
        setSplitRows((rows) => removeSplitAlloc(rows, rowId, allocIdx))
        setSplitDirty(true)
    }

    const addSplitAlloc = (rowId: string) => {
        setSplitRows((rows) => appendSplitAlloc(rows, rowId))
        setSplitDirty(true)
    }

    const addSplitRow = () => {
        setSplitRows((rows) => appendSplitRow(rows, { selectedDocIds, documents, dateEcheance: form.dateEcheance }))
        setSplitDirty(true)
    }

    const applyAutoRepartir = () => {
        setSplitRows(buildSplit())
        setSplitDirty(false)
    }

    const handleAutoRepartir = () => {
        if (splitDirty) {
            setAutoRepartirConfirmOpen(true)
            return
        }
        applyAutoRepartir()
    }

    const handleCreateOthers = () => {
        setCreatedEffets([])
        setSplitRows(buildSplit())
        setSplitDirty(false)
    }

    const handleAddAchat = () => set({ achatsLies: [...form.achatsLies, { achatId: "", montantAlloue: "" }] })
    const handleRemoveAchat = (idx: number) => {
        const achatId = form.achatsLies[idx]?.achatId
        set({ achatsLies: form.achatsLies.filter((_, i) => i !== idx) })
        if (achatId && selectedDocIds.includes(achatId)) {
            setSelectedDocIds((prev) => prev.filter((d) => d !== achatId))
        }
    }
    const handleAchatChange = (idx: number, field: "achatId" | "montantAlloue", value: string) => {
        set({ achatsLies: form.achatsLies.map((a, i) => i === idx ? { ...a, [field]: value } : a) })
    }

    const filteredClients = clients.filter((c) => c.raisonSociale.toLowerCase().includes(clientSearch.toLowerCase()) || c.code.toLowerCase().includes(clientSearch.toLowerCase()))
    const filteredFournisseurs = fournisseurs.filter((f) => f.raisonSociale.toLowerCase().includes(fournisseurSearch.toLowerCase()) || f.code.toLowerCase().includes(fournisseurSearch.toLowerCase()))

    const montantNum = parseFloat(form.montant) || 0
    const splitWarning = form.montant && totalSelected > 0 && montantNum < totalSelected

    const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id))
    const { totalACouvrir, totalReparti, splitValid, splitErrors } = computeSplitState({
        splitRows, selectedDocIds, selectedDocs,
    })

    const { mutateAsync: createBatch } = useBatchCreateEffets()

    const handleCreateSplit = async () => {
        if (!splitValid) return
        setIsCreatingSplit(true)
        const shared = {
            tire: form.tire,
            tireAdresse: form.tireAdresse || null,
            tireBanque: form.tireBanque || null,
            beneficiaire: form.beneficiaire,
            fournisseurId: form.fournisseurId || null,
            companyBankAccountId: form.companyBankAccountId || null,
            dateCreation: form.dateCreation,
        }
        try {
            const result = await createBatch({
                type: "EMIS",
                effets: splitRows.map((row) => ({
                    ...shared,
                    montant: round3(row.allocations.reduce((s, a) => s + (parseFloat(a.montant) || 0), 0)),
                    dateEcheance: row.dateEcheance,
                    ordrePaiementNumero: row.ordrePaiementNumero || null,
                    achatsLies: row.allocations.map((a) => ({ achatId: a.achatId, montantAlloue: round3(parseFloat(a.montant) || 0) })),
                })),
            })
            setCreatedEffets(result.effets)
            notify.success({ title: `${result.effets.length} effet(s) émis`, description: "Les effets apparaissent dans la liste." })
        } catch {
            // l'erreur est déjà affichée par le hook
        } finally {
            setIsCreatingSplit(false)
        }
    }

    return {
        clients,
        fournisseurs,
        bankAccounts,
        companyData,
        clientSearch,
        setClientSearch,
        fournisseurSearch,
        setFournisseurSearch,
        selectedTireur,
        selectedFournisseur,
        selectedDocIds,
        suggestedDates,
        echeancesOpen,
        setEcheancesOpen,
        horizon,
        setHorizon,
        echeancePage,
        setEcheancePage,
        splitRows,
        setSplitDirty,
        createdEffets,
        setCreatedEffets,
        isCreatingSplit,
        form,
        set,
        isRECU,
        isEMIS,
        selectedBankAccount,
        entityId,
        echeances,
        echeancesLoading,
        pageFrom,
        pageTo,
        totalPages,
        totalEcheances,
        documents,
        toggleDoc,
        totalSelected,
        handleTypeChange,
        handleTireurSelect,
        handleFournisseurSelect,
        handleSuggestEcheance,
        updateSplitRow,
        removeSplitRow: removeSplitRowById,
        updateSplitAlloc,
        removeSplitAlloc: removeSplitAllocById,
        addSplitAlloc,
        addSplitRow,
        handleAutoRepartir,
        applyAutoRepartir,
        autoRepartirConfirmOpen,
        setAutoRepartirConfirmOpen,
        handleCreateOthers,
        handleAddAchat,
        handleRemoveAchat,
        handleAchatChange,
        filteredClients,
        filteredFournisseurs,
        montantNum,
        splitWarning,
        selectedDocs,
        totalACouvrir,
        totalReparti,
        splitValid,
        splitErrors,
        handleCreateSplit,
    }
}

export type NouvelEffetController = ReturnType<typeof useNouvelEffet>
