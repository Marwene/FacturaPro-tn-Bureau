---
name: state-boundaries
description: À charger avant tout composant qui gère de l'état. Décide où placer une donnée — useState local, store Zustand, ou cache TanStack Query — et interdit useEffect pour le data fetching.
---

# state-boundaries

## Décision à prendre systématiquement avant un useState/useEffect

| La donnée est... | Alors elle va dans... |
|---|---|
| Récupérée depuis une API (facture, client, avoir...) | `useQuery` (TanStack Query) |
| Créée/modifiée via une action serveur | `useMutation` (TanStack Query), invalider la query concernée |
| Partagée entre plusieurs composants/pages, pas issue du serveur (ex. filtres de planning, état d'un wizard multi-étapes) | Store Zustand |
| Strictement locale à un seul composant (ouverture d'un dropdown, valeur d'un input avant submit) | `useState` — c'est OK |
| Calculable à partir d'un autre état déjà disponible | `useMemo` ou variable dérivée au rendu — jamais un `useEffect` qui la recopie dans un state |

## useEffect : la seule vraie utilité restante
`useEffect` est réservé aux vrais effets de bord : souscription à un event listener, API navigateur (resize, intersection observer), cleanup à l'unmount. Si tu écris `useEffect(() => { fetch(...) }, [])`, tu es dans le mauvais pattern — remplace par `useQuery`.

Debounce : ne réimplémente pas `setTimeout`/`clearTimeout` — utilise `hooks/use-debounce.ts`, il existe déjà.

## Taille des stores Zustand
Si un store dépasse ~150 lignes, pose-toi la question avant d'ajouter : est-ce que je suis en train d'y mettre des données serveur qui devraient être en cache TanStack Query ? Si oui, ne les ajoute pas au store — remonte le point à `architecture`.

## Auto-vérification
```
grep -n "useEffect(" <fichier>
```
Chaque occurrence doit avoir un commentaire juste au-dessus expliquant pourquoi ce n'est pas un fetch ni un état dérivé déplaçable.