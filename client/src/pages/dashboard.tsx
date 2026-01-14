
import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Terminal, Activity, Zap, X, Filter, PlaySquare, Film, ListVideo, Trash2, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { useSillo } from "@/context/SilloContext";
import { getYouTubeId, getYouTubeThumbnail } from "@/lib/youtube";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { vaults, addVault, deleteVault } = useSillo();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -- Search State --
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "video" | "playlist">("all");
  const [isSearching, setIsSearching] = useState(false);

  // -- Search Query --
  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery({
    queryKey: ["youtube-search", debouncedQuery, filterType],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(debouncedQuery)}&type=${filterType}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: !!debouncedQuery,
  });

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || isSubmitting) return;

    setIsSubmitting(true);
    const result = await addVault(newUrl);
    setIsSubmitting(false);

    if (result.success) {
      setNewUrl("");
      setIsAdding(false);
    } else {
      toast({
        title: "Creation Failed",
        description: result.error || "Could not create vault. Please check the URL.",
        variant: "destructive"
      });
    }
  };

  const handleSearchSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setDebouncedQuery(searchQuery);
      setIsSearching(true);
    }
  };

  const handleAddFromResult = async (result: any) => {
    const url = result.type === 'playlist'
      ? `https://www.youtube.com/playlist?list=${result.id}`
      : `https://www.youtube.com/watch?v=${result.id}`;

    const res = await addVault(url);
    if (res.success) {
      setIsSearching(false);
      setSearchQuery("");
      setDebouncedQuery("");
    } else {
      toast({
        title: "Creation Failed",
        description: res.error,
        variant: "destructive"
      });
    }
  };

  const handleDeleteVault = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this vault?")) {
      await deleteVault(id);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">

      {/* Manual Add Vault Overlay */}
      {isAdding && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-card border border-border p-8 rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setIsAdding(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-semibold tracking-tight mb-6">Add Learning Source</h2>
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="Paste YouTube Video or Playlist URL..."
                  className="bg-background border-border h-12 text-base focus:border-primary/50 transition-colors"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newUrl || isSubmitting}
                  className="bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 min-w-[120px] justify-center shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : "Create Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subtle Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{
        backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
        backgroundSize: '4rem 4rem'
      }} />

      <div className="relative z-10 max-w-7xl mx-auto space-y-16 pb-24">
        <Header onAddClick={() => setIsAdding(true)} />

        {/* Search Overlay/Drawer */}
        {(isSearching || searchResults.length > 0) ? (
          <section className="min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-6 mb-8">
              <h2 className="text-2xl font-semibold">Discovery Results</h2>
              <button onClick={() => { setIsSearching(false); setDebouncedQuery(""); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 px-6 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { id: 'all', label: 'All Types', icon: Filter },
                { id: 'video', label: 'Videos', icon: Film },
                { id: 'playlist', label: 'Playlists', icon: ListVideo },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-all shrink-0",
                    filterType === f.id
                      ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/20"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted"
                  )}
                >
                  <f.icon className="w-4 h-4" />
                  {f.label}
                </button>
              ))}
            </div>

            {isSearchLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 bg-white/[0.02] animate-pulse rounded-xl border border-white/5" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6">
                {searchResults.map((item: any) => (
                  <div key={item.id} className="group relative border border-border bg-card rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 flex flex-col card-hover">
                    <div className="aspect-video relative bg-muted">
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 text-[10px] font-semibold tracking-wider rounded-md text-white backdrop-blur-md">
                        {item.type.toUpperCase()}
                      </div>
                      <button
                        onClick={() => handleAddFromResult(item)}
                        className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm"
                      >
                        <Plus className="w-12 h-12 text-primary scale-90 group-hover:scale-100 transition-transform duration-300" />
                      </button>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors" dangerouslySetInnerHTML={{ __html: item.title }} />
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{item.description}</p>
                      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>{item.channelTitle}</span>
                        <span>{new Date(item.publishedAt).getFullYear()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <div className="col-span-full text-center py-24 text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/20">
                    <p className="text-base">No results found. Try a broader search term.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            {/* Active Focus Cards */}
            <section className="space-y-6 px-6 md:px-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Your Vaults</h2>
                <div className="text-xs text-muted-foreground font-medium tracking-wide hidden sm:block">
                  {vaults.length} {vaults.length === 1 ? 'Vault' : 'Vaults'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* New Vault Button (if empty) */}
                {vaults.length === 0 && !isSearching && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="group relative h-64 border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-all duration-300 text-muted-foreground hover:text-primary hover:bg-primary/[0.03]"
                  >
                    <Plus className="w-10 h-10 opacity-60 group-hover:scale-110 transition-transform" />
                    <span className="text-base font-medium">Create your first Vault</span>
                    <span className="text-xs text-muted-foreground/70">Add a YouTube video or playlist</span>
                  </button>
                )}

                {vaults.map((vault) => {
                  let videoId = getYouTubeId(vault.url);
                  let thumbnail = vault.thumbnail || (videoId ? getYouTubeThumbnail(videoId) : "");
                  const isPlaylist = vault.url.includes("playlist");

                  return (
                    <Link key={vault.id} href={`/player/${videoId || "error"}`}>
                      <div className="group relative h-64 border border-border bg-card rounded-xl cursor-pointer overflow-hidden transition-all duration-500 hover:border-primary/50 card-hover">
                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteVault(e, vault.id)}
                          className="absolute top-4 right-4 z-30 p-2.5 bg-black/60 backdrop-blur-md rounded-lg border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive hover:border-destructive hover:text-white transition-all duration-300"
                          title="Delete Vault"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Playlist Stack Effect */}
                        {isPlaylist && (
                          <div className="absolute top-0 right-0 w-6 h-full bg-muted/50 border-l border-border z-20 flex flex-col items-center pt-4 gap-2">
                            <div className="w-1 h-1 bg-foreground/20 rounded-full" />
                            <div className="w-1 h-1 bg-foreground/20 rounded-full" />
                            <div className="w-1 h-1 bg-foreground/20 rounded-full" />
                          </div>
                        )}
                        <div className="absolute inset-0 z-0">
                          {thumbnail ? (
                            <div
                              className="w-full h-full bg-cover bg-center opacity-30 group-hover:opacity-20 group-hover:scale-105 transition-all duration-700"
                              style={{ backgroundImage: `url(${thumbnail})` }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-muted to-transparent opacity-50" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                        </div>

                        <div className="relative z-10 p-6 h-full flex flex-col justify-end">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Terminal className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                                {isPlaylist ? "PLAYLIST" : "VIDEO"}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                              {vault.title}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                              <span>Added {new Date(vault.addedAt).toLocaleDateString()}</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="h-1 w-full bg-muted mt-4 overflow-hidden rounded-full">
                              <div className="h-full bg-primary w-[0%] group-hover:w-[15%] transition-all duration-700 shadow-lg shadow-primary/50" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* Intent Search Bar */}
        <section className={cn("pt-12 pb-24 flex justify-center px-6 transition-all duration-500", isSearching ? "fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl z-50 pb-8 pt-6 border-t border-border" : "")}>
          <div className="w-full max-w-2xl relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none" />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchSubmit}
              className="border-0 bg-secondary/50 backdrop-blur-md text-lg h-16 px-14 placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0 font-medium rounded-2xl shadow-xl shadow-black/5 transition-all duration-300 group-hover:bg-secondary/70"
              placeholder="Search for architecture, deep dives, or sequences..."
            />
            {/* Enter Hint */}
            {(searchQuery && !isSearching) && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none animate-in fade-in duration-300">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Press Enter</span>
                <div className="w-5 h-5 flex items-center justify-center rounded border border-border bg-background/50 text-xs text-muted-foreground">↵</div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
