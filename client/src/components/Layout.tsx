import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Hexagon, Activity, Map, Home } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" data-testid="link-home">
            <div className="relative">
              <Hexagon className="w-8 h-8 text-primary group-hover:rotate-180 transition-transform duration-700" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              </div>
            </div>
            <span className="text-xl font-serif tracking-widest text-foreground font-bold group-hover:text-primary transition-colors">
              CORE<span className="text-primary font-light">OF</span>LIFE
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4">
              <Link href="/" data-testid="nav-dashboard">
                <Button variant={location === "/" ? "secondary" : "ghost"} size="sm" className="font-display text-xs">
                  <Home className="w-4 h-4 mr-1" /> Персонаж
                </Button>
              </Link>
              <Link href="/world" data-testid="nav-world">
                <Button variant={location === "/world" ? "secondary" : "ghost"} size="sm" className="font-display text-xs">
                  <Map className="w-4 h-4 mr-1" /> Мир
                </Button>
              </Link>
            </div>

            {user ? (
              <>
                <div className="hidden md:flex items-center gap-6 text-sm font-display text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    В сети
                  </span>
                </div>
                
                <div className="h-6 w-[1px] bg-white/10" />
                
                <div className="flex items-center gap-3">
                  <span className="hidden md:inline font-tech text-primary" data-testid="text-user-email">{user.email}</span>
                  <Button variant="ghost" size="icon" onClick={() => logout()} title="Выйти" data-testid="button-logout">
                    <LogOut className="w-5 h-5 text-muted-foreground hover:text-destructive transition-colors" />
                  </Button>
                </div>
              </>
            ) : (
              <Button asChild variant="ghost" className="font-display" data-testid="link-login">
                <a href="/api/login">Войти</a>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+CjxwYXRoIGQ9Ik01MCAwSDBWMTUwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-20 pointer-events-none" />
        
        <div className="container mx-auto px-4 py-8 relative z-10">
          {children}
        </div>
      </main>

      <footer className="border-t border-white/5 py-8 bg-black/20">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground font-tech">
          <p>© 2025 CORE OF LIFE SYSTEM. ВСЕ ПРАВА ЗАЩИЩЕНЫ.</p>
          <p className="mt-2 opacity-50">v0.9.1-АЛЬФА // ГЕНОМНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ АКТИВНА</p>
        </div>
      </footer>
    </div>
  );
}
