import { Clock, FileText, GraduationCap, Users, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Stat = {
  label: string;
  value: string;
  icon: LucideIcon;
  subtitle?: string;
  progress?: number;
};

const stats: Stat[] = [
  { label: "Turmas ativas", value: "2", icon: Users },
  { label: "Alunos", value: "47", icon: GraduationCap },
  { label: "Pareceres este bimestre", value: "12 / 47", icon: FileText, progress: (12 / 47) * 100 },
  { label: "Horas economizadas", value: "23h", icon: Clock, subtitle: "este mês com a Sofia" },
];

export function QuickStats() {
  return (
    <section aria-label="Resumo rápido" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, subtitle, progress }) => (
        <Card
          key={label}
          className="rounded-2xl border-border shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
            {progress !== undefined && (
              <Progress value={progress} className="mt-3 h-2" />
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}