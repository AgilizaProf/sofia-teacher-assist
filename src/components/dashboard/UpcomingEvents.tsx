import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const events = [
  { time: "14h", title: "Conselho de classe - 211", when: "Hoje" },
  { time: "8h", title: "Aula de Língua Portuguesa - 211", when: "Amanhã" },
  { time: "10h", title: "Reunião com responsáveis - João Silva", when: "Sex" },
];

export function UpcomingEvents() {
  return (
    <Card className="rounded-2xl border-border shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Calendar className="h-5 w-5 text-primary" aria-hidden />
        <CardTitle className="text-base font-semibold">Próximos compromissos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((e) => (
          <div
            key={e.title}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="text-sm font-bold">{e.time}</span>
              </div>
              <p className="truncate text-sm font-medium">{e.title}</p>
            </div>
            <Badge variant="secondary" className="rounded-lg shrink-0">
              {e.when}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}