import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, resolveCompanyId } from "@/lib/session"
import { checkPermission, type PermissionKey } from "@/lib/permissions"
import { errorResponse } from "@/lib/schemas"
import { createRequestId, logger } from "@/lib/logger"
import type { SessionUser } from "@/lib/session"
import { z } from "zod"

type RouteContext = { params: Promise<Record<string, string>> }

/**
 * Garde de permission — OBLIGATOIRE (lot E1) :
 *   - soit `permission: PermissionKey` (contrôle centralisé ici), soit
 *   - `authOnly: true` : dérogation explicite, toujours justifiée par un
 *     commentaire `// justifié : …` dans la route (aucune PermissionKey
 *     adaptée, contrôle porté par le handler — rôle ADMIN — ou données
 *     scopées `session.id`).
 * L'union discrimante rend le couple « ni permission ni authOnly » invalide
 * au typage : toute route ajoutée doit choisir explicitement.
 */
type PermissionGate =
  | { permission: PermissionKey; authOnly?: never }
  | { permission?: never; authOnly: true }

export type RouteConfig = PermissionGate & {
  requireCompany?: boolean
  /** Schéma Zod du **body** : parsé automatiquement avant le handler ; échec → 422 `{ error, issues }`. */
  schema?: z.ZodType
  /** Schéma Zod de la **query string** (`Record<string, string>`) : même contrat 422. */
  query?: z.ZodType
}

/**
 * `body` / `query` reçus par le handler : typés via `z.infer` du schéma
 * déclaré dans la config ; `undefined` quand aucun schéma n'est déclaré
 * (jamais `any` — le handler relit alors `request.json()` lui-même, comme
 * avant, en attendant la migration Annexe A du lot E2).
 */
type BodyOf<C> = C extends { schema: infer S extends z.ZodType } ? z.infer<S> : undefined
type QueryOf<C> = C extends { query: infer Q extends z.ZodType } ? z.infer<Q> : undefined

type Handler<C extends RouteConfig> = (
  request: NextRequest,
  context: {
    params: Record<string, string>
    session: SessionUser
    companyId: string
    body: BodyOf<C>
    query: QueryOf<C>
  }
) => Promise<Record<string, unknown> | NextResponse>

/** 422 homogène — contrat `{ error, issues, success: false }` (issues = tableau Zod), cf. `GET /api/tresorerie`. */
function validationResponse(issues: unknown): NextResponse {
  return NextResponse.json({ ...errorResponse("Données invalides"), issues }, { status: 422 })
}

/** Body JSON en `unknown` : absent ou invalide → `undefined`, le schéma décide ensuite (422 si requis). */
async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

function createHandler<C extends RouteConfig>(config: C, handler: Handler<C>) {
  return async (request: NextRequest, { params }: RouteContext) => {
    const requestId = createRequestId()
    try {
      const session = await getSessionFromRequest(request)
      if (!session?.id) {
        return NextResponse.json(errorResponse("Non authentifié"), { status: 401 })
      }

      if (config.permission) {
        const perm = checkPermission(session.role, session.permissions, config.permission)
        if (!perm.allowed) {
          return NextResponse.json(errorResponse(perm.error ?? "Accès refusé"), {
            status: perm.status ?? 403,
          })
        }
      }

      const resolvedParams = await params
      let companyId = ""
      if (config.requireCompany) {
        const result = await resolveCompanyId(request, session)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
        companyId = result.companyId
      }

      // Validation Zod AVANT le handler : body puis query ; échec → 422 `{ error, issues }`.
      const parsedBody = config.schema ? config.schema.safeParse(await readJsonBody(request)) : null
      if (parsedBody && !parsedBody.success) return validationResponse(parsedBody.error.issues)

      const parsedQuery = config.query
        ? config.query.safeParse(Object.fromEntries(request.nextUrl.searchParams))
        : null
      if (parsedQuery && !parsedQuery.success) return validationResponse(parsedQuery.error.issues)

      const result = await handler(request, {
        params: resolvedParams,
        session,
        companyId,
        // `parsedX` est non null exactement quand le schéma correspondant est
        // déclaré : `unknown` → type `z.infer` déduit ; `undefined` sinon.
        body: (parsedBody ? parsedBody.data : undefined) as BodyOf<C>,
        query: (parsedQuery ? parsedQuery.data : undefined) as QueryOf<C>,
      })

      if (result instanceof NextResponse) return result

      return NextResponse.json(result)
    } catch (error) {
      // Plus de fuite : le message brut (Prisma, stack…) part UNIQUEMENT dans
      // le logger serveur, sous le même `requestId` que celui exposé au client.
      logger.error(`[${config.permission ?? "authOnly"}]`, { requestId, error })
      return NextResponse.json(
        { ...errorResponse("Erreur serveur"), requestId },
        { status: 500 },
      )
    }
  }
}

export const apiRoute = {
  get: <C extends RouteConfig>(config: C, handler: Handler<C>) => createHandler(config, handler),
  post: <C extends RouteConfig>(config: C, handler: Handler<C>) => createHandler(config, handler),
  put: <C extends RouteConfig>(config: C, handler: Handler<C>) => createHandler(config, handler),
  patch: <C extends RouteConfig>(config: C, handler: Handler<C>) => createHandler(config, handler),
  delete: <C extends RouteConfig>(config: C, handler: Handler<C>) => createHandler(config, handler),
}
