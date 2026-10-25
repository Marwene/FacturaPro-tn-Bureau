# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tunisian SME owners, managers, accountants, and workshop supervisors who need a single tool to manage invoicing, stock, treasury, production, and exports on a daily basis. They work in French, use Tunisian Dinar (TND), and operate in a fiscal context specific to Tunisia (TVA, FODEC, timbre fiscal, TMM BCT rates, NGP export codes).

## Product Purpose

FacturaPro TN is a Tunisian commercial management and invoicing platform that replaces the fragmented use of spreadsheets, generic accounting software, and manual fiscal calculations. It exists so that Tunisian businesses can manage their entire commercial cycle — from quote to delivery to invoice to payment to stock to production — in one tool without needing external fiscal configuration. Success means fewer errors, faster workflows, and full compliance with Tunisian fiscal regulations out of the box.

## Positioning

FacturaPro TN is purpose-built for Tunisia, with native fiscal compliance (TVA, FODEC, timbre fiscal, TMM BCT rates, NGP codes) that generic international tools like Sage, Zoho, or Odoo require manual configuration to achieve. It combines simplicity and affordability with an all-in-one local solution covering invoicing, stock, treasury, atelier/workshop production, and export — eliminating the need to stitch together multiple tools. The .tn domain and local SMTP infrastructure reinforce its commitment to the Tunisian market.

## Operating Context

Users manage invoices (factures), quotes (devis), delivery notes (bons de livraison), purchase orders (bons de commande), credit notes (avoirs), and point-of-sale transactions. They track inventory with product variants, categories, and stock alerts. They manage treasury through cheques, commercial paper (effets de commerce), bank transfers, and cash. Workshop users handle technical sheets, raw materials, production orders, and Gantt scheduling. Export users work with NGP codes and customs declarations. The app supports multi-company management, role-based permissions (ADMIN/USER), and multi-currency invoicing (TND, EUR, USD).

## Capabilities and Constraints

- 19+ business modules organized into 7 navigation groups (General, Sales, Purchases, Finance, Stock, Atelier, Export)
- Multi-tenant architecture with role-based access control (~70+ permission keys across 20 modules)
- PDF generation for all document types (invoices, quotes, delivery notes, packing lists)
- CSV/Excel export, email reminders, barcode display, file upload
- Dark/light mode support, command palette (Cmd+K) for global search
- French-only interface (`lang="fr"`) — no multi-language support
- Responsive design with sidebar collapse to icon mode
- Real-time TMM BCT rate fetching via cron jobs
- 3D design studio for product customization (Three.js + Konva)
- AI integration via Mistral for OCR processing
- Hosted on Vercel with Neon PostgreSQL serverless

## Brand Commitments

- Name: FacturaPro TN
- Logo: FP monogram in a rounded square
- Typography: DM Sans (Google Fonts) — confirmed as a durable choice
- No strong color brand identity — neutral/professional palette is a deliberate design decision
- Voice: professional, direct, functional

## Evidence on Hand

- Fully functional Next.js App Router application with 19+ modules
- shadcn/ui component library with 60+ components
- Prisma schema with full data model for all business entities
- Working PDF generation, Excel export, email sending
- Dark mode implementation via next-themes
- Responsive layout with sidebar navigation

## Product Principles

1. **Tunisia-first fiscal compliance** — All fiscal calculations (TVA, FODEC, timbre, TMM) are native, not configurable add-ons
2. **All-in-one simplicity** — One tool replaces spreadsheets, generic accounting, and fragmented point solutions
3. **Affordable for SMEs** — Pricing and complexity scaled for Tunisian small/medium businesses, not enterprises
4. **Complete commercial cycle** — From quote to delivery to invoice to payment to stock to production in one flow
5. **Local infrastructure** — Hosted locally, local SMTP, .tn domain — built for the Tunisian market

## Accessibility & Inclusion

Baseline accessibility provided by Radix UI / shadcn/ui (keyboard navigation, semantic HTML, reduced-motion support). No formal WCAG audit, no automated a11y testing, no skip links, no explicit ARIA enhancements. For a daily-use business tool, this is a known gap that future work should address.
