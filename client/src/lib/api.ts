import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * fetch wrapper that attaches the current user's Firebase ID token as a
 * Bearer header so the server can verify the request. Prefixes relative
 * "/api" paths with VITE_API_URL when configured.
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const url = input.startsWith("/api") ? `${API_BASE}${input}` : input;

    const headers = new Headers(init.headers || {});
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, { ...init, headers, credentials: "include" });
}
