/**
 * AI request guard for Edge Functions.
 *
 * Cost/abuse control is handled at the model layer (max_tokens, temperature,
 * stop_sequences) inside ai.ts. This guard only does the cheap, stateless
 * checks: optional paid gating and a hard input-size cap. No database rows.
 */

export type AiErrorCode = "AI_GATED" | "AI_INPUT_TOO_LARGE";

export class GuardError extends Error {
    constructor(
        public readonly code: AiErrorCode,
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = "GuardError";
    }
}

function envNumber(name: string, fallback: number): number {
    const value = Number(Deno.env.get(name));
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function envFlag(name: string): boolean {
    return ["1", "true", "yes", "on"].includes((Deno.env.get(name) || "").toLowerCase());
}

function envList(name: string): string[] {
    return (Deno.env.get(name) || "").split(",").map((e) => e.trim()).filter(Boolean);
}

function ensureEntitled(userId: string): void {
    if (!envFlag("AI_GATING_ENABLED")) return;
    if (envList("AI_ALLOWLIST_USER_IDS").includes(userId)) return;
    throw new GuardError(
        "AI_GATED",
        402,
        "AI features require an active plan. Upgrade to generate summaries, lesson plans, and use the chat coach.",
    );
}

function validateInputs(inputs: Array<string | undefined | null>): void {
    const maxInputChars = envNumber("AI_MAX_INPUT_CHARS", 4000);
    for (const input of inputs) {
        if (input && input.length > maxInputChars) {
            throw new GuardError(
                "AI_INPUT_TOO_LARGE",
                400,
                `Input is too long. Keep each field under ${maxInputChars} characters.`,
            );
        }
    }
}

export function guardAiRequest(userId: string, inputs: Array<string | undefined | null>): void {
    ensureEntitled(userId);
    validateInputs(inputs);
}
