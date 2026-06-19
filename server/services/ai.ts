import { GoogleGenerativeAI } from "@google/generative-ai";

type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

type AiProviderName = "groq" | "cerebras" | "gemini";

type SummaryResult = {
    keyTakeaways: string[];
    recommendedAction: string;
    timestamp: string;
};

type LessonPlanResult = {
    title: string;
    overview: string;
    steps: {
        title: string;
        goal: string;
        practice: string;
        durationMinutes: number;
    }[];
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

let genAI: GoogleGenerativeAI | null = null;
let geminiModel: any = null;

function getMaxOutputTokens(): number {
    const value = Number(process.env.AI_MAX_OUTPUT_TOKENS);
    return Number.isFinite(value) && value > 0 ? value : 900;
}

function getPreferredProvider(): AiProviderName {
    const configured = process.env.AI_PROVIDER?.toLowerCase();
    if (configured === "groq" || configured === "cerebras" || configured === "gemini") {
        return configured;
    }

    if (process.env.GROQ_API_KEY) return "groq";
    if (process.env.CEREBRAS_API_KEY) return "cerebras";
    return "gemini";
}

function getGeminiModel() {
    if (!geminiModel) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set");
        }
        genAI = new GoogleGenerativeAI(apiKey);
        geminiModel = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
            generationConfig: {
                maxOutputTokens: getMaxOutputTokens(),
            },
        });
    }
    return geminiModel;
}

async function callOpenAiCompatible(provider: Exclude<AiProviderName, "gemini">, messages: ChatMessage[]): Promise<string> {
    const config = PROVIDER_CONFIG[provider];
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
        throw new Error(`${config.apiKeyEnv} is not set`);
    }

    const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: process.env[config.modelEnv] || process.env.AI_MODEL || config.defaultModel,
            messages,
            temperature: 0.2,
            max_tokens: getMaxOutputTokens(),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${provider} request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error(`${provider} returned an empty response`);
    }

    return content;
}

async function generateText(messages: ChatMessage[]): Promise<string> {
    const provider = getPreferredProvider();

    if (provider === "gemini") {
        const model = getGeminiModel();
        const prompt = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    return callOpenAiCompatible(provider, messages);
}

function parseSummaryJson(text: string, videoTitle: string): SummaryResult {
    const jsonStr = extractJson(text)
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

    const parsed = JSON.parse(jsonStr);
    return {
        keyTakeaways: Array.isArray(parsed.keyTakeaways)
            ? parsed.keyTakeaways.slice(0, 3).map(String)
            : [`Analysis of ${videoTitle}`, "Important ideas and examples", "Recommended follow-up practice"],
        recommendedAction: String(parsed.recommendedAction || "Review the most important section and write one practical takeaway."),
        timestamp: String(parsed.timestamp || "00:00"),
    };
}

function extractJson(text: string): string {
    const trimmed = text.trim();
    const fenced = trimmed
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

    const firstBrace = fenced.indexOf("{");
    const lastBrace = fenced.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return fenced.slice(firstBrace, lastBrace + 1);
    }

    return fenced;
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

        return parseSummaryJson(text, videoTitle);
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
            {
                role: "user",
                content: message,
            },
        ]);
    } catch (error: any) {
        console.error("AI Chat Failed:", error);
        return `AI is not configured yet. Set AI_PROVIDER plus GROQ_API_KEY or CEREBRAS_API_KEY in .env, then restart the dev server.`;
    }
}

function fallbackLessonPlan(videoTitle: string): LessonPlanResult {
    return {
        title: `Practice plan for ${videoTitle}`,
        overview: "This plan is based on the available title and notes. Add a transcript later for a more specific sequence.",
        steps: [
            {
                title: "Preview the core idea",
                goal: "Identify the main concept being taught before practicing details.",
                practice: "Watch the opening section, pause at the first clear demonstration, and write one sentence describing the skill.",
                durationMinutes: 5,
            },
            {
                title: "Break down the demonstration",
                goal: "Turn the lesson into a repeatable movement or decision.",
                practice: "Replay a short section, copy it slowly, then note what changes your result.",
                durationMinutes: 12,
            },
            {
                title: "Apply it independently",
                goal: "Use the concept without copying the video exactly.",
                practice: "Create a small variation, record one attempt, and compare it against the original example.",
                durationMinutes: 8,
            },
        ],
        checkpoints: [
            "Can explain the concept in your own words",
            "Can repeat the example slowly without stopping",
            "Can create one variation from the same idea",
        ],
    };
}

function parseLessonPlanJson(text: string, videoTitle: string): LessonPlanResult {
    const parsed = JSON.parse(extractJson(text));
    const steps = Array.isArray(parsed.steps) ? parsed.steps.slice(0, 5) : [];

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

        const plan = parseLessonPlanJson(text, videoTitle);
        return plan.steps.length > 0 ? plan : fallbackLessonPlan(videoTitle);
    } catch (error) {
        console.error("AI Lesson Plan Failed:", error);
        return fallbackLessonPlan(videoTitle);
    }
}
