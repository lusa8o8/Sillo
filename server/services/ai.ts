import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy initialization to ensure env vars are loaded
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

function getModel() {
    if (!model) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is missing from environment variables.");
            throw new Error("GEMINI_API_KEY is not set");
        }
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    }
    return model;
}

export async function generateSummary(videoTitle: string, context?: string): Promise<any> {
    try {
        const aiModel = getModel();

        const prompt = `
        You are an expert educational AI assistant.
        Analyze the following video topic: "${videoTitle}".
        ${context ? `Additional Context: ${context}` : ""}
    
        Provide a structured summary in JSON format with the following fields:
        - keyTakeaways: array of 3 strings (brief bullet points)
        - recommendedAction: string (a specific action item for the learner)
        - timestamp: string (a hypothetical timestamp relevant to the action, e.g., "05:30")
    
        Respond ONLY with raw JSON.
        `;

        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/^```json\n|```$/g, "").trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("AI Summary Generation Failed:", error);
        // Fallback mock response if AI fails
        return {
            keyTakeaways: [
                `Analysis of ${videoTitle} concepts`,
                "Key patterns and architectural decisions",
                "Implementation strategies for scalability"
            ],
            recommendedAction: "Review the core concepts introduced in the first section.",
            timestamp: "00:00"
        };
    }
}

export async function generateChatResponse(message: string, context?: string): Promise<string> {
    try {
        const aiModel = getModel();

        const prompt = `
        You are a helpful teaching assistant for the video: "${context || 'Learning Session'}".
        Answer the student's question concisely and encouragingly.
        
        Student: ${message}
        AI:
        `;

        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("AI Chat Failed Detailed:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        if (error.message) console.error("Error Message:", error.message);
        return `I'm having trouble connecting to my brain right now. Error Details: ${error.message || "Unknown Error"}. Please check the API key configuration.`;
    }
}
