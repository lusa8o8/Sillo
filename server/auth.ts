import type { Request, Response, NextFunction } from "express";
import { initializeApp, cert, applicationDefault, getApps, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * Firebase Authentication for the API.
 *
 * Verifies the Firebase ID token sent by the client as `Authorization: Bearer <token>`
 * and attaches the resolved user to `req.user`.
 *
 * Credentials are resolved in this order:
 *   1. FIREBASE_SERVICE_ACCOUNT  - full service account JSON (stringified) in an env var
 *   2. GOOGLE_APPLICATION_CREDENTIALS - path to a service account file (applicationDefault)
 *   3. FIREBASE_PROJECT_ID - project id only; enough for ID token verification
 *
 * Dev fallback: if no credentials are configured AND NODE_ENV !== "production",
 * requests fall back to DEV_USER_ID so local development keeps working. This
 * fallback is NEVER used in production — there, a valid token is always required.
 */

export interface AuthedUser {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
    devFallback?: boolean;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AuthedUser;
        }
    }
}

let cachedAuth: Auth | null | undefined;

function initFirebaseApp(): App | null {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
        try {
            const parsed = JSON.parse(serviceAccountJson);
            return initializeApp({ credential: cert(parsed) });
        } catch (error) {
            console.error("[auth] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", error);
            return null;
        }
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return initializeApp({ credential: applicationDefault() });
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    if (projectId) {
        // projectId alone is sufficient to verify ID tokens (audience check +
        // Google public keys). No private key is needed for verifyIdToken.
        return initializeApp({ projectId });
    }

    return null;
}

function getFirebaseAuth(): Auth | null {
    if (cachedAuth !== undefined) {
        return cachedAuth;
    }
    const app = initFirebaseApp();
    cachedAuth = app ? getAuth(app) : null;
    return cachedAuth;
}

let warnedAboutFallback = false;

function devFallbackUser(): AuthedUser {
    if (!warnedAboutFallback) {
        console.warn(
            "[auth] No Firebase Admin credentials configured. Falling back to DEV_USER_ID for local development. " +
            "Set FIREBASE_SERVICE_ACCOUNT (or GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_PROJECT_ID) to enforce real auth.",
        );
        warnedAboutFallback = true;
    }
    return { uid: process.env.DEV_USER_ID || "user-123", devFallback: true };
}

function extractBearerToken(req: Request): string | null {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const auth = getFirebaseAuth();

    if (!auth) {
        if (process.env.NODE_ENV === "production") {
            res.status(500).json({ error: "Authentication is not configured on the server." });
            return;
        }
        req.user = devFallbackUser();
        next();
        return;
    }

    const token = extractBearerToken(req);
    if (!token) {
        res.status(401).json({ error: "Authentication required." });
        return;
    }

    try {
        const decoded = await auth.verifyIdToken(token);
        req.user = {
            uid: decoded.uid,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture,
        };
        next();
    } catch (error) {
        console.warn("[auth] Token verification failed:", (error as Error).message);
        res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
    }
}

/**
 * Resolves the authenticated user id from a request. Must run after
 * authMiddleware. Throws if no user is present, so a missing guard fails loudly
 * instead of silently leaking data across users.
 */
export function getUserId(req: Request): string {
    if (!req.user?.uid) {
        throw new Error("getUserId called without an authenticated user. Ensure authMiddleware runs first.");
    }
    return req.user.uid;
}
