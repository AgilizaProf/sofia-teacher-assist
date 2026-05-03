import { Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function TimeAndFocus() {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
      <Card className="rounded-2xl border-border/70 shadow-sm h-full flex flex-col">
        <CardContent className="p-6 flex flex-1 flex-col justify-between">
          <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tempo devolvido a você
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">8 h 12 min</p>
          <p className="mt-1 text-sm text-muted-foreground">
            economizados nos últimos 7 dias
          </p>
          </div>
          <div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Meta: 10h</span>
              <span>82%</span>
            </div>
            <Progress value={82} className="mt-1.5 h-2" />
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
            <TrendingUp className="h-3.5 w-3.5" />
            +38% vs. semana passada
          </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className="rounded-2xl border-border/70 shadow-sm h-full flex flex-col"
        style={{ background: "var(--gradient-hero)" }}
      >
        <CardContent className="p-6 flex flex-1 flex-col">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Foco de hoje · sugerido pela IA
          </p>
          <h3 className="mt-2 text-lg font-semibold leading-snug text-foreground">
            Caio (TDAH) precisa de uma atividade adaptada para a aula de matemática de amanhã.
          </h3>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>~2 minutos para gerar</li>
            <li>baseado no laudo já cadastrado</li>
          </ul>
          <Button className="mt-auto pt-5 w-full rounded-xl h-11 shadow-sm sm:w-auto sm:px-6 self-start">
            <Sparkles className="mr-1 h-4 w-4" />
            Adaptar agora
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}