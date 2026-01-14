import { Plus, User } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  onAddClick?: () => void;
}

export function Header({ onAddClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between py-4 px-6 md:px-0 sticky top-0 z-50 bg-background/50 backdrop-blur-md border-b border-white/5 transition-all" data-testid="header">
      <Link href="/">
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
            <span className="font-bold text-primary">S</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
            SILLO
          </h1>
        </div>
      </Link>
      <div className="flex items-center gap-4">
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          aria-label="Add Vault"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Vault</span>
        </button>
        <button className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground" aria-label="Profile">
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
