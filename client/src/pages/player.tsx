import { useState, useEffect, useRef } from "react";
import { Link, useRoute } from "wouter";
import YouTube from "react-youtube";
import { AlertCircle, Check, ChevronLeft, Maximize2, Play, Pause, Clock, List, Loader2, Trash2, BookOpen, ChevronDown, ChevronUp, RefreshCw, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSillo } from "@/context/SilloContext";
import { Note } from "@/lib/storage";
import { useNotes } from "@/hooks/useNotes";
import { usePlaylistItems } from "@/hooks/usePlaylistItems";
import { IntelligencePanel } from "@/components/player/IntelligencePanel";
import { aiFetch } from "@/lib/aiApi";

type PlayerMode = 'default' | 'theater';
type SaveState = "idle" | "saving" | "saved" | "error";

type LessonPlan = {
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

interface AutoSavingNoteProps {
  note: Note;
  formatVideoTime: (seconds: number) => string;
  onJump: (timestamp: number) => void;
  onUpdate: (noteId: string, text: string) => Promise<void>;
  onDelete: (noteId: string) => void;
}

function AutoSavingNote({ note, formatVideoTime, onJump, onUpdate, onDelete }: AutoSavingNoteProps) {
  const [draft, setDraft] = useState(note.text);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const lastSavedText = useRef(note.text);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDraft(note.text);
    lastSavedText.current = note.text;
    setSaveState("idle");
  }, [note.id, note.text]);

  const saveDraft = async (text: string) => {
    if (text === lastSavedText.current) return;

    setSaveState("saving");
    try {
      await onUpdate(note.id, text);
      lastSavedText.current = text;
      setSaveState("saved");
    } catch (error) {
      console.error("Autosave failed:", error);
      setSaveState("error");
    }
  };

  const scheduleSave = (text: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveDraft(text);
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  const handleChange = (value: string) => {
    setDraft(value);
    setSaveState(value === lastSavedText.current ? "idle" : "saving");
    scheduleSave(value);
  };

  const handleBlur = () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveDraft(draft);
  };

  return (
    <li className="flex items-start gap-4 group p-3 rounded-xl hover:bg-muted/50 transition-colors">
      <button
        onClick={() => onJump(note.timestamp)}
        className="mt-2 w-2 h-2 rounded-full bg-primary shadow-lg shadow-primary/50 shrink-0 hover:scale-150 transition-transform cursor-pointer"
        title="Jump to timestamp"
      />
      <div className="flex-1">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-mono font-medium text-primary cursor-pointer hover:underline underline-offset-2"
              onClick={() => onJump(note.timestamp)}
            >
              {formatVideoTime(note.timestamp)}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 min-w-[54px]">
              {saveState === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Saving</>}
              {saveState === "saved" && <><Check className="w-3 h-3 text-primary" /> Saved</>}
              {saveState === "error" && <><AlertCircle className="w-3 h-3 text-destructive" /> Error</>}
            </span>
          </div>
          <button onClick={() => onDelete(note.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={handleBlur}
          rows={Math.max(2, Math.min(8, draft.split("\n").length + 1))}
          className="w-full resize-none bg-transparent text-foreground/90 text-sm leading-relaxed outline-none cursor-text whitespace-pre-wrap selection:bg-primary/20 placeholder:text-muted-foreground/40"
          placeholder="Add an observation..."
        />
      </div>
    </li>
  );
}

export default function Player() {
  const [, params] = useRoute("/player/:id");
  // Default to a real ID if missing for testing. 
  const videoId = params?.id || "WjJUPxBa1ls";
  const { saveNote, updateNote, deleteNote, vaults } = useSillo();

  const notes = useNotes(vaults.find(v => v.url.includes(videoId))?.id);

  // Find the vault title
  const currentVault = vaults.find(v => v.url.includes(videoId));
  const videoTitle = currentVault?.title || videoId;
  const videoCategory = "Vault";

  // -- Player Ref --
  const playerRef = useRef<any>(null); // Stores the YouTube Player instance
  const containerRef = useRef<HTMLDivElement>(null);

  // -- Deep Work Timer State --
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);

  // -- Video State --
  const [isPlaying, setIsPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerMode, setPlayerMode] = useState<PlayerMode>('default');
  const [isPlaylistVisible, setIsPlaylistVisible] = useState(true);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [lessonPlanLoading, setLessonPlanLoading] = useState(false);
  const [lessonPlanError, setLessonPlanError] = useState<string | null>(null);

  const formatVideoTime = (seconds: number) => {
    if (!seconds) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Sync isPlaying with Player State
  const onPlayerStateChange = (event: any) => {
    // 1 = Playing, 2 = Paused, 3 = Buffering, 0 = Ended
    const state = event.data;
    setIsPlaying(state === 1);
  };

  const onPlayerReady = (event: any) => {
    console.log("YouTube Player Ready");
    playerRef.current = event.target;
    setIsReady(true);
    setTotalDuration(playerRef.current.getDuration());
  };

  // Polling for progress (since IFrame API doesn't have onProgress event)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning || isPlaying) {
      // Poll more frequently if playing to update scrubber
      interval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const time = playerRef.current.getCurrentTime();
          setPlayedSeconds(time);
          // Also update duration if it wasn't valid before
          if (!totalDuration) setTotalDuration(playerRef.current.getDuration());
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isTimerRunning, totalDuration]);


  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen change events (ESC key)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);


  const seekTo = (seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      setPlayedSeconds(seconds); // Immediate UI update
    }
  };

  // -- Notes State --
  // managed by useQuery hook now

  const handleAddNote = () => {
    if (!currentVault?.id) return;
    saveNote(currentVault.id, "New observation...", playedSeconds);
  };

  const handleUpdateNote = async (noteId: string, text: string) => {
    if (!currentVault?.id) return;
    await updateNote(currentVault.id, noteId, text);
  };

  const handleDeleteNote = (noteId: string) => {
    if (!currentVault?.id) return;
    deleteNote(currentVault.id, noteId);
  };

  // Jump to timestamp when clicking a note
  const jumpToNote = (timestamp: number) => {
    seekTo(timestamp);
    if (!isPlaying && playerRef.current) {
      playerRef.current.playVideo();
    }
  };

  // Skip 
  const skipForward = () => seekTo(playedSeconds + 10);
  const skipBack = () => seekTo(playedSeconds - 10);

  const isPlaylist = videoId.startsWith("PL") || videoId.length > 15;
  const playlistItems = usePlaylistItems(isPlaylist ? videoId : undefined);

  const buildAiContext = () => {
    const noteContext = notes
      .filter((note) => note.text.trim())
      .slice(0, 12)
      .map((note) => `- ${formatVideoTime(note.timestamp)}: ${note.text.trim()}`)
      .join("\n");

    return [
      `Vault type: ${currentVault?.type || "video"}`,
      currentVault?.url ? `Source URL: ${currentVault.url}` : "",
      noteContext ? `Learner notes:\n${noteContext}` : "No learner notes yet.",
      "Transcript: not available yet.",
    ].filter(Boolean).join("\n");
  };

  const fetchLessonPlan = async () => {
    if (!videoTitle) return;

    setLessonPlanLoading(true);
    setLessonPlanError(null);

    try {
      const response = await aiFetch("lesson-plan", {
        title: videoTitle,
        context: buildAiContext(),
      });

      if (!response.ok) {
        throw new Error("Failed to generate lesson plan");
      }

      const data = await response.json();
      setLessonPlan(data);
    } catch (error) {
      console.error("Lesson plan generation failed:", error);
      setLessonPlanError("Could not generate the lesson plan. Check the AI provider key and try again.");
    } finally {
      setLessonPlanLoading(false);
    }
  };

  useEffect(() => {
    if (!currentVault?.id) return;

    const timeout = setTimeout(() => {
      fetchLessonPlan();
    }, 600);

    return () => clearTimeout(timeout);
  }, [currentVault?.id, videoTitle, notes.length]);

  const opts: any = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1, // Enable controls for playlist navigation ease
      modestbranding: 1,
      rel: 0,
      listType: isPlaylist ? 'playlist' : undefined,
      list: isPlaylist ? videoId : undefined,
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">

      {/* Header */}
      <header className="h-16 flex items-center px-6 border-b border-white/5 z-20 bg-background/80 backdrop-blur-md fixed top-0 w-full transition-all">
        <Link href="/">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group px-3 py-1.5 rounded-lg hover:bg-muted/50">
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Library</span>
          </button>
        </Link>
        <div className="mx-auto absolute left-1/2 -translate-x-1/2 text-sm font-medium tracking-wide text-foreground/90 line-clamp-1 max-w-[50%] flex items-center gap-2">
          <span className="text-muted-foreground/50 font-normal">{videoCategory}</span>
          <span className="text-muted-foreground/30">/</span>
          <span>{videoTitle}</span>
        </div>
      </header>

      {/* Main Player Area */}
      <main className="flex-1 flex flex-col pt-20 pb-16">
        <div className="w-full max-w-[1600px] mx-auto p-6 md:p-8 flex-1 flex flex-col gap-8">

          {/* Player Modes Container */}
          <div className={cn(
            "flex gap-6 transition-all duration-500 ease-in-out relative",
            isFullscreen ? "fixed inset-0 z-50 bg-black p-0 m-0" : "w-full",
            playerMode === 'theater' && !isFullscreen ? "flex-col" : "flex-row pr-[424px]"
          )}>

            {/* VIDEO AREA */}
            <div
              ref={containerRef}
              className={cn(
                "relative bg-black transition-all duration-500 border border-border/50",
                isFullscreen ? "w-full h-full border-0" : "flex-1 rounded-2xl overflow-hidden aspect-video shadow-2xl shadow-black/20",
                playerMode === 'theater' && !isFullscreen ? "w-full h-[75vh]" : ""
              )}>
              <div className="absolute inset-0 w-full h-full pointer-events-auto">
                <YouTube
                  videoId={isPlaylist ? undefined : videoId}
                  opts={opts}
                  onReady={onPlayerReady}
                  onStateChange={onPlayerStateChange}
                  className="w-full h-full"
                  iframeClassName="w-full h-full"
                />
              </div>

              {/* Hover Controls */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end justify-between z-10 pointer-events-none hover:pointer-events-auto">
                <div className="flex gap-4 items-center">
                  <button onClick={togglePlay} className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg shadow-white/20">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <div className="text-white/90 text-sm font-medium font-mono tracking-wide">
                    {formatVideoTime(playedSeconds)} <span className="text-white/40">/</span> {formatVideoTime(totalDuration)}
                  </div>
                </div>

                <div className="flex gap-2 backdrop-blur-md bg-black/30 p-1.5 rounded-lg border border-white/10">
                  <button
                    onClick={() => setPlayerMode('default')}
                    className={cn("p-2 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors", playerMode === 'default' && "text-primary bg-primary/10")}
                    title="Default View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPlayerMode('theater')}
                    className={cn("p-2 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors", playerMode === 'theater' && "text-primary bg-primary/10")}
                    title="Theater Mode"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button onClick={toggleFullscreen} className="p-2 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Fullscreen">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* SIDEBAR INTELLIGENCE (Hidden in Fullscreen) */}
            {(!isFullscreen && playerMode !== 'theater') && (
              <div className="w-[400px] flex-shrink-0 animate-in slide-in-from-right-4 duration-500 flex flex-col absolute right-0 top-0 bottom-0">
                <IntelligencePanel videoTitle={videoTitle} context={buildAiContext()} className="h-full rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-lg shadow-black/5" />
              </div>
            )}
          </div>

          {/* THEATER MODE SIDEBAR (Pushed Below) */}
          {playerMode === 'theater' && !isFullscreen && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-2">
                <div className="h-[500px] border border-border rounded-2xl bg-card/50 overflow-hidden shadow-sm">
                  <IntelligencePanel videoTitle={videoTitle} context={buildAiContext()} />
                </div>
              </div>
            </div>
          )}

          {/* Notes Section - Video Notes and Lesson Plan */}
          {!isFullscreen && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                  Session Notes
                  <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Private</span>
                </h2>
                <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 min-h-[300px] flex flex-col shadow-sm card-hover">
                  <ul className="space-y-4 flex-1">
                    {notes.length === 0 && (
                      <li className="text-muted-foreground/50 text-sm italic flex flex-col items-center justify-center h-48 gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-2xl">✍️</span>
                        </div>
                        <span>No notes yet. Click below or capture thoughts as they come...</span>
                      </li>
                    )}
                    {notes.map((note) => (
                      <AutoSavingNote
                        key={note.id}
                        note={note}
                        formatVideoTime={formatVideoTime}
                        onJump={jumpToNote}
                        onUpdate={handleUpdateNote}
                        onDelete={handleDeleteNote}
                      />
                    ))}
                  </ul>
                  <button
                    onClick={handleAddNote}
                    className="self-start text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                  >
                    + Add Note at {formatVideoTime(playedSeconds)}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">Lesson Plan</h2>
                  <button
                    onClick={fetchLessonPlan}
                    disabled={lessonPlanLoading}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                    title="Refresh lesson plan"
                  >
                    <RefreshCw className={cn("w-4 h-4", lessonPlanLoading && "animate-spin")} />
                  </button>
                </div>
                <div className="bg-card rounded-2xl p-6 border border-border text-sm min-h-[300px] flex flex-col gap-5 shadow-sm">
                  {lessonPlanLoading && !lessonPlan ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      </div>
                      <p>Generating a structured lesson plan...</p>
                    </div>
                  ) : lessonPlanError && !lessonPlan ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-destructive" />
                      </div>
                      <p>{lessonPlanError}</p>
                      <button
                        onClick={fetchLessonPlan}
                        className="text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : lessonPlan ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-primary">
                          <BookOpen className="w-4 h-4" />
                          <h3 className="font-semibold text-foreground leading-snug">{lessonPlan.title}</h3>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{lessonPlan.overview}</p>
                      </div>

                      <ol className="space-y-4">
                        {lessonPlan.steps.map((step, index) => (
                          <li key={`${step.title}-${index}`} className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="font-semibold text-foreground leading-snug">
                                {index + 1}. {step.title}
                              </h4>
                              <span className="shrink-0 text-[11px] font-mono text-muted-foreground bg-background border border-border rounded px-2 py-1">
                                {step.durationMinutes}m
                              </span>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                              <span className="text-foreground/80">Goal:</span> {step.goal}
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                              <span className="text-foreground/80">Practice:</span> {step.practice}
                            </p>
                          </li>
                        ))}
                      </ol>

                      {lessonPlan.checkpoints.length > 0 && (
                        <div className="space-y-3 pt-1">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                            <Target className="w-3.5 h-3.5" />
                            Checkpoints
                          </h4>
                          <ul className="space-y-2">
                            {lessonPlan.checkpoints.map((checkpoint, index) => (
                              <li key={`${checkpoint}-${index}`} className="flex gap-3 text-muted-foreground leading-relaxed">
                                <Check className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                                <span>{checkpoint}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {lessonPlanLoading && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Refreshing plan...
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center opacity-60">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <p>No lesson plan yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PLAYLIST SIDEBAR */}
          {(!isFullscreen && isPlaylist && playlistItems.length > 0) && (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Playlist Episodes</h3>
                <button
                  onClick={() => setIsPlaylistVisible(!isPlaylistVisible)}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  {isPlaylistVisible ? (
                    <>
                      Hide <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Show <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>

              {isPlaylistVisible && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {playlistItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        window.location.href = `/player/${item.id}`; // Simple navigation for now
                      }}
                      className={cn(
                        "group flex flex-col gap-2 p-3 rounded-xl border border-border bg-card/30 hover:bg-muted/50 transition-all cursor-pointer h-full",
                        item.id === videoId && "border-primary/50 bg-primary/5"
                      )}
                    >
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50">
                        <img src={item.thumbnail} alt={item.title} className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-8 h-8 text-white fill-white drop-shadow-lg" />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <h4 className={cn("text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors", item.id === videoId ? "text-primary" : "text-foreground")}>
                          {item.id === videoId && <span className="mr-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">PLAYING</span>}
                          {item.title}
                        </h4>
                        <span className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.channelTitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Persistent Footer Status */}
      <footer className="h-14 bg-background/80 backdrop-blur-xl border-t border-border flex items-center justify-between px-6 md:px-12 fixed bottom-0 w-full z-20 text-xs font-medium text-muted-foreground shadow-lg shadow-black/5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTimer}
              className={cn(
                "flex items-center gap-2.5 transition-colors px-3 py-1.5 rounded-lg hover:bg-muted",
                isTimerRunning ? "text-primary bg-primary/5" : "hover:text-foreground"
              )}
            >
              <Clock className={cn("w-4 h-4", isTimerRunning && "animate-pulse")} />
              <span className="tracking-wide font-mono uppercase">Focus: {formatTime(timeLeft)}</span>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTimeLeft(prev => Math.max(60, prev - 300))}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                title="- 5 mins"
              >
                -
              </button>
              <button
                onClick={() => setTimeLeft(prev => prev + 300)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                title="+ 5 mins"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 px-3 py-1.5">
            <List className="w-4 h-4" />
            <span className="tracking-wide font-mono uppercase">Notes: {notes.length}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
