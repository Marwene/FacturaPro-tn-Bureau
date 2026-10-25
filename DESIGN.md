---
name: FacturaPro TN
description: Gestion commerciale tunisienne — interface sobre, professionnelle et dense pour la productivité quotidienne
colors:
  primary: "#2c2c2c"
  primary-light: "#ebebeb"
  secondary: "#f5f5f5"
  secondary-dark: "#3d3d3d"
  muted: "#7a7a7a"
  destructive: "#c93545"
  destructive-dark: "#f26474"
  border: "#ebebeb"
  border-dark: "rgba(255,255,255,0.10)"
  ring: "#a3a3a3"
  chart-1: "#e06820"
  chart-2: "#009783"
  chart-3: "#3d5f7a"
  chart-4: "#f5c842"
  chart-5: "#dea043"
  sidebar-bg: "#fafafa"
  sidebar-bg-dark: "#2c2c2c"
  sidebar-accent: "#2a5eb8"
typography:
  display:
    fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 500
    lineHeight: 1.2
  body:
    fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 400
    fontSize: "1rem"
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 500
    fontSize: "0.875rem"
    lineHeight: 1.429
  caption:
    fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 500
    fontSize: "0.75rem"
    lineHeight: 1.333
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-light}"
    rounded: "{rounded.md}"
    padding: "6px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-light}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "6px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.sidebar-bg}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  badge:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: FacturaPro TN

## Overview

**Creative North Star: "Le Terminal de Confiance"**

FacturaPro TN est un outil de travail sobre et efficace, conçu pour des utilisateurs qui passent des heures chaque jour à gérer factures, stock et trésorerie. L'interface disparaît derrière la productivité : pas de couleur dominante, pas de fioritures, pas de bruit visuel. Chaque élément existe pour une raison fonctionnelle. La palette entièrement neutre (oklch sans chroma) permet à l'information de primer sur le style. Le dark mode et le light mode partagent cette même philosophie : la fonction guide la forme.

Le système est dense en informations mais jamais confus. Les composants s'adaptent au contexte — compacts dans les tableaux de données, aérés dans les formulaires et les écrans de lecture. La profondeur est créée par des couches de couleur et des ombres structurelles légères, pas par des effets décoratifs. C'est un outil qui gagne la confiance par sa rigueur, pas par son esthétique.

**Key Characteristics:**
- Palette entièrement neutre — zéro couleur de marque, tout est灰度
- Typographie DM Sans unique — propre, moderne, sans caractère excessif
- Composants adaptatifs — densité variable selon le contexte
- Ombres structurelles — séparation des couches par élévation légère
- Dark mode natif — même densité, mêmes règles, palette inversée

## Colors

La palette est strictement achromatique : toutes les couleurs sémantiques utilisent oklch avec chroma=0 (gris pur). Seules les couleurs destructive et chart apportent de la chromaticité, réservées à des fonctions spécifiques.

### Primary

- **Near-Black** (#2c2c2c / oklch(0.205 0 0)): Texte principal, fond de bouton primary en light mode, sidebar primary. La couleur dominante du système — omniprésente mais jamais agressive grâce à sa neutralité.
- **Light Gray** (#ebebeb / oklch(0.922 0 0)): Bordures, inputs, séparateurs. Le squelette visuel qui structure l'espace.

### Secondary

- **Cool White** (#f5f5f5 / oklch(0.97 0 0)): Fond secondaire, boutons secondaires, zones de contenu alternées. Crée des couches sans ombre.
- **Mid Gray** (#3d3d3d / oklch(0.269 0 0)): Fond secondaire en dark mode, accents sombres.

### Neutral

- **Off-White** (#fafafa / oklch(0.985 0 0)): Fond principal en light mode, cartes, popover.
- **Charcoal** (#1a1a1a / oklch(0.145 0 0)): Fond principal en dark mode, texte en light mode.
- **Muted Gray** (#7a7a7a / oklch(0.556 0 0)): Texte secondaire, labels désactivés, placeholders.
- **Ring Gray** (#a3a3a3 / oklch(0.708 0 0)): Focus ring, bordures actives.

### Destructive

- **Alert Red** (#c93545 / oklch(0.577 0.245 27.325)): Erreurs, suppressions, alertes critiques en light mode.
- **Soft Red** (#f26474 / oklch(0.704 0.191 22.216)): Même rôle en dark mode, plus doux pour la lisibilité sur fond sombre.

### Charts

- **Amber** (#e06820 / oklch(0.646 0.222 41.116)): Chart 1 — revenus, séries principales
- **Teal** (#009783 / oklch(0.6 0.118 184.704)): Chart 2 — stocks, séries secondaires
- **Slate Blue** (#3d5f7a / oklch(0.398 0.07 227.392)): Chart 3 — finances
- **Amber Gold** (#f5c842 / oklch(0.828 0.189 84.429)): Chart 4 — alertes
- **Warm Gold** (#dea043 / oklch(0.769 0.188 70.08)): Chart 5 — tendances

### Named Rules

**The No-Brand Rule.** Aucune couleur de marque n'existe dans le système. La palette est un outil neutre qui met en valeur les données, pas une identité visuelle. Toute couleur chromatique ajoutée doit justifier sa fonction.

**The Tonal Layering Rule.** La profondeur est créée par des couches de gris (background → card → popover), pas par des ombres seules. Chaque couche a un ton légèrement différent.

## Typography

**Display Font:** DM Sans (with system font fallback)
**Body Font:** DM Sans (with system font fallback)

**Character:** DM Sans est une sans-serif geometrica propre et moderne. Utilisée seule pour tout le système — pas de contraste display/body, pas de police d'accent. La personnalité vient de la hiérarchie (tailles, poids, espacement), pas du choix typographique.

### Hierarchy

- **Display** (500, 1.5rem, 1.2): Titres de page, en-têtes de module. Apparaît dans les headers de section.
- **Headline** (500, 1.125rem, 1.556): Titres de cartes, titres de modals, headers de tableau.
- **Title** (500, 1rem, 1.5): Labels de navigation, titres de formulaires, noms d'éléments.
- **Body** (400, 1rem, 1.5): Texte principal, descriptions, contenu de cellules. Max line length: ~75ch.
- **Label** (500, 0.875rem, 1.429): Labels de champs, boutons, badges, navigation secondaire.
- **Caption** (500, 0.75rem, 1.333): Timestamps, métadonnées, hints, textes de statut.

### Named Rules

**The Single-Face Rule.** Une seule famille typographique (DM Sans) pour tout le système. Pas de contraste display/body, pas de police d'accent. La lisibilité vient de la hiérarchie, pas de la variété.

**The Dense Label Rule.** Les labels et boutons utilisent `font-weight: 500` (medium) pour maintenir la lisibilité dans les interfaces denses sans alourdir le texte.

## Layout

Le layout est basé sur un système de sidebar fixe à gauche avec un contenu principal scrollable. La sidebar fait 256px en mode étendu, 48px en mode icônes. Le contenu utilise des breakpoints standards (640px, 768px, 1024px, 1280px) avec des containers max-width progressifs. L'espacement de base est 4px (0.25rem), multiplié pour créer le rythme: 8px pour les gaps internes, 16px pour les paddings de cartes, 24px pour les sections, 48px pour les margins de page.

La densité est adaptative : les tableaux de données utilisent des paddings compacts (py-2, px-3), les formulaires et écrans de lecture sont plus aérés (py-4, px-6). Les grilles de cartes utilisent `@container queries` pour s'adapter à la taille du conteneur parent plutôt qu'à la viewport.

## Elevation & Depth

Le système utilise des ombres structurelles légères pour séparer les couches d'interface. Pas de shadows décoratives — chaque ombre existe pour indiquer une élévation fonctionnelle. En dark mode, la profondeur est créée par des couches de gris de plus en plus claires plutôt que par des ombres.

### Shadow Vocabulary

- **Dropdown Shadow** (`shadow-md`): Selects, dropdowns, command palettes — éléments flottants au-dessus du contenu.
- **Sheet Shadow** (`shadow-lg`): Panels coulissants (sidebar, settings) — séparation marquée du contenu principal.
- **Tooltip Shadow** (`shadow-xl`): Tooltips, chart tooltips — élément le plus élevé, léger rehaussement.
- **Card Lift** (`shadow-sm`): Cartes en hover ou en état actif — signal subtil d'interaction.

### Named Rules

**The Structural Shadow Rule.** Les ombres ne sont jamais décoratives. Elles signalent une élévation fonctionnelle : dropdown (niveau 1), sheet (niveau 2), tooltip (niveau 3). Pas d'ombre = pas d'élévation.

**The Tonal Depth Rule.** En dark mode, la profondeur est créée par des couches de gris de plus en plus claires (background → card → popover), pas par des ombres qui seraient invisibles sur fond sombre.

## Shapes

La langue formelle est rectangulaire avec des coins légèrement arrondis. Le rayon de base est 10px (0.625rem), calculé commeracine d'une échelle proportionnelle : sm=6px, md=8px, lg=10px, xl=14px. Les boutons et inputs utilisent `rounded-md` (8px). Les cartes et modals utilisent `rounded-lg` (10px). Les badges et avatars utilisent `rounded-full` (9999px) pour leur forme circulaire.

Pas de coins carrés (sharp corners) dans le système — même les éléments fonctionnels ont un arrondi minimum de 6px pour adoucir la rigueur de la grille. Pas de formes organiques, pas de bordures décoratives, pas de clipping complexe.

## Components

### Buttons

- **Shape:** Rounded-md (8px), hauteur variable selon la taille (h-6 à h-9)
- **Primary:** Fond near-black (#2c2c2c), texte light gray (#ebebeb), bordure transparente. Padding: 6px 16px. Font: DM Sans 500, 0.875rem.
- **Hover / Focus:** Focus ring 3px ring-gray/50. Pas de changement de couleur en hover — le focus ring est le seul signal.
- **Secondary:** Fond transparent, texte near-black, bordure light gray. Même padding et focus.
- **Ghost:** Fond transparent, texte near-black, pas de bordure. Utilisé pour les actions secondaires.
- **Destructive:** Fond destructive (#c93545), texte blanc. Réservé aux suppressions et alertes critiques.

### Badges

- **Shape:** Rounded-full (9999px), hauteur 20px, padding horizontal 8px.
- **Default:** Fond secondary (#f5f5f5), texte near-black. Pour les statuts neutres.
- **Destructive:** Fond destructive (#c93545), texte blanc. Pour les erreurs et alertes.

### Cards

- **Corner Style:** Rounded-lg (10px)
- **Background:** Off-white (#fafafa) en light, card (#2c2c2c) en dark
- **Shadow Strategy:** Aucune au repos. Shadow-sm en hover ou état actif.
- **Border:** Light gray (#ebebeb) en light, white/10% en dark
- **Internal Padding:** 24px (spacing-lg)

### Inputs

- **Style:** Bordure light gray, fond transparent, rounded-md (8px). Hauteur h-8 (32px). Padding: 6px 12px.
- **Focus:** Focus ring 3px ring-gray/50, bordure ring color.
- **Error:** Bordure destructive, ring-destructive/20. Label adjacent en destructive.
- **Disabled:** Fond muted, texte muted-foreground, curseur non-disponible.

### Navigation

- **Style:** Sidebar fixe gauche, items empilés verticalement. Hauteur d'item: h-8 (32px). Padding: 8px 12px. Rounded-md.
- **Typography:** Label (500, 0.875rem). Icônes Lucide 16px.
- **Default:** Fond transparent, texte muted-foreground.
- **Hover:** Fond secondary, texte near-black.
- **Active:** Fond secondary, texte near-black, icône sidebar-primary en dark mode (#2a5eb8).
- **Mobile:** Sidebar collapse en overlay avec sheet (shadow-lg).

### Tables

- **Style:** Bordure fine (1px) en light, white/10% en dark. Pas de zebra striping.
- **Header:** Fond secondary, texte muted, font-weight 500.
- **Row Hover:** Fond secondary subtil.
- **Cell Padding:** Compact — py-2 px-3 pour les données denses.

## Do's and Don'ts

### Do:

- **Do** maintenir la neutralité de la palette — toute couleur chromatique ajoutée doit justifier sa fonction (destructive, chart, statut).
- **Do** utiliser la tonal layering pour créer la profondeur — background → card → popover, pas des ombres seules.
- **Do** adapter la densité au contexte — compact pour les tableaux, aéré pour les formulaires.
- **Do** utiliser le focus ring 3px ring-gray/50 sur tous les éléments interactifs.
- **Do** respecter la hiérarchie typographique DM Sans — pas de police d'accent, la lisibilité vient du poids et de la taille.
- **Do** utiliser les ombres structurellement — dropdown (md), sheet (lg), tooltip (xl).

### Don't:

- **Don't** ajouter de couleur de marque — le système est intentionnellement neutre.
- **Don't** utiliser des ombres décoratives — chaque ombre doit signaler une élévation fonctionnelle.
- **Don't** mélanger les densities — un formulaire aéré dans un tableau dense crée de la confusion.
- **Don't** ignorer le dark mode — toute modification visuelle doit être testée dans les deux modes.
- **Don't** utiliser des border-radius incohérents — respecter l'échelle (sm/md/lg/xl/full).
- **Don't** surcharger les interfaces — la sobriété est une feature, pas un manque de design.
