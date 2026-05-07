import { useEffect, useRef } from "react";
import { useSofiaUserData } from "./SofiaUserContext";
import { useSofiaNotifications } from "./notifications";
import {
  actionOpenAgenda,
  actionOpenAluno,
  actionOpenAlunoNoMomento,
  actionOpenPlanejamento,
} from "./dashboardLinks";

// ─────────────────────────────────────────────────────────────────────────────
// Sofia — Lembretes automáticos (Fase 3)
//
// Componente "headless": não renderiza UI. Avalia, em background, o estado
// real do usuário (turmas, agenda, diário) e empurra notificações para o
// store global da Sofia. Princípios:
//
//   • Sofia só fala do que o usuário JÁ cadastrou — se algo está vazio,
//     ela pergunta se quer preencher (nunca inventa).
//   • Cada lembrete tem `dedupKey` por dia/semana, então não dispara
//     repetidamente na mesma sessão nem após refresh.
//   • Toda notificação tem ação clicável que leva ao elemento real.
// ─────────────────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekKey(): string {
  const d = new Date();
  // ISO week-ish: ano + número da semana aproximado
  const start = new Date(d.getFullYear(), 0, 1);
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const week = Math.ceil((diffDays + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Texto curto descrevendo um aluno PCD ("Ana (TEA)" ou só "Ana").
function describePcd(nome: string, codigo: string | null): string {
  if (!codigo) return `**${nome}**`;
  return `**${nome}** (${codigo.toUpperCase()})`;
}

export function SofiaAutoReminders() {
  const data = useSofiaUserData();
  const notif = useSofiaNotifications();
  // Evita reavaliar dezenas de vezes por segundo: dispara a cada 5 min e on-mount.
  const tickRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const evaluate = () => {
      if (cancelled) return;
      tickRef.current += 1;

      // Não age se o usuário ainda não cadastrou nada — Sofia perguntaria,
      // mas aqui evitamos poluir o drawer no primeiro acesso.
      if (!data.hasAnyData) return;

      const now = new Date();
      const hour = now.getHours();
      const today = todayISO();

      // ── 1) Dia sem aula na agenda ──────────────────────────────────────
      // Só se o usuário tem turmas cadastradas e usa a agenda (já tem ao
      // menos 1 evento histórico). Após 8h e antes das 20h.
      const hasTurmas = data.turmas.length > 0;
      const usaAgenda = data.agenda.length > 0;
      const eventosHoje = data.agenda.filter((e) => e.date === today);
      if (hasTurmas && usaAgenda && eventosHoje.length === 0 && hour >= 8 && hour < 20) {
        notif.push({
          category: "lembrete",
          text: "Notei que hoje não há aulas marcadas na sua agenda. Quer revisar ou adicionar algo?",
          dedupKey: `lembrete:dia-sem-aula:${today}`,
          action: actionOpenAgenda("Abrir agenda"),
        });
      }

      // ── 2) Diário de bordo sem registros recentes ──────────────────────
      // Só se o usuário já registrou algo alguma vez (caso contrário,
      // estaríamos sugerindo sobre algo que ele não usa). À tarde/noite.
      if (data.diario.entries.length > 0 && hour >= 17) {
        // Existe algum registro com timestamp de hoje?
        const houveHoje = data.diario.entries.some((e) => {
          const m = /^e-(\d+)/.exec(e.id);
          if (!m) return /^Hoje/i.test(e.date);
          const d = new Date(Number(m[1]));
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        });
        if (!houveHoje) {
          notif.push({
            category: "lembrete",
            text: "Você ainda não registrou nada no diário de bordo hoje. Posso abrir um espaço rápido pra você?",
            dedupKey: `lembrete:sem-diario:${today}`,
            action: actionOpenPlanejamento("m6", "Abrir diário"),
          });
        }
      }

      // ── 3) Padrão repetido em tags do diário ───────────────────────────
      // Se nas últimas 7 entradas a mesma tag aparece 3+ vezes, sinaliza.
      const recentes = data.diario.entries.slice(0, 7);
      if (recentes.length >= 4) {
        const cont: Record<string, number> = {};
        for (const e of recentes) {
          for (const t of e.tags ?? []) cont[t] = (cont[t] ?? 0) + 1;
        }
        const top = Object.entries(cont)
          .filter(([, n]) => n >= 3)
          .sort((a, b) => b[1] - a[1])[0];
        if (top) {
          const [tag, n] = top;
          notif.push({
            category: "padrao",
            text: `Notei que a tag **${tag}** apareceu ${n}× nas suas últimas anotações. Quer que eu ajude a explorar esse padrão?`,
            dedupKey: `padrao:tag:${tag}:${weekKey()}`,
            action: actionOpenPlanejamento("m6", "Ver diário"),
          });
        }
      }

      // ── 4) Alertas PCD nos momentos M1, M3 e M5 ────────────────────────
      // Sofia só avisa sobre alunos PCD que JÁ estão cadastrados (nunca
      // inventa). Cada alerta é deduplicado por turma + momento + semana
      // para não repetir na mesma sessão nem após refresh.
      if (data.alunosPCD.length > 0) {
        const wk = weekKey();

        // Para cada turma que tem alunos PCD, monta o resumo curto.
        const turmasComPcd = Object.entries(data.alunosPCDPorTurma).filter(
          ([turma, lista]) => turma !== "_sem_turma" && lista.length > 0,
        );

        for (const [turma, lista] of turmasComPcd) {
          // Limita a 3 nomes para o texto não estourar.
          const nomes = lista.slice(0, 3).map((a) => describePcd(a.primeiro_nome, a.pcd_codigo)).join(", ");
          const extra = lista.length > 3 ? ` e mais ${lista.length - 3}` : "";
          const primeiro = lista[0];

          // M1 — ao gerar/revisar a semana, lembrar de adaptar para PCD.
          notif.push({
            category: "pcd",
            text: `Na turma **${turma}** você tem ${lista.length} aluno(s) PCD: ${nomes}${extra}. Quer que eu sugira adaptações ao montar a semana?`,
            dedupKey: `pcd:m1:${turma}:${wk}`,
            action: actionOpenPlanejamento("m1", "Abrir M1 com a turma"),
          });

          // M3 — editor conversacional: lembrar nominalmente do(s) aluno(s).
          notif.push({
            category: "pcd",
            text: `Ao editar o plano de **${turma}**, lembre de incluir suportes para ${nomes}${extra}. Posso abrir o editor agora?`,
            dedupKey: `pcd:m3:${turma}:${wk}`,
            action: actionOpenPlanejamento("m3", "Abrir editor (M3)"),
          });

          // M5 — replicar entre turmas: aviso de que a turma de destino tem PCDs.
          notif.push({
            category: "pcd",
            text: `Antes de replicar para **${turma}**, lembre que ${nomes}${extra} pode(m) precisar de ajustes específicos.`,
            dedupKey: `pcd:m5:${turma}:${wk}`,
            action: actionOpenPlanejamento("m5", "Revisar antes de replicar"),
          });

          // Atalho extra: abrir o detalhe do primeiro aluno PCD da turma
          // direto no Dashboard (anotações de PCD).
          if (primeiro) {
            notif.push({
              category: "pcd",
              text: `Há anotações de PCD para **${primeiro.primeiro_nome}** (${turma}). Quer revisar antes de planejar?`,
              dedupKey: `pcd:detalhe:${turma}:${primeiro.id}:${wk}`,
              // Deep-link com momento: filtra PCD, destaca o aluno na lista
              // e abre o modal de detalhe com o bloco "Contexto Sofia".
              action: actionOpenAlunoNoMomento("m1", primeiro.nome, "Ver aluno (M1)"),
            });
          }
        }
      }
    };

    // Primeira avaliação um pouco depois do mount (evita disparar antes da
    // hidratação dos dados persistidos).
    const t0 = window.setTimeout(evaluate, 4000);
    const interval = window.setInterval(evaluate, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearInterval(interval);
    };
    // Reavalia quando os dados-base do usuário mudam.
  }, [data, notif]);

  return null;
}
