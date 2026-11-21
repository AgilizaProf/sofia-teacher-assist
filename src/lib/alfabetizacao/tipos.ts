// Leitura e escrita (Criança alfabetizada): tipos e níveis.
//
// Tudo o que a professora confirma aqui fica na conta dela (app_snapshots,
// chave "alfa_dados") e é lido pela ficha do aluno, pelos pareceres e pela Sofia.
// O áudio da leitura e a foto do texto NÃO são guardados: só o resultado.

export type NivelLeitura = 1 | 2 | 3 | 4 | 5 | 6;

export const NIVEIS_LEITURA: Array<{ n: NivelLeitura; nome: string; curto: string; desc: string }> =
  [
    {
      n: 1,
      nome: "Pré-leitor",
      curto: "Pré-leitor",
      desc: "Ainda não lê. Pode reconhecer algumas letras.",
    },
    {
      n: 2,
      nome: "Leitor de sílabas",
      curto: "Sílabas",
      desc: "Lê sílabas soltas, mas ainda não junta em palavras.",
    },
    {
      n: 3,
      nome: "Leitor de palavras",
      curto: "Palavras",
      desc: "Lê palavras, uma de cada vez.",
    },
    {
      n: 4,
      nome: "Leitor de frases",
      curto: "Frases",
      desc: "Lê frases curtas, com pausas.",
    },
    {
      n: 5,
      nome: "Leitor de texto sem fluência",
      curto: "Texto, sem fluência",
      desc: "Lê textos curtos devagar ou com erros.",
    },
    {
      n: 6,
      nome: "Leitor fluente",
      curto: "Fluente",
      desc: "Lê textos com ritmo e poucas trocas.",
    },
  ];

export function nomeNivelLeitura(n: number | null | undefined): string {
  return NIVEIS_LEITURA.find((x) => x.n === n)?.nome ?? "Sem avaliação";
}

export type NivelEscrita = 1 | 2 | 3 | 4 | 5;

export const NIVEIS_ESCRITA: Array<{ n: NivelEscrita; nome: string; desc: string }> = [
  { n: 1, nome: "Pré-silábico", desc: "Usa letras ou rabiscos sem relação com os sons." },
  { n: 2, nome: "Silábico", desc: "Escreve uma letra para cada sílaba." },
  {
    n: 3,
    nome: "Silábico-alfabético",
    desc: "Mistura sílabas completas com sílabas de uma letra só.",
  },
  { n: 4, nome: "Alfabético", desc: "Escreve como fala, com erros de ortografia." },
  {
    n: 5,
    nome: "Alfabético com ortografia em consolidação",
    desc: "Escreve com poucos erros e começa a usar as regras.",
  },
];

export function nomeNivelEscrita(n: number | null | undefined): string {
  return NIVEIS_ESCRITA.find((x) => x.n === n)?.nome ?? "Sem avaliação";
}

export type TipoCartao = "silabas" | "palavras" | "frases" | "texto";

export type Cartao = {
  id: string;
  /** 1 a 6: do mais simples (sílabas) ao texto para fluência. */
  nivel: 1 | 2 | 3 | 4 | 5 | 6;
  tipo: TipoCartao;
  titulo: string;
  /** Sílabas, palavras ou frases, na ordem em que a criança lê. */
  itens: string[];
  /** Só nos cartões de texto. */
  texto?: string;
  /** O que o cartão treina (ex.: "lh", "sílabas com B e M"). */
  foco?: string;
  /** Quantas palavras (ou sílabas) a criança tem para ler. */
  total: number;
};

export const NIVEIS_CARTAO: Array<{ n: Cartao["nivel"]; nome: string; para: string }> = [
  { n: 1, nome: "Sílabas", para: "Para quem está começando a juntar as letras." },
  { n: 2, nome: "Palavras simples", para: "Palavras com sílabas de consoante e vogal." },
  { n: 3, nome: "Palavras com sílabas difíceis", para: "LH, NH, CH, RR, SS, BR, PL e outras." },
  { n: 4, nome: "Frases", para: "Três frases curtas em cada cartão." },
  { n: 5, nome: "Textos curtos", para: "Pequenos textos de 30 a 50 palavras." },
  { n: 6, nome: "Textos para fluência", para: "Textos de 80 a 110 palavras, para medir o ritmo." },
];

/** Como a criança leu cada item do cartão. */
export type Marca = "ok" | "troca" | "pulou" | "nao";

export type AvaliacaoLeitura = {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  /** ISO (data e hora da confirmação). */
  data: string;
  cartaoId: string;
  cartaoNivel: number;
  tipo: TipoCartao;
  total: number;
  lidas: number;
  corretas: number;
  /** 0 a 1, sobre o que a criança tentou ler. */
  precisao: number;
  /** Palavras (ou sílabas) corretas por minuto. */
  pcpm: number;
  segundos: number;
  nivelSugerido: NivelLeitura;
  /** Nível confirmado (ou corrigido) pela professora. */
  nivel: NivelLeitura;
  obs?: string;
};

export type ErroEscrita = {
  /** Como a criança escreveu. */
  escrita: string;
  /** Como se escreve. */
  correta: string;
  /** Categoria (ver CATEGORIAS em erros.ts). */
  cat: string;
};

export const CRITERIOS_ESCRITA: Array<{ id: string; nome: string }> = [
  { id: "ortografia", nome: "Ortografia" },
  { id: "segmentacao", nome: "Separação das palavras" },
  { id: "pontuacao", nome: "Pontuação e letra maiúscula" },
  { id: "ideias", nome: "Sequência das ideias" },
  { id: "genero", nome: "Adequação à proposta" },
];

export type AvaliacaoEscrita = {
  id: string;
  alunoId: string;
  alunoNome: string;
  turma: string;
  data: string;
  proposta?: string;
  transcricao: string;
  nivelSugerido: NivelEscrita;
  nivel: NivelEscrita;
  /** Nota de 1 a 4 por critério (ver CRITERIOS_ESCRITA). */
  criterios: Record<string, number>;
  erros: ErroEscrita[];
  comentario: string;
  pontosFortes?: string;
};

export type AlfaDados = {
  leituras: AvaliacaoLeitura[];
  escritas: AvaliacaoEscrita[];
  /** Palavras corretas por minuto esperadas para "leitor fluente", por ano. */
  metas: Record<string, number>;
};

export const METAS_PADRAO: Record<string, number> = {
  "1": 40,
  "2": 60,
  "3": 80,
  "4": 95,
  "5": 110,
};

export const ALFA_VAZIO: AlfaDados = { leituras: [], escritas: [], metas: METAS_PADRAO };
