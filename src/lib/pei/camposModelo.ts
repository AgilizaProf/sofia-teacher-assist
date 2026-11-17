// Liga cada espaço do modelo da rede a um campo do PEI do app, para mostrar
// as sugestões rápidas certas (e a BNCC) quando a professora preenche na tela.
import type { Lacuna } from "./modeloRede";

export type CampoDoModelo = {
  /** Chave do catálogo PEI_SUGGESTIONS (ou "" se não há sugestões). */
  sugestao: string;
  /** Campo para a lista da BNCC (ver componentePadrao) ou null. */
  bncc: string | null;
  /** Espaço curto (identificação, data): vira caixa de uma linha. */
  curto: boolean;
};

function sem(t: string) {
  return t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** rótulo do espaço → campo do PEI (sugestões) e campo da BNCC. */
export const REGRAS_CAMPOS: Array<[RegExp, string, string | null]> = [
  [
    /potencialidade|ponto(s)? forte|habilidades (ja )?desenvolvid|o que (ja )?sabe/,
    "potencialidades",
    null,
  ],
  [/interess|motiva|preferencia/, "interessesMotivacoes", null],
  [/crise|desregula/, "comoLidarCrises", null],
  [/comportament/, "comportamentosRelevantes", null],
  [/percurso|historico escolar|vida escolar/, "percursoEscolar", null],
  // Antes de "atendimento": "Atendimento Educacional Especializado" é o AEE, não a clínica.
  [/\baee\b|atendimento educacional especializado|sala de recursos/, "objetivosAEE", null],
  [/atendimento|terapia|clinic|especialista/, "atendimentosExternos", null],
  [/intervenc/, "resultadosIntervencoes", null],
  [/familia|responsave(l|is) (pode|deve)|em casa/, "comoFamiliaApoia", null],
  [/combinad/, "combinadosFamilia", null],
  [/profissional de apoio|mediador|cuidador/, "funcaoProfissionalApoio", null],
  [/revis|atualiza/, "criteriosAtualizacao", null],
  // "Estratégias e recursos": o campo é de estratégias, não só de materiais.
  [/estrateg.*(recurso|materia)/, "estrategiasArea", "estrategiasArea"],
  [/tecnologia assistiva|aplicativo|software/, "softwaresAplicativos", null],
  [/material(is)? adaptad|adaptac(ao|oes) fisica|recurso/, "adaptacoesFisicasMateriais", null],
  [/avalia/, "adaptacoesAvaliacao", null],
  [/tempo/, "adaptacoesTempo", null],
  [/espaco|ambiente|sala/, "adaptacoesEspaco", null],
  [/metodolog/, "adaptacoesMetodologicas", null],
  [/inclusao|coletiv|turma/, "estrategiasInclusaoColetiva", null],
  [/estrateg/, "estrategiasArea", "estrategiasArea"],
  [/conteudo|adaptac(ao|oes) curricular|curricul/, "adaptacoesConteudo", "adaptacoesConteudo"],
  [
    /meta|objetivo|habilidade|competencia|expectativa|aprendizage(m|ns) esperad/,
    "objetivosLongoPrazo",
    "objetivosLongoPrazo",
  ],
];

/** Escolhe sugestões e BNCC pelo rótulo do espaço (e pela seção do documento). */
export function campoDoModelo(l: Lacuna): CampoDoModelo {
  const r = sem(l.rotulo);
  const s = sem(l.secao || "");
  const curto =
    l.tipo !== "linha" &&
    l.tipo !== "paragrafo_seguinte" &&
    l.rotulo.length <= 40 &&
    // Palavras inteiras: "cid" não pode casar com "capacidade", nem "idade" com "habilidades".
    /\b(nome|data|nascimento|diagnostico|escola|unidade|ano|serie|turma|turno|cid|idade|telefone|celular|contato|matricula|endereco|professor(a|es)?|diretor(a)?|coordenador(a)?|periodo|vigencia|inicio|fim|termino|codigo|inep|municipio|cidade|bairro|cep|cpf|rg|nis|sus|e-?mail|mae|pai|filiacao)\b|responsavel( legal)?$/.test(
      r,
    ) &&
    !/objetivo|meta|estrateg|descri|observa/.test(r);
  if (curto) return { sugestao: "", bncc: null, curto: true };

  // Área do conhecimento citada no rótulo: a BNCC abre naquele componente.
  const area = /portugu|leitura|escrita|linguage/.test(r)
    ? "aval_obs:leitura_escrita"
    : /matemat|numer|calcul|raciocinio/.test(r)
      ? "aval_obs:raciocinio_logico"
      : /motor|corpo|educacao fisica/.test(r)
        ? "aval_obs:motor_grosso"
        : /social|convivio|interac/.test(r)
          ? "aval_obs:socializacao"
          : null;

  for (const [re, sugestao, bncc] of REGRAS_CAMPOS) {
    if (re.test(r)) return { sugestao, bncc: bncc ? area || bncc : area, curto: false };
  }
  // Rótulo genérico ("Língua Portuguesa", "Meta — linha 2"): usa a seção.
  for (const [re, sugestao, bncc] of REGRAS_CAMPOS) {
    if (re.test(s)) return { sugestao, bncc: bncc ? area || bncc : area, curto: false };
  }
  return { sugestao: "", bncc: area, curto: false };
}
