import { z } from "zod";

// ─── User (comptes / invitations) — schémas partagés par les routes `app/api/users/**`
// Lot E2a (Annexe A) : config `schema` du wrapper `apiRoute` — parse avant handler,
// 422 `{ error, issues, success: false }` en cas d'échec, STRIP des clés inconnues
// (correction mass-assignment S-7 : impossible d'injecter `role`/`companyId`/…
// via un payload non déclaré).
//
// Non-régressif vis-à-vis des formulaires réels :
//   - `create-user-dialog`    → name/email/password requis (validés `required` + minLength 6
//                               côté react-hook-form), `role` ∈ {ADMIN, USER}, `permissions`
//                               et `companyIds` optionnels.
//   - `edit-user-dialog`      → envoie un champ UNIQUEMENT s'il a changé ; `password`
//                               (minLength 6, jamais envoyé vide) inclus seulement s'il est
//                               truthy ; `actif` boolean ; `companyIds` toujours fourni.
//   - `securite-settings-client` → `currentPassword` requis, `newPassword` requis minLength 6.

/** POST /api/users — création d'un utilisateur par un ADMIN. */
export const createUserSchema = z.object({
    name: z.string().min(1, "Nom requis"),
    email: z.string().min(1, "Email requis"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    role: z.enum(["ADMIN", "USER"]).optional(),
    permissions: z.array(z.string()).optional(),
    companyIds: z.array(z.string()).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/** PATCH /api/users/[id] — tout optionnel ; `password` court désormais rejeté en 422 (avant : silencieusement ignoré). */
export const updateUserSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    role: z.enum(["ADMIN", "USER"]).optional(),
    password: z
        .string()
        .min(6, "Le mot de passe doit contenir au moins 6 caractères")
        .optional(),
    permissions: z.array(z.string()).optional(),
    actif: z.boolean().optional(),
    companyIds: z.array(z.string()).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** PATCH /api/users/me — profil de l'utilisateur connecté (name/email uniquement). */
export const meUpdateSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
});

export type MeUpdateInput = z.infer<typeof meUpdateSchema>;

/** PATCH /api/users/me/password — changement de son propre mot de passe. */
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Tous les champs sont requis"),
    newPassword: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** POST /api/users/resend-invitation — `password` optionnel (fallback aléatoire côté handler). */
export const resendInvitationSchema = z.object({
    userId: z.string().min(1, "ID utilisateur requis"),
    password: z.string().optional(),
});

export type ResendInvitationInput = z.infer<typeof resendInvitationSchema>;
