// Empty initial state for new users.
// Demo fixtures are preserved separately in mockData.demo.ts.

import { useEffect, useState } from "react";
import { getMockAccount, subscribeMockAccount, PRO_DATASET, type MockAccount } from "./sofia/mockAccount";
import { brHour } from "./datetime";

export type UserContext = {
  name: string;
  initials: string;
  plan: "FREE" | "PRO" | "ANNUAL";
  streakDays: number;
  schools: number;
  classes: number;
  students: number;
  pcdStudents: number;
  documentsGenerated: number;
  hoursSavedWeek: number;
  minutesSavedWeek: number;
  hoursSavedTotal: number;
  reportsDoneBimester: number;
  reportsTotalBimester: number;
  weeklyGoalHours: number;
  creditsUsed: number;
  creditsTotal: number;
};

export const initialsFromName = (name: string): string => {
  const trimmed = (name || "").trim();
  if (!trimmed) return "P";
  const parts = trimmed.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "P";
};

function buildUser(account: MockAccount): UserContext {
  if (account === "pro_cheio") {
    const u = PRO_DATASET.user;
    const t = PRO_DATASET.turma;
    return {
      name: u.nome,
      initials: initialsFromName(u.nome),
      plan: "PRO",
      streakDays: u.streak_dias,
      schools: 1,
      classes: 1,
      students: t.total_alunos,
      pcdStudents: PRO_DATASET.alunos.length,
      documentsGenerated: PRO_DATASET.pareceres.finalizados,
      hoursSavedWeek: 4,
      minutesSavedWeek: 30,
      hoursSavedTotal: u.horas_economizadas_mes,
      reportsDoneBimester: PRO_DATASET.pareceres.finalizados,
      reportsTotalBimester: PRO_DATASET.pareceres.total,
      weeklyGoalHours: 5,
      creditsUsed: u.creditos_usados,
      creditsTotal: u.creditos_total,
    };
  }
  const name = "Educador(a)";
  return {
    name,
    initials: initialsFromName(name),
    plan: "FREE",
    streakDays: 0,
    schools: 0, classes: 0, students: 0, pcdStudents: 0,
    documentsGenerated: 0,
    hoursSavedWeek: 0, minutesSavedWeek: 0, hoursSavedTotal: 0,
    reportsDoneBimester: 0, reportsTotalBimester: 0,
    weeklyGoalHours: 5,
    creditsUsed: 0, creditsTotal: 3000,
  };
}

export const useUser = (): UserContext => {
  const [account, setAccount] = useState<MockAccount>(() =>
    typeof window === "undefined" ? "free_vazio" : getMockAccount()
  );
  useEffect(() => {
    setAccount(getMockAccount());
    return subscribeMockAccount(setAccount);
  }, []);
  return buildUser(account);
};

export const greeting = (name: string) => {
  const h = brHour();
  const slot = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return name ? `${slot}, ${name}` : `${slot} 👋`;
};

// Empty datasets — components should render their <EmptyState/> when these are empty.
export const students: never[] = [];
export const classes: never[] = [];
export const reports: never[] = [];
export const lessonPlans: never[] = [];
export const pcdStudents: never[] = [];
export const documents: never[] = [];
export const events: never[] = [];
export const timeline: never[] = [];
export const records: never[] = [];
export const sofiaHistory: never[] = [];
export const sofiaSuggestions: never[] = [];
export const radarItems: never[] = [];
export const recentActivity: never[] = [];
export const weeklyAgenda: never[] = [];