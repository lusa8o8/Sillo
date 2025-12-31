import { Link, useRoute } from "wouter";
import { ChevronLeft, Maximize2, Volume2, SkipBack, Play, SkipForward, Clock, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import videoFrame from "@assets/generated_images/cinematic_coding_environment_dark_aesthetic.png";

export default function Player() {
  const [, params] = useRoute("/player/:id");
  const courseId = params?.id || "1";

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-white/20">
      
      {/* Header */}
      <header className="h-16 flex items-center px-6 border-b border-white/5 z-20 bg-black/50 backdrop-blur-sm fixed top-0 w-full">
        <Link href="/">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group">
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Library</span>
          </button>
        </Link>
        <div className="mx-auto absolute left-1/2 -translate-x-1/2 text-sm font-medium tracking-wide text-white/80">
          Advanced Python / Decorators & Metaclasses
        </div>
      </header>

      {/* Main Player Area */}
      <main className="flex-1 flex flex-col pt-16 pb-12">
        <div className="w-full max-w-[1600px] mx-auto p-6 md:p-12 flex-1 flex flex-col gap-8">
          
          {/* Cinematic Player Container */}
          <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-white/5 group shadow-2xl">
            {/* Simulated Video Content */}
            <div className="absolute inset-0">
               <img 
                 src={videoFrame} 
                 alt="Video Content" 
                 className="w-full h-full object-cover opacity-80"
               />
               <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* Custom Controls Overlay (Visible on Hover) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6">
              <div className="flex justify-end">
                <button className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors">
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                 {/* Scrubber */}
                 <div className="h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer group/scrubber">
                   <div className="h-full w-[35%] bg-primary shadow-[0_0_10px_rgba(41,98,255,0.8)] relative">
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/scrubber:opacity-100 shadow-lg scale-0 group-hover/scrubber:scale-100 transition-all" />
                   </div>
                 </div>
                 
                 {/* Controls */}
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-6">
                     <button className="text-white/80 hover:text-white transition-colors"><SkipBack className="w-5 h-5" /></button>
                     <button className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"><Play className="w-5 h-5 fill-current ml-1" /></button>
                     <button className="text-white/80 hover:text-white transition-colors"><SkipForward className="w-5 h-5" /></button>
                     <div className="text-xs font-mono text-white/60 ml-2">04:20 / 12:45</div>
                   </div>
                   
                   <div className="flex items-center gap-4">
                     <button className="text-white/80 hover:text-white transition-colors"><Volume2 className="w-5 h-5" /></button>
                   </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-light tracking-tight text-white/90">Session Notes</h2>
              <div className="bg-card/30 border border-white/5 rounded-xl p-8 space-y-6 min-h-[300px]">
                <ul className="space-y-4">
                   <li className="flex items-start gap-4 group">
                     <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(41,98,255,0.6)] shrink-0" />
                     <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                       Decorators in Python are higher-order functions that modify the behavior of other functions or methods. They allow you to wrap another function in order to extend the behavior of the wrapped function, without permanently modifying it.
                     </p>
                   </li>
                   <li className="flex items-start gap-4 group">
                     <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(41,98,255,0.6)] shrink-0" />
                     <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                       Use <code className="bg-white/10 px-1.5 py-0.5 rounded text-primary-foreground font-mono text-sm">@functools.wraps</code> to preserve metadata when writing custom decorators.
                     </p>
                   </li>
                   <li className="flex items-start gap-4 group">
                     <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(41,98,255,0.6)] shrink-0" />
                     <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                       Metaclasses are the 'classes of classes'. They control how classes are created. A class is an instance of a metaclass.
                     </p>
                   </li>
                </ul>
                <button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium mt-4 flex items-center gap-2">
                  + Add Note at 04:20
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-light tracking-tight text-white/90">Lesson Plan</h2>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-4 rounded-lg flex items-center gap-4 cursor-pointer transition-all border",
                      i === 4 
                        ? "bg-white/[0.03] border-primary/20" 
                        : "hover:bg-white/[0.02] border-transparent hover:border-white/5 opacity-60 hover:opacity-100"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border",
                      i === 4 ? "border-primary text-primary shadow-[0_0_8px_rgba(41,98,255,0.3)]" : "border-white/20 text-muted-foreground"
                    )}>
                      {i}
                    </div>
                    <div className="flex-1">
                      <div className={cn("text-sm font-medium", i === 4 ? "text-white" : "text-muted-foreground")}>
                        {i === 1 ? "Introduction to Metaprogramming" : 
                         i === 2 ? "Understanding Type" :
                         i === 3 ? "Decorator Basics" :
                         i === 4 ? "Deep Dive: @wraps" :
                         i === 5 ? "Class Decorators" : "Final Project"}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 mt-1 font-mono">15:00 MIN</div>
                    </div>
                    {i < 4 && <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Persistent Footer Status */}
      <footer className="h-12 bg-black border-t border-white/5 flex items-center justify-between px-6 md:px-12 fixed bottom-0 w-full z-20 font-mono text-xs">
         <div className="flex items-center gap-6 text-muted-foreground">
           <div className="flex items-center gap-2">
             <Clock className="w-3.5 h-3.5" />
             <span className="tracking-widest">SESSION TIMER: 12:45</span>
           </div>
         </div>
         
         <div className="flex items-center gap-6 text-muted-foreground">
           <div className="flex items-center gap-2">
             <List className="w-3.5 h-3.5" />
             <span className="tracking-widest">PROGRESS: 4/12</span>
           </div>
         </div>
      </footer>
    </div>
  );
}
