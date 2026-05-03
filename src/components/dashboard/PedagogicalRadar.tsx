import { Radar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Insight = {
  tone: "warning" | "info" | "success";
  message: string;
  cta: string;
};

const insights: Insight[] = [
  {
    tone: "warning",
    message: "Maria Silva (211) está há 3 semanas sem registro no diário. Quer adicionar uma observação?",
    cta: "Resolver",
  },
  {
    tone: "info",
    message: "Você ainda não criou o plano de Matemática da semana de 06/05. Posso sugerir um?",
    cta: "Ver",
  },
  {
    tone: "success",
    message: "Parabéns! Você completou 80% dos pareceres do 1º bimestre. Faltam 9.",
    cta: "Ver",
  },
];

const toneStyles: Record<Insight["tone"], { dot: string; border: string; bg: string }> = {
  warning: { dot: "bg-warning", border: "border-warning/30", bg: "bg-warning/10" },
  info: { dot: "bg-info", border: "border-info/30", bg: "bg-info/10" },
  success: { dot: "bg-accent", border: "border-accent/30", bg: "bg-accent/10" },
};

export function PedagogicalRadar() {
  return (
    <Card className="rounded-2xl border-border shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Radar className="h-5 w-5 text-primary" aria-hidden />
        <CardTitle className="text-base font-semibold">Radar Pedagógico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((i, idx) => {
          const s = toneStyles[i.tone];
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-xl border ${s.border} ${s.bg} p-3 transition-all duration-200`}
            >
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug text-foreground">{i.message}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 rounded-lg px-2 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  {i.cta}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}