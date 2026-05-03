import { FileText, CalendarCheck, Sparkles, type LucideIcon } from "lucide-react";

const items: { icon: LucideIcon; title: string; meta: string }[] = [
  { icon: FileText, title: "Você gerou o parecer da Tereza", meta: "há 2h 4min · de criação" },
  { icon: CalendarCheck, title: "Planejamento da turma 211 finalizado", meta: "ontem · alinhado à BNCC" },
  { icon: Sparkles, title: "Atividade adaptada para Caio (TDAH)", meta: "2 dias atrás · matemática" },
];

export function WeekTimeline() {
  return (
    <section aria-labelledby="week-title">
      <div className="flex items-end justify-between">
        <h2 id="week-title" className="text-xl font-semibold tracking-tight">
          📈 Esta semana
        </h2>
        <a href="#" className="text-sm font-medium text-primary hover:underline">
          Ver tudo
        </a>
      </div>
      <ul className="mt-3 space-y-3">
        {items.map(({ icon: Icon, title, meta }) => (
          <li
            key={title}
            className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{meta}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}