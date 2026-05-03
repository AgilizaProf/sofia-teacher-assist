import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SofiaHero() {
  return (
    <section
      aria-labelledby="sofia-greeting"
      className="relative overflow-hidden rounded-2xl border border-border p-6 shadow-sm md:p-8"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Sparkles className="h-7 w-7" aria-hidden />
        </div>
        <div className="flex-1">
          <h1 id="sofia-greeting" className="text-2xl font-bold tracking-tight md:text-3xl">
            Bom dia, Camila ✨
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Você tem 3 pareceres pendentes da turma 211 e 1 plano de aula para revisar.
            Quer que eu comece pelo mais urgente?
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="rounded-xl shadow-sm transition-all duration-200 hover:shadow-md">
              <Sparkles className="mr-2 h-4 w-4" />
              Começar com a Sofia
            </Button>
            <Button variant="outline" className="rounded-xl bg-card transition-all duration-200">
              Ver tudo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}