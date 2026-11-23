// Qual aluno é o da mensagem do WhatsApp?
//
// A mensagem chega com o nome como a professora falou ("o Bento leu hoje").
// Quando o nome bate com um aluno só, ele já vem escolhido. Quando bate com
// mais de um (Bento Xavier e Bento da Cruz), a tela "Para confirmar" pergunta
// "Qual Bento?" e a professora toca no certo. Nada de foto: só o nome e a turma.

export type AlunoSala = { id: string; nome: string; turma: string };

export type AlunoResolvido = {
  /** Aluno já definido (pelo id da mensagem ou por ser o único com esse nome). */
  escolhido: AlunoSala | null;
  /** Alunos com esse nome, quando há mais de um. */
  candidatos: AlunoSala[];
};

function palavras(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// "da", "de", "dos"… não ajudam a separar um aluno do outro.
const LIGACOES = new Set(["da", "de", "do", "das", "dos", "e"]);

function chave(s: string): string[] {
  return palavras(s).filter((p) => !LIGACOES.has(p));
}

/**
 * Alunos cujo nome contém todas as palavras do nome da mensagem.
 * "Bento" → Bento Xavier e Bento da Cruz; "Bento Cruz" → só Bento da Cruz.
 * Sem acento e sem diferença de maiúsculas.
 */
export function candidatosPara(nomeMensagem: string, alunos: AlunoSala[]): AlunoSala[] {
  const alvo = chave(nomeMensagem);
  if (alvo.length === 0) return [];
  const exatos = alunos.filter((a) => chave(a.nome).join(" ") === alvo.join(" "));
  if (exatos.length > 0) return exatos;
  return alunos.filter((a) => {
    const p = chave(a.nome);
    return alvo.every((w) => p.includes(w));
  });
}

export function resolverAluno(
  msg: { aluno_id: string | null; aluno_nome: string | null },
  alunos: AlunoSala[],
): AlunoResolvido {
  const peloId = msg.aluno_id ? alunos.find((a) => a.id === msg.aluno_id) : undefined;
  if (peloId) return { escolhido: peloId, candidatos: [] };
  const cands = candidatosPara(msg.aluno_nome || "", alunos);
  if (cands.length === 1) return { escolhido: cands[0], candidatos: [] };
  return { escolhido: null, candidatos: cands };
}

/** O primeiro nome do jeito que veio na mensagem, para a pergunta "Qual Bento?". */
export function nomeDaPergunta(nomeMensagem: string): string {
  const p = (nomeMensagem || "").trim().split(/\s+/).filter(Boolean);
  return p.length > 0 ? p.join(" ") : "aluno";
}
