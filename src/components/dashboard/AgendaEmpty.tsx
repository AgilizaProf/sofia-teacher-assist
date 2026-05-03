import { CalendarPlus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AgendaEmpty() {
  return (
    <section aria-labelledby="agenda-title">
      <div className="flex items-end justify-between">
        <h2 id="agenda-title" className="text-xl font-semibold tracking-tight">
          🗓️ Agenda
        </h2>
        <a href="#" className="text-sm font-medium text-primary hover:underline">
          Abrir
        </a>
      </div>
      <Card className="mt-3 rounded-2xl border-border/70 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Calendar className="h-6 w-6" />
          </div>
          <p className="mt-3 font-semibold">Sua semana está livre</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Adicione provas, entregas e reuniões pra não esquecer.
          </p>
          <Button variant="outline" className="mt-4 rounded-xl">
            <CalendarPlus className="mr-1 h-4 w-4" />
            Adicionar evento
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}