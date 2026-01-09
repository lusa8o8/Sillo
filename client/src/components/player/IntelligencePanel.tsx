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
        <div className={cn("flex flex-col h-full bg-sidebar border-l border-white/10", className)}>
            {/* Header Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab("summary")}
                    className={cn(
                        "flex-1 py-3 text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition-colors",
                        activeTab === "summary"
                            ? "text-primary border-b-2 border-primary bg-primary/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI SUMMARY
                </button>
                <button
                    onClick={() => setActiveTab("chat")}
                    className={cn(
                        "flex-1 py-3 text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition-colors",
                        activeTab === "chat"
                            ? "text-primary border-b-2 border-primary bg-primary/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    CHAT COACH
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground animate-pulse">
                            Analyzing video transcript...
                        </p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {activeTab === "summary" ? (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-primary" /> Key Takeaways
                                    </h3>
                                    <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                                        <li className="flex gap-2">
                                            <span className="text-primary">•</span>
                                            <span>This sequence covers the architectural patterns of <strong>{videoTitle || "this topic"}</strong>.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-primary">•</span>
                                            <span>Key focus areas involve performance optimization and system scalability.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-primary">•</span>
                                            <span>The instructor analyzes how specific design decisions impact long-term maintenance.</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="p-4 bg-muted/50 rounded-lg border border-white/5">
                                    <h4 className="text-xs font-mono text-primary mb-2 uppercase">Action Item</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Review the implementation strategy at 12:45 and consider its application to your current project architecture.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="bg-muted p-3 rounded-r-xl rounded-bl-xl text-sm text-muted-foreground">
                                        Hello! I've analyzed this video. Ask me anything about the code examples or concepts shown.
                                    </div>
                                </div>

                                {/* Mock User Message */}
                                <div className="flex gap-3 flex-row-reverse">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-mono">YOU</span>
                                    </div>
                                    <div className="bg-primary/10 p-3 rounded-l-xl rounded-br-xl text-sm text-foreground">
                                        Explain the middleware part again?
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="bg-muted p-3 rounded-r-xl rounded-bl-xl text-sm text-muted-foreground">
                                        Sure! At <strong>05:30</strong>, the speaker explains that middleware intercepts the request before it reaches your route handler. Think of it like a security guard checking ID before letting you into the club.
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
