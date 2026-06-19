import { useState, useEffect, useRef } from "react";
import { Sparkles, BookOpen, MessageSquare, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { authedFetch } from "@/lib/api";

interface IntelligencePanelProps {
    videoTitle: string;
    context?: string;
    className?: string;
}

export function IntelligencePanel({ videoTitle, context, className }: IntelligencePanelProps) {
    const [activeTab, setActiveTab] = useState<"summary" | "chat">("summary");
    const [loading, setLoading] = useState(true);
    const [summaryData, setSummaryData] = useState<any>(null);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    // Keep the latest context without forcing a summary refetch on every note edit
    // (each fetch is a billable AI call).
    const contextRef = useRef(context);
    useEffect(() => {
        contextRef.current = context;
    }, [context]);

    // Chat State
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: "Hi! I'm your study coach for this session. I work from the video title and your notes (no full transcript yet), so I'll be clear about what I can infer versus what needs the video to confirm. Ask away." }
    ]);
    const [input, setInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);

    // Fetch Summary
    useEffect(() => {
        if (!videoTitle) return;

        const fetchSummary = async () => {
            setLoading(true);
            setSummaryError(null);
            try {
                const res = await authedFetch(`/api/ai/summary`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: videoTitle, context: contextRef.current })
                });
                if (res.ok) {
                    const data = await res.json();
                    setSummaryData(data);
                } else {
                    const data = await res.json().catch(() => ({}));
                    if (res.status === 402) {
                        setSummaryError(data.error || "AI features require an active plan.");
                    } else if (res.status === 429) {
                        setSummaryError(data.error || "AI limit reached. Try again shortly.");
                    } else {
                        throw new Error("Failed to fetch summary");
                    }
                }
            } catch (error) {
                console.error(error);
                setSummaryError("Could not generate a summary right now.");
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [videoTitle]);

    // Handle Chat Submit
    const handleSend = async () => {
        if (!input.trim() || chatLoading) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput("");
        setChatLoading(true);

        try {
            const res = await authedFetch(`/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, title: videoTitle, context })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'ai', text: data.message }]);
            } else {
                const data = await res.json().catch(() => ({}));
                const fallback = res.status === 402
                    ? (data.error || "AI features require an active plan to continue.")
                    : res.status === 429
                        ? (data.error || "You've hit the AI limit for now. Try again shortly.")
                        : "Sorry, I encountered an error.";
                setMessages(prev => [...prev, { role: 'ai', text: fallback }]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', text: "Network error. Please try again." }]);
        } finally {
            setChatLoading(false);
        }
    };

    // Scroll to bottom of chat
    useEffect(() => {
        const chatScroll = chatScrollRef.current;
        if (!chatScroll) return;

        chatScroll.scrollTo({
            top: chatScroll.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, chatLoading]);

    useEffect(() => {
        const textarea = chatInputRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
    }, [input]);

    return (
        <div className={cn("flex flex-col h-full bg-card/40 border-l border-border", className)}>
            {/* Header Tabs */}
            <div className="flex border-b border-border bg-muted/20">
                <button
                    onClick={() => setActiveTab("summary")}
                    className={cn(
                        "flex-1 py-3.5 text-xs font-semibold tracking-wide flex items-center justify-center gap-2.5 transition-all relative",
                        activeTab === "summary"
                            ? "text-primary bg-background"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    {activeTab === "summary" && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />}
                    <BookOpen className="w-3.5 h-3.5" />
                    AI SUMMARY
                </button>
                <button
                    onClick={() => setActiveTab("chat")}
                    className={cn(
                        "flex-1 py-3.5 text-xs font-semibold tracking-wide flex items-center justify-center gap-2.5 transition-all relative",
                        activeTab === "chat"
                            ? "text-primary bg-background"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    {activeTab === "chat" && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />}
                    <MessageSquare className="w-3.5 h-3.5" />
                    CHAT COACH
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden bg-background/50 relative">
                {activeTab === "summary" ? (
                    <div className="h-full overflow-y-auto p-6">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                    <Loader2 className="w-8 h-8 text-primary animate-spin relative z-10" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground animate-pulse">
                                    Generating insights from the title and your notes...
                                </p>
                            </div>
                        ) : summaryError ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 px-4">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">{summaryError}</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <p className="text-[11px] text-muted-foreground/70 leading-relaxed border border-border/60 rounded-lg px-3 py-2 bg-muted/20">
                                    Generated from the video title and your notes — not a full transcript. Treat specifics as guidance to verify against the video.
                                </p>
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        Key Takeaways
                                    </h3>
                                    <ul className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                                        {summaryData?.keyTakeaways?.map((item: string, i: number) => (
                                            <li key={i} className="flex gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 shadow-sm shadow-primary/50" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {summaryData?.recommendedAction && (
                                    <div className="p-5 bg-card rounded-xl border border-border shadow-sm">
                                        <h4 className="text-xs font-bold text-primary mb-2 uppercase tracking-wide flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            Recommended Action
                                        </h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {summaryData.recommendedAction}
                                            {summaryData.timestamp && (
                                                <span className="ml-2 text-foreground font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                                                    at {summaryData.timestamp}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col h-full min-h-0">
                        <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border", msg.role === 'ai' ? "bg-primary/10 border-primary/20" : "bg-muted border-border")}>
                                        {msg.role === 'ai' ? <Sparkles className="w-4 h-4 text-primary" /> : <span className="text-[10px] font-bold text-muted-foreground">YOU</span>}
                                    </div>
                                    <div className={cn("max-w-[82%] p-4 rounded-2xl text-sm shadow-sm", msg.role === 'ai' ? "bg-card border border-border rounded-tl-sm text-muted-foreground" : "bg-primary text-primary-foreground rounded-tr-sm shadow-md shadow-primary/20")}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-sm text-sm text-muted-foreground shadow-sm italic">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="shrink-0 p-4 border-t border-border bg-background/95 backdrop-blur">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2"
                            >
                                <textarea
                                    ref={chatInputRef}
                                    className="min-w-0 flex-1 max-h-32 resize-none overflow-y-auto bg-muted/30 border border-border rounded-lg px-4 py-2 text-sm leading-5 focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Ask about this topic..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    rows={1}
                                    disabled={chatLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || chatLoading}
                                    className="shrink-0 p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
