// Empty initial state for new users.
// Demo fixtures are preserved separately in mockData.demo.ts.

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

export const useUser = (): UserContext => {
  const name = "Professora";
  return {
    name,
    initials: initialsFromName(name),
    plan: "FREE",
    streakDays: 0,
    schools: 0,
    classes: 0,
    students: 0,
    pcdStudents: 0,
    documentsGenerated: 0,
    hoursSavedWeek: 0,
    minutesSavedWeek: 0,
    hoursSavedTotal: 0,
    reportsDoneBimester: 0,
    reportsTotalBimester: 0,
    weeklyGoalHours: 5,
    creditsUsed: 0,
    creditsTotal: 3000,
  };
};

export const greeting = (name: string) => {
  const h = new Date().getHours();
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