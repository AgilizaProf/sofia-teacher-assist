// Chamadas à função da Sofia que ouve a leitura e lê a foto do texto.
import { invocarIA } from "@/lib/sofia/invocarIA";
import type { ErroEscrita, NivelEscrita } from "./tipos";

export type RespostaLeitura = { transcricao: string; observacao: string };

export type RespostaTexto = {
  transcricao: string;
  nivel_escrita: NivelEscrita;
  justificativa_nivel: string;
  criterios: Record<string, number>;
  erros: ErroEscrita[];
  pontos_fortes: string;
  comentario: string;
};

const FUNCAO = "avaliar-alfabetizacao";

/** Só no ambiente de desenvolvimento: respostas prontas para testar a tela. */
function emTeste(): boolean {
  try {
    return import.meta.env.DEV && localStorage.getItem("alfa_teste") === "1";
  } catch {
    return false;
  }
}

export async function ouvirLeitura(args: {
  audioBase64: string;
  mime: string;
  cartaoTexto: string;
  cartaoTipo: string;
  ano: string;
  alunoNome: string;
}): Promise<RespostaLeitura> {
  if (emTeste()) {
    const ps = args.cartaoTexto.split(/\s+/).filter(Boolean);
    const dito = ps.slice(0, Math.ceil(ps.length * 0.8)).map((p, k) => (k % 7 === 3 ? "bola" : p));
    return {
      transcricao: dito.join(" "),
      observacao: "Leu devagar, com pausas entre as palavras.",
    };
  }
  const d = await invocarIA<Partial<RespostaLeitura>>(FUNCAO, {
    body: {
      modo: "leitura",
      audio_base64: args.audioBase64,
      mime: args.mime,
      cartao_texto: args.cartaoTexto,
      cartao_tipo: args.cartaoTipo,
      ano: args.ano,
      descricaoCobranca: `Avaliação de leitura — ${args.alunoNome}`,
    },
    validar: (r) => typeof r?.transcricao === "string",
  });
  return { transcricao: d.transcricao ?? "", observacao: d.observacao ?? "" };
}

export async function corrigirTexto(args: {
  imagemBase64: string;
  mime: string;
  ano: string;
  proposta: string;
  alunoNome: string;
}): Promise<RespostaTexto> {
  if (emTeste())
    return {
      transcricao: "O canpo estava cheio de flores. A minina correu e o caxorro foi atras dela.",
      nivel_escrita: 4,
      justificativa_nivel: "Escreve todas as sílabas, com trocas de ortografia.",
      criterios: { ortografia: 2, segmentacao: 3, pontuacao: 3, ideias: 3, genero: 3 },
      erros: [
        { escrita: "canpo", correta: "campo", cat: "m_pb" },
        { escrita: "minina", correta: "menina", cat: "e_i" },
        { escrita: "caxorro", correta: "cachorro", cat: "x_ch" },
        { escrita: "atras", correta: "atrás", cat: "acentuacao" },
      ],
      pontos_fortes: "Conta a história em ordem e usa ponto final.",
      comentario: "Vale retomar o uso de M antes de P e B.",
    };
  const d = await invocarIA<Partial<RespostaTexto>>(FUNCAO, {
    body: {
      modo: "texto",
      imagem_base64: args.imagemBase64,
      mime: args.mime,
      ano: args.ano,
      proposta: args.proposta,
      descricaoCobranca: `Correção de texto — ${args.alunoNome}`,
    },
    validar: (r) => typeof r?.transcricao === "string" && r.transcricao.trim().length > 0,
  });
  return {
    transcricao: d.transcricao ?? "",
    nivel_escrita: (d.nivel_escrita ?? 4) as NivelEscrita,
    justificativa_nivel: d.justificativa_nivel ?? "",
    criterios: d.criterios ?? {},
    erros: Array.isArray(d.erros) ? d.erros : [],
    pontos_fortes: d.pontos_fortes ?? "",
    comentario: d.comentario ?? "",
  };
}
