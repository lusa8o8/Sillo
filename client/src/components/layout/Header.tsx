import { Plus, User } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  onAddClick?: () => void;
}

export function Header({ onAddClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between py-6 px-6 md:px-0" data-testid="header">
      <Link href="/">
        <h1 className="text-2xl font-light tracking-[0.2em] cursor-pointer hover:opacity-80 transition-opacity">
          SILLO
        </h1>
      </Link>
      <div className="flex items-center gap-6">
        <button
          onClick={onAddClick}
          className="p-2 hover:bg-white/5 rounded-full transition-colors group"
          aria-label="Add Vault"
        >
          <Plus className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
        <button className="p-2 hover:bg-white/5 rounded-full transition-colors group" aria-label="Profile">
          <User className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>
    </header>
  );
}
