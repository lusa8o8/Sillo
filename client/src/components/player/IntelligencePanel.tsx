import { useState, useEffect } from "react";
import { Sparkles, BookOpen, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntelligencePanelProps {
    videoTitle: string;
    className?: string;
}

export function IntelligencePanel({ videoTitle, className }: IntelligencePanelProps) {
    const [activeTab, setActiveTab] = useState<"summary" | "chat">("summary");
    const [loading, setLoading] = useState(true);

    // Mock AI Generation delay
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 2500);
        return () => clearTimeout(timer);
    }, []);

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
            <div className="flex-1 overflow-y-auto p-6 bg-background/50">
                {loading ? (
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
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {activeTab === "summary" ? (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        Key Takeaways
                                    </h3>
                                    <ul className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                                        <li className="flex gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 shadow-sm shadow-primary/50" />
                                            <span>This sequence covers the architectural patterns of <strong className="text-foreground">{videoTitle || "this topic"}</strong>.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 shadow-sm shadow-primary/50" />
                                            <span>Key focus areas involve performance optimization and system scalability.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 shadow-sm shadow-primary/50" />
                                            <span>The instructor analyzes how specific design decisions impact long-term maintenance.</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="p-5 bg-card rounded-xl border border-border shadow-sm">
                                    <h4 className="text-xs font-bold text-primary mb-2 uppercase tracking-wide flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        Recommended Action
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Review the implementation strategy at <span className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded text-xs cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors">12:45</span> and consider its application to your current project architecture.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-sm text-sm text-muted-foreground shadow-sm">
                                        Hello! I've analyzed this video. Ask me anything about the code examples or concepts shown.
                                    </div>
                                </div>

                                {/* Mock User Message */}
                                <div className="flex gap-4 flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                                        <span className="text-[10px] font-bold text-muted-foreground">YOU</span>
                                    </div>
                                    <div className="bg-primary text-primary-foreground p-4 rounded-2xl rounded-tr-sm text-sm shadow-md shadow-primary/20">
                                        Explain the middleware part again?
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-sm text-sm text-muted-foreground shadow-sm">
                                        Sure! At <strong className="text-foreground cursor-pointer hover:text-primary border-b border-dotted border-border hover:border-primary transition-colors">05:30</strong>, the speaker explains that middleware intercepts the request before it reaches your route handler. Think of it like a security guard checking ID before letting you into the club.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
}
