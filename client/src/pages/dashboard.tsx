
import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Terminal, Activity, Zap, X, Filter, PlaySquare, Film, ListVideo } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { useSillo } from "@/context/SilloContext";
import { getYouTubeId, getYouTubeThumbnail } from "@/lib/youtube";

export default function Dashboard() {
  const { vaults, addVault } = useSillo();
  const [isAdding, setIsAdding] = useState(false); // Manual URL modal
  const [newUrl, setNewUrl] = useState("");

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
    if (!newUrl) return;
    const success = await addVault(newUrl);
    if (success) {
      setNewUrl("");
      setIsAdding(false);
    }
  };

  const handleSearchSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setDebouncedQuery(searchQuery);
      setIsSearching(true);
    }
  };

  const handleAddFromResult = async (result: any) => {
    // For MVP, if it's a playlist we might need more logic, but for now we basically mock the URL
    const url = result.type === 'playlist'
      ? `https://www.youtube.com/playlist?list=${result.id}`
      : `https://www.youtube.com/watch?v=${result.id}`;

    await addVault(url);
    setIsSearching(false);
    setSearchQuery("");
    setDebouncedQuery("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">

      {/* Manual Add Vault Overlay */}
      {isAdding && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-white/10 p-8 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setIsAdding(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-light tracking-wide mb-6">Add Learning Source</h2>
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="Paste YouTube Video URL..."
                  className="bg-black/50 border-white/10 h-12 text-lg font-normal placeholder:font-sans"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 text-sm text-muted-foreground hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={!newUrl} className="bg-primary text-primary-foreground px-6 py-2 text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
                  Create Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
        backgroundSize: '4rem 4rem'
      }} />

      <div className="relative z-10 max-w-7xl mx-auto space-y-16 pb-24">
        <Header onAddClick={() => setIsAdding(true)} />

        {/* Search Overlay/Drawer - Activates when isSearching or having results */}
        {(isSearching || searchResults.length > 0) ? (
          <section className="min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-6 mb-8">
              <h2 className="text-2xl font-light">Discovery Results</h2>
              <button onClick={() => { setIsSearching(false); setDebouncedQuery(""); setSearchQuery(""); }} className="text-muted-foreground hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 px-6 mb-8 overflow-x-auto pb-2">
              {[
                { id: 'all', label: 'All Types', icon: Filter },
                { id: 'video', label: 'Videos', icon: Film },
                { id: 'playlist', label: 'Playlists', icon: ListVideo },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all",
                    filterType === f.id
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/30"
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
                  <div key={i} className="h-64 bg-white/5 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6">
                {searchResults.map((item: any) => (
                  <div key={item.id} className="group relative border border-white/10 bg-black/40 rounded-xl overflow-hidden hover:border-primary/50 transition-all flex flex-col">
                    <div className="aspect-video relative bg-white/5">
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 text-[10px] font-medium tracking-wide rounded text-white backdrop-blur-md">
                        {item.type.toUpperCase()}
                      </div>
                      <button
                        onClick={() => handleAddFromResult(item)}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="w-12 h-12 text-primary scale-90 group-hover:scale-100 transition-transform" />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-medium text-white/90 line-clamp-2 mb-2" dangerouslySetInnerHTML={{ __html: item.title }} />
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{item.description}</p>
                      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>{item.channelTitle}</span>
                        <span>{new Date(item.publishedAt).getFullYear()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <div className="col-span-full text-center py-24 text-muted-foreground">
                    No results found. Try a broader term.
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
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Vaults</h2>
                <div className="text-xs text-muted-foreground font-medium tracking-widest">
                  TIME SAVED: 12h 45m
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* New Vault Button (if empty) */}
                {vaults.length === 0 && !isSearching && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="group relative h-64 border border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary"
                  >
                    <Plus className="w-8 h-8 opacity-50 type-primary" />
                    <span className="text-sm font-medium">Create your first Vault</span>
                  </button>
                )}

                {vaults.map((vault) => {
                  // Logic to handle both Video and Playlist URLs roughly
                  // For prototype, we extract ID. If playlist, we might generic it.
                  let videoId = getYouTubeId(vault.url);
                  let thumbnail = videoId ? getYouTubeThumbnail(videoId) : vault.thumbnail;

                  // Simple overrides if we saved metadata
                  if (vault.thumbnail) thumbnail = vault.thumbnail;
                  const isPlaylist = vault.url.includes("playlist");

                  return (
                    <Link key={vault.id} href={`/player/${videoId || "error"}`}>
                      <div className="group relative h-64 border border-white/5 rounded-xl cursor-pointer overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_-5px_hsl(156,79%,54%,0.15)]">
                        {/* Playlist Stack Effect */}
                        {isPlaylist && (
                          <div className="absolute top-0 right-0 w-6 h-full bg-white/5 border-l border-white/5 z-20 flex flex-col items-center pt-4 gap-2">
                            <div className="w-1 h-1 bg-white/20 rounded-full" />
                            <div className="w-1 h-1 bg-white/20 rounded-full" />
                            <div className="w-1 h-1 bg-white/20 rounded-full" />
                          </div>
                        )}
                        <div className="absolute inset-0 z-0">
                          {thumbnail ? (
                            <div
                              className="w-full h-full bg-cover bg-center opacity-60 group-hover:opacity-40 transition-opacity"
                              style={{ backgroundImage: `url(${thumbnail})` }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-50" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                        </div>

                        <div className="relative z-10 p-8 h-full flex flex-col justify-end">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Terminal className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                                {isPlaylist ? "PLAYLIST VAULT" : "VIDEO VAULT"}
                              </span>
                            </div>
                            <h3 className="text-xl font-light text-white group-hover:translate-x-1 transition-transform duration-300 line-clamp-2">
                              {vault.title}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                              <span>{new Date(vault.addedAt).toLocaleDateString()}</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="h-0.5 w-full bg-white/10 mt-4 overflow-hidden rounded-full">
                              <div className="h-full bg-primary w-[0%] group-hover:w-[10%] transition-all duration-500 shadow-[0_0_10px_hsl(156,79%,54%)]" />
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


        {/* Intent Search Bar - Always Visible at bottom until search is active, then it moves? 
            Actually, let's keep it but make it toggle search mode 
        */}
        <section className={cn("pt-8 pb-16 flex justify-center px-6 transition-all duration-500", isSearching ? "fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent z-50 pb-8 pt-20" : "")}>
          <div className="w-full max-w-2xl relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchSubmit}
              className="border-0 bg-black/80 backdrop-blur-md text-lg h-14 px-16 placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 font-light border-b border-white/10 rounded-none focus:border-white/20 transition-colors"
              placeholder="Search for topics, playlists, or huge tutorials..."
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                Press ENTER to search
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
