import {
  Home,
  Users,
  BookOpen,
  Heart,
  FileText,
  Calendar,
  BarChart3,
  MessageCircle,
  Sparkles,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const items = [
  { icon: Home, label: "Início", active: true },
  { icon: Users, label: "Alunos" },
  { icon: BookOpen, label: "Planejamento" },
  { icon: Heart, label: "Inclusão" },
  { icon: FileText, label: "Pareceres" },
  { icon: Calendar, label: "Agenda" },
  { icon: BarChart3, label: "Relatórios" },
  { icon: MessageCircle, label: "Sofia", badge: "IA" },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 border-r border-border bg-card">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <span className="text-base font-semibold tracking-tight">AgilizaProf</span>
      </div>

      <nav className="flex-1 px-3 pt-2" aria-label="Navegação principal">
        <ul className="space-y-1">
          {items.map(({ icon: Icon, label, active, badge }) => (
            <li key={label}>
              <a
                href="#"
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{label}</span>
                {badge && (
                  <Badge className="h-5 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary hover:bg-primary/15">
                    {badge}
                  </Badge>
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="m-3 flex items-center gap-3 rounded-xl border border-border bg-background p-2.5">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            C
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">Camila</p>
          <p className="truncate text-xs text-muted-foreground">Professora</p>
        </div>
        <button
          aria-label="Configurações"
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}