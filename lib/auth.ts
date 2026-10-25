import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
    DeactivatedAccountError,
    InvalidCredentialsError,
    RateLimitedSignInError,
    UnverifiedEmailError,
} from "./auth-errors";
import {
    clearRateLimit,
    consumeRateLimit,
    LOGIN_ACCOUNT_LIMIT,
    rateLimitKey,
    type RateLimitDecision,
} from "./rate-limit";

interface AuthorizeUser extends User {
  role: string;
  companyId: string | null;
  emailVerified: Date | null;
  permissions: string[];
  allowedCompanyIds: string[];
  rememberMe: boolean;
}

const SESSION_INACTIVITY_MS = 30 * 60 * 1000; // 30 min sans "Se souvenir de moi"
const REMEMBER_ME_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000; // 7j avec "Se souvenir de moi"

export const { handlers, signIn, signOut, auth } = NextAuth({
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7j — durée de vie max du cookie JWT. Pour les sessions sans "Se souvenir de moi", l'expiration est gérée par le session-marker signé (httpOnly, posé par la Server Action de login, supprimé à la fermeture du navigateur) vérifié par proxy.ts.
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                rememberMe: { label: "Se souvenir de moi", type: "checkbox" },
            },
            async authorize(credentials) {
                // C2 — les motifs connus sont désormais LÉVÉS (sous-classes de
                // `CredentialsSignin`, cf. `lib/auth-errors.ts`) au lieu de
                // `return null` : le client reçoit un `code` structuré
                // (`invalid_credentials | deactivated | unverified | rate_limited`).
                if (!credentials?.email || !credentials?.password) {
                    throw new InvalidCredentialsError();
                }

                // Rate limit PAR COMPTE (10 tentatives / 15 min) — incrémenté à
                // chaque tentative, AVANT toute requête DB. Bloqué → erreur
                // `rate_limited` portant le délai restant (secondes). Fail-open :
                // une erreur inattendue du compteur ne bloque jamais la connexion.
                const accountKey = rateLimitKey(
                    "login",
                    "account",
                    String(credentials.email)
                );
                let accountDecision: RateLimitDecision;
                try {
                    accountDecision = await consumeRateLimit(
                        accountKey,
                        LOGIN_ACCOUNT_LIMIT
                    );
                } catch {
                    accountDecision = {
                        ok: true,
                        remaining: LOGIN_ACCOUNT_LIMIT.limit,
                        resetAt: new Date(Date.now() + LOGIN_ACCOUNT_LIMIT.windowMs),
                    };
                }
                if (!accountDecision.ok) {
                    throw new RateLimitedSignInError(accountDecision.retryAfterSeconds);
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                    include: { userCompanies: true },
                });

                // Utilisateur inconnu OU mot de passe incorrect : même code
                // `invalid_credentials` (aucun signal différencié).
                if (!user || !user.passwordHash) throw new InvalidCredentialsError();

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                );

                if (!isValid) throw new InvalidCredentialsError();

                // Block deactivated accounts
                if (user.actif === false) throw new DeactivatedAccountError();

                // La vérification de l'email doit précéder la connexion
                if (!user.emailVerified) throw new UnverifiedEmailError();

                const authUser: AuthorizeUser = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    role: user.role,
                    companyId: user.companyId,
                    emailVerified: user.emailVerified,
                    permissions: user.permissions,
                    allowedCompanyIds: user.userCompanies.map((uc) => uc.companyId),
                    rememberMe: credentials.rememberMe === "true",
                };
                // Login réussi → remise à zéro du compteur de compte
                // (clearRateLimit est fail-open, ne peut donc pas faire échouer
                // une connexion pourtant valide).
                await clearRateLimit(accountKey);
                return authUser;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id as string;
                token.role = (user as { role?: string }).role as string;
                token.companyId = (user as { companyId?: string | null }).companyId as string;
                token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified as Date | null;
                token.permissions = (user as { permissions?: string[] }).permissions ?? [];
                token.allowedCompanyIds = (user as { allowedCompanyIds?: string[] }).allowedCompanyIds ?? [];
                token.rememberMe = (user as { rememberMe?: boolean }).rememberMe === true;
                token.lastActivity = Date.now();
            }

            // Vérification d'inactivité à chaque appel JWT
            if (token.lastActivity) {
                const now = Date.now();
                const maxInactivity = token.rememberMe
                    ? REMEMBER_ME_INACTIVITY_MS
                    : SESSION_INACTIVITY_MS;

                if (now - (token.lastActivity as number) > maxInactivity) {
                    return null; // session expirée → logout
                }

                // sliding expiration : met à jour lastActivity
                token.lastActivity = now;
            }

            // Resynchronise les données métier depuis la base à chaque appel,
            // afin que le token reflète l'état courant (ex : création de la première
            // société pendant l'onboarding, nouveaux liens société, vérification email).
            if (token.id) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: {
                            companyId: true,
                            role: true,
                            permissions: true,
                            emailVerified: true,
                            userCompanies: { select: { companyId: true } },
                        },
                    });
                    if (dbUser) {
                        token.companyId = dbUser.companyId as string;
                        token.role = dbUser.role;
                        token.permissions = dbUser.permissions;
                        token.emailVerified = dbUser.emailVerified;
                        token.allowedCompanyIds = dbUser.userCompanies.map((uc) => uc.companyId);
                    }
                } catch {
                    // Conserver le token existant si la lecture échoue
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                (session.user as { role?: string }).role = token.role as string;
                (session.user as { companyId?: string }).companyId = token.companyId as string;
                (session.user as { emailVerified?: Date | null }).emailVerified = token.emailVerified as Date | null;
                (session.user as { permissions?: string[] }).permissions = token.permissions as string[] ?? [];
                (session.user as { allowedCompanyIds?: string[] }).allowedCompanyIds = token.allowedCompanyIds as string[] ?? [];
            }
            return session;
        },
    },
});
