---
name: api-route-guard
description: À charger avant toute création ou modification de route sous app/api/**. Impose l'usage du wrapper lib/api-route.ts (apiRoute/createHandler) au lieu de réimplémenter session/permissions/companyId manuellement.
---

# api-route-guard

## Constat qui justifie ce skill
Le wrapper `lib/api-route.ts` (`createHandler`) existe, vérifie session + permission + `companyId` multi-tenant, et est bien conçu. Mais 0 route sur 111 ne l'utilisait — 45 routes réimplémentaient manuellement `getSessionFromRequest()`. Ce skill existe pour que ça ne se reproduise plus.

## Règle
Toute nouvelle route, ou toute route existante que tu modifies, DOIT être wrappée avec `apiRoute`/`createHandler`.

```ts
// ❌ Interdit — pattern dupliqué 45 fois, à ne plus reproduire
export async function GET(req: Request) {
  const session = await getSessionFromRequest(req)
  if (!session) return new Response('Unauthorized', { status: 401 })
  // ...
}

// ✅ Attendu
export const GET = apiRoute(async ({ session, companyId, permissions }) => {
  // logique métier uniquement — session/permission/companyId déjà résolus
})
```

## Si le wrapper ne couvre pas ton cas
Ne pas contourner. Deux options :
1. Le cas est un vrai besoin générique → proposer un patch de `lib/api-route.ts` à l'agent `architecture`.
2. La route est légitimement publique (`auth/*`, `cron/*`, webhooks BCT) → la lister explicitement dans ton rapport de sortie comme "publique, raison : ...", pour que `qa` puisse la whitelister consciemment.

## Auto-vérification avant de rendre la main
```
grep -L "apiRoute(" <fichiers app/api/**/route.ts modifiés>
```
Ne doit rien retourner, sauf les routes explicitement listées comme publiques dans ton rapport.