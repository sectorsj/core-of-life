import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-6 max-w-md px-6">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-20 w-20 text-destructive/80" />
        </div>
        <h1 className="text-4xl font-display font-bold text-white" data-testid="text-404-title">404: Пустота</h1>
        <p className="text-muted-foreground font-tech text-lg" data-testid="text-404-message">
          Координаты, к которым вы пытаетесь получить доступ, не существуют в этом слое реальности.
        </p>
        
        <div className="pt-6">
          <Link href="/" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 font-display tracking-widest uppercase" data-testid="link-return-to-core">
            Вернуться в Ядро
          </Link>
        </div>
      </div>
    </div>
  );
}
