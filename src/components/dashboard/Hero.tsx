import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pt-2">
      <h1 id="hero-title" className="text-3xl font-bold tracking-tight md:text-[34px] md:leading-tight">
        Bom dia, Camila. Hoje você gera 3 pareceres em 12 minutos.
      </h1>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground">
        Você tem 6 alunos em 2 turmas aguardando o relatório descritivo do bimestre. Vamos juntas?
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button className="rounded-xl h-11 px-5 shadow-sm">
          Começar pelos pareceres
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
        <Button variant="ghost" className="rounded-xl h-11 px-4 text-foreground/70">
          <PlayCircle className="mr-1 h-4 w-4" />
          Tutorial · 90s
        </Button>
      </div>
    </section>
  );
}