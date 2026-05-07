// ─────────────────────────────────────────────────────────────────────────────
// Testes E2E do pipeline de filtros do M6.
//
// Simulam a cadeia completa que o usuário exercita ao abrir o diário:
//   URL (?tag/?turma/?aluno) ou localStorage (plan_m6_filters)
//     → sanitizeFilter / sanitizeM6Filters
//     → filterM6Entries
//     → lista renderizada
//
// Garantem que valores inválidos (XSS, controle, oversize, tipos errados,
// localStorage corrompido) nunca afetem a lista filtrada — a saída precisa
// ser idêntica à de "sem filtros aplicados".
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from "vitest";
import { filterM6Entries, sanitizeM6Filters, type M6EntryLike } from "./m6Filters";

const ENTRIES: M6EntryLike[] = [
  { title: "Leitura", text: "Turma 5A engajada com a Maria.", tags: ["+ funcionou"] },
  { title: "Frações", text: "Turma 5B precisou reforço com João Pedro.", tags: ["- precisa reforço"] },
  { title: "Ciências", text: "Reunião com família da Ana foi ótima.", tags: ["+ funcionou", "+ família"] },
  { title: "Roda", text: "Turma 5A em conversa de inclusão.", tags: ["+ inclusão"] },
];

function parseURLFilters(qs: string): Record<string, unknown> {
  const u = new URLSearchParams(qs);
  const obj: Record<string, unknown> = {};
  for (const [k, v] of u.entries()) obj[k] = v;
  return obj;
}

describe("M6 filtros — pipeline E2E (URL → sanitização → filtro)", () => {
  it("URL válida filtra corretamente por tag, turma e aluno combinados", () => {
    const raw = parseURLFilters("tag=funcionou&turma=5A&aluno=Maria");
    const out = filterM6Entries(ENTRIES, raw);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Leitura");
  });

  it("URL sem filtros retorna lista intacta", () => {
    expect(filterM6Entries(ENTRIES, {})).toEqual(ENTRIES);
    expect(filterM6Entries(ENTRIES, parseURLFilters(""))).toEqual(ENTRIES);
  });

  it.each([
    ["XSS em tag",      "tag=%3Cscript%3Ealert(1)%3C%2Fscript%3E"],
    ["regex injection", "turma=.%2A%7C5A"], // ".*|5A"
    ["controle",        "aluno=Maria%00%0A"],
    ["oversize >80",    "tag=" + encodeURIComponent("a".repeat(120))],
    ["template lit",    "turma=%24%7Bx%7D"], // "${x}"
    ["path traversal",  "aluno=..%2F..%2Fetc%2Fpasswd"],
    ["pipe/backslash",  "tag=foo%5Cbar%7Cbaz"],
  ])("URL inválida (%s) é descartada e lista permanece igual à sem filtro", (_label, qs) => {
    const raw = parseURLFilters(qs);
    expect(filterM6Entries(ENTRIES, raw)).toEqual(ENTRIES);
  });

  it("URL parcialmente inválida mantém apenas campos válidos", () => {
    // turma válida + aluno com XSS → filtra só por turma; aluno é descartado.
    const raw = parseURLFilters("turma=5A&aluno=%3Cscript%3E");
    const out = filterM6Entries(ENTRIES, raw);
    expect(out.map((e) => e.title)).toEqual(["Leitura", "Roda"]);
  });

  it("URL com tag em case diferente faz match (case-insensitive)", () => {
    const out = filterM6Entries(ENTRIES, parseURLFilters("tag=FUNCIONOU"));
    expect(out).toHaveLength(2);
  });
});

describe("M6 filtros — pipeline E2E (localStorage corrompido)", () => {
  it.each<[string, unknown]>([
    ["null",                     null],
    ["string crua",              "totally-broken"],
    ["array",                    ["tag", "5A"]],
    ["número",                   42],
    ["boolean",                  true],
    ["objeto com tipos errados", { tag: 123, turma: { x: 1 }, aluno: ["Maria"] }],
    ["objeto com XSS",           { tag: "<script>", turma: "${x}", aluno: "../../etc" }],
    ["objeto com strings vazias",{ tag: "", turma: "   ", aluno: "\u0000" }],
    ["objeto oversize",          { tag: "a".repeat(200) }],
  ])("localStorage corrompido (%s) → filtros sanitizados ficam vazios e lista é intacta", (_label, raw) => {
    expect(sanitizeM6Filters(raw)).toEqual({ tag: undefined, turma: undefined, aluno: undefined });
    expect(filterM6Entries(ENTRIES, raw)).toEqual(ENTRIES);
  });

  it("localStorage com mistura válido+inválido aplica só o válido", () => {
    const raw = { tag: "+ família", turma: "<bad>", aluno: 123 };
    const out = filterM6Entries(ENTRIES, raw);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Ciências");
  });

  it("aluno via mention respeita fronteira de palavra (não casa substring)", () => {
    // "Ana" está dentro de "Mariana" — não pode casar uma entrada com Mariana.
    const entries: M6EntryLike[] = [
      { title: "x", text: "A Mariana trouxe a tarefa.", tags: [] },
      { title: "y", text: "A Ana participou.", tags: [] },
    ];
    const out = filterM6Entries(entries, { aluno: "Ana" });
    expect(out.map((e) => e.title)).toEqual(["y"]);
  });
});