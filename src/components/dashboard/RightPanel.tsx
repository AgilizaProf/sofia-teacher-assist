import { Sparkles, ArrowRight, BookOpen, Accessibility, UserPlus, Upload } from "lucide-react";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-auto inline-flex h-5 items-center rounded-md border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function Item({
  icon: Icon,
  label,
  shortcut,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
}) {
  return (
    <a
      href="#"
      className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 truncate">{label}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </a>
  );
}

export function RightPanel() {
  return (
    <aside className="hidden xl:flex xl:flex-col xl:w-72 xl:shrink-0 xl:fixed xl:inset-y-0 xl:right-0 xl:z-20 xl:border-l xl:border-border xl:bg-card xl:px-3 xl:py-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <SectionTitle>Sugestões da IA</SectionTitle>
          <div className="space-y-1">
            <a
              href="#"
              className="flex items-start gap-2 rounded-lg border border-border/70 bg-background p-3 text-sm transition-colors hover:bg-muted"
            >
              <Sparkles className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <span className="flex-1">Gerar parecer descritivo da Tereza</span>
              <Kbd>↵</Kbd>
            </a>
            <a
              href="#"
              className="flex items-start gap-2 rounded-lg border border-border/70 bg-background p-3 text-sm transition-colors hover:bg-muted"
            >
              <Sparkles className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <span className="flex-1">Adaptar atividade para Caio (TDAH)</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </div>

        <div className="space-y-2">
          <SectionTitle>Ir para</SectionTitle>
          <div className="space-y-0.5">
            <Item icon={BookOpen} label="Planejamento" shortcut="G P" />
            <Item icon={Accessibility} label="Inclusão" shortcut="G I" />
          </div>
        </div>

        <div className="space-y-2">
          <SectionTitle>Ações rápidas</SectionTitle>
          <div className="space-y-0.5">
            <Item icon={UserPlus} label="Cadastrar novo aluno" shortcut="N A" />
            <Item icon={Upload} label="Importar lista de alunos (CSV)" />
          </div>
        </div>
      </div>
    </aside>
  );
}