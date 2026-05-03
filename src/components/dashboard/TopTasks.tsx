import {
  BarChart3,
  BookOpen,
  Calendar,
  FileEdit,
  Heart,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Task = { title: string; description: string; icon: LucideIcon };

const tasks: Task[] = [
  { title: "Gerar parecer descritivo", description: "Crie pareceres alinhados à BNCC em segundos", icon: FileEdit },
  { title: "Plano de aula com IA", description: "Sequências didáticas prontas para sua turma", icon: BookOpen },
  { title: "Plano Educacional Individualizado (PEI)", description: "Adaptações para alunos PCD com sensibilidade", icon: Heart },
  { title: "Agenda pedagógica", description: "Organize aulas, reuniões e eventos", icon: Calendar },
  { title: "Relatórios para a coordenação", description: "Pareceres em lote, PDFs com selo institucional", icon: BarChart3 },
  { title: "Conversar com a Sofia", description: "Tire dúvidas pedagógicas a qualquer hora", icon: MessageCircle },
];

export function TopTasks() {
  return (
    <section aria-labelledby="top-tasks">
      <h2 id="top-tasks" className="mb-4 text-lg font-semibold tracking-tight">
        O que você quer fazer agora?
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map(({ title, description, icon: Icon }) => (
          <button
            key={title}
            type="button"
            className="text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
          >
            <Card className="group h-full rounded-2xl border-border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold leading-tight">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </section>
  );
}