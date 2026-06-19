/**
 * AI provider logic for Edge Functions. Ported from server/services/ai.ts to
 * pure fetch (no SDK) so it runs in Deno. Supports groq, cerebras, gemini.
 * Prompts preserve the honesty/grounding rules from the Express version.
 */

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type AiProviderName = "groq" | "cerebras" | "gemini";

export type SummaryResult = {
    keyTakeaways: string[];
    recommendedAction: string;
    timestamp: string;
};

export type LessonPlanResult = {
    title: string;
    overview: string;
    steps: { title: string; goal: string; practice: string; durationMinutes: number }[];
    checkpoints: string[];
};

const PROVIDER_CONFIG: Record<Exclude<AiProviderName, "gemini">, {
    apiKeyEnv: string;
    modelEnv: string;
    defaultModel: string;
    endpoint: string;
}> = {
    groq: {
        apiKeyEnv: "GROQ_API_KEY",
        modelEnv: "GROQ_MODEL",
        defaultModel: "llama-3.3-70b-versatile",
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
    },
    cerebras: {
        apiKeyEnv: "CEREBRAS_API_KEY",
        modelEnv: "CEREBRAS_MODEL",
        defaultModel: "llama-3.3-70b",
        endpoint: "https://api.cerebras.ai/v1/chat/completions",
    },
};

function env(name: string): string | undefined {
    return Deno.env.get(name);
}

function getMaxOutputTokens(): number {
    const value = Number(env("AI_MAX_OUTPUT_TOKENS"));
    return Number.isFinite(value) && value > 0 ? value : 900;
}

// Control layers (env-tunable):
//   AI_TEMPERATURE      creativity/randomness (0..2), default 0.2
//   AI_STOP_SEQUENCES   comma-separated strings that end generation, optional
function getTemperature(): number {
    const value = Number(env("AI_TEMPERATURE"));
    return Number.isFinite(value) && value >= 0 ? value : 0.2;
}

function getStopSequences(): string[] {
    return (env("AI_STOP_SEQUENCES") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

function getPreferredProvider(): AiProviderName {
    const configured = env("AI_PROVIDER")?.toLowerCase();
    if (configured === "groq" || configured === "cerebras" || configured === "gemini") {
        return configured;
    }
    if (env("GROQ_API_KEY")) return "groq";
    if (env("CEREBRAS_API_KEY")) return "cerebras";
    return "gemini";
}

async function callOpenAiCompatible(
    provider: Exclude<AiProviderName, "gemini">,
    messages: ChatMessage[],
): Promise<string> {
    const config = PROVIDER_CONFIG[provider];
    const apiKey = env(config.apiKeyEnv);
    if (!apiKey) throw new Error(`${config.apiKeyEnv} is not set`);

    const stop = getStopSequences();
    const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: env(config.modelEnv) || env("AI_MODEL") || config.defaultModel,
            messages,
            temperature: getTemperature(),
            max_tokens: getMaxOutputTokens(),
            ...(stop.length > 0 ? { stop } : {}),
        }),
    });

    if (!response.ok) {
        throw new Error(`${provider} request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${provider} returned an empty response`);
    return content;
}

async function callGemini(messages: ChatMessage[]): Promise<string> {
    const apiKey = env("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    const model = env("GEMINI_MODEL") || "gemini-2.0-flash-exp";

    const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    const stop = getStopSequences();
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: getMaxOutputTokens(),
                    temperature: getTemperature(),
                    ...(stop.length > 0 ? { stopSequences: stop } : {}),
                },
            }),
        },
    );

    if (!response.ok) {
        throw new Error(`gemini request failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    if (!text) throw new Error("gemini returned an empty response");
    return text;
}

async function generateText(messages: ChatMessage[]): Promise<string> {
    const provider = getPreferredProvider();
    return provider === "gemini" ? callGemini(messages) : callOpenAiCompatible(provider, messages);
}

function extractJson(text: string): string {
    const fenced = text.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();
    const first = fenced.indexOf("{");
    const last = fenced.lastIndexOf("}");
    return first >= 0 && last > first ? fenced.slice(first, last + 1) : fenced;
}

function fallbackSummary(videoTitle: string): SummaryResult {
    return {
        keyTakeaways: [
            `Analysis of ${videoTitle} concepts`,
            "Key ideas need transcript context for a precise summary",
            "Add a transcript source to make this lesson plan specific",
        ],
        recommendedAction: "Add an AI provider key and transcript extraction to generate grounded learning guidance.",
        timestamp: "00:00",
    };
}

export async function generateSummary(videoTitle: string, context?: string): Promise<SummaryResult> {
    try {
        const text = await generateText([
            {
                role: "system",
                content: "You are an expert educational assistant. You are given only a video title and, optionally, the learner's notes — you do NOT have a transcript or the actual video content. Base your takeaways on this limited context. Keep them honest and clearly general when the topic is uncertain, and never invent specific quotes, statistics, names, or timestamps. Return only valid JSON.",
            },
            {
                role: "user",
                content: `Analyze this learning video topic: "${videoTitle}".
${context ? `Additional context:\n${context}` : ""}

Return JSON with:
- keyTakeaways: array of exactly 3 concise strings
- recommendedAction: one specific learner action
- timestamp: a relevant timestamp string, or "00:00" if unknown`,
            },
        ]);

        const parsed = JSON.parse(extractJson(text));
        return {
            keyTakeaways: Array.isArray(parsed.keyTakeaways)
                ? parsed.keyTakeaways.slice(0, 3).map(String)
                : fallbackSummary(videoTitle).keyTakeaways,
            recommendedAction: String(parsed.recommendedAction || "Review the most important section and write one practical takeaway."),
            timestamp: String(parsed.timestamp || "00:00"),
        };
    } catch (error) {
        console.error("AI Summary Generation Failed:", error);
        return fallbackSummary(videoTitle);
    }
}

export async function generateChatResponse(
    message: string,
    options: { title?: string; context?: string } = {},
): Promise<string> {
    const sessionName = options.title || options.context || "Learning Session";
    try {
        return await generateText([
            {
                role: "system",
                content: `You are a concise teaching assistant for the learning session: "${sessionName}". Ground your answers in the learner's notes and the video title below. There is no full transcript available, so be honest: distinguish what you can reasonably infer from what would need the actual video to confirm, and never fabricate specific quotes, timestamps, or exact claims about the video's content.${options.context ? `\n\nSession context:\n${options.context}` : ""}`,
            },
            { role: "user", content: message },
        ]);
    } catch (error) {
        console.error("AI Chat Failed:", error);
        return "AI is not configured yet. Set AI_PROVIDER plus a provider key in Supabase secrets.";
    }
}

function fallbackLessonPlan(videoTitle: string): LessonPlanResult {
    return {
        title: `Practice plan for ${videoTitle}`,
        overview: "This plan is based on the available title and notes. Add a transcript later for a more specific sequence.",
        steps: [
            { title: "Preview the core idea", goal: "Identify the main concept being taught before practicing details.", practice: "Watch the opening section, pause at the first clear demonstration, and write one sentence describing the skill.", durationMinutes: 5 },
            { title: "Break down the demonstration", goal: "Turn the lesson into a repeatable movement or decision.", practice: "Replay a short section, copy it slowly, then note what changes your result.", durationMinutes: 12 },
            { title: "Apply it independently", goal: "Use the concept without copying the video exactly.", practice: "Create a small variation, record one attempt, and compare it against the original example.", durationMinutes: 8 },
        ],
        checkpoints: [
            "Can explain the concept in your own words",
            "Can repeat the example slowly without stopping",
            "Can create one variation from the same idea",
        ],
    };
}

export async function generateLessonPlan(videoTitle: string, context?: string): Promise<LessonPlanResult> {
    try {
        const text = await generateText([
            {
                role: "system",
                content: "You are an expert learning coach. Return only valid JSON. Build practical lesson plans that can be followed while watching a video.",
            },
            {
                role: "user",
                content: `Create a structured lesson plan for this learning video: "${videoTitle}".
${context ? `Available learner context:\n${context}` : "No transcript is available yet. Use only the title and any broad inferences, and avoid inventing exact claims."}

Return JSON with:
- title: concise string
- overview: one sentence
- steps: array of 3 to 5 objects with title, goal, practice, durationMinutes
- checkpoints: array of 3 to 4 concise strings

Make the plan specific to the topic where possible, but be honest when transcript context is missing.`,
            },
        ]);

        const parsed = JSON.parse(extractJson(text));
        const steps = Array.isArray(parsed.steps) ? parsed.steps.slice(0, 5) : [];
        if (steps.length === 0) return fallbackLessonPlan(videoTitle);

        return {
            title: String(parsed.title || `Practice plan for ${videoTitle}`),
            overview: String(parsed.overview || "A short structured plan for reviewing and practicing this lesson."),
            steps: steps.map((step: any, index: number) => ({
                title: String(step.title || `Step ${index + 1}`),
                goal: String(step.goal || "Understand and practice the next important concept."),
                practice: String(step.practice || "Review the lesson section, then apply the idea in a short focused drill."),
                durationMinutes: Number.isFinite(Number(step.durationMinutes)) ? Number(step.durationMinutes) : 10,
            })),
            checkpoints: Array.isArray(parsed.checkpoints)
                ? parsed.checkpoints.slice(0, 4).map(String)
                : ["Write one takeaway", "Practice one example", "Create one variation"],
        };
    } catch (error) {
        console.error("AI Lesson Plan Failed:", error);
        return fallbackLessonPlan(videoTitle);
    }
}
