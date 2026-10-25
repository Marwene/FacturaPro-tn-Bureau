import { z } from "zod";

// ─── Auth publique (bootstrap + vérification e-mail) — schémas partagés ───────
// Lot E2a (Annexe A) : ces 3 routes sont PUBLIQUES (appelées pré-auth) et ne
// passent PAS par le wrapper `apiRoute` (qui impose une session → 401) — cf.
// `docs/wiki/auth.md` § routes publiques. Elles valident leur body avec
// `safeParse` et rejettent avec le MÊME contrat 422 que le wrapper :
// `{ error: "Données invalides", issues, success: false }` via `errorResponse`.

/** POST /api/auth/register — inscription bootstrap (premier ADMIN, uniquement si aucun compte n'existe). */
export const registerSchema = z.object({
    name: z.string().min(1, "Nom requis"),
    email: z.string().min(1, "Email requis"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/** POST /api/auth/resend-code — renvoi du code de vérification. */
export const resendCodeSchema = z.object({
    email: z.string().min(1, "Email requis"),
});

export type ResendCodeInput = z.infer<typeof resendCodeSchema>;

/** POST /api/users/verify-email — validation du code de vérification. */
export const verifyEmailSchema = z.object({
    email: z.string().min(1, "Email requis"),
    code: z.string().min(1, "Code requis"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
