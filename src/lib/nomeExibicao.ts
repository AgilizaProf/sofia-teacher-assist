// Nomes de alunos chegam como foram digitados: "CAIO FERNANDES", "paulo", "Luís".
// Para a tela ficar uniforme, nomes todos em maiúsculas ou todos em minúsculas
// aparecem com a primeira letra maiúscula. Nomes já misturados ("Ana de Souza")
// ficam como estão. O dado guardado não muda.
const MINUSCULAS = new Set(["da", "de", "do", "das", "dos", "e"]);

export function nomeExibicao(nome: string | null | undefined): string {
  const n = (nome ?? "").trim().replace(/\s+/g, " ");
  if (!n) return "";
  const tudoIgual = n === n.toUpperCase() || n === n.toLowerCase();
  if (!tudoIgual) return n;
  return n
    .toLowerCase()
    .split(" ")
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}
