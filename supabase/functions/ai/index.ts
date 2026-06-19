/**
 * AI Edge Function. Replaces the Express /api/ai/* routes.
 *
 * Routes (by trailing path segment):
 *   POST .../ai/summary       { title, context? }
 *   POST .../ai/chat          { message, title?, context? }
 *   POST .../ai/lesson-plan   { title, context? }
 *
 * Each request is authenticated with a Firebase ID token and passed through the
 * gating / input-cap / rate-limit guard before hitting a provider.
 */
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
import { AuthError, verifyFirebaseToken } from "../_shared/auth.ts";
import { GuardError, guardAiRequest } from "../_shared/guard.ts";
import { generateChatResponse, generateLessonPlan, generateSummary } from "../_shared/ai.ts";

function json(body: unknown, status: number, origin: string | null): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
}

Deno.serve(async (req) => {
    const preflight = handlePreflight(req);
    if (preflight) return preflight;

    const origin = req.headers.get("origin");

    if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405, origin);
    }

    // Last path segment selects the action (e.g. /functions/v1/ai/summary).
    const action = new URL(req.url).pathname.split("/").filter(Boolean).pop();

    try {
        const user = await verifyFirebaseToken(req.headers.get("authorization"));
        const body = await req.json().catch(() => ({}));

        switch (action) {
            case "summary": {
                const { title, context } = body;
                guardAiRequest(user.uid, [title, context]);
                return json(await generateSummary(title, context), 200, origin);
            }
            case "chat": {
                const { message, title, context } = body;
                if (typeof message !== "string" || !message.trim()) {
                    return json({ error: "Message is required" }, 400, origin);
                }
                guardAiRequest(user.uid, [message, title, context]);
                const reply = await generateChatResponse(message, { title, context });
                return json({ message: reply }, 200, origin);
            }
            case "lesson-plan": {
                const { title, context } = body;
                if (!title) {
                    return json({ error: "Title is required" }, 400, origin);
                }
                guardAiRequest(user.uid, [title, context]);
                return json(await generateLessonPlan(title, context), 200, origin);
            }
            default:
                return json({ error: `Unknown action: ${action}` }, 404, origin);
        }
    } catch (error) {
        if (error instanceof AuthError) {
            return json({ error: error.message }, error.status, origin);
        }
        if (error instanceof GuardError) {
            return json({ error: error.message, code: error.code }, error.status, origin);
        }
        console.error("AI function error:", error);
        return json({ error: "Failed to process AI request" }, 500, origin);
    }
});
