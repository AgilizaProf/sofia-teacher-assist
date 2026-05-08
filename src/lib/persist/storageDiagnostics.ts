/**
 * Diagnóstico de storage — captura ocorrências de dados inválidos vindos
 * do localStorage / snapshot remoto, sem quebrar a aplicação.
 *
 * Como inspecionar no navegador:
 *   window.__storageDiagnostics()         // lista as últimas ocorrências
 *   window.__storageDiagnostics.clear()   // limpa o buffer
 *
 * Cada `usePersistentState` chama `reportStorageIssue(...)` quando detecta:
 *   - JSON corrompido (falha no parse)
 *   - tipo incompatível com o `initial` (ex.: esperava array, veio objeto)
 *   - valor `null` onde se esperava objeto/array
 */

export type StorageIssueKind =
  | "parse-error"
  | "type-mismatch"
  | "null-where-object"
  | "null-where-array";

export type StorageSource = "localStorage" | "remote-snapshot";

export interface StorageIssue {
  ts: number;
  key: string;
  source: StorageSource;
  kind: StorageIssueKind;
  expectedType: string;
  receivedType: string;
  message: string;
  rawPreview?: string;
}

const MAX_ISSUES = 100;
const buffer: StorageIssue[] = [];

function previewOf(value: unknown): string {
  try {
    if (typeof value === "string") return value.length > 160 ? value.slice(0, 160) + "…" : value;
    const s = JSON.stringify(value);
    return s && s.length > 160 ? s.slice(0, 160) + "…" : s ?? String(value);
  } catch {
    return String(value);
  }
}

function typeLabel(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function reportStorageIssue(issue: Omit<StorageIssue, "ts">): void {
  const full: StorageIssue = { ts: Date.now(), ...issue };
  buffer.push(full);
  if (buffer.length > MAX_ISSUES) buffer.shift();

  // Console group amigável para diagnóstico rápido no DevTools.
  /* eslint-disable no-console */
  console.groupCollapsed(
    `%c[storage:invalid] %c${full.key} %c· ${full.kind}`,
    "color:#F97316;font-weight:700;",
    "color:#8B5CF6;font-weight:700;",
    "color:#888;font-weight:500;",
  );
  console.warn(full.message);
  console.log("source:", full.source);
  console.log("expected:", full.expectedType, "· received:", full.receivedType);
  if (full.rawPreview) console.log("raw preview:", full.rawPreview);
  console.groupEnd();
  /* eslint-enable no-console */
}

export function getStorageIssues(): StorageIssue[] {
  return buffer.slice();
}

export function clearStorageIssues(): void {
  buffer.length = 0;
}

/**
 * Verifica se `value` é estruturalmente compatível com `initial`.
 * Retorna `null` se OK, ou uma descrição do problema.
 */
export function detectShapeMismatch(
  value: unknown,
  initial: unknown,
): { kind: StorageIssueKind; expectedType: string; receivedType: string } | null {
  const expected = typeLabel(initial);
  const received = typeLabel(value);

  if (expected === "array" && received !== "array") {
    return {
      kind: received === "null" ? "null-where-array" : "type-mismatch",
      expectedType: "array",
      receivedType: received,
    };
  }
  if (expected === "object" && received !== "object") {
    return {
      kind: received === "null" ? "null-where-object" : "type-mismatch",
      expectedType: "object",
      receivedType: received,
    };
  }
  // Para tipos primitivos, exigimos correspondência direta.
  if (
    expected !== "object" &&
    expected !== "array" &&
    expected !== received &&
    // permitir undefined/null em primitivos opcionais
    received !== "undefined"
  ) {
    return { kind: "type-mismatch", expectedType: expected, receivedType: received };
  }
  return null;
}

// Expor helpers globais no client para inspeção rápida via DevTools.
if (typeof window !== "undefined") {
  const w = window as unknown as Record<string, unknown>;
  const fn = (() => getStorageIssues()) as ((() => StorageIssue[]) & { clear?: () => void });
  fn.clear = () => clearStorageIssues();
  w.__storageDiagnostics = fn;
}