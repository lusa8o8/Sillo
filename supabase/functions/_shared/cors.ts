/**
 * CORS handling for the AI Edge Function.
 *
 * The browser client (served from Vercel) calls these functions cross-origin
 * (*.supabase.co), so we must echo an allowed origin and answer preflight.
 *
 * Configure allowed origins via the ALLOWED_ORIGINS secret (comma-separated),
 * e.g. "https://sillo.vercel.app,http://localhost:5005". If unset, falls back
 * to "*" for local development.
 */

function allowedOrigins(): string[] {
    return (Deno.env.get("ALLOWED_ORIGINS") || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
}

export function corsHeaders(requestOrigin: string | null): Record<string, string> {
    const allow = allowedOrigins();
    let origin = "*";

    if (allow.length > 0) {
        // Only reflect the origin if it's on the allow-list; otherwise pin to
        // the first configured origin so we never echo an untrusted one.
        origin = requestOrigin && allow.includes(requestOrigin) ? requestOrigin : allow[0];
    } else if (requestOrigin) {
        origin = requestOrigin;
    }

    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
    };
}

/** Returns a 204 preflight response if this is an OPTIONS request, else null. */
export function handlePreflight(req: Request): Response | null {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
    }
    return null;
}
