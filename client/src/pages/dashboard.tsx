import { Link } from "wouter";
import { Plus, User, Search, Play, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Assets
import avatar1 from "@assets/generated_images/minimalist_professional_profile_portrait_monochrome.png";
import avatar2 from "@assets/generated_images/minimalist_tech_expert_portrait_monochrome.png";
import avatar3 from "@assets/generated_images/minimalist_designer_portrait_monochrome.png";
import courseThumb from "@assets/generated_images/abstract_dark_code_visualization_neon_blue.png";

const FOCUS_CARDS = [
  {
    id: 1,
    title: "Advanced Python",
    progress: 70,
    lessons: "3/10 Lessons",
    image: courseThumb,
    active: true,
  },
  {
    id: 2,
    title: "System Architecture",
    progress: 32,
    lessons: "4/12 Lessons",
    image: null,
    active: false,
  },
  {
    id: 3,
    title: "UI Motion Design",
    progress: 15,
    lessons: "2/8 Lessons",
    image: null,
    active: false,
  },
];

const CHANNELS = [
  { id: 1, name: "Sarah Drasner", avatar: avatar1, new: true },
  { id: 2, name: "Theo Browne", avatar: avatar2, new: false },
  { id: 3, name: "DesignCourse", avatar: avatar3, new: true },
  { id: 4, name: "Fireship", avatar: null, fallback: "FS", new: false },
  { id: 5, name: "Hyperplexed", avatar: null, fallback: "HP", new: true },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 font-sans overflow-hidden relative">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(41,98,255,0.03),transparent_40%)] pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <header className="flex items-center justify-between" data-testid="header">
          <h1 className="text-2xl font-bold tracking-tight">FOCUS</h1>
          <div className="flex items-center gap-6">
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors group" aria-label="Add Vault">
              <Plus className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors group" aria-label="Profile">
              <User className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </div>
        </header>

        {/* Active Focus Cards */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Vaults</h2>
            <button className="p-1 hover:text-white transition-colors text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FOCUS_CARDS.map((card) => (
              <Link href={`/player/${card.id}`} key={card.id}>
                <div 
                  className="group relative cursor-pointer"
                  data-testid={`card-focus-${card.id}`}
                >
                  <Card className={cn(
                    "border border-white/5 bg-card/50 hover:bg-card/80 transition-all duration-500 overflow-hidden h-[240px] flex flex-col justify-between p-6",
                    "hover:border-primary/20 hover:shadow-glow",
                    card.active ? "ring-1 ring-primary/20" : ""
                  )}>
                    {card.image && (
                      <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                        <img src={card.image} alt="" className="w-full h-full object-cover grayscale mix-blend-screen" />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
                      </div>
                    )}
                    
                    <div className="relative z-10">
                      <h3 className="text-xl font-medium tracking-tight text-white group-hover:text-primary transition-colors duration-300">
                        {card.title}
                      </h3>
                    </div>

                    <div className="relative z-10 space-y-4">
                      <Progress value={card.progress} className="h-[2px] bg-white/10" indicatorClassName="bg-primary shadow-[0_0_10px_rgba(41,98,255,0.5)]" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>{card.progress}% Complete</span>
                        <span>{card.lessons}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </Link>
            ))}
            
            {/* Add New Placeholder */}
            <button className="h-[240px] border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center gap-4 hover:border-white/10 hover:bg-white/[0.02] transition-all group">
               <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                 <Plus className="w-5 h-5 text-muted-foreground" />
               </div>
               <span className="text-sm text-muted-foreground font-medium">Create New Vault</span>
            </button>
          </div>
        </section>

        {/* Whitelisted Channels */}
        <section className="space-y-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Whitelisted Channels</h2>
          <div className="flex items-start gap-8 overflow-x-auto pb-4 scrollbar-hide">
            {CHANNELS.map((channel) => (
              <div key={channel.id} className="flex flex-col items-center gap-3 group cursor-pointer min-w-[80px]">
                <div className={cn(
                  "relative p-[2px] rounded-full transition-all duration-300",
                  channel.new ? "bg-gradient-to-tr from-primary to-transparent" : "bg-transparent group-hover:bg-white/10"
                )}>
                  <div className="bg-background rounded-full p-[2px]">
                    <Avatar className="w-14 h-14 border border-white/5 group-hover:border-white/20 transition-colors">
                      {channel.avatar && <AvatarImage src={channel.avatar} className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />}
                      <AvatarFallback className="bg-white/5 text-muted-foreground text-xs">{channel.fallback || channel.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground group-hover:text-white transition-colors text-center max-w-[80px] truncate">
                  {channel.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Intent Search */}
        <section className="pt-8 pb-16 flex justify-center">
          <div className="relative w-full max-w-2xl group">
            <div className="absolute inset-0 bg-primary/20 blur-[100px] opacity-0 group-hover:opacity-20 transition-opacity duration-1000" />
            <div className="relative glass rounded-2xl border border-white/10 overflow-hidden flex items-center p-2 group-focus-within:border-primary/50 transition-colors shadow-lg">
              <Search className="w-5 h-5 text-muted-foreground ml-4" />
              <Input 
                className="border-0 bg-transparent text-lg h-14 px-4 placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 font-light"
                placeholder="Enter a specific learning query..."
                data-testid="input-search"
              />
              <div className="hidden md:flex items-center gap-2 pr-4 text-xs text-muted-foreground font-mono opacity-50">
                <span className="bg-white/5 px-2 py-1 rounded">⌘K</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
