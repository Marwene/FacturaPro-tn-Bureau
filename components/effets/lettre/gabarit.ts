// ============================================================================
// IMPRESSION SUR PRÉ-IMPRIMÉ (overlay) — à calibrer avec la grille millimétrée
// ============================================================================
//
// Contrairement à buildLettreHTML (qui dessine une carte complète avec ses
// propres cadres/couleurs, pour l'aperçu à l'écran), cette fonction n'imprime
// QUE le texte, positionné en absolu en millimètres, par-dessus le papier
// pré-imprimé de la banque. Aucun cadre, aucune couleur, aucun fond : tout ça
// existe déjà sur le papier.
//
// COMMENT CALIBRER :
// 1. Imprimez grille-calibration-mm.html et posez votre traite dessus.
// 2. Pour chaque champ ci-dessous, relevez le coin haut-gauche (top/left) et
//    la taille de la case (width/height) en mm sur la grille.
// 3. Remplacez les valeurs dans PRINT_FIELDS. Faites un test d'impression
//    RÉEL sur le papier pré-imprimé (Échelle = 100%, Marges = Aucune) et
//    ajustez de ±1-2mm si besoin — c'est normal de faire 2-3 essais.
// 4. Ajustez PAGE_WIDTH_MM / PAGE_HEIGHT_MM à la taille exacte de votre
//    papier (mesurée à plat, non plié).

// COMMENT CALIBRER (si votre pré-imprimé diffère de celui calibré ici) :
// 1. Imprimez grille-calibration-mm.html et posez votre traite dessus.
// 2. Pour chaque champ ci-dessous, relevez le coin haut-gauche (top/left) et
//    la taille de la case (width/height) en mm sur la grille.
// 3. Remplacez les valeurs dans PRINT_FIELDS. Faites un test d'impression
//    RÉEL sur le papier pré-imprimé (Échelle = 100%, Marges = Aucune) et
//    ajustez de ±1-2mm si besoin — c'est normal de faire 2-3 essais.
// 4. Ajustez PAGE_WIDTH_MM / PAGE_HEIGHT_MM à la taille exacte de votre
//    papier (mesurée à plat, non plié).
//
// Calibration actuelle : dérivée par mesure directe (grille 5mm superposée)
// sur un exemplaire réel photographié du pré-imprimé "Lettre de Change"
// tunisien, format B5 (176 x 250mm). Le contenu imprimé n'occupe que le
// haut de la feuille (~0-108mm) ; le reste du B5 est vierge sur ce modèle.
// Fiable à ±1-2mm — un test d'impression réel reste recommandé avant tirage
// en volume, une photo n'ayant pas la précision d'un scanner à plat.

export const LETTRE_PAGE_WIDTH_MM = 176 // B5
export const LETTRE_PAGE_HEIGHT_MM = 250 // B5
export const PAGE_WIDTH_MM = LETTRE_PAGE_WIDTH_MM
export const PAGE_HEIGHT_MM = LETTRE_PAGE_HEIGHT_MM

// Photo du pré-imprimé réel (posée dans public/), utilisée UNIQUEMENT dans
// l'aperçu écran comme calque de fond pour vérifier le calage des champs.
// Jamais incluse dans le HTML envoyé à l'impression (buildLettrePrintOverlayHTML).
export const PREIMPRIME_IMAGE_SRC = "/effets/lettre-de-change-preimprime.jpg"
// Dimensions réelles du fichier image (px) — la photo ne couvre que la partie
// haute imprimée du B5 (le reste de la feuille, ~114-250mm, est vierge sur ce
// modèle). On dérive sa hauteur en mm à partir de son ratio, pour l'étirer à
// la largeur exacte de la page (176mm) sans la déformer.
const PREIMPRIME_IMAGE_PX = { width: 836, height: 540 }
export const PREIMPRIME_IMAGE_HEIGHT_MM = (PAGE_WIDTH_MM * PREIMPRIME_IMAGE_PX.height) / PREIMPRIME_IMAGE_PX.width

export type PrintField = {
    top: number
    left: number
    width: number
    height?: number
    fontSize?: number // en pt
    bold?: boolean
    align?: "left" | "center" | "right"
    dir?: "ltr" | "rtl"
    mono?: boolean // pour les chiffres du RIB, alignés en colonnes
    multiline?: boolean // pour adresse/domiciliation sur 2-3 lignes
}

export const PRINT_FIELDS: Record<string, PrintField> = {
    // Ligne "A [lieu] / Le [date]" — Ordre de paiement (haut, dupliqué avec lieuCreation/dateCreation plus bas)
    lieuOrdre: { top: 8, left: 70, width: 68, fontSize: 10, bold: true },
    dateOrdre: { top: 17, left: 70, width: 68, fontSize: 10, bold: true },
    // Échéance (haut)
    echeance: { top: 15, left: 62, width: 36, height: 8, fontSize: 10, bold: true, align: "center" },
    // RIB simple (sous Échéance, une seule ligne continue)
    ribSimple: { top: 20, left: 8, width: 50, height: 7, fontSize: 8, mono: true },
    // Montant (haut droite, 1ère occurrence)
    montantChiffres: { top: 14, left: 142, width: 34, height: 10, fontSize: 12, bold: true, align: "center" },
    // Bénéficiaire ("payer à l'ordre de")
    beneficiaire: { top: 32, left: 98, width: 76, height: 8, fontSize: 10, bold: true },
    // Montant (2e occurrence, sous "payer à l'ordre de")
    montantChiffres2: { top: 30, left: 142, width: 34, height: 12, fontSize: 12, bold: true, align: "center" },
    // Montant en lettres — pleine largeur, une seule ligne
    montantLettresFr: { top: 44, left: 8, width: 166, height: 8, fontSize: 9, bold: true },
    // Lieu et date de création (bas, dupliqué avec lieuOrdre/dateOrdre)
    lieuDateCreation: { top: 54, left: 8, width: 87, height: 8, fontSize: 9 },
    echeance2: { top: 54, left: 97, width: 41, height: 8, fontSize: 9, align: "center" },
    // Nom du cédant
    cedant: { top: 54, left: 140, width: 34, height: 8, fontSize: 8 },
    // RIB détaillé (4 cases)
    ribCodeEtab: { top: 60, left: 8, width: 19, height: 8, fontSize: 9, align: "center", mono: true },
    ribCodeAgence: { top: 60, left: 28, width: 19, height: 8, fontSize: 9, align: "center", mono: true },
    ribCompte: { top: 60, left: 48, width: 34, height: 8, fontSize: 9, align: "center", mono: true },
    ribCle: { top: 60, left: 83, width: 11, height: 8, fontSize: 9, align: "center", mono: true },
    // Valeur en
    valeurEn: { top: 58, left: 97, width: 40, height: 10, fontSize: 10, bold: true, align: "center" },
    // Domiciliation (banque du tiré) — multi-ligne
    domiciliationBanque: { top: 58, left: 140, width: 35, height: 20, fontSize: 8, multiline: true },
    // Nom et adresse du Tiré — multi-ligne
    tireNomAdresse: { top: 68, left: 60, width: 36, height: 14, fontSize: 8, multiline: true },
}
export type BgBox = { top: number; left: number; width: number; height: number }

// Cases (bordures) du pré-imprimé, mesurées sur un exemplaire réel (grille
// 5mm superposée à une photo du document). Reconstitution approximative à
// but de repère visuel — pas une reproduction pixel-perfect.
export const BG_BOXES: BgBox[] = [
    { top: 8, left: 8, width: 50, height: 19 }, // Signature du tiré
    { top: 8, left: 62, width: 78, height: 19 }, // Échéance / A / Le / Ordre de paiement
    { top: 13, left: 142, width: 34, height: 12 }, // Montant 1
    { top: 28, left: 8, width: 50, height: 18 }, // Tireur
    { top: 28, left: 60, width: 80, height: 18 }, // Contre cette LC / payer à l'ordre de
    { top: 28, left: 142, width: 34, height: 14 }, // Montant 2
    { top: 42, left: 8, width: 168, height: 11 }, // Montant en lettres
    { top: 50, left: 8, width: 168, height: 14 }, // Lieu/Date création / Échéance / Cédant / Codes
    { top: 54, left: 60, width: 1, height: 10 },
    { top: 54, left: 97, width: 1, height: 10 },
    { top: 54, left: 140, width: 1, height: 10 },
    { top: 54, left: 8, width: 87, height: 30 }, // RIB détaillé
    { top: 60, left: 28, width: 1, height: 8 },
    { top: 60, left: 48, width: 1, height: 8 },
    { top: 60, left: 83, width: 1, height: 8 },
    { top: 54, left: 97, width: 43, height: 14 }, // Valeur en
    { top: 54, left: 140, width: 36, height: 26 }, // Domiciliation
    { top: 68, left: 8, width: 25, height: 12 }, // Acceptation
    { top: 68, left: 33, width: 25, height: 12 }, // Aval
    { top: 64, left: 58, width: 39, height: 16 }, // Nom et adresse du Tiré
    { top: 68, left: 140, width: 36, height: 12 }, // Signature du tireur
]
