import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const filters = [
  { label: "Todos", count: 6, active: true },
  { label: "PCD", count: 1 },
  { label: "Regular", count: 5 },
];

type Student = {
  initials: string;
  name: string;
  meta: string;
  pcd?: string;
};

const turmas: { name: string; subtitle: string; students: Student[] }[] = [
  {
    name: "1º ano · Teste",
    subtitle: "Ed. Infantil · sala 111",
    students: [{ initials: "T", name: "Tereza", meta: "1º ano · sem laudo" }],
  },
  {
    name: "2º ano · CAIC",
    subtitle: "Fundamental I · sala 211",
    students: [
      { initials: "CF", name: "Caio Fernandes", meta: "2º ano · acompanhamento ativo", pcd: "PCD · TDAH" },
      { initials: "MR", name: "Maria Ribeiro", meta: "2º ano · sem laudo" },
    ],
  },
];

export function StudentsSection() {
  return (
    <section aria-labelledby="students-title">
      <div className="flex items-center gap-2">
        <h2 id="students-title" className="text-xl font-semibold tracking-tight">
          Seus alunos
        </h2>
        <Badge className="rounded-full bg-muted text-foreground/70 hover:bg-muted">6</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              f.active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/70 hover:bg-muted"
            )}
          >
            {f.label}
            <span className={cn("text-[11px]", f.active ? "opacity-90" : "text-muted-foreground")}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {turmas.map((t) => (
          <Card key={t.name} className="rounded-2xl border-border/70 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.subtitle}</p>
                </div>
                <Badge className="rounded-full bg-muted text-foreground/70 hover:bg-muted">
                  {t.students.length} {t.students.length === 1 ? "aluno" : "alunos"}
                </Badge>
              </div>
              <ul className="mt-4 divide-y divide-border/60">
                {t.students.map((s) => (
                  <li key={s.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-foreground/70 text-xs font-semibold">
                        {s.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        {s.pcd && (
                          <Badge className="rounded-full bg-primary/10 text-primary text-[10px] hover:bg-primary/10">
                            {s.pcd}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{s.meta}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}