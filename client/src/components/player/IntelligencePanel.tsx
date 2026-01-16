import { useState, useEffect, useRef } from "react";
import { Sparkles, BookOpen, MessageSquare, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntelligencePanelProps {
    videoTitle: string;
    className?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export function IntelligencePanel({ videoTitle, className }: IntelligencePanelProps) {
    const [activeTab, setActiveTab] = useState<"summary" | "chat">("summary");
    const [loading, setLoading] = useState(true);
    const [summaryData, setSummaryData] = useState<any>(null);

    // Chat State
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: "Hello! I've analyzed this video. Ask me anything about the code examples or concepts shown." }
    ]);
    const [input, setInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Fetch Summary
    useEffect(() => {
        if (!videoTitle) return;

        const fetchSummary = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/ai/summary`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: videoTitle })
                });
                if (res.ok) {
                    const data = await res.json();
                    setSummaryData(data);
                } else {
                    throw new Error("Failed to fetch summary");
                }
            } catch (error) {
                console.error(error);
                // Fallback handled by backend or show simple error
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
            const res = await fetch(`${API_BASE}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, context: videoTitle })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'ai', text: data.message }]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error." }]);
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
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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
            <div className="flex-1 overflow-y-auto p-6 bg-background/50 relative">
                {activeTab === "summary" ? (
                    loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                <Loader2 className="w-8 h-8 text-primary animate-spin relative z-10" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground animate-pulse">
                                Analyzing video insight...
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                    )
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 space-y-4 pb-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border", msg.role === 'ai' ? "bg-primary/10 border-primary/20" : "bg-muted border-border")}>
                                        {msg.role === 'ai' ? <Sparkles className="w-4 h-4 text-primary" /> : <span className="text-[10px] font-bold text-muted-foreground">YOU</span>}
                                    </div>
                                    <div className={cn("p-4 rounded-2xl text-sm shadow-sm", msg.role === 'ai' ? "bg-card border border-border rounded-tl-sm text-muted-foreground" : "bg-primary text-primary-foreground rounded-tr-sm shadow-md shadow-primary/20")}>
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
                        <div className="mt-auto pt-4 border-t border-border">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2"
                            >
                                <input
                                    className="flex-1 bg-muted/30 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Ask about this topic..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={chatLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || chatLoading}
                                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
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
