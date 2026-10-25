# FacturaPro — Wiki du projet

Documentation vivante du projet, organisée **module par module** et **fonctionnalité par fonctionnalité**.
Chaque ajout, modification ou manipulation est consignée ici par l'agent responsable, afin de suivre l'évolution du projet.

## Règles pour les agents

- **Qui écrit ?** L'agent responsable de la zone modifiée (Backend, Frontend, Database, Architecture, QA) met à jour la fiche du module concerné **et** le changelog.
- **Quand ?** À chaque étape "UPDATE WIKI" du pipeline (après `graphify update .`), pour toute modification de code, de schéma ou de configuration.
- **Format** : chaque entrée de changelog suit le modèle :
  `- [DATE] Rôle (module) : description du changement — fichiers clés`.
- **Ne jamais** écrire de secrets (clés API, mots de passe, connexions).

## Sommaire des modules

| Module | Fiche | Résumé |
| --- | --- | --- |
| Authentification & utilisateurs | [auth.md](auth.md) | Connexion, inscription, invitations, permissions |
| Facturation | [facturation.md](facturation.md) | Factures, devis, avoirs, bons de commande, bons de livraison |
| Inventaire | [inventaire.md](inventaire.md) | Produits, variantes, catégories, marques, stock, matières premières |
| Achats | [achats.md](achats.md) | Achats fournisseurs, lignes, mouvements de stock liés |
| Trésorerie | [tresorerie.md](tresorerie.md) | Paiements, chèques, effets de commerce, comptes bancaires, taux de change |
| CRM | [crm.md](crm.md) | Tiers (clients / fournisseurs) |
| Production / Atelier | [production.md](production.md) | Ordres de fabrication, designs personnalisés, packing lists, types de cartons |
| Export (NGP) | [export.md](export.md) | Exports, codes NGP |
| Paramètres & société | [parametres.md](parametres.md) | Entreprises, paramètres applicatifs, colisage |
| Dashboard & rapports | [dashboard-rapports.md](dashboard-rapports.md) | Tableau de bord, rapports, notifications, recherche, POS, upload |
| Sécurité & incidents | [incident-secrets-2026-09-25.md](incident-secrets-2026-09-25.md) | Incident fuite .env / rotation des secrets |
| Suivi audit transverse | [audit-facturapro-suivi.md](audit-facturapro-suivi.md) | Avancement des 14 prompts de AUDIT-FACTURAPRO.md |
| Suivi audit 2026-10 | [audit-2026-10-suivi.md](audit-2026-10-suivi.md) | Avancement du chantier A→M de l'audit du 2026-10-07 (règles du chantier, dette environnement) |
| UI — Dialogs d'entité | [ui-dialogs.md](ui-dialogs.md) | Règles créer vs réutiliser, suppression du wrapper `entity-dialog.tsx` (P2-11) |

## Journal des changements

Toutes les modifications sont consignées dans le [CHANGELOG.md](CHANGELOG.md) (chronologique).
