import { Plus, LogOut } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onAddClick?: () => void;
}

export function Header({ onAddClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const initial = (user?.displayName || user?.email || "?").charAt(0).toUpperCase();

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors text-sm font-semibold text-foreground/80"
              aria-label="Profile"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span>{initial}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium truncate">{user?.displayName || "Signed in"}</span>
              {user?.email && <span className="text-xs font-normal text-muted-foreground truncate">{user.email}</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
