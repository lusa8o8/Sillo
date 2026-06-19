/**
 * Firebase ID token verification for Deno Edge Functions.
 *
 * Mirrors the Express `authMiddleware`, but without firebase-admin. Firebase
 * signs ID tokens with rotating RSA keys published as a JWK set; `jose` fetches
 * and caches them, and verifies the signature, issuer, audience, and expiry.
 *
 * Requires the FIREBASE_PROJECT_ID secret (e.g. "sillo-42acd").
 */

import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const FIREBASE_JWKS_URL =
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

// Cached across warm invocations.
const jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

export class AuthError extends Error {
    constructor(message: string, public readonly status: number) {
        super(message);
        this.name = "AuthError";
    }
}

export interface AuthedUser {
    uid: string;
    email?: string;
}

function bearer(authHeader: string | null): string {
    const match = (authHeader || "").match(/^Bearer\s+(.+)$/i);
    if (!match) throw new AuthError("Authentication required.", 401);
    return match[1].trim();
}

export async function verifyFirebaseToken(authHeader: string | null): Promise<AuthedUser> {
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    if (!projectId) {
        throw new AuthError("Authentication is not configured.", 500);
    }

    const token = bearer(authHeader);

    try {
        const { payload } = await jwtVerify(token, jwks, {
            issuer: `https://securetoken.google.com/${projectId}`,
            audience: projectId,
        });

        if (!payload.sub) {
            throw new AuthError("Invalid token: missing subject.", 401);
        }

        return {
            uid: payload.sub,
            email: typeof payload.email === "string" ? payload.email : undefined,
        };
    } catch (error) {
        if (error instanceof AuthError) throw error;
        throw new AuthError("Invalid or expired session. Please sign in again.", 401);
    }
}
