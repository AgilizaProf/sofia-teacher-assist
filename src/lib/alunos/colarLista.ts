// Lê uma lista de nomes colada pela professora (do diário de classe, de uma
// planilha, do WhatsApp…) e devolve só os nomes, um por aluno.

const MAX = 80;

/** Tira numeração ("1.", "01 -", "3)"), marcadores e colunas extras de planilha. */
function limparLinha(linha: string): string {
  let l = linha.split("\t").map((c) => c.trim()).filter(Boolean).find((c) => /[a-zà-ú]{2}/i.test(c)) ?? "";
  l = l.replace(/^[\s•\-–*·]+/, "");
  l = l.replace(/^\d{1,3}\s*[.)\-–º°:]?\s+/, "");
  l = l.replace(/\s+/g, " ").trim();
  if (!/[a-zà-ú]/i.test(l)) return "";
  // Nome todo em maiúsculas vira "Nome Sobrenome"
  if (l === l.toUpperCase()) {
    l = l
      .toLowerCase()
      .split(" ")
      .map((p) => (/^(da|de|do|das|dos|e)$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(" ");
  }
  return l.slice(0, 120);
}

function chave(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export type ListaColada = { novos: string[]; repetidos: string[]; cortados: number };

/** Separa os nomes novos dos que já estão na turma. Aceita uma linha por aluno
 *  ou nomes separados por ";". */
export function lerListaColada(texto: string, jaNaTurma: string[] = []): ListaColada {
  const existentes = new Set(jaNaTurma.map(chave));
  const vistos = new Set<string>();
  const novos: string[] = [];
  const repetidos: string[] = [];
  for (const bruto of texto.split(/\r?\n|;/)) {
    const nome = limparLinha(bruto);
    if (nome.length < 2) continue;
    const k = chave(nome);
    if (vistos.has(k)) continue;
    vistos.add(k);
    if (existentes.has(k)) repetidos.push(nome);
    else novos.push(nome);
  }
  const cortados = Math.max(0, novos.length - MAX);
  return { novos: novos.slice(0, MAX), repetidos, cortados };
}
