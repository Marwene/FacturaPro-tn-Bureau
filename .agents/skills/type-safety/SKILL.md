---
name: type-safety
description: À charger avant tout code TypeScript qui touche des données Prisma ou une validation Zod. Interdit any/as any/@ts-ignore et donne la méthode pour dériver le bon type à la place.
---

# type-safety

## Règle
`any`, `as any`, `@ts-ignore`, `@ts-expect-error` sont INTERDITS dans ce projet, sans exception silencieuse. Si tu es tenté d'en écrire un, c'est le signal qu'il faut dériver le type correctement — pas le contourner.

## Comment dériver le bon type selon la situation

**Donnée qui vient de Prisma (résultat de `findMany`, `findUnique`, avec `include`/`select`) :**
```ts
type FactureAvecClient = Prisma.FactureGetPayload<{
  include: { client: true; lignes: true }
}>
```

**Donnée validée par un schéma Zod :**
```ts
type FactureInput = z.infer<typeof factureSchema>
```

**Callback sur une liste typée (`.map`, `.filter`) :**
Ne jamais écrire `(o: any) =>` — le type de l'élément se déduit automatiquement si le tableau source est lui-même typé. Si le tableau vient d'un `useQuery`, type le retour de la query, pas chaque callback.

**Réponse d'API :**
Typer avec le schéma Zod de sortie, pas `any[]`. Exemple concret déjà vu dans ce projet à corriger :
```ts
// ❌
const overdue: any[] = []

// ✅
const overdue: FactureAvecClient[] = []
```

## Cas limite légitime (rare)
Si un type tiers est vraiment impossible à typer proprement (librairie sans types), utiliser `unknown` + une garde de type (`typeof`, `in`, type predicate), jamais `any`. Documenter pourquoi en commentaire.

## Auto-vérification avant de rendre la main
```
grep -rn ": any\b\|as any\b\|@ts-ignore\|@ts-expect-error" <fichiers modifiés>
```
Doit retourner vide.