"use client";

// Shared helpers & query keys
export { useCompanyId, companyParam, queryKeys } from "./use-queries-shared";

// Domain query hooks
export { useDashboard } from "./use-dashboard-query";
export { useInvoiceList as useInvoices, useInvoiceDetail as useInvoice } from "./use-invoices";
export { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "./use-clients-queries";
export { useFournisseurs, useCreateFournisseur, useUpdateFournisseur, useDeleteFournisseur } from "./use-fournisseurs-queries";
export { useAchats, useAchat, useCreateAchat, useUpdateAchatStatus, useDeleteAchat } from "./use-achats-queries";
export { useProducts, useCreateProduct } from "./use-products-queries";
export { useQuotes, useQuote, useConvertQuoteToInvoice, useCreateQuote, useUpdateQuoteStatus, useDeleteQuote } from "./use-quotes-queries";
export { useDeliveryNotes, useDeliveryNote, useCreateDeliveryNote, useUpdateDeliveryNoteStatus, useDeleteDeliveryNote } from "./use-delivery-notes-queries";
export { useCheques, useCreateCheque } from "./use-cheques-queries";
export { useReports } from "./use-reports-query";
export { useSettings, useUpdateSettings } from "./use-settings-queries";
export { useCompany } from "./use-company-query";
export { usePayments, useCreatePayment, usePaymentsList, useUpdatePayment, useDeletePayment } from "./use-payments-queries";
export { useNgpCodes, useCreateNgpCode, useUpdateNgpCode, useDeleteNgpCode } from "./use-ngp-code-queries";
export { useExports, useExport, useCreateExport, useUpdateExport, useDeleteExport } from "./use-exports-queries";
