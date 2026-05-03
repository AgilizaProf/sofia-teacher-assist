import { Bell, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
        <a href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">
            AgilizaProf
          </span>
        </a>

        <div className="relative mx-auto flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            placeholder="Pesquisar alunos, turmas, pareceres..."
            className="h-10 rounded-xl pl-9"
            aria-label="Pesquisar"
          />
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-xl"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          </Button>
          <div className="flex items-center gap-2 rounded-xl px-1 py-1 transition-all hover:bg-muted">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                C
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">Camila</span>
          </div>
        </div>
      </div>
    </header>
  );
}