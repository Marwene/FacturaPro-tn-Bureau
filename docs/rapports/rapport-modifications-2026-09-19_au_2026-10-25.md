# Rapport consolidé des modifications — 2026-09-19 → 2026-10-25

- **Date de génération** : 2026-10-26.
- **Périmètre** : tout l'historique des modifications jusqu'à hier (aujourd'hui = 2026-10-26) — soit les **112 entrées** de `docs/wiki/CHANGELOG.md` (section « Entries ») couvrant les dates **2026-09-19 → 2026-10-25**, **plus** les **5 commits git** du dépôt (tous datés du **2026-10-25** : `e03ceea`, `082f796`, `e10012a`, `b387719`, `a3c55b9`).
- **Sources utilisées** : `docs/wiki/CHANGELOG.md` (112 entrées de la section « Entries ») et `git log` / `git show --stat` / `git show --numstat` du dépôt.
- **Généré par le Governor Agent.**
- **Aucun secret reproduit** : aucune clé API, aucun mot de passe, aucune valeur de variable d'environnement n'est recopiée dans ce rapport. Les rares entrées de changelog qui énumèrent des noms de variables sensibles sont paraphrasées (noms remplacés par une désignation générique).
- **Méthode et limites** : chaque ligne du tableau de la section A correspond à une entrée du changelog ; le résumé est le titre en gras d'ouverture de l'entrée (tronqué à la première phrase, 1 ligne maximum) et la colonne « Fichiers clés » reprend ce qui figure à la fin de l'entrée après le marqueur de fichiers, variantes de libellé du dépôt incluses (`— fichiers clés :`, `**— fichiers clés** :`, `Fichier clé :`, `Fichiers concernés :`), ou « — » si l'entrée n'en liste aucun (**2 cas** : `2026-09-25 / sécurité-incident` et `2026-10-18 / prompt-g-p2-etapes-2-3`). Les sections historiques `## YYYY-MM-DD — …` du même fichier (ancien format d'archive, antérieures ou contiguës à ce périmètre) ne sont **pas** comptées : elles ne sont pas des entrées de la section « Entries ». Ce rapport est factuel : rien n'est extrapolé au-delà du changelog et du git ; toute information absente est notée « non documenté ».

---

## SECTION A — Synthèse chronologique

112 lignes, triées par date croissante (ordre du fichier conservé à date égale).

| Date | Rôle | Lot / Module | Résumé (1 ligne max) | Fichiers clés |
| --- | --- | --- | --- | --- |
| 2026-09-19 | Frontend | status-badge | Enrichissement du fichier `status-badge.tsx` avec les configs manquantes pour tous les modules — Ajout de 5 nouvelles configs de statut (Bon de Commande, Ordre de Fabrication, Rapprochement, Design/Modèle, Packing List) et 5 … | `components/status-badge.tsx`, `lib/types/enums.ts`, `lib/types/index.tsx` |
| 2026-09-19 | Frontend | bons-commande | Remplacement du Combobox produit par ProductSelect partagé dans `scan-bc-manual-entry.tsx` — Interface Product étendue (tauxTVA, fodec, tauxFodec, suppliers). | `components/bons-commande/scan-bc-manual-entry.tsx`, `components/shared/product-select.tsx` |
| 2026-09-19 | Frontend | shared | Remplacement du Combobox `@base-ui/react` par une solution custom Popover + Input + liste filtrée dans `line-items-table.tsx` — Le Combobox ne filtrait pas correctement avec des objets comme `value`. | `components/shared/line-items-table.tsx` |
| 2026-09-19 | Frontend | shared | Correction filtrage Combobox et élargissement du tableau dans `line-items-table.tsx` — Ajout de la prop `filter` au Combobox @base-ui/react pour que la recherche par code/nom/fournisseur fonctionne correctement. | `components/shared/line-items-table.tsx` |
| 2026-09-19 | Backend + Frontend | Inventaire | Système multi-fournisseurs pour les produits — Table ProductSupplier, historique des prix, comparaison fournisseurs, sélection enrichie dans les documents. | `prisma/schema.prisma`, `app/api/products/[id]/suppliers/`, `components/produits/product-suppliers-section.tsx`, `components/produits/product-supplier-price-history.tsx`, `components/produits/product-supplier-comparison.tsx`, `components/shared/line-items-table.tsx` |
| 2026-09-20 | Frontend + Backend | facturation | Module de facturation fin de mois — Ajout de `hooks/use-pending-bl.ts` (hooks TanStack Query `usePendingBLs` et `useCreateInvoiceFromBL`), `components/factures/pending-bl-alert.tsx` (composant dashboard alerte BLs en attente par … | `hooks/use-pending-bl.ts`, `components/factures/pending-bl-alert.tsx`, `components/factures/generate-invoice-dialog.tsx`, `components/factures/facture-detail-lines.tsx`, `components/factures/facture-detail-client.tsx`, `lib/types/invoice.ts`, `app/api/invoices/[id]/route.ts`, `lib/export-utils.ts` |
| 2026-09-20 | Backend | facturation/PDF | Groupement visuel des lignes de facture par Bon de Livraison — Extension de `DocumentLine` avec champs optionnels `blNumero`, `blDate`, `isGroupHeader`. | `lib/pdf-types.ts`, `lib/pdf-builder.ts`, `lib/pdf-converters.ts`, `lib/types/invoice.ts` |
| 2026-09-20 | Frontend + Backend | inventaire | Filtre fournisseur dans le listing produits + recherche par fournisseur + dot au lieu de CircleCheck — Remplacement de l'icône `CircleCheck` par un dot (`span.size-1.5.rounded-full.bg-amber-500`) pour l'indicateur fournisseur par … | `components/produits/produits-client.tsx`, `lib/stores/produits-store.ts`, `hooks/use-produits.ts`, `app/api/products/route.ts` |
| 2026-09-20 | QA | tous modules | Audit complet de 8 modules — Devis, Bon de commande, Bon de livraison, Facture, Achats/BL, Achats Factures, Inventaire, Produits/Mouvements. | docs/audits/*.md |
| 2026-09-20 | Frontend + Backend | inventaire | Dot pour isDefault + recherche/filtrage par fournisseur — Remplacement de l'icone CircleCheck par un simple dot amber pour indiquer le fournisseur par defaut dans les colonnes Fournisseurs et Prix Achat. | components/produits/produits-client.tsx, app/api/products/route.ts, lib/stores/produits-store.ts, hooks/use-produits.ts |
| 2026-09-20 | Frontend | inventaire | Correction colonne "Prix Vente" dans le listing produits — La colonne affichait maintenant le `prixHT` du produit (prix de vente défini par l'utilisateur) au lieu du `salePrice` du fournisseur qui était souvent null et faisait un … | `components/produits/produits-client.tsx` |
| 2026-09-20 | Frontend + Backend | inventaire | Prix achat fournisseur par défaut dans détail + icône CircleCheck pour isDefault — Modification du GET `/api/products/[id]` pour inclure les suppliers et calculer `prixAchatDefault` (prix du fournisseur par défaut). | `app/api/products/[id]/route.ts`, `components/produits/produit-detail-client.tsx`, `components/produits/produit-form-page.tsx`, `components/produits/product-suppliers-section.tsx`, `components/produits/produits-client.tsx`, `lib/types/product.ts`, `hooks/use-produits.ts` |
| 2026-09-20 | Frontend | inventaire | Remplacement icône ⭐/Star par Badge "Défaut" + validation prix vente ≠ prix achat — Remplacement de l'emoji ⭐ et de l'icône `Star` (lucide-react) par un composant `Badge` (variant secondary/outline avec style amber) pour … | `components/produits/produits-client.tsx`, `components/produits/produit-form-page.tsx`, `components/produits/product-suppliers-section.tsx`, `components/produits/product-supplier-comparison.tsx` |
| 2026-09-20 | Frontend | inventaire | Ajout des actions "Voir le détail" et "Supprimer" dans le menu du listing produits — La colonne actions du DataTable dans `produits-client.tsx` contient maintenant 3 items : "Voir le détail" (Eye, lien vers `/produits/[id]`) … | `components/produits/produits-client.tsx` |
| 2026-09-20 | Backend + Frontend | inventaire | Gestion multi-fournisseurs pendant la création/modification d'un produit — Ajout du champ `suppliers` (tableau de `ProductSupplierInput`) au `productSchema` dans `lib/schemas.ts`. | `lib/schemas.ts`, `app/api/products/route.ts`, `app/api/products/[id]/route.ts`, `components/produits/produit-form-page.tsx` |
| 2026-09-20 | Backend | stock | Utilisation du prix d'achat fournisseur par défaut pour les mouvements de stock — Ajout de `getDefaultSupplierPrice()` dans `lib/stock-utils.ts` qui query `ProductSupplier` (isDefault=true) pour récupérer supplierId et … | `lib/stock-utils.ts`, `app/api/achats/[id]/route.ts`, `app/api/products/[id]/stock-movements/route.ts` |
| 2026-09-20 | Backend | inventaire | Ajout du champ `salePrice` (prix de vente fournisseur) dans les réponses API des produits — Le champ `salePrice` du modèle Prisma `ProductSupplier` est désormais retourné dans `GET /api/products`, `GET/POST … | `app/api/products/route.ts`, `app/api/products/[id]/suppliers/route.ts`, `app/api/products/[id]/suppliers/[supplierId]/route.ts`, `lib/types/product.ts` |
| 2026-09-21 | Frontend | factures/generate-invoice-dialog | HoverCard BL details — Ajout d'un HoverCard avec icône Info devant chaque numéro de BL dans le `GenerateInvoiceDialog`. | `components/factures/generate-invoice-dialog.tsx`, `hooks/use-pending-bl.ts` |
| 2026-09-21 | Backend + Frontend | bons-livraison | Affichage badge "Facturé" dans le listing BL — (1) API `GET /api/bons-livraison` : ajout de l'include `invoices` (relation `InvoiceBonLivraison` → `invoice` avec select `id`, `numero`, `dateEmission`, `status`). | `app/api/bons-livraison/route.ts`, `lib/types/delivery-note.ts`, `components/bons-livraison/bl-client.tsx` |
| 2026-09-21 | Frontend + Backend | facturation | Corrections FloatingAlert — (1) FAB rendu via `createPortal` pour être toujours visible (hors du flux du dashboard), z-index `9999`. | `components/factures/floating-alert.tsx`, `app/api/invoices/from-bl/route.ts` |
| 2026-09-21 | Frontend | factures/floating-alert | Ajout bouton « Générer » par client — État local `selectedClient` pour tracker le client sélectionné. | `components/factures/floating-alert.tsx` |
| 2026-09-21 | Frontend | facturation/dashboard | Nettoyage — Suppression de `components/dashboard/pending-bl-section.tsx` (ancien composant cards remplacé par FloatingAlert). | `components/dashboard/dashboard-client.tsx` |
| 2026-09-21 | Frontend | facturation/dashboard | Composant FloatingAlert pour BLs en attente — Création de `lib/stores/pending-bl-store.ts` (Zustand store avec persistance localStorage pour isMinimized, dismissedToday, reminderCount, nextReminderMinutes) et … | `lib/stores/pending-bl-store.ts`, `components/factures/floating-alert.tsx`, `components/dashboard/dashboard-client.tsx` |
| 2026-09-21 | Frontend | dashboard | Refonte du composant PendingBL → PendingBLSection — Remplacement de `components/factures/pending-bl-alert.tsx` (ancien composant carte d'alerte) par `components/dashboard/pending-bl-section.tsx` (3 cartes KPI suivant le pattern … | `components/dashboard/pending-bl-section.tsx`, `components/dashboard/dashboard-client.tsx` |
| 2026-09-21 | Frontend | dashboard | Intégration du composant PendingBLAlert dans le dashboard — Ajout de l'import et du rendu de `PendingBLAlert` dans `components/dashboard/dashboard-client.tsx`, placé après `SecondaryCardsSection` et avant les cartes de stock. | `components/dashboard/dashboard-client.tsx` |
| 2026-09-21 | Governor Agent | graphify | Résolution du Graphify Drift — `graphify update .` exécuté avec succès après le timeout précédent. | `hooks/use-pending-bl.ts`, `components/factures/pending-bl-alert.tsx`, `components/factures/generate-invoice-dialog.tsx`, `components/factures/facture-detail-lines.tsx`, `components/factures/facture-detail-client.tsx`, `lib/types/invoice.ts`, `app/api/invoices/[id]/route.ts`, `lib/export-utils.ts` |
| 2026-09-23 | Frontend | inventaire | Refonte complète page Inventaire — Remplacement des 4 tables HTML custom par des DataTable réutilisables avec search, tri, pagination, et filtres facettés. | `components/stock/inventaire-client.tsx` |
| 2026-09-25 | Backend | auth/rate-limit | Correctifs post-revue QA — (1) FIX 1 `resend-code` : le consume IP (`RESEND_CODE_IP_LIMIT` 10/h) est désormais appelé au tout début du `try`, avant `request.json()` — un corps malformé (500) ou `{}` sans email (400) compte … | `app/api/auth/resend-code/route.ts`, `lib/rate-limit.ts`, `lib/__tests__/rate-limit.test.ts`, `docs/wiki/auth.md` |
| 2026-09-25 | Backend | auth/rate-limit | Rate limiting des 5 endpoints publics d'auth — Création de `lib/rate-limit.ts` : seuils nommés documentés (`NEXTAUTH_IP_LIMIT` 15/5min, `LOGIN_ACCOUNT_LIMIT` 10/15min, `REGISTER_IP_LIMIT` 5/h, `RESEND_CODE_IP_LIMIT` 10/h … | `lib/rate-limit.ts`, `lib/__tests__/rate-limit.test.ts`, `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/resend-code/route.ts`, `app/api/users/check-status/route.ts`, `app/api/users/verify-email/route.ts`, `docs/wiki/auth.md` |
| 2026-09-25 | Backend | dashboard-rapports, wiki | Micro-complément STEP 6 (documentation uniquement, aucun code) — rubrique « Hors périmètre — à décider » de `docs/wiki/dashboard-rapports.md` enrichie : (1) point `app/actions/products.ts` explicite désormais le risque `unlink` … | `docs/wiki/dashboard-rapports.md` |
| 2026-09-25 | Backend | upload/sécurité | Durcissement des 4 routes d'upload — Création de `lib/upload-guard.ts` : `detectMime()` (sniffing magic bytes JPEG/PNG/GIF/WebP/PDF, `null` sinon → HTML/XML/SVG rejetés), `validateUpload()` (taille vérifiée AVANT `arrayBuffer()` … | `lib/upload-guard.ts`, `app/api/upload/route.ts`, `app/api/products/[id]/photo/route.ts`, `app/api/products/[id]/fiches/route.ts`, `app/api/products/[id]/fiche-technique/route.ts` |
| 2026-09-25 | Governor | sécurité/incident | Fuite de `.env` via l'export `FacturaPRO.zip` — secrets concernés par nom de variable uniquement : `url de connexion a la base`, `secret d'application`, `identifiants SMTP`, `identifiants SMTP`, `Mistral-Ai-OCR3` ; contamination … | — |
| 2026-09-26 | Gouverneur | documentation/audit racine | Correction de l'incident d'écriture parasite de AUDIT-FACTURAPRO.md — suppression de l'octet '0' inséré à l'offset 32356 (ligne 318) le 2026-09-26 18:55:09, restauration byte-exacte de l'état pré-incident (size 45862, md5 … | AUDIT-FACTURAPRO.md, docs/wiki/CHANGELOG.md |
| 2026-09-26 | Frontend | atelier/planning/P1-4 | Nettoyage des `any` de l'Atelier et du Planning (Lot 2 de P1-4) — suppression des 19 occurrences de `any` dans 5 fichiers, en appliquant le skill `type-safety`. | `components/atelier/ordres-fabrication-client.tsx`, `components/planning/planning-client.tsx`, `components/atelier/matieres-premieres-client.tsx`, `components/atelier/modeles-client.tsx`, `components/atelier/nouveau-of-dialog.tsx`, `docs/wiki/production.md` |
| 2026-09-26 | Frontend | avoirs/P1-4 | Nettoyage des `any` du module Avoir (Lot 1 de P1-4) — suppression des 20 occurrences de `any` et des 2 directives `// eslint-disable-next-line @typescript-eslint/no-explicit-any` dans 7 fichiers `components/avoirs/`, en … | `components/avoirs/avoir-form-entity.tsx`, `components/avoirs/avoir-form-lines.tsx`, `components/avoirs/avoir-dialog-financier-section.tsx`, `components/avoirs/avoir-dialog-simple-section.tsx`, `components/avoirs/avoir-detail-left-column.tsx`, `components/avoirs/avoir-detail-sidebar.tsx`, `components/avoirs/avoir-detail-client.tsx`, `docs/wiki/facturation.md` |
| 2026-09-27 | Backend | groupe4-stock-notifs-companies/P1-5 | Migration des 4 fichiers / 8 handlers de `app/api/stock-mouvements/route.ts`, `app/api/notifications/route.ts`, `app/api/companies/route.ts`, `app/api/companies/[id]/route.ts` vers le wrapper `lib/api-route.ts` — Groupe 4 de P1-5 … | app/api/stock-mouvements/route.ts, app/api/notifications/route.ts, app/api/companies/route.ts, app/api/companies/[id]/route.ts, docs/wiki/inventaire.md, docs/wiki/dashboard-rapports.md, docs/wiki/parametres.md, docs/wiki/audit-facturapro-suivi.md |
| 2026-09-27 | Backend | categories-marques/P1-5 | Migration des 4 routes / 8 handlers de `app/api/categories/` + `app/api/marques/` vers le wrapper `lib/api-route.ts` — Groupe 3 de P1-5 (audit transverse). | app/api/categories/route.ts, app/api/categories/[id]/route.ts, app/api/marques/route.ts, app/api/marques/[id]/route.ts, docs/wiki/inventaire.md, docs/wiki/CHANGELOG.md, docs/wiki/audit-facturapro-suivi.md |
| 2026-09-27 | Backend | produits/P1-5 | Migration des 5 routes / 9 handlers restantes de `app/api/products/` vers le wrapper `lib/api-route.ts` — Groupe 2 de P1-5 (audit transverse ; les 9 routes déjà wrappées du dossier n'ont pas été touchées). | app/api/products/route.ts, app/api/products/[id]/route.ts, app/api/products/[id]/stats/route.ts, app/api/products/[id]/variants/route.ts, app/api/products/[id]/fiches/[ficheId]/route.ts, docs/wiki/inventaire.md, docs/wiki/audit-facturapro-suivi.md |
| 2026-09-27 | Backend | clients/P1-5 | Migration des 8 routes `app/api/clients/` vers le wrapper `lib/api-route.ts` — Groupe 1 de P1-5 (audit transverse). | app/api/clients/route.ts, app/api/clients/[id]/route.ts, app/api/clients/[id]/detail/route.ts, app/api/clients/[id]/documents/route.ts, app/api/clients/[id]/solde/route.ts, app/api/clients/[id]/check-blocage/route.ts, app/api/clients/[id]/credit-limit/route.ts, app/api/clients/[id]/envoyer-rappel/route.ts, docs/wiki/crm.md, docs/wiki/audit-facturapro-suivi.md |
| 2026-09-27 | Gouverneur | documentation/audit transverse | Création de la traçabilité d'avancement des 14 prompts du §6 de `AUDIT-FACTURAPRO.md` — nouvelle fiche `docs/wiki/audit-facturapro-suivi.md` (statuts revérifiés par commande avant écriture) + ligne « Suivi audit transverse » dans … | docs/wiki/audit-facturapro-suivi.md, docs/wiki/README.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Frontend | p2-7-justifications/P2-7 | Passe finale de justifications écrites de `P2-7` (audit §6 P2-7, étape 2) — les 16 `useEffect` conservés sans commentaire reçoivent un commentaire de justification en français au format `// Justification useEffect : <système … | components/customizer/canvas/design-canvas.tsx, components/customizer/mockup/mockup-3d.tsx, components/factures/floating-alert.tsx, components/planning/gantt-chart.tsx, components/produits/etiquettes-produits-dialog.tsx, components/ui/calendar.tsx, components/ui/carousel.tsx, components/ui/sidebar-context.tsx, hooks/customizer/use-canvas-events.ts, hooks/use-auto-logout.ts, hooks/use-mobile.ts, hooks/use-settings.ts, lib/providers/session-provider.tsx, lib/providers/theme-provider.tsx, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Frontend | p2-7-suppression-code-mort/P2-7 | Lot de clôture de `P2-7` — suppression du code mort consentie par l'utilisateur (accord explicite reçu : « A oui, B1 oui, B2 oui ») | hooks/use-debounce.ts (supprimé), hooks/use-achats-search.ts (supprimé), hooks/use-invoices-search.ts (supprimé), hooks/use-achats.ts, hooks/use-produits.ts, hooks/use-avoirs.ts, hooks/use-bc.ts, hooks/use-bl.ts, hooks/use-devis.ts, hooks/use-exports.ts, hooks/use-fournisseurs.ts, hooks/use-invoices.ts, components/avoirs/avoirs-client.tsx, components/bons-commande/bons-commande-client.tsx, components/bons-livraison/bl-client.tsx, components/devis/devis-client.tsx, components/exports/exports-client.tsx, components/factures/factures-client.tsx, components/fournisseurs/fournisseurs-client.tsx, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Backend | p2-7-lot3-expiration/P2-7 | Lot 3 (expiration des devis) de `P2-7` — déplacement côté serveur de l'expiration automatique des devis | lib/quote-expiry.ts, app/api/quotes/route.ts, app/api/quotes/[id]/route.ts, app/api/dashboard/route.ts, app/api/quotes/expire/route.ts, hooks/use-devis.ts, components/devis/devis-client.tsx, components/devis/devis-detail-client.tsx, hooks/use-quotes-queries.ts, hooks/use-queries.ts, docs/wiki/devis.md, docs/wiki/dashboard-rapports.md, docs/wiki/audit-facturapro-suivi.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Frontend | p2-7-final-consommateurs/P2-7 | Lot final (partie 1) de `P2-7` — migration des 3 derniers consommateurs de `hooks/use-debounce.ts` pour que le fichier n'ait plus aucun importeur | components/command-palette.tsx, components/produits/produit-form-page.tsx, components/stock/mouvements-client.tsx, docs/wiki/audit-facturapro-suivi.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Frontend | p2-7-lot7-divers/P2-7 | Lot 7 (divers) de `P2-7` — les 6 `useEffect` non justifiés « divers » de l'audit `AUDIT-FACTURAPRO.md` §6 | components/achats/scan-upload-screen.tsx, components/atelier/nouveau-of-dialog.tsx, components/atelier/packing-list-client.tsx, components/paiements/paiements-client.tsx, components/produits/produit-form-page.tsx, docs/wiki/achats.md, docs/wiki/production.md, docs/wiki/tresorerie.md, docs/wiki/inventaire.md, docs/wiki/audit-facturapro-suivi.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Frontend | p2-7-lot6-financier/P2-7 | Lot 6 (calculs financiers) de `P2-7` — les 5 `useEffect` non justifiés « financiers » de l'audit `AUDIT-FACTURAPRO.md` §6 | components/devis/nouveau-devis-client.tsx, components/bons-livraison/nouveau-bl-client.tsx, hooks/use-bl.ts, docs/wiki/devis.md, docs/wiki/audit-facturapro-suivi.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Frontend | p2-7-lot5-customizer/P2-7 | Lot 5 de `P2-7` — les 3 `useEffect` non justifiés du module customizer (audit `AUDIT-FACTURAPRO.md` §6) | components/customizer/customizer-studio.tsx, components/customizer/canvas/design-canvas.tsx, docs/wiki/production.md, docs/wiki/audit-facturapro-suivi.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Frontend | p2-7-lot4-command-palette/P2-7 | Lot 4 de `P2-7` — les 3 `useEffect` non justifiés de `components/command-palette.tsx` (audit `AUDIT-FACTURAPRO.md` §6) | components/command-palette.tsx, docs/wiki/dashboard-rapports.md, docs/wiki/audit-facturapro-suivi.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Frontend | p2-7-lot2-hooks-search/P2-7 | Lot 2 de `P2-7` — suppression des 12 `useEffect` de debounce-recherche non justifiés listés au tableau de périmètre (audit `AUDIT-FACTURAPRO.md` §6) | hooks/use-achats-search.ts, hooks/use-achats.ts, hooks/use-avoirs.ts, hooks/use-bc.ts, hooks/use-bl.ts, hooks/use-devis.ts, hooks/use-exports.ts, hooks/use-fournisseurs.ts, hooks/use-invoices-search.ts, hooks/use-invoices.ts, hooks/use-payments-search.ts, hooks/use-produits.ts, components/fournisseurs/fournisseurs-client.tsx, docs/wiki/achats.md, docs/wiki/bons-commande.md, docs/wiki/devis.md, docs/wiki/export.md, docs/wiki/fournisseurs.md, docs/wiki/inventaire.md, docs/wiki/tresorerie.md, docs/wiki/audit-facturapro-suivi.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Frontend | p2-7-lot1-effets/P2-7 | Lot 1 (pilote) de `P2-7` — module Effets sans `useEffect` non justifié (audit `AUDIT-FACTURAPRO.md` §6) | components/effets/apercu-effet-dialog.tsx, hooks/use-effets.ts, components/effets/effets-client.tsx, docs/wiki/tresorerie.md, docs/wiki/audit-facturapro-suivi.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Backend | p1-4-cloture/P1-4 | Clôture de `P1-4` (audit `AUDIT-FACTURAPRO.md` §6) — validation utilisateur des 3 points suivants ce jour, exécution stricte de ceux-ci uniquement | check-ngp.ts (supprimé), zod-test.ts (supprimé), app/api/rapports/inventaire/route.ts, prisma/seed-effets.ts, docs/wiki/audit-facturapro-suivi.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | General | p1-4-purge-any/P1-4 | Lot final de P1-4 (audit `AUDIT-FACTURAPRO.md` §6) — purge des 12 dernières occurrences `@typescript-eslint/no-explicit-any` dans 8 fichiers | check-ngp.ts, zod-test.ts, prisma/seed-effets.ts, lib/export-csv.ts, components/exports/export-list-columns.tsx, components/customizer/canvas/design-canvas.tsx, lib/customizer/export/generate-fiche.ts, lib/customizer/export/production-export.ts, docs/wiki/export.md, docs/wiki/production.md, docs/wiki/audit-facturapro-suivi.md, docs/wiki/CHANGELOG.md |
| 2026-09-28 | Backend | cron-whitelist/P1-5 | Documentation uniquement — 0 fichier `.ts`/`.tsx` modifié, 0 ligne de code applicatif | docs/wiki/auth.md, docs/wiki/dashboard-rapports.md, docs/wiki/CHANGELOG.md, docs/wiki/audit-facturapro-suivi.md |
| 2026-09-28 | Backend | setup-company/P1-5 | Migration du 1 fichier / 1 handler restant hors groupes métier vers le wrapper `lib/api-route.ts` — sous-groupe 7a de P1-5 (audit transverse) : `app/api/setup/company/route.ts` (POST, onboarding société). | app/api/setup/company/route.ts, docs/wiki/auth.md, docs/wiki/CHANGELOG.md, docs/wiki/audit-facturapro-suivi.md |
| 2026-09-28 | Backend | groupe6-extract-taux-userco/P1-5 | Migration des 6 fichiers / 6 handlers restants « hors groupes » vers le wrapper `lib/api-route.ts` — Groupe 6 (dernier) de P1-5 (audit transverse), sous décision Option A″ validée par l'utilisateur. | app/api/achats/extract/route.ts, app/api/bons-commande/extract/route.ts, app/api/bons-commande/[id]/detail/extract/route.ts, app/api/effets/check-echeances/route.ts, app/api/rapports/inventaire/route.ts, app/api/user/companies/route.ts, docs/wiki/achats.md, docs/wiki/bons-commande.md, docs/wiki/tresorerie.md, docs/wiki/dashboard-rapports.md, docs/wiki/parametres.md, docs/wiki/audit-facturapro-suivi.md |
| 2026-09-28 | Backend | groupe5-users/P1-5 | Migration des 4 fichiers / 7 handlers restants de `app/api/users/` vers le wrapper `lib/api-route.ts` — Groupe 5 (dernier) de P1-5 (audit transverse ; `app/api/users/route.ts` était déjà wrappé, inchangé). | app/api/users/[id]/route.ts, app/api/users/me/route.ts, app/api/users/me/password/route.ts, app/api/users/resend-invitation/route.ts, docs/wiki/auth.md, docs/wiki/audit-facturapro-suivi.md |
| 2026-09-30 | Frontend | p2-8-hooks-inline/P2-8 | Refactor `P2-8` (audit `AUDIT-FACTURAPRO.md` §6) — extraction des 12 sites `useQuery` / `useMutation` / `fetch()` inline des 4 fichiers `components/effets/nouvel-effet-client.tsx`, `components/cheques/nouveau-cheque-dialog.tsx` … | hooks/use-effets.ts, hooks/use-companies.ts, hooks/use-company-query.ts, hooks/use-produits.ts, hooks/use-product-variants.ts, components/effets/nouvel-effet-client.tsx, components/cheques/nouveau-cheque-dialog.tsx, components/entreprises/entreprise-detail-client.tsx, components/produits/produit-form-page.tsx, docs/wiki/CHANGELOG.md, docs/wiki/tresorerie.md, docs/wiki/inventaire.md, docs/wiki/parametres.md |
| 2026-09-30 | General | tsc-fix-et-centralisation-types | Correction des 5 erreurs `tsc` préexistantes (audit hors périmètre) + centralisation des types dupliqués atelier dans `lib/types/` | hooks/use-devis.ts, hooks/use-effets.ts, lib/types/product.ts, lib/types/ordre-fabrication.ts, lib/types/design.ts, lib/types/packing-list.ts, lib/types/index.tsx, components/atelier/ordres-fabrication-client.tsx, components/atelier/modeles-client.tsx, components/atelier/nouveau-of-dialog.tsx, components/atelier/packing-list-client.tsx, components/planning/planning-client.tsx, docs/wiki/CHANGELOG.md, docs/wiki/production.md |
| 2026-10-01 | Frontend | p2-10-decoupe/P2-10 | Découpe de `components/effets/nouvel-effet-client.tsx` (1141 → 66 lignes, −94 %) | components/effets/nouvel-effet-client.tsx (1141 → 66), components/effets/use-nouvel-effet.ts (337, créé), components/effets/effet-form-utils.ts (49, créé), components/effets/effet-split-logic.ts (146, créé), components/effets/nouvel-effet-{parties,main-column,sidebar,split-dialog}.tsx (177 / 82 / 161 / 303, créés), components/effets/split-row-echeance-collision.tsx (43, créé), components/effets/nouvel-effet-actions.tsx (67 → 74), lib/stores/effet-form-store.ts (41, créé) |
| 2026-10-01 | Frontend | p2-9-useMutation/P2-9 | Refactor `P2-9` (audit `AUDIT-FACTURAPRO.md` §6) — migration des `fetch()` bruts de `components/auth/login-form.tsx` et `components/parametres/securite-settings-client.tsx` vers `useMutation` TanStack Query | hooks/use-login.ts (créé), hooks/use-users-mutations.ts, components/auth/login-form.tsx, components/parametres/securite-settings-client.tsx |
| 2026-10-02 | Frontend | p2-12-confirm-delete/P2-12 | 6 confirmations de suppression artisanales `AlertDialog` remplacées par la brique de référence `components/confirm-delete-dialog.tsx` | components/confirm-delete-dialog.tsx (58 → 60 l., extension), components/atelier/modeles-client.tsx, components/atelier/ordres-fabrication-client.tsx (bloc suppression seul), components/atelier/packing-list-client.tsx, components/bons-commande/bons-commande-client.tsx, components/parametres/carton-types-manager.tsx, components/planning/planning-client.tsx |
| 2026-10-02 | Frontend | p2-11-entity-dialog/P2-11 | Décision B = SUPPRIMER `components/shared/entity-dialog.tsx` | components/shared/entity-dialog.tsx (50 l., supprimé ; 4 siblings `form-actions.tsx`, `line-items-table.tsx`, `product-select.tsx`, `variant-select.tsx` intacts), docs/wiki/ui-dialogs.md (créé), docs/wiki/README.md (ligne d'index), docs/wiki/CHANGELOG.md (cette entrée), docs/wiki/audit-facturapro-suivi.md (ligne P2-11 → ✅, Bilan, Prochaine étape) |
| 2026-10-08 | Backend | p3-14-tests-financiers/P3-14 | tests de la logique financière + 3 correctifs `lib/decimal.ts` validés par l'utilisateur + exclusion `.opencode` de vitest | lib/decimal.ts (202 → 217 l., 3 correctifs), vitest.config.ts (1 l., exclude), lib/__tests__/decimal.test.ts (260 → 306 l., 54 → 69 tests + purge de 4 `as any`), lib/__tests__/calc-line-totals.test.ts (créé, 247 l., 17 tests), lib/__tests__/effet-split-logic.test.ts (créé, 365 l., 32 tests), lib/__tests__/pdf-numbers.test.ts (créé, 46 l., 9 tests), lib/__tests__/tmm-bct.test.ts (créé, 49 l., 6 tests) |
| 2026-10-08 | Frontend | p2-13-toast-wrapper/P2-13 | wrapper de toast centralisé et typé `lib/toast.ts` créé + 7 fichiers migrés (0 ligne de JSX, 0 texte modifié) | lib/toast.ts (29 l., créé), lib/api-error.ts (44 → 71 l.), hooks/use-users-mutations.ts (200 → 181 l.), components/parametres/securite-settings-client.tsx, components/achats/nouvel-achat-actions.tsx, components/achats/scan-verification-form.tsx, components/bons-livraison/nouveau-bl-actions.tsx, components/devis/nouveau-devis-actions.tsx, components/factures/nouvelle-facture-actions.tsx |
| 2026-10-09 | Backend | lot-b3-backfill-a-prime/Prompt-B | Backfill a′ (option approuvée par l'utilisateur) — clôture S-4 du lot B3 | `scripts/dev/backfill-dashboard-search-permissions.ts`, `docs/wiki/auth.md` § S-4 (« Backfill a′ — exécuté le 2026-10-09 »), cette entrée CHANGELOG. |
| 2026-10-09 | Backend | lot-b3-permissions-s4/Prompt-B | Lot B3 (P0) — S-4 permissions manquantes | `lib/permissions.ts`, `app/api/tresorerie/route.ts`, `app/api/tresorerie/evolution/route.ts`, `app/api/dashboard/route.ts`, `app/api/search/route.ts`, `app/api/stock-mouvements/route.ts`, `app/api/effets/{check-echeances,documents-lies,echeance-collision,echeances-a-venir,splits,suggest-echeances}/route.ts`, fiche module `docs/wiki/auth.md` § S-4 — renforcements 2026-10 (lot B3), cette entrée CHANGELOG. Aucun commit (orchestration Governor). |
| 2026-10-09 | Backend | lot-b2-arbitrage-avoirs-id | Arbitrage Governor — S-2 isolation `app/api/avoirs/[id]/route.ts` | `app/api/avoirs/[id]/route.ts` ; classification `docs/wiki/audit-scope-multi-societe.md` §7.1/§7.4 ; Known Issue CHANGELOG mise à jour. |
| 2026-10-09 | Backend | lot-b2-isolation-paiements/Prompt-B | Lot B2 (P0) — S-2 isolation multi-société des paiements | `lib/invoice-payment.ts`, `app/api/payments/route.ts`, `app/api/effets/[id]/route.ts`, `app/api/cheques/[id]/encaisser/route.ts`, `app/api/effets/splits/route.ts`, `app/api/ngp-codes/[id]/route.ts`, `app/api/carton-types/[id]/route.ts`, `lib/__tests__/payments-isolation.test.ts` ; fiche module `docs/wiki/tresorerie.md` § B2 ; classification `docs/wiki/audit-scope-multi-societe.md` §7. |
| 2026-10-09 | Backend | lot-b1-securite-sessions/Prompt-B | Lot B1 du Prompt B (P0 sécurité applicative) — S-1 salt JWT dérivé du nom du cookie + S-3 session périmée (lastActivity) avec relecture DB cacheée ≤ 30 s | lib/session-token.ts (créé), lib/session-cache.ts (créé), lib/session.ts (getSessionFromRequest réécrit), proxy.ts (salt dérivé), app/api/users/[id]/route.ts, app/api/users/me/route.ts, app/api/users/me/password/route.ts, app/api/users/resend-invitation/route.ts, app/api/users/verify-email/route.ts, app/api/setup/company/route.ts (invalidations), lib/__tests__/session-token.test.ts (créé), docs/wiki/auth.md (§ Durcissement des sessions — Lot B1), docs/wiki/CHANGELOG.md (cette entrée) |
| 2026-10-09 | General | lot-a-hygiene/Prompt-A | clôture du Prompt A (P0) du chantier audit 2026-10-07 — hygiène de dépôt | gitignore (ligne `/prisma/migrations` supprimée), prisma/migrations/ (20 fichiers ajoutés à l'index), 9 fichiers racine supprimés (disque + index), public/uploads/ (11 fichiers désindexés, disque conservé), docs/wiki/audit-2026-10-suivi.md (créé — tableau prompts A→M), docs/wiki/CHANGELOG.md (cette entrée), docs/wiki/README.md (ligne d'index) |
| 2026-10-14 | Backend | lot-c2-server-action/Prompt-C | Lot C2 (backend du P0 Authentification) — Server Action de login + `__session-marker` httpOnly signé, codes d'erreur structurés, durcissement du proxy | `lib/session-marker.ts`, `lib/auth-errors.ts`, `app/(auth)/login/login-action.ts`, `proxy.ts`, `lib/auth.ts`, `lib/session-token.ts`, `app/api/users/check-status/route.ts`, `lib/bootstrap.ts`, `app/(app)/layout.tsx`, fiche `docs/wiki/auth.md`. |
| 2026-10-14 | Backend | lot-c2-correctif-qa-safe-internal-path | Correctif du blocage QA du lot C2 — open-redirect contournable dans `safeInternalPath` (tripliqué) | `lib/safe-internal-path.ts` (créé), `lib/__tests__/safe-internal-path.test.ts` (créé), `proxy.ts`, `app/(auth)/login/login-action.ts`, `app/(auth)/login/page.tsx`, `lib/__tests__/proxy-authz.test.ts`, `docs/wiki/auth.md`, cette entrée. |
| 2026-10-14 | Frontend | lot-c3-login/Prompt-C | Lot C3 (frontend du P0 Authentification) — login par Server Action + écran de progression à jalons réels | `hooks/use-login.ts`, `hooks/use-auth.ts` (créé), `lib/stores/auth-progress-store.ts` (créé), `components/auth/auth-progress-screen.tsx` (créé), `components/auth/login-form.tsx`, `components/auth/register-form.tsx`, `app/(auth)/verify-email/page.tsx`, `lib/providers/session-provider.tsx`, `app/(app)/loading.tsx`, `components/dashboard/dashboard-client.tsx`, `hooks/use-dashboard.ts`, `hooks/use-user-companies.ts`, `docs/wiki/auth.md`, cette entrée. |
| 2026-10-14 | Governor | decisions-bloquantes-2026-10-14 | Les deux décisions bloquantes ouvertes au 2026-10-09 sont levées | `docs/wiki/CHANGELOG.md` (Known Issues + cette entrée), `graphify-out/graph.json` (+ backup `graphify-out/2026-10-14/`), `.env` (hors repo, gitignoré). |
| 2026-10-15 | Governor | prompt-c-cloture/Prompt-C | Clôture du Prompt C — P0 Authentification | `proxy.ts`, `lib/session-marker.ts`, `lib/auth-errors.ts`, `lib/safe-internal-path.ts`, `app/(auth)/login/login-action.ts`, `lib/auth.ts`, `hooks/use-login.ts`, `hooks/use-auth.ts`, `lib/stores/auth-progress-store.ts`, `components/auth/{login-form,auth-progress-screen}.tsx`, fiche `docs/wiki/auth.md`. |
| 2026-10-16 | Backend | lot-d2-tresorerie-corrections/D2 | Cycle de correction D2 (trésorerie) — 4 défauts du lot D2 (APPROVE AVEC RÉSERVES par le QA) + 2 garde-fous d'arbitrage | `lib/tresorerie/source-keys.ts`, `lib/__tests__/tresorerie-{source-keys,compute,ledger}.test.ts`, `app/api/cheques/[id]/{annuler,rejeter}/route.ts`, `components/paiements/tresorerie-client.tsx`, `docs/wiki/tresorerie.md`, `docs/wiki/CHANGELOG.md` |
| 2026-10-16 | Backend | lot-d2-tresorerie/D2 | Lot D2 (P1 Trésorerie) — le ledger `MouvementTresorerie` devient la source unique des soldes et il est écrit à chaque point de mutation métier | `lib/tresorerie/{compute,ledger,sens,source-keys}.ts`, `lib/types/tresorerie.ts`, `lib/invoice-payment.ts`, `app/api/payments/[id]/route.ts`, `app/api/cheques/`, `app/api/effets/`, `app/api/avoirs/[id]/route.ts`, `app/api/tresorerie/{route,evolution/route}.ts`, `lib/__tests__/tresorerie-*.test.ts` |
| 2026-10-16 | Database | lot-d1-modele-donnees/Prompt-D1 | Lot D1 (P1 Trésorerie) — modèle de données + script de backfill idempotent en dry-run | `prisma/schema.prisma`, `prisma/migrations/20261016190215_add_tresorerie_ledger/`, `prisma/migrations/20261016192747_add_a_qualifier_statut_mouvement/`, `prisma/backfill-mouvements-tresorerie.ts`, `docs/wiki/tresorerie.md` § D1, cette entrée. |
| 2026-10-17 | Governor | suivi-audit-2026-10-coherence | Correction des incohérences de la fiche de suivi `docs/wiki/audit-2026-10-suivi.md` | `docs/wiki/audit-2026-10-suivi.md`, `docs/wiki/CHANGELOG.md` |
| 2026-10-18 | Frontend | lot-f4-alert-confirm-catch/F | Prompt F, lot F.4 (dernier) — élimination de tous les `alert()`/`confirm()` natifs + traitement des `catch` vides | `components/effets/nouvel-effet-actions.tsx`, `components/effets/use-nouvel-effet.ts`, `components/effets/nouvel-effet-split-dialog.tsx`, `components/exports/export-detail-client.tsx`, `components/parametres/ngp-settings-client.tsx`, `components/parametres/utilisateurs-settings-client.tsx`, `components/produits/produit-form-page.tsx`, `components/produits/produit-variants-section.tsx`, `app/actions/companies.ts`, `app/actions/products.ts`, `app/api/packing-list/[id]/route.ts`, `app/api/products/[id]/{fiche-technique,fiches/[ficheId],photo}/route.ts`, `app/api/quotes/[id]/convert/route.ts`, `components/confirm-delete-dialog.tsx` (brique réutilisée), `docs/wiki/notifications.md` §9, `docs/wiki/tresorerie.md`, `docs/wiki/export.md`, `docs/wiki/parametres.md`, `docs/wiki/inventaire.md` |
| 2026-10-18 | Frontend | lot-f3b-sonner-migration-final/F | Prompt F, lot F.3b (vague 2/2) — fin de la migration `sonner` → `notify` + bascule de la règle ESLint | les 36 fichiers migrés ci-dessus (imports `@/lib/notify`), `eslint.config.mjs` (règle en `error`), `docs/wiki/notifications.md` §5–§6–§8, `docs/wiki/achats.md`, `docs/wiki/devis.md`, `docs/wiki/facturation.md` |
| 2026-10-18 | Frontend | lot-f3a-sonner-migration/F | Prompt F, lot F.3a (vague 1/2) — migration des appels `sonner` vers `notify` | les 28 fichiers migrés ci-dessus (imports `@/lib/notify`), `docs/wiki/notifications.md` §6–§7, `docs/wiki/bons-commande.md`, `docs/wiki/inventaire.md`, `docs/wiki/parametres.md` |
| 2026-10-18 | Frontend | lot-f2-etats-ux/F | Prompt F, lot F.2 — états de chargement / erreur / vide + pages d'erreur Next.js | `components/shared/error-state.tsx`, `components/shared/list-skeleton.tsx`, `components/shared/detail-skeleton.tsx`, `components/shared/chart-error-boundary.tsx`, `app/not-found.tsx`, `app/global-error.tsx`, `app/(app)/{factures,clients,fournisseurs,achats,paiements,effets,cheques,produits,stock-mouvements}/{loading,error}.tsx`, `app/(app)/{factures,clients,fournisseurs,produits,effets,achats}/[id]/loading.tsx`, `components/paiements/tresorerie-client.tsx`, `components/produits/produit-detail-client.tsx`, `docs/wiki/ui-kit.md` §H.15, `docs/wiki/notifications.md` §6 |
| 2026-10-18 | Frontend | lot-f1-notify-socle/F | Prompt F, lot F.1 — socle des notifications | `lib/notify.ts`, `components/shared/app-toast.tsx`, `lib/api-error.ts`, `lib/api-client.ts`, `lib/toast.ts` (supprimé), `lib/__tests__/notify.test.ts`, `eslint.config.mjs`, 10 consommateurs migrés (`app/(auth)/verify-email/page.tsx`, `components/auth/login-form.tsx`, `components/auth/register-form.tsx`, `components/parametres/securite-settings-client.tsx`, `hooks/use-users-mutations.ts`, `components/achats/nouvel-achat-actions.tsx`, `components/achats/scan-verification-form.tsx`, `components/bons-livraison/nouveau-bl-actions.tsx`, `components/devis/nouveau-devis-actions.tsx`, `components/factures/nouvelle-facture-actions.tsx`), `docs/wiki/notifications.md` |
| 2026-10-18 | Governor | prompt-g-regles-documentaires/G | Prompt G, étape 5 — 2 règles documentaires validées par l'utilisateur et appliquées | `docs/wiki/ui-dialogs.md`, `AGENTS.md`, `docs/wiki/CHANGELOG.md` |
| 2026-10-18 | Frontend | lot-g6-kit-cloture/G | Prompt G — P2, lot de clôture G.6 : retrait de `FilterBar` + migration d'`avoir-dialog` vers `EntityFormDialog` | `components/avoirs/avoir-dialog.tsx`, `components/shared/filter-bar.tsx` (supprimé), `components/shared/entity-form-dialog.tsx` (lu, inchangé), `docs/wiki/ui-kit.md` §H.13–H.14 (+ §D/§E/§G/§H.1/§H.7/§H.9/§H.11 referencés au retrait) |
| 2026-10-18 | Frontend | lot-g4b-kit-adoption/G | Prompt G — P2, étape 4, lot 2/2 : migration des modules factures / effets vers les briques `components/shared/` | `components/factures/{facture-detail-actions,factures-client,facture-detail-client,facture-detail-info,facture-detail-lines,facture-detail-sidebar,payment-dialog,nouvelle-facture-client,invoice-form-bc-vise,floating-alert}.tsx`, `components/effets/{effets-client,impression-effets-client,effet-detail-client,nouvel-effet-sidebar,apercu-effet-dialog,nouvel-effet-split-dialog}.tsx`, `docs/wiki/ui-kit.md` §H.11–H.12 |
| 2026-10-18 | Frontend | lot-g4a-kit-adoption/G | Prompt G — P2, étape 4, lot 1/2 : migration des modules clients / fournisseurs / achats vers les briques `components/shared/` | `components/clients/{clients-client,client-detail-client,client-dialog,client-solde,client-document,client-profile-header,credit-limit-dialog}.tsx`, `components/fournisseurs/{fournisseurs-client,fournisseur-detail-client,fournisseur-dialog,fournisseur-solde,fournisseur-document,fournisseur-echeances-card,fournisseur-profile-header}.tsx`, `components/achats/{achats-client,achat-detail-client,achat-detail-sidebar,achat-detail-actions,nouvel-achat-client,manual-entry-form,achat-form-lines}.tsx`, `docs/wiki/ui-kit.md` §H.9–H.10 |
| 2026-10-18 | Frontend | prompt-g-p2-etapes-2-3/UI-kit | Prompt G — P2, étapes 2 et 3 : kit de composants partagés + suppression des formats locaux | — |
| 2026-10-19 | Governor | diag-login-plugins/G | Diagnostic utilisateur (« 2 plugins en status failed » + « chargement bloqué à 95 % après login, dashboard jamais chargé ») puis 3 correctifs délégués | `.opencode/plugins/graphify.js`, `.opencode/opencode.json`, `lib/safe-internal-path.ts` (`DEFAULT_POST_LOGIN_ROUTE`), `app/(auth)/login/login-action.ts`, `app/(auth)/login/page.tsx`, `proxy.ts`, `hooks/use-login.ts` (`NAVIGATION_TIMEOUT_MS`, `awaitNavigationCommit`), `components/auth/login-form.tsx`, `lib/stores/auth-progress-store.ts`, `lib/__tests__/proxy-authz.test.ts`, `lib/__tests__/safe-internal-path.test.ts`, `docs/wiki/auth.md` |
| 2026-10-20 | Frontend | lot-d32-ui-tresorerie/Prompt-D3 | Prompt D3 — Écran trésorerie : découpage UI en 13 fichiers ≤ 250 lignes, 2 briques partagées extraites, calculs de présentation externalisés | `components/paiements/` (13 fichiers : `tresorerie-client.tsx`, `paiements-client.tsx`, `paiements-columns.tsx`, `statut-flux-badge.tsx`, `tresorerie-comptes.tsx`, `tresorerie-ventilation.tsx`, `tresorerie-projection.tsx`, `tresorerie-echeances.tsx`, `tresorerie-echeances-calendar.tsx`, `tresorerie-echeances-columns.tsx`, `tresorerie-evolution-chart.tsx`, `tresorerie-recents.tsx`, `tresorerie-paiements-attente.tsx`), `components/shared/mode-reglement-badge.tsx`, `components/shared/flux-colors.ts`, `lib/tresorerie/presentation.ts`, `lib/__tests__/tresorerie-presentation.test.ts`, `hooks/use-tresorerie.ts`, `hooks/use-payments-queries.ts`, `docs/wiki/tresorerie.md`, `docs/wiki/ui-kit.md` |
| 2026-10-20 | Backend | lot-d31-api-tresorerie/Prompt-D3 | Prompt D3 — API trésorerie : filtre par compte, échéancier « en retard », route PATCH compte | `app/api/tresorerie/route.ts` (`compteQuerySchema`, `filtreCompteType`/`filtreMouvement`/`filtreInstrument`, échéancier sans `gte: now`, `parCompte` en mapping explicite), `app/api/tresorerie/comptes/[id]/route.ts` (nouvelle route PATCH), `lib/tresorerie/ledger.ts` (`typeComptePour`), `lib/tresorerie/compute.ts` (`soldeReel`, `enRetard`), `lib/types/tresorerie.ts` (`TresorerieCompte`, `TresorerieData`), `lib/__tests__/tresorerie-echeancier-retard.test.ts`, `docs/wiki/tresorerie.md` |
| 2026-10-20 | Backend | fix-login-marker-page/G | Correctif du défaut « page /login redirige sans vérifier le __session-marker » | `lib/session-marker.ts` (`markerSatisfied`), `proxy.ts`, `app/(auth)/login/page.tsx`, `lib/__tests__/session-marker.test.ts`, `docs/wiki/auth.md` |
| 2026-10-21 | Frontend | fix-ordre-providers-queryclient/Prompt-C2bis | Correctif du 500 sur `/login` — « No QueryClient set, use QueryClientProvider to set one » | `app/layout.tsx` (ordre des providers + commentaire d'ordre obligatoire), `lib/providers/query-provider.tsx`, `lib/providers/session-provider.tsx` (monte `AutoLogout`), `docs/wiki/auth.md` |
| 2026-10-21 | Backend | fix-marker-rotation-claims/Prompt-C2bis | Correctif du défaut « connexion bloquée à 95 % / Redirection interrompue » à chaque tentative (rememberMe=false) | `lib/session-marker.ts` (`canonicalBinding`, `tokenBinding`, `createSessionMarker`, `verifySessionMarker`, `markerSatisfied` inchangée), `app/(auth)/login/login-action.ts` (`decodeSessionToken`, garde-fou « jamais d'échec de connexion »), `lib/__tests__/session-marker.test.ts` (test pivot rotation token_v1 → token_v2), `lib/__tests__/proxy-authz.test.ts`, `docs/wiki/auth.md` |
| 2026-10-22 | Backend | lot-e2a-schemas-identite/E | Migration Annexe A « identité / paramètres / catalogue » vers `schema` (Prompt E, exigence 6) | `lib/schemas/company.ts` (nouveau), `lib/schemas/user.ts` (nouveau), `lib/schemas/auth.ts` (nouveau), `lib/schemas/ngp-code.ts` (nouveau), `lib/schemas/notification.ts` (nouveau), `app/api/companies/route.ts`, `app/api/companies/[id]/route.ts`, `app/api/users/route.ts`, `app/api/users/[id]/route.ts`, `app/api/users/me/route.ts`, `app/api/users/me/password/route.ts`, `app/api/users/resend-invitation/route.ts`, `app/api/settings/route.ts`, `app/api/notifications/route.ts`, `app/api/setup/company/route.ts`, `app/api/ngp-codes/route.ts`, `app/api/ngp-codes/[id]/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/resend-code/route.ts`, `app/api/users/verify-email/route.ts`, `docs/wiki/parametres.md`, `docs/wiki/auth.md`, `docs/wiki/dashboard-rapports.md` |
| 2026-10-22 | Backend | lot-e1-api-route-hardening/E | Durcissement `lib/api-route.ts` (Prompt E) | `lib/api-route.ts` (union discriminée, 422, 500 générique + requestId), `lib/logger.ts` (nouveau), `lib/__tests__/api-route.test.ts` (nouveau), `app/api/auth/logout/route.ts`, `app/api/companies/route.ts`, `app/api/company-bank-accounts/route.ts`, `app/api/notifications/route.ts`, `app/api/products/next-code/route.ts`, `app/api/setup/company/route.ts`, `app/api/upload/route.ts`, `app/api/user/companies/route.ts`, `app/api/users/[id]/route.ts`, `app/api/users/me/route.ts`, `app/api/users/me/password/route.ts`, `app/api/users/resend-invitation/route.ts`, `app/api/users/route.ts`, `docs/wiki/auth.md` |
| 2026-10-23 | Frontend | lot-e2g-w3-cast-resolver/E | Correctif unique du finding W3 de la revue `qa` (lot E2f) — suppression du cast masquant `zodResolver(createUserSchema) as unknown as Resolver<CreateUserLoginFormValues>` dans `create-user-dialog.tsx` | `components/settings/utilisateurs/create-user-dialog.tsx`, `components/settings/utilisateurs/create-user-login-fields.tsx`, `components/settings/utilisateurs/create-user-companies-section.tsx`, `docs/wiki/auth.md` (§ E2g), `docs/wiki/parametres.md` (§ E2f corrigé), `docs/wiki/CHANGELOG.md` |
| 2026-10-23 | Backend | lot-e6-cloture-check-rules/E | clôture du Prompt E — `node scripts/check-rules.mjs` passe de 3 violations / `exit 1` à VIOLATIONS (0) / `exit 0` | `lib/schemas/carton-type.ts` (nouveau), `app/api/carton-types/route.ts`, `app/api/carton-types/[id]/route.ts`, `scripts/check-rules.mjs` (`WHITELIST_VALIDATION`, `bodyReadIgnored()`, fixtures m/n/o), `docs/wiki/auth.md` (§ check-rules), `docs/wiki/CHANGELOG.md` |
| 2026-10-23 | Backend | lot-e5-check-rules/E | `scripts/check-rules.mjs` — contrôleur de règles des routes `app/api` (exigence 9 du Prompt E, `PROMPTS-GOVERNOR-FACTURAPRO.md:230`, audit §6.3-6) | `scripts/check-rules.mjs` (nouveau, 847 lignes — `WHITELIST_NO_WRAPPER` = source unique de la liste blanche, `analyze()` = cœur testable, `runSelfTest()` = 12 fixtures en mémoire), `package.json` (ajout `"check-rules": "node scripts/check-rules.mjs"`), `docs/wiki/auth.md` (nouvelle section « Contrôle automatisé des règles des routes »), `docs/wiki/CHANGELOG.md` |
| 2026-10-23 | Backend | lot-e4-cron-auth/E | Durcissement « échec fermé » des 3 routes `app/api/cron/*` (audit §3 S-8, Prompt E exigence 5) | `lib/cron-auth.ts` (nouveau), `lib/__tests__/cron-auth.test.ts` (nouveau, 26 tests), `app/api/cron/check-echeances/route.ts`, `app/api/cron/check-echeances/relance-ecart-bc/route.ts`, `app/api/cron/tmm-bct/route.ts`, `docs/wiki/dashboard-rapports.md` (§ Whitelist `cron/*` + § Durcissement E4 + conséquence de déploiement) |
| 2026-10-23 | Frontend | lot-e2c-schema-partage-formulaires/E | Cycle de correction 6c — branchement des formulaires consommateurs des routes migrées par E2a sur les schémas partagés `lib/schemas/*` | components/auth/register-form.tsx, components/entreprises/create-company-dialog.tsx, components/entreprises/entreprise-detail-client.tsx, components/settings/utilisateurs/create-user-dialog.tsx, components/settings/utilisateurs/create-user-login-fields.tsx (type `CreateUserLoginFormValues` dérivé de `CreateUserInput`), components/settings/utilisateurs/edit-user-dialog.tsx, components/parametres/profil-settings-client.tsx, components/parametres/securite-settings-client.tsx, components/parametres/ngp-settings-client.tsx, components/setup/company-setup-form.tsx, docs/wiki/auth.md, docs/wiki/parametres.md |
| 2026-10-23 | Backend | lot-e2b-schemas-financiers/E | Annexe A « groupe financier » — migration des 9 routes restantes vers le paramètre `schema:` du wrapper `lib/api-route.ts` | lib/schemas/document-updates.ts (nouveau), app/api/invoices/[id]/route.ts, app/api/quotes/[id]/route.ts, app/api/quotes/[id]/convert/route.ts, app/api/bons-commande/[id]/route.ts, app/api/avoirs/[id]/route.ts, app/api/achats/[id]/route.ts, app/api/bons-livraison/[id]/route.ts, app/api/products/[id]/stock-movements/route.ts, app/api/payments/[id]/route.ts, docs/wiki/facturation.md, docs/wiki/devis.md, docs/wiki/achats.md, docs/wiki/bons-commande.md, docs/wiki/inventaire.md, docs/wiki/tresorerie.md |
| 2026-10-23 | Backend | lot-e3-cles-api-chiffrement/E | clés API `AppSettings` — garde-fou `••••`, masquage exhaustif, Zod sur le PUT, chiffrement AES-256-GCM au repos + backfill | lib/api-keys-crypto.ts (nouveau), lib/schemas/settings.ts (nouveau), scripts/dev/backfill-chiffrement-cles-api.ts (nouveau), lib/__tests__/api-keys-crypto.test.ts (nouveau), lib/api-keys.ts, app/api/settings/app/route.ts, docs/wiki/parametres.md |
| 2026-10-23 | Frontend | lot-e2f-correctifs-qa/E | Cycle de correction QA du Prompt E — 2 BLOQUANTS + 3 WARNINGS de la revue `qa` du 2026-10-23 | components/setup/company-setup-form.tsx, components/parametres/profil-settings-client.tsx, components/parametres/securite-settings-client.tsx, components/settings/utilisateurs/edit-user-dialog.tsx, hooks/use-companies.ts (useSetupCompany), hooks/use-users-mutations.ts (useUpdateProfil), hooks/use-users.ts (useProfilQuery), docs/wiki/auth.md, docs/wiki/parametres.md |
| 2026-10-24 | Frontend | lot-h0-query-keys/H | Socle W0 — registre central des query keys + convention toasts écrite | lib/query-keys.ts (nouveau), docs/wiki/query-keys.md (nouveau), docs/wiki/CHANGELOG.md |
| 2026-10-24 | Backend | lot-h1-server-actions/H | suppression du tour HTTP des server actions — les 13 `fetch()` (12 dans `app/actions/bons-commande.ts`, 1 dans `app/actions/achats.ts`) remplacés par des appels directs de services `lib/` partagés avec les routes API | app/actions/bons-commande.ts, app/actions/achats.ts, lib/service-error.ts (nouveau), lib/service-route.ts (nouveau), lib/bon-commande/create.ts (nouveau), lib/bon-commande/update.ts (nouveau), lib/bon-commande/detail.ts (nouveau), lib/bon-commande/detail-extract.ts (nouveau), lib/bon-commande/extract.ts (nouveau), lib/bon-livraison/create.ts (nouveau), lib/invoice/create.ts (nouveau), lib/achats/extract.ts (nouveau), app/api/bons-commande/route.ts, app/api/bons-commande/[id]/route.ts, app/api/bons-commande/[id]/detail/route.ts, app/api/bons-commande/[id]/detail/extract/route.ts, app/api/bons-commande/extract/route.ts, app/api/achats/extract/route.ts, app/api/bons-livraison/route.ts, app/api/invoices/route.ts, lib/session.ts, lib/stores/achats-store.ts, lib/stores/bons-commande-store.ts, docs/wiki/bons-commande.md, docs/wiki/achats.md, docs/wiki/facturation.md, docs/wiki/CHANGELOG.md |
| 2026-10-24 | Frontend | lot-h3-produits/H | vague W3 — les 5 composants `components/produits/` qui transportaient leur état serveur perdent leurs `fetch()`/`useQuery`/`useMutation`/`useQueries` inline (13 sites) au profit de hooks `hooks/`, avec ZÉRO changement visuel et … | hooks/use-product-suppliers.ts (nouveau), hooks/use-product-fiche-technique.ts, hooks/use-product-variants.ts, hooks/use-products-for-labels.ts, components/produits/product-suppliers-section.tsx, components/produits/product-supplier-price-history.tsx, components/produits/product-supplier-comparison.tsx, components/produits/product-fiches-list.tsx, components/produits/etiquettes-produits-dialog.tsx, docs/wiki/inventaire.md (§ Lot H W3), docs/wiki/query-keys.md (§4 état), docs/wiki/CHANGELOG.md |
| 2026-10-24 | Frontend | lot-h2-parametres-entreprises/H | vague W2 — les 5 composants `components/parametres/` + `components/entreprises/` qui transportaient leur état serveur (12 sites `fetch()`/`useQuery`/`useMutation` inline : 3 + 2 + 1 + 5 + 1) les délèguent à des hooks, avec ZÉRO … | hooks/use-company-bank-accounts.ts (nouveau), hooks/use-settings.ts, hooks/use-users.ts, hooks/use-companies.ts, hooks/use-company-query.ts, hooks/use-effets.ts, components/parametres/general-settings-client.tsx, components/parametres/facturation-settings-client.tsx, components/parametres/utilisateurs-settings-client.tsx, components/entreprises/entreprise-banques-client.tsx, components/entreprises/entreprises-list-client.tsx, components/entreprises/entreprise-detail-client.tsx, lib/query-keys.ts, docs/wiki/parametres.md (§ Lot H W2), docs/wiki/query-keys.md (§4 état), docs/wiki/CHANGELOG.md |
| 2026-10-24 | Frontend | lot-h4-vagues-finales/H | vague W4 FINALE — `components/` et `app/` (hors `app/api`) passent à ZÉRO `fetch()` et ZÉRO `useQuery`/`useMutation`/`useQueries` inline | hooks/use-customizer-init.ts (nouveau), hooks/use-global-search.ts (nouveau), hooks/use-notifications.ts, hooks/use-effets.ts, hooks/use-ordres-fabrication.ts, hooks/use-devis.ts, hooks/use-achats-queries.ts, hooks/use-bl.ts, components/customizer/customizer-studio.tsx, components/layout/notifications-popover.tsx, components/effets/impression-effets-client.tsx, components/command-palette.tsx, components/atelier/nouveau-of-dialog.tsx, components/devis/nouveau-devis-client.tsx, components/achats/scan-upload-screen.tsx, components/bons-livraison/nouveau-bl-client.tsx, docs/wiki/query-keys.md, docs/wiki/notifications.md, docs/wiki/dashboard-rapports.md, docs/wiki/tresorerie.md, docs/wiki/production.md, docs/wiki/devis.md, docs/wiki/achats.md, docs/wiki/CHANGELOG.md |
| 2026-10-25 | Governor | lot-h5-cloture/H | Clôture du Prompt H — statut ❌ → ✅ après revérification indépendante du Governor contre le code réel | `docs/wiki/audit-2026-10-suivi.md`, `docs/wiki/CHANGELOG.md`. *(Exécution réelle 2026-10-25.)* |
| 2026-10-25 | Governor | securisation-git | Sécurisation git complète du dépôt + politique git permanente (décision utilisateur) | `AGENTS.md`, `.gitignore`, `docs/wiki/CHANGELOG.md`. *(Exécution réelle 2026-10-25.)* |

---

## SECTION B — Commits git du 2026-10-25

Les 5 commits du dépôt, tous datés du 2026-10-25 (`git log --format='%h|%ad|%s' --date=short`).

| Hash | Sujet | Fichiers touchés (résumé) | Stat (+/−) |
| --- | --- | --- | --- |
| `e03ceea` | État du projet au 2026-10-25 — chantier audit 2026-10 prompts A→G clôturés | **1 128 fichiers** — premier commit du dépôt (code applicatif + wiki + skills + migrations). Principaux répertoires : `.agents/skills` (178), `app/api` (123), `app/(app)` (97), `components/ui` (60), `docs/wiki` (27), `.opencode/skills` (25), `lib/types` (24), `lib/stores` (24), `lib/__tests__` (24), `components/produits` (23), `prisma/migrations` (22), `components/shared` (20) | **+220 589 / −0** |
| `082f796` | [lot-gouvernance] Politique git : commit + push automatiques à chaque clôture de lot | `AGENTS.md` (1 fichier) | **+10 / −1** |
| `e10012a` | [lot-gouvernance] Wiki : entrée CHANGELOG sécurisation-git + alignement règle commit du suivi | `docs/wiki/CHANGELOG.md`, `docs/wiki/audit-2026-10-suivi.md` | **+3 / −1** |
| `b387719` | [lot-h5-cloture] Prompt H clôturé : revérification Governor + STEP 6 (suivi ❌→✅, bilan 10✅/5❌, baseline lint 385) | `docs/wiki/CHANGELOG.md`, `docs/wiki/audit-2026-10-suivi.md` | **+5 / −3** |
| `a3c55b9` | feat: refactor inventaire and effet detail components | **30 fichiers** : `components/effets/` (8 : `effet-detail-client.tsx` allégé de 624 lignes, + `effet-detail-{dialogs,hero,links,sections,sidebar}.tsx`, `effet-detail-logic.ts`, `use-effet-detail-actions.ts`), `components/produits/` (7 : `produit-form-page.tsx` allégé, + `produit-form-{main-sections,media-sections,section,sidebar,suppliers-section}.tsx`, `produit-variants-section.tsx`), `components/stock/` (6 : `inventaire-client.tsx` allégé, + `inventaire-{charts,kpis,mouvements-section,skeleton,tables}.tsx`), `hooks/` (3 : `use-produit-form.ts`, `use-produit-form-files.ts`, `use-produit-form-suppliers.ts`), `lib/` (4 : `inventaire-logic.ts`, `planning/gantt-layout.ts`, tests `effet-detail-logic.test.ts` + `inventaire-logic.test.ts`), `app/(app)/inventaire/page.tsx`, `eslint.config.mjs` | **+2 708 / −1 872** |
| | **Total des 5 commits** | 1 163 fichiers touchés (cumul, avec doublons éventuels entre commits) | **+223 315 / −1 877** |

### Correspondance commits ↔ entrées wiki

```
$ grep -c 'e03ceea' docs/wiki/CHANGELOG.md
1
$ grep -c '082f796' docs/wiki/CHANGELOG.md
0
$ grep -c 'e10012a' docs/wiki/CHANGELOG.md
0
$ grep -c 'b387719' docs/wiki/CHANGELOG.md
0
$ grep -c 'a3c55b9' docs/wiki/CHANGELOG.md
0
```

- **`e03ceea`** → cité dans l'entrée `[2026-10-25] Governor (securisation-git)` (hash présent 1 fois).
- **`082f796`** et **`e10012a`** → le hash n'est pas cité, mais l'objet des deux commits (politique git permanente ajoutée à `AGENTS.md`, entrée CHANGELOG « sécurisation-git », alignement de la règle de commit dans `docs/wiki/audit-2026-10-suivi.md`) est décrit dans l'entrée `[2026-10-25] Governor (securisation-git)`.
- **`b387719`** → le hash n'est pas cité, mais le sujet reprend mot pour mot l'entrée `[2026-10-25] Governor (lot-h5-cloture/H)` (clôture du Prompt H, suivi ❌→✅, baseline lint 385).
- **`a3c55b9`** → ⚠️ **commit sans entrée wiki (STEP 6 manquant)** : aucune entrée CHANGELOG ne correspond à ce commit. Preuve :

```
$ grep -inE 'a3c55b9|refactor inventaire and effet|inventaire-(charts|kpis|tables|skeleton)\.tsx|use-produit-form|effet-detail-(dialogs|hero|links|sections|sidebar)\.tsx' docs/wiki/CHANGELOG.md
(exit 1 — vide)
```

Le sujet du commit et aucun des 30 fichiers qu'il crée ne figurent dans `docs/wiki/CHANGELOG.md` : le STEP 6 (mise à jour du wiki) n'a pas été fait pour ce commit.

---

## SECTION C — Highlights des lots majeurs

15 paragraphes détaillés, dans l'ordre chronologique, reprenant le détail des entrées correspondantes du changelog.

### 1. P1-4 / P1-5 — purge des `any` et migration des routes vers `lib/api-route.ts`
**Date** : 2026-09-26 → 2026-09-28 (11 entrées)

Deux campagnes transverses de l'audit `AUDIT-FACTURAPRO.md` §6. **P1-4** nettoie le typage : 19 `any` supprimés dans 5 fichiers de l'Atelier/Planning,
puis 20 `any` et 2 directives `eslint-disable` dans le module Avoir, et enfin les 12 dernières occurrences `no-explicit-any` réparties dans 8 fichiers
(lot de clôture validé par l'utilisateur). **P1-5** migre systématiquement les routes vers le wrapper `lib/api-route.ts` par groupes : groupe 1
(8 routes `clients/**`), groupe 2 (5 routes `products/**`), groupe 3 (4 routes `categories/**` + `marques/**`), groupe 4 (4 fichiers / 8 handlers
stock-notifications-companies), groupe 5 (4 fichiers / 7 handlers `users/**`), groupe 6 (6 fichiers hors groupes, sous décision Option A″),
sous-groupe 7a (`setup/company`) et une entrée strictement documentaire pour la whitelist des routes cron. Plusieurs GET sont rendus
authentifiés par décision explicite de l'utilisateur (Option A du 2026-09-27).
**Fichiers clés** : `app/api/clients/**` (8 routes), `app/api/products/**` (5 routes), `app/api/categories/**` + `app/api/marques/**` (4 routes),
`app/api/stock-mouvements/route.ts`, `app/api/notifications/route.ts`, `app/api/companies/[id]/route.ts`, `app/api/users/**` (4 routes),
`app/api/achats/extract/route.ts`, `app/api/setup/company/route.ts`, `docs/wiki/auth.md`, `docs/wiki/audit-facturapro-suivi.md`.

### 2. P2-7 — suppression des `useEffect` non justifiés
**Date** : 2026-09-28 (11 entrées)

Lot transverse le plus dense de la journée, découpé en lots successifs appliqués au périmètre de l'audit §6 : lot 1 pilote (module Effets rendu
sans `useEffect` non justifié), lot 2 (suppression des 12 `useEffect` de debounce-recherche), lot 3 Backend (expiration automatique des devis
déplacée côté serveur), lot 4 (`components/command-palette.tsx`, 3 occurrences), lot 5 (customizer, 3), lot 6 (calculs financiers, 5),
lot 7 (divers, 6), puis lot final (migration des 3 derniers consommateurs de `hooks/use-debounce.ts` afin que ce fichier n'ait plus aucun
importeur). La passe de justifications traite les 16 `useEffect` volontairement conservés : chacun reçoit un commentaire écrit au format
`// Justification useEffect : <système externe non réactif>`. Le lot de clôture supprime le code mort explicitement consenti par l'utilisateur.
**Fichiers clés** : `components/effets/effets-client.tsx`, `hooks/use-effets.ts`, `components/command-palette.tsx`, `components/customizer/canvas/design-canvas.tsx`,
`components/planning/gantt-chart.tsx`, `hooks/use-debounce.ts` (supprimé), `hooks/use-achats-search.ts` (supprimé), `hooks/use-invoices-search.ts` (supprimé), `docs/wiki/audit-facturapro-suivi.md`.

### 3. Prompt A — hygiène de dépôt (clôture P0)
**Date** : 2026-10-09

Clôture du premier prompt du chantier d'audit 2026-10 (P0 « hygiène de dépôt »), validée puis stagée ce jour-là. Trois opérations d'étape :
**D1a** — suppression des scripts/fichiers racine morts de la racine (`check-ngp.cjs`, `check-tables.cjs`, `diag-colisage.ts`, `refactor.js`,
`update_next_number.js`, listes de fichiers TXT — 9 fichiers retirés du disque et de l'index) ; **D2a** — désextension des 11 fichiers de `public/uploads/` (logo entreprise, photo produit,
8 fiches techniques PDF, 1 photo WebP) par `git rm --cached`, les fichiers restant sur disque ; **D3a** — versionnement des migrations Prisma :
la ligne `/prisma/migrations` seule est retirée du `.gitignore` (le reste du fichier est conservé). La checklist de rotation des secrets
documentée au §4.6 de la fiche d'incident est également validée, et la fiche de suivi `docs/wiki/audit-2026-10-suivi.md` est créée
(tableau A→M, A ✅ le 2026-10-09 / B→M ❌ à cette date).
**Fichiers clés** : `.gitignore`, `prisma/migrations/**` (20 fichiers), `public/uploads/**` (11 désindexations), `docs/wiki/audit-2026-10-suivi.md` (créée), `docs/wiki/CHANGELOG.md`.

### 4. Prompt B — P0 sécurité applicative : sessions, isolation multi-société, permissions
**Date** : 2026-10-09 (5 entrées)

Le lot le plus sensible du chantier, en 4 pièces. **B1 (S-1, S-3)** : création de `lib/session-token.ts` (source unique de lecture du cookie de
session) et de `lib/session-cache.ts` ; le salt JWT est dérivé du nom du cookie, et `getSessionFromRequest` applique la règle `lastActivity`
(expiration par inactivité 30 min / 7 j selon `rememberMe`) avec relecture DB cacheée ≤ 30 s — 16 tests unitaires sans base. **B2 (S-2)** :
isolation multi-société des paiements : `lib/invoice-payment.ts` et les routes `payments`, `effets/[id]`, `cheques/[id]/encaisser`,
`effets/splits` sont scopées par `companyId`, avec `lib/__tests__/payments-isolation.test.ts` ; un arbitrage du même jour corrige l'accès non
scopé de `PATCH /api/avoirs/[id]` (devient `findFirst({ id, companyId })` + 404, garde DELETE ajoutée). **B3 (S-4)** : permissions manquantes
ajoutées sur 10 routes (trésorerie, évolution, dashboard, search, stock-mouvements, effets). **Backfill a′** : exécution approuvée de la
procédure de backfill.
**Fichiers clés** : `lib/session-token.ts` (créé), `lib/session-cache.ts` (créé), `lib/session.ts`, `proxy.ts`, `lib/invoice-payment.ts`,
`lib/permissions.ts`, `lib/__tests__/payments-isolation.test.ts`, `docs/wiki/auth.md`, `docs/wiki/audit-scope-multi-societe.md`.

### 5. Prompt C — P0 Authentification (server action, login, clôture)
**Date** : 2026-10-14 → 2026-10-15 (5 entrées)

Lot C2 (backend) fait passer le login par Server Action, avec correctif QA sur `lib/safe-internal-path.ts`. Lot C3 (frontend) introduit
`hooks/use-auth.ts`, le store `lib/stores/auth-progress-store.ts` et l'écran de progression `components/auth/auth-progress-screen.tsx`
(étapes réelles plutôt qu'un pourcentage fictif), `components/auth/login-form.tsx` étant aligné sur ce flux. Une entrée du même jour arbitre
les deux décisions bloquantes rencontrées (doublon de variable de connexion dans `.env` — dernier doublon conservé par décision utilisateur —
et reprise du graphe Graphify après un drift d'environnement). La clôture du 2026-10-15 valide le périmètre complet d'auth :
`proxy.ts`, `lib/session-marker.ts`, `lib/auth-errors.ts`, `lib/safe-internal-path.ts`, `app/(auth)/login/login-action.ts`, `lib/auth.ts`.
**Fichiers clés** : `proxy.ts`, `lib/session-marker.ts`, `lib/auth-errors.ts`, `lib/safe-internal-path.ts`, `app/(auth)/login/login-action.ts`,
`hooks/use-login.ts`, `hooks/use-auth.ts`, `lib/stores/auth-progress-store.ts`, `components/auth/login-form.tsx`, `components/auth/auth-progress-screen.tsx`, `docs/wiki/auth.md`.

### 6. Lots D1 / D2 — modèle de données et ledger de trésorerie
**Date** : 2026-10-16 (3 entrées)

**D1 (Database)** pose le modèle : migration `20261016190215_add_tresorerie_ledger` (table de grand livre `MouvementTresorerie`),
seconde migration `20261016192747_add_a_qualifier_statut_mouvement`, et un script de backfill **idempotent exécuté en dry-run**
(`prisma/backfill-mouvements-tresorerie.ts`), le tout documenté dans `docs/wiki/tresorerie.md` § D1. **D2 (Backend)** change la règle de
calcul : le ledger devient la **source unique des soldes** et il est écrit à chaque point de mutation métier (paiements, chèques, effets,
avoirs, routes trésorerie), avec les helpers `lib/tresorerie/{compute,ledger,sens,source-keys}.ts` et les types associés. Le cycle de
correction du même jour traite les 4 défauts relevés par le QA (« APPROVE AVEC RÉSERVES ») plus 2 garde-fous d'arbitrage, en verrouillant
la règle par des tests `tresorerie-{source-keys,compute,ledger}.test.ts`.
**Fichiers clés** : `prisma/schema.prisma`, `prisma/migrations/20261016190215_add_tresorerie_ledger/`, `prisma/migrations/20261016192747_add_a_qualifier_statut_mouvement/`,
`prisma/backfill-mouvements-tresorerie.ts`, `lib/tresorerie/compute.ts`, `lib/tresorerie/ledger.ts`, `lib/tresorerie/source-keys.ts`, `lib/types/tresorerie.ts`, `lib/invoice-payment.ts`.

### 7. Prompt F — notifications, états UX et fin des `alert()` natifs
**Date** : 2026-10-18 (5 entrées)

Quatre lots + clôture. **F.1** crée le socle : `lib/notify.ts` (API de notifications unique), `components/shared/app-toast.tsx`,
`lib/api-error.ts`, `lib/api-client.ts`, suppression de l'ancien `lib/toast.ts`, tests `lib/__tests__/notify.test.ts`, règle ESLint associée et
migration de 10 consommateurs. **F.2** livre les états de chargement / erreur / vide (`error-state.tsx`, `list-skeleton.tsx`,
`detail-skeleton.tsx`, `chart-error-boundary.tsx`) ainsi que les pages d'erreur Next.js (`app/not-found.tsx`, `app/global-error.tsx`,
fichiers `loading.tsx` / `error.tsx` par module). **F.3a** migre 28 fichiers de `sonner` vers `notify`, **F.3b** termine la vague 2/2 et bascule
la règle ESLint. **F.4** élimine tous les `alert()` / `confirm()` natifs et traite les `catch` vides.
**Fichiers clés** : `lib/notify.ts`, `components/shared/app-toast.tsx`, `lib/api-error.ts`, `lib/api-client.ts`, `lib/toast.ts` (supprimé),
`lib/__tests__/notify.test.ts`, `components/shared/error-state.tsx`, `components/shared/list-skeleton.tsx`, `app/not-found.tsx`, `app/global-error.tsx`, `eslint.config.mjs`.

### 8. Prompt G — kit de composants partagés `components/shared/`
**Date** : 2026-10-18 (5 entrées)

Les étapes 2 et 3 livrent **9 briques** dans `components/shared/` : `PageHeader` (unifie les 29 `<h1>` du produit), `KpiGrid`, `EntityFormDialog`
(RHF + Zod génériques), `FilterBar` (état hors composant via `createListStore`, debounce 300 ms en handler, 0 `useEffect`), `SectionCard`,
`FormField`, `MoneyCell`, `DateCell`, plus l'élargissement de `ConfirmDialog` (10 consommateurs à zéro régression) ; l'étape 3 supprime
parallèlement les formats locaux (3 `fmt()`, 2 `fmtShort`, 5 `Intl.NumberFormat`, 4 `formatDate` locaux) au profit des sources uniques
`lib/utils.ts` / `lib/decimal.ts`. L'étape 4 adopte les briques dans les modules : lot 1/2 clients / fournisseurs / achats, lot 2/2 factures /
effets. Le lot de clôture G.6 retire `FilterBar` (supprimé — seuil de vivacité non atteint) et migre `avoir-dialog` vers `EntityFormDialog`.
L'entrée « règles documentaires » fixe par décision utilisateur la règle des 3 usages réels avant toute brique partagée.
**Fichiers clés** : `components/shared/page-header.tsx`, `components/shared/kpi-grid.tsx`, `components/shared/entity-form-dialog.tsx`,
`components/shared/section-card.tsx`, `components/shared/form-field.tsx`, `components/shared/money-cell.tsx`, `components/shared/date-cell.tsx`,
`components/shared/confirm-delete-dialog.tsx`, `components/shared/filter-bar.tsx` (créé puis **supprimé** en G.6), `components/clients/**`,
`components/fournisseurs/**`, `components/factures/**`, `components/effets/**`, `components/avoirs/avoir-dialog.tsx`,
`docs/wiki/ui-kit.md`, `docs/wiki/ui-dialogs.md`, `AGENTS.md`.

### 9. Lot D3 — API et écran de trésorerie
**Date** : 2026-10-20 (2 entrées)

Côté **API** : `GET /api/tresorerie` gagne un paramètre `compte=CAISSE|BANQUE` validé par Zod (`422` si invalide) qui restreint **toutes** les
agrégations via 3 vues SQL de filtre (comptes, écritures du ledger, instruments rattachés par leur écriture) — jamais de filtrage post-agrégation ;
l'échéancier perd sa borne `gte: now` pour que le total « en retard » et le détail soient cohérents ; une nouvelle route
`PATCH /api/tresorerie/comptes/[id]` (permission `paiements:modifier`, 404 scopé) gère le solde initial, avec 4 tests dédiés. Côté **UI** :
l'écran est découpé en **13 fichiers ≤ 250 lignes** (max 244), les calculs de présentation partent dans `lib/tresorerie/presentation.ts`
(264 lignes, purs, 13 tests), et 2 briques partagées sont extraites (`mode-reglement-badge.tsx`, `flux-colors.ts`).
**Fichiers clés** : `app/api/tresorerie/route.ts`, `app/api/tresorerie/comptes/[id]/route.ts` (nouveau), `lib/tresorerie/ledger.ts`, `lib/tresorerie/compute.ts`,
`components/paiements/` (13 fichiers), `components/shared/mode-reglement-badge.tsx`, `components/shared/flux-colors.ts`, `lib/tresorerie/presentation.ts`,
`lib/__tests__/tresorerie-echeancier-retard.test.ts`, `docs/wiki/tresorerie.md`.

### 10. Prompt E (1/3) — durcissement `lib/api-route.ts` et validation Zod partagée
**Date** : 2026-10-22 → 2026-10-23 (6 entrées)

**E1** transforme `RouteConfig` en union discriminée (chaque route doit déclarer `permission` **ou** `authOnly: true`), impose le **422** pour les
échecs Zod sur `schema` et `query`, fait passer le **500** en réponse générique + `requestId` avec trace côté serveur via le nouveau
`lib/logger.ts` (JSON-lines, redaction des clés sensibles) ; inventaire final **192/192 handlers gardés** (175 `permission`, 17 `authOnly`).
**E2a** migre l'Annexe A « identité / paramètres / catalogue » : 13 routes wrappées + 3 routes publiques validées en `safeParse` avec le même
contrat 422, la **correction du mass-assignment S-7** se faisant par le STRIP des clés inconnues, et **5 nouveaux schémas partagés**
(`lib/schemas/{company,user,auth,ngp-code,notification}.ts`). **E2b** enchaîne sur les 9 routes du groupe financier avec
`lib/schemas/document-updates.ts`, **E2c** branche 10 formulaires clients sur ces schémas, **E2f/E2g** traitent les findings de la revue QA,
dont la suppression d'un cast masquant `zodResolver` dans `create-user-dialog.tsx`.
**Fichiers clés** : `lib/api-route.ts`, `lib/logger.ts`, `lib/schemas/company.ts`, `lib/schemas/user.ts`, `lib/schemas/auth.ts`, `lib/schemas/ngp-code.ts`,
`lib/schemas/notification.ts`, `lib/schemas/document-updates.ts`, `lib/__tests__/api-route.test.ts`, `app/api/**` (22 routes), `docs/wiki/auth.md`, `docs/wiki/parametres.md`.

### 11. Lot E3 — chiffrement des clés API (AES-256-GCM)
**Date** : 2026-10-23

Sécurisation au repos des clés API stockées dans `AppSettings` : **chiffrement AES-256-GCM** dans le nouveau module `lib/api-keys-crypto.ts`,
avec **garde-fou `••••`** côté interface (jamais de valeur réelle réaffichée), masquage exhaustif des réponses, validation **Zod du PUT**
via `lib/schemas/settings.ts`, et un script de **backfill** `scripts/dev/backfill-chiffrement-cles-api.ts` pour convertir les valeurs déjà
stockées en clair. Les tests `lib/__tests__/api-keys-crypto.test.ts` verrouillent le comportement (aller-retour chiffrement/déchiffrement,
erreurs). La lecture existante `lib/api-keys.ts` et la route `app/api/settings/app/route.ts` sont adaptées, la documentation étant mise à jour
dans `docs/wiki/parametres.md`.
**Fichiers clés** : `lib/api-keys-crypto.ts` (nouveau), `lib/schemas/settings.ts` (nouveau), `scripts/dev/backfill-chiffrement-cles-api.ts` (nouveau),
`lib/__tests__/api-keys-crypto.test.ts` (nouveau), `lib/api-keys.ts`, `app/api/settings/app/route.ts`, `docs/wiki/parametres.md`.

### 12. Lots E4 / E5 / E6 — authentification des cron et contrôleur de règles des routes
**Date** : 2026-10-23 (3 entrées)

**E4** durcit les 3 routes `app/api/cron/*` en « échec fermé » : la garde partagée `lib/cron-auth.ts` relit le secret d'environnement à chaque
appel (jamais capté à l'import), compare en temps constant (empreinte sha256 + `timingSafeEqual`) et renvoie un 401 identique que le secret soit
absent ou le header invalide, **avant toute lecture/écriture DB** — la route `cron/tmm-bct`, jusque-là sans aucune authentification, est
elle aussi couverte ; 26 tests sur les vrais handlers. **E5** livre le contrôleur `scripts/check-rules.mjs` (847 lignes, Node standard pur,
0 dépendance) qui vérifie les 123 `route.ts` : présence d'une permission sur chaque config `apiRoute`, wrapper obligatoire, déclaration `schema:`
pour toute lecture de corps — listes blanches documentées en un seul endroit, script exposé via `npm run check-rules`. **E6** clôture le prompt :
les 2 routes `carton-types` sont migrées vers `lib/schemas/carton-type.ts` et le contrôle passe de 3 violations / `exit 1` à **VIOLATIONS (0) /
`exit 0`**.
**Fichiers clés** : `lib/cron-auth.ts` (nouveau), `lib/__tests__/cron-auth.test.ts` (26 tests), `app/api/cron/check-echeances/route.ts`,
`app/api/cron/check-echeances/relance-ecart-bc/route.ts`, `app/api/cron/tmm-bct/route.ts`, `scripts/check-rules.mjs` (nouveau), `lib/schemas/carton-type.ts` (nouveau),
`package.json` (script `check-rules`), `docs/wiki/auth.md`.

### 13. Prompt H — query keys centrales et migration des hooks (vagues W0 → W4)
**Date** : 2026-10-24 (5 entrées)

Le prompt le plus structural côté données serveur. **W0** crée `lib/query-keys.ts` (registre central des clés de requête) et la fiche
`docs/wiki/query-keys.md` qui fixe aussi la convention des callbacks de toast. **H1** supprime le tour HTTP des server actions : les 13 `fetch()`
de `app/actions/{bons-commande,achats}.ts` appellent désormais des services `lib/` partagés avec les routes API (`lib/service-error.ts`,
`lib/service-route.ts`, `lib/bon-commande/*`, `lib/bon-livraison/create.ts`, `lib/invoice/create.ts`…). Les vagues suivantes déplacent
l'état serveur hors des composants : **W2** (5 composants `parametres/` + `entreprises/`, 12 sites), **W3** (5 composants `produits/`, 13 sites),
**W4** (vague finale : `components/` et `app/` hors `app/api` passent à **ZÉRO `fetch()` et ZÉRO hook inline**) — chaque migration conserve
les mêmes endpoints, les mêmes query keys et les mêmes invalidations, avec « zéro changement visuel ».
**Fichiers clés** : `lib/query-keys.ts` (nouveau), `docs/wiki/query-keys.md` (nouveau), `app/actions/bons-commande.ts`, `app/actions/achats.ts`,
`lib/service-error.ts`, `lib/service-route.ts`, `hooks/use-customizer-init.ts` (nouveau), `hooks/use-global-search.ts` (nouveau), `hooks/use-notifications.ts`, `hooks/use-products-for-labels.ts`.

### 14. Clôture du Prompt H (revérification Governor)
**Date** : 2026-10-25

Les lots H0→H4 avaient été exécutés le 2026-10-24 dans une session antérieure, mais la ligne de suivi était restée sur ❌ par oubli de STEP 6
(4ᵉ cas de ce type, après B, D2 et E). Ce lot est une **clôture d'orchestration sans écriture de code** : le Governor revérifie la checklist
item par item **sur les fichiers livrés**, pas sur le récit — absence de `fetch()` dans `app/actions/*.ts` et dans `components/` + `app/` hors
`app/api` (greps à sortie vide), absence de hooks inline, `lib/query-keys.ts` consommé par 17 fichiers, invalidation systématique via
`queryKeys.…`, convention de toast écrite, et correction du bug `_count.utilisateurs` (`entreprise-detail-client.tsx` lit désormais
`_count.users`). Preuves finales : lint **✖ 385 problems (35 errors, 350 warnings)** (nouvelle baseline, 397 → 385), `tsc --noEmit` **0 erreur**,
vitest **25 fichiers / 431 tests** verts.
**Fichiers clés** : `docs/wiki/audit-2026-10-suivi.md` (statut ❌ → ✅), `docs/wiki/CHANGELOG.md`, `docs/wiki/query-keys.md`, `lib/query-keys.ts`, `components/entreprises/entreprise-detail-client.tsx`.

### 15. Refactor des composants inventaire / détail effet / formulaire produit — sans entrée wiki
**Date** : 2026-10-25 (commit `a3c55b9` uniquement)

Seul des 5 commits du dépôt **sans entrée CHANGELOG** (voir section B). Portée constatée par git : **30 fichiers, +2 708 / −1 872**. Trois
découpes de fichiers monolithes en composants + logique extraite : `components/effets/effet-detail-client.tsx` perd 624 lignes au profit de
`effet-detail-{hero,links,sections,sidebar,dialogs}.tsx`, `effet-detail-logic.ts` et du hook `use-effet-detail-actions.ts` ;
`components/produits/produit-form-page.tsx` est délesté de 722 lignes vers `produit-form-{main-sections,media-sections,section,sidebar,suppliers-section}.tsx`
plus les hooks `use-produit-form.ts` (179 l.), `use-produit-form-files.ts` (104 l.), `use-produit-form-suppliers.ts` (78 l.) ;
`components/stock/inventaire-client.tsx` perd 610 lignes au profit de `inventaire-{charts,kpis,mouvements-section,skeleton,tables}.tsx`.
La logique pure sort du JSX (`lib/inventaire-logic.ts`, `lib/planning/gantt-layout.ts`) avec 2 nouveaux fichiers de test
(105 et 64 lignes) ; `eslint.config.mjs` gagne 29 lignes. **Aucun détail de ce commit n'est documenté dans le wiki** : le STEP 6 n'a pas été fait.
**Fichiers clés** : `components/effets/effet-detail-client.tsx`, `components/effets/effet-detail-logic.ts`, `components/produits/produit-form-page.tsx`,
`components/stock/inventaire-client.tsx`, `hooks/use-produit-form.ts`, `lib/inventaire-logic.ts`, `lib/planning/gantt-layout.ts`,
`lib/__tests__/effet-detail-logic.test.ts`, `lib/__tests__/inventaire-logic.test.ts`, `eslint.config.mjs`.

---

## SECTION D — Statistiques

### D.1 — Volume général

- **112 entrées** de changelog (section « Entries »), période **2026-09-19 → 2026-10-25**, sur **25 dates distinctes**.
- **5 commits git**, tous datés du **2026-10-25**.
- **15 highlights** restitués en section C (lots majeurs).
- **2 entrées** ne listent pas de fichiers clés (colonnes « — »), **110** en listent.
- **0 fichier de code modifié** par ce rapport (documentaire uniquement).

### D.2 — Répartition par date (compteur recalculé par commande)

```
$ grep -oE '^- \[2026-[0-9]{2}-[0-9]{2}\]' docs/wiki/CHANGELOG.md | sort | uniq -c
      5 - [2026-09-19]
     12 - [2026-09-20]
      9 - [2026-09-21]
      1 - [2026-09-23]
      5 - [2026-09-25]
      3 - [2026-09-26]
      5 - [2026-09-27]
     16 - [2026-09-28]
      2 - [2026-09-30]
      2 - [2026-10-01]
      2 - [2026-10-02]
      2 - [2026-10-08]
      6 - [2026-10-09]
      4 - [2026-10-14]
      1 - [2026-10-15]
      3 - [2026-10-16]
      1 - [2026-10-17]
     10 - [2026-10-18]
      1 - [2026-10-19]
      3 - [2026-10-20]
      2 - [2026-10-21]
      2 - [2026-10-22]
      8 - [2026-10-23]
      5 - [2026-10-24]
      2 - [2026-10-25]

$ grep -cE '^- \[2026-[0-9]{2}-[0-9]{2}\] ' docs/wiki/CHANGELOG.md
112
```

Somme des 25 lignes : **112** (identique au compteur exigé, date par date).

### D.3 — Répartition par rôle (compteur recalculé par commande)

```
$ grep -oE '^- \[2026-[0-9]{2}-[0-9]{2}\] [A-Za-z+ ]+ \(' docs/wiki/CHANGELOG.md | sed -E 's/^- \[[0-9]{4}-[0-9]{2}-[0-9]{2}\] //; s/ \($//' | sort | uniq -c | sort -rn
     50 Frontend
     38 Backend
      8 Governor
      5 Frontend + Backend
      3 General
      3 Backend + Frontend
      2 Gouverneur
      1 QA
      1 Governor Agent
      1 Database
```

| Rôle | Entrées | Part |
| --- | --- | --- |
| Frontend | 50 | 44,6 % |
| Backend | 38 | 33,9 % |
| Governor | 8 | 7,1 % |
| Frontend + Backend | 5 | 4,5 % |
| General | 3 | 2,7 % |
| Backend + Frontend | 3 | 2,7 % |
| Gouverneur | 2 | 1,8 % |
| QA | 1 | 0,9 % |
| Governor Agent | 1 | 0,9 % |
| Database | 1 | 0,9 % |
| **Total** | **112** | **100 %** |

Remarques factuelles sur les libellés : les valeurs sont recopiées telles qu'écrites dans le dépôt. Agrégés par famille de rôle : **Frontend 50** ;
**Backend 38** ; **Governor 11** (8 « Governor » + 2 « Gouverneur » + 1 « Governor Agent ») ; **General 3** ; **Database 1** ; **QA 1** ;
rôles croisés 8 (« Frontend + Backend » 5 + « Backend + Frontend » 3). Sous-total : 112.

### D.4 — Bilan de commits

```
$ git log --oneline | wc -l
5
$ git log --format='%h|%ad|%s' --date=short
a3c55b9|2026-10-25|feat: refactor inventaire and effet detail components
b387719|2026-10-25|[lot-h5-cloture] Prompt H clôturé : revérification Governor + STEP 6 (suivi ❌→✅, bilan 10✅/5❌, baseline lint 385)
e10012a|2026-10-25|[lot-gouvernance] Wiki : entrée CHANGELOG sécurisation-git + alignement règle commit du suivi
082f796|2026-10-25|[lot-gouvernance] Politique git : commit + push automatiques à chaque clôture de lot
e03ceea|2026-10-25|État du projet au 2026-10-25 — chantier audit 2026-10 prompts A→G clôturés
$ git log --format='' --numstat | awk 'NF==3{a+=$1;d+=$2} END {print "insertions="a, "deletions="d}'
insertions=223315 deletions=1877
```

- **5 commits**, tous le **2026-10-25** ; **+223 315 / −1 877** au total ; **1 163 fichiers touchés** en cumul (1 128 + 1 + 2 + 2 + 30).
- **4 commits sur 5** ont leur contrepartie wiki (par hash ou par sujet) ; **1 commit sur 5 n'en a pas** : `a3c55b9` — **commit sans entrée wiki (STEP 6 manquant)** (détail section B).
- Le dépôt git ne commence qu'au 2026-10-25 (`e03ceea` est le commit initial) : **toute l'activité 2026-09-19 → 2026-10-24 est tracée uniquement dans le changelog**, elle n'a pas d'empreinte git.
