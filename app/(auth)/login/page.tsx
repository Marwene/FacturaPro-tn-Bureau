import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { hasAdminCached } from "@/lib/bootstrap";
import { safeInternalPath, DEFAULT_POST_LOGIN_ROUTE } from "@/lib/safe-internal-path";
import { decodeSessionToken, readSessionToken } from "@/lib/session-token";
import { markerSatisfied } from "@/lib/session-marker";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage(props: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  // C2 (item 7) — session déjà active → retour direct au flux applicatif.
  // Couche complémentaire de la redirection de proxy.ts (vale pour les
  // navigations RSC et tout chemin contournant le middleware).
  // Sans impact sur le flow verify-email : les comptes non vérifiés n'ont
  // jamais de session (`authorize()` les refuse — `lib/auth-errors.ts`).
  //
  // 2026-10-20 — la redirection n'a lieu que si la session est **conforme au
  // marqueur** (même règle que `proxy.ts`, helper partagé
  // `markerSatisfied(cookies, source, token)` — `lib/session-marker.ts`) :
  // `rememberMe !== false` → toujours OK ; `rememberMe === false` →
  // `__session-marker` signé et lié aux claims stables du jeton réellement lu.
  // Sans ça, une
  // session rejouée/perdue sans son marqueur redirigeait vers le repli sans
  // re-vérifier → boucle /login ↔ repli.
  //
  // On garde `auth()` (et NON le décodage brut seul) : c'est le callback
  // `jwt` de `lib/auth.ts` qui applique la vérification d'inactivité
  // glissante (`lastActivity`) ET resynchronise les données métier depuis la
  // base — `decodeSessionToken` ne fait que déchiffrer/valider le JWT.
  // Le décodage brut n'est utilisé ici qu'en complément, pour obtenir
  // `token.rememberMe` et l'id portant le `bind` du marqueur (lié aux claims
  // stables du jeton décodé, pas à sa valeur exacte — `auth()` ne donne ni
  // l'un ni l'autre).
  const session = await auth();
  if (session?.user?.id) {
    const cookieStore = await cookies();
    const source = readSessionToken(cookieStore);
    const token = source ? await decodeSessionToken(source) : null;
    const markerOk =
      source !== null &&
      token !== null &&
      (await markerSatisfied(cookieStore, source, token));

    if (markerOk) {
      const searchParams = await props.searchParams;
      redirect(safeInternalPath(searchParams?.callbackUrl) ?? DEFAULT_POST_LOGIN_ROUTE);
    }
    // Session présente mais marqueur absent/invalidé → ON REND le formulaire
    // de reconnexion (ni redirection ni message d'erreur) : l'utilisateur
    // reconnectable, pas de boucle.
  }

  // Cache mémoire TTL (et non `cache()` React, limité à une requête) :
  // voir lib/bootstrap.ts — 0 requête DB au rendu suivant.
  const adminExists = await hasAdminCached();
  if (!adminExists) redirect("/register");

  return <LoginForm />;
}
