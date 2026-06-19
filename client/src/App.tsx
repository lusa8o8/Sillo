import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Player from "@/pages/player";
import Login from "@/pages/login";
import { SilloProvider } from "@/context/SilloContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/player/:id" component={Player} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster />
        <Login />
      </>
    );
  }

  return (
    <SilloProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </SilloProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthedApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
