import { auth } from "./firebase";

/**
 * Calls the Supabase AI Edge Function. The function is deployed with
 * verify_jwt=false and authenticates via the Firebase ID token we send as a
 * Bearer header (no Supabase anon key needed).
 *
 * Base URL derives from VITE_SUPABASE_URL, e.g.
 *   https://<ref>.supabase.co/functions/v1/ai
 */
const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/ai`;

export type AiAction = "summary" | "chat" | "lesson-plan";

export async function aiFetch(action: AiAction, body: unknown): Promise<Response> {
    const headers = new Headers({ "Content-Type": "application/json" });
    const user = auth.currentUser;
    if (user) {
        headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
    }

    return fetch(`${FUNCTIONS_BASE}/${action}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
}
