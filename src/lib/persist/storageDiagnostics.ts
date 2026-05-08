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
  /** Tamanho original do raw em chars, antes do truncamento. */
  rawSize?: number;
  /** Exemplo do shape esperado (derivado do `initial`). */
  expectedShape?: string;
  /** Exemplo "esqueleto" do valor recebido (apenas tipos, sem payload). */
  receivedShape?: string;
}

const MAX_ISSUES = 100;
const PREVIEW_MAX = 1200; // ~15× maior que antes
const SHAPE_MAX_DEPTH = 3;
const SHAPE_MAX_KEYS = 12;
const SHAPE_MAX_ITEMS = 3;
const buffer: StorageIssue[] = [];

function typeLabel(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** Preview maior, com pretty-print quando JSON é válido. */
export function previewOf(value: unknown, max: number = PREVIEW_MAX): { text: string; size: number } {
  try {
    if (typeof value === "string") {
      // Tenta pretty-print se for JSON; senão devolve string crua.
      try {
        const parsed = JSON.parse(value) as unknown;
        const pretty = JSON.stringify(parsed, null, 2);
        return truncate(pretty, max);
      } catch {
        return truncate(value, max);
      }
    }
    const s = JSON.stringify(value, null, 2) ?? String(value);
    return truncate(s, max);
  } catch {
    return truncate(String(value), max);
  }
}

function truncate(s: string, max: number): { text: string; size: number } {
  const size = s.length;
  return { text: size > max ? s.slice(0, max) + `\n… (+${size - max} chars omitidos)` : s, size };
}

/**
 * Gera uma representação compacta do "shape" de um valor — apenas tipos,
 * limitando profundidade/largura para o log permanecer legível.
 */
export function shapeOf(value: unknown, depth: number = 0): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "function") return "function";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (depth >= SHAPE_MAX_DEPTH) return "[…]";
    const sample = value.slice(0, SHAPE_MAX_ITEMS).map((v) => shapeOf(v, depth + 1));
    const more = value.length > SHAPE_MAX_ITEMS ? `, …(+${value.length - SHAPE_MAX_ITEMS})` : "";
    return `[${sample.join(", ")}${more}]`;
  }
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    if (depth >= SHAPE_MAX_DEPTH) return "{…}";
    const shown = keys.slice(0, SHAPE_MAX_KEYS);
    const parts = shown.map((k) => `${k}: ${shapeOf(obj[k], depth + 1)}`);
    const more = keys.length > SHAPE_MAX_KEYS ? `, …(+${keys.length - SHAPE_MAX_KEYS})` : "";
    return `{ ${parts.join(", ")}${more} }`;
  }
  return t;
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
  if (full.expectedShape) console.log("expected shape:", full.expectedShape);
  if (full.receivedShape) console.log("received shape:", full.receivedShape);
  if (full.rawPreview) {
    const sizeNote = typeof full.rawSize === "number" ? ` (${full.rawSize} chars)` : "";
    console.log(`raw preview${sizeNote}:\n${full.rawPreview}`);
  }
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