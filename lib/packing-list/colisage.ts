export interface TailleQty {
  taille: string
  quantite: number
}

export interface CartonType {
  id: string
  nom: string
  capacite: number
  longueur?: number
  largeur?: number
  hauteur?: number
}

export interface Carton {
  numero: number
  contenu: Record<string, number>
  totalPieces: number
  capacite?: number
  typeNom?: string
}

export interface ColisageResult {
  cartons: Carton[]
  nbCartons: number
  totalPieces: number
  capaciteCarton: number
  types?: CartonType[]
}

export interface ValidationResult {
  ok: boolean
  erreurs: string[]
  distribueParTaille: Record<string, number>
}

/**
 * Distribue les quantités par taille dans des cartons.
 *
 * Optimisation :
 * - Multi-types de cartons (capacités différentes). Accepter `types` (liste
 *   sélectionnée) ou, pour compatibilité, un simple nombre de capacité.
 * - Nombre de cartons minimal : `ceil(total / plus grande capacité)`.
 * - Remplissage équilibré : chaque carton reçoit ~ total/n (jamais un carton
 *   quasi-vide) tout en respectant sa capacité.
 * - Le dernier carton peut utiliser un type plus petit si sa charge le permet.
 * - Les cartons manuels éventuels sont d'abord soustraits de la demande.
 */
export function repartirParTailles(
  demande: TailleQty[],
  types: CartonType[] | number,
  manuels: Omit<Carton, "numero">[] = []
): ColisageResult {
  const typesNorm = Array.isArray(types)
    ? types
        .map((t) => ({ id: t.id, nom: t.nom, capacite: Math.max(0, Math.floor(t.capacite)) }))
        .filter((t) => t.capacite > 0)
    : types > 0
      ? [{ id: "defaut", nom: "Carton", capacite: Math.max(0, Math.floor(types)) }]
      : []

  // Capacités triées décroissantes
  const caps = typesNorm.map((t) => t.capacite).sort((a, b) => b - a)
  const capMax = caps[0] ?? 0

  const restant = new Map<string, number>()
  for (const d of demande) {
    const q = Math.max(0, Math.floor(d.quantite))
    if (q > 0) restant.set(d.taille, (restant.get(d.taille) ?? 0) + q)
  }

  const cartons: Carton[] = []

  // Cartons manuels (composition imposée par l'utilisateur)
  const typesAsc = [...typesNorm].sort((a, b) => a.capacite - b.capacite)
  for (const m of manuels) {
    const contenu: Record<string, number> = {}
    let total = 0
    for (const [taille, q] of Object.entries(m.contenu)) {
      const qte = Math.max(0, Math.floor(q))
      if (qte <= 0) continue
      contenu[taille] = qte
      total += qte
      const restantQ = (restant.get(taille) ?? 0) - qte
      if (restantQ <= 0) restant.delete(taille)
      else restant.set(taille, restantQ)
    }
    if (total > 0) {
      const t = typesAsc.find((tt) => tt.capacite >= total) ?? typesNorm[0]
      cartons.push({
        numero: cartons.length + 1,
        contenu,
        totalPieces: total,
        capacite: t?.capacite,
        typeNom: t?.nom,
      })
    }
  }

  const restTotal = Array.from(restant.values()).reduce((s, q) => s + q, 0)

  if (restTotal <= 0) {
    const totalPieces = cartons.reduce((s, c) => s + c.totalPieces, 0)
    return {
      cartons,
      nbCartons: cartons.length,
      totalPieces,
      capaciteCarton: capMax,
      types: typesNorm,
    }
  }

  // Sans limite (aucun type renseigné) : un seul carton contient le reste
  if (capMax <= 0) {
    const contenu: Record<string, number> = {}
    let total = 0
    for (const [taille, q] of restant) {
      contenu[taille] = q
      total += q
    }
    cartons.push({
      numero: cartons.length + 1,
      contenu,
      totalPieces: total,
      capacite: 0,
      typeNom: "Sans limite",
    })
    return { cartons, nbCartons: cartons.length, totalPieces: total, capaciteCarton: 0 }
  }

  // Nombre de cartons minimal et charges équilibrées
  let N = Math.max(1, Math.ceil(restTotal / capMax))

  const loads: number[] = []
  let rem = restTotal
  for (let i = 0; i < N; i++) {
    const left = N - i
    const share = left === 1 ? rem : Math.ceil(rem / left)
    loads.push(share)
    rem -= share
  }
  // Éliminer d'éventuels cartons à charge nulle
  while (loads.length > 0 && loads[loads.length - 1] <= 0) loads.pop()
  N = loads.length
  if (N === 0) {
    const totalPieces = cartons.reduce((s, c) => s + c.totalPieces, 0)
    return {
      cartons,
      nbCartons: cartons.length,
      totalPieces,
      capaciteCarton: capMax,
      types: typesNorm,
    }
  }

  // Capacité / type choisi par carton : le plus petit type ≥ charge
  const capsPerCarton = loads.map((load) => {
    const t = typesAsc.find((tt) => tt.capacite >= load)
    return t ?? typesNorm[0] ?? { id: "defaut", nom: "Carton", capacite: capMax }
  })

  const autoCartons: Array<{ contenu: Record<string, number>; totalPieces: number; capacite: number; typeNom: string }> =
    loads.map((load, i) => ({
      contenu: {},
      totalPieces: load,
      capacite: capsPerCarton[i].capacite,
      typeNom: capsPerCarton[i].nom,
    }))

  // Distribution : ordre déterministe (grandes quantités d'abord), on remplit
  // chaque carton jusqu'à sa charge cible, en scindant une taille si besoin.
  const tailles = Array.from(restant.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  let ci = 0
  let used = 0
  for (const [taille, qty] of tailles) {
    let q = qty
    while (q > 0 && ci < N) {
      const target = loads[ci]
      const space = target - used
      if (space <= 0) {
        ci++
        used = 0
        continue
      }
      const take = Math.min(q, space)
      autoCartons[ci].contenu[taille] = (autoCartons[ci].contenu[taille] ?? 0) + take
      used += take
      q -= take
      if (used >= target) {
        ci++
        used = 0
      }
    }
  }

  autoCartons.forEach((c) => {
    cartons.push({ numero: cartons.length + 1, ...c })
  })

  const totalPieces = cartons.reduce((s, c) => s + c.totalPieces, 0)

  return { cartons, nbCartons: cartons.length, totalPieces, capaciteCarton: capMax, types: typesNorm }
}

/**
 * Vérifie que la somme des quantités par taille de tous les cartons
 * correspond exactement aux quantités demandées.
 */
export function validerColisage(
  demande: TailleQty[],
  cartons: Array<{ contenu: Record<string, number> }>
): ValidationResult {
  const erreurs: string[] = []
  const distribueParTaille: Record<string, number> = {}

  for (const c of cartons) {
    for (const [taille, q] of Object.entries(c.contenu)) {
      distribueParTaille[taille] = (distribueParTaille[taille] ?? 0) + q
    }
  }

  const demandeParTaille: Record<string, number> = {}
  for (const d of demande) {
    demandeParTaille[d.taille] = (demandeParTaille[d.taille] ?? 0) + d.quantite
  }

  for (const [taille, q] of Object.entries(demandeParTaille)) {
    const distribue = distribueParTaille[taille] ?? 0
    if (distribue !== q) {
      erreurs.push(`Taille ${taille} : ${distribue} distribué(s) / ${q} demandé(s)`)
    }
  }
  for (const [taille, q] of Object.entries(distribueParTaille)) {
    if (!(taille in demandeParTaille)) {
      erreurs.push(`Taille ${taille} : ${q} distribué(s) sans demande`)
    }
  }

  return { ok: erreurs.length === 0, erreurs, distribueParTaille }
}
