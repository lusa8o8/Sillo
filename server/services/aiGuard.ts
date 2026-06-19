/**
 * AI request guard: gating, input validation, and token-budget rate limiting.
 *
 * This protects the AI endpoints from cost/abuse and provides a single place to
 * gate the features behind a paid entitlement.
 *
 * NOTE ON RATE LIMITING + SERVERLESS:
 * The rate limiter below keeps state in memory. That is fine for the long-lived
 * dev Express server, but on serverless targets (Vercel / Firebase Functions)
 * memory is per-instance and resets on cold start, so limits are only
 * approximate and not shared across instances. Swap `MemoryRateLimitStore` for a
 * shared store (Postgres, Upstash/Redis, Durable Object) before relying on this
 * for real abuse protection in production. The `RateLimitStore` interface is
 * intentionally small to make that swap easy.
 */

export type AiErrorCode =
    | "AI_GATED"
    | "AI_INPUT_TOO_LARGE"
    | "AI_RATE_LIMITED";

export class AiGuardError extends Error {
    constructor(
        public readonly code: AiErrorCode,
        public readonly statusCode: number,
        message: string,
    ) {
        super(message);
        this.name = "AiGuardError";
    }
}

function envNumber(name: string, fallback: number): number {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function envFlag(name: string): boolean {
    return ["1", "true", "yes", "on"].includes((process.env[name] || "").toLowerCase());
}

function envList(name: string): string[] {
    return (process.env[name] || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

// Rough token estimate. Avoids pulling in a tokenizer dependency; ~4 chars/token
// is a standard heuristic for English text and is good enough for budgeting.
export function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

interface RateLimitDecision {
    allowed: boolean;
    retryAfterSeconds: number;
    reason?: "requests" | "tokens";
}

interface RateLimitStore {
    consume(key: string, tokens: number): RateLimitDecision;
}

interface Bucket {
    windowStart: number;
    requests: number;
    tokens: number;
}

class MemoryRateLimitStore implements RateLimitStore {
    private buckets = new Map<string, Bucket>();

    consume(key: string, tokens: number): RateLimitDecision {
        const windowMs = envNumber("AI_RATE_LIMIT_WINDOW_MS", 60_000);
        const maxRequests = envNumber("AI_RATE_LIMIT_MAX_REQUESTS", 20);
        const maxTokens = envNumber("AI_RATE_LIMIT_MAX_TOKENS", 20_000);

        const now = Date.now();
        let bucket = this.buckets.get(key);

        if (!bucket || now - bucket.windowStart >= windowMs) {
            bucket = { windowStart: now, requests: 0, tokens: 0 };
            this.buckets.set(key, bucket);
        }

        const retryAfterSeconds = Math.max(
            1,
            Math.ceil((bucket.windowStart + windowMs - now) / 1000),
        );

        if (bucket.requests + 1 > maxRequests) {
            return { allowed: false, retryAfterSeconds, reason: "requests" };
        }

        if (bucket.tokens + tokens > maxTokens) {
            return { allowed: false, retryAfterSeconds, reason: "tokens" };
        }

        bucket.requests += 1;
        bucket.tokens += tokens;
        return { allowed: true, retryAfterSeconds: 0 };
    }
}

const rateLimitStore: RateLimitStore = new MemoryRateLimitStore();

/**
 * Gating: when AI_GATING_ENABLED is on, only allowlisted user ids may use AI
 * features. This is the seam for paid access — replace the allowlist check with
 * a real entitlement/subscription lookup once billing is wired in.
 */
function ensureEntitled(userId: string): void {
    if (!envFlag("AI_GATING_ENABLED")) return;

    const allowlist = envList("AI_ALLOWLIST_USER_IDS");
    if (allowlist.includes(userId)) return;

    throw new AiGuardError(
        "AI_GATED",
        402,
        "AI features require an active plan. Upgrade to generate summaries, lesson plans, and use the chat coach.",
    );
}

function validateInputs(inputs: Array<string | undefined | null>): number {
    const maxInputChars = envNumber("AI_MAX_INPUT_CHARS", 4000);

    let totalChars = 0;
    for (const input of inputs) {
        if (!input) continue;
        if (input.length > maxInputChars) {
            throw new AiGuardError(
                "AI_INPUT_TOO_LARGE",
                400,
                `Input is too long. Keep each field under ${maxInputChars} characters.`,
            );
        }
        totalChars += input.length;
    }

    return totalChars;
}

export interface GuardAiRequestArgs {
    userId: string;
    inputs: Array<string | undefined | null>;
}

/**
 * Single entry point for AI routes: enforces gating, input size caps, and the
 * token-budget rate limit. Throws AiGuardError on rejection.
 */
export function guardAiRequest({ userId, inputs }: GuardAiRequestArgs): void {
    ensureEntitled(userId);

    const totalInputChars = validateInputs(inputs);

    // Budget = estimated input tokens + the reserved output ceiling, so a single
    // request is accounted for its full potential cost.
    const reservedOutputTokens = envNumber("AI_MAX_OUTPUT_TOKENS", 900);
    const estimatedTokens = estimateTokens(" ".repeat(totalInputChars)) + reservedOutputTokens;

    const decision = rateLimitStore.consume(userId, estimatedTokens);
    if (!decision.allowed) {
        const message =
            decision.reason === "tokens"
                ? "AI token budget exceeded for now. Try again shortly."
                : "Too many AI requests. Please slow down and try again shortly.";
        throw new AiGuardError("AI_RATE_LIMITED", 429, message);
    }
}
