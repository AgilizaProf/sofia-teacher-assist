import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";

// Catálogo de sugestões rápidas por campo do PEI.
// As frases foram redigidas para serem clicáveis e inseridas no texto.
export const PEI_SUGGESTIONS: Record<string, string[]> = {
  // Perfil
  potencialidades: [
    "Demonstra excelente memória visual para imagens e símbolos.",
    "Aprende com facilidade por meio de rotinas previsíveis.",
    "Tem boa coordenação motora ampla em atividades ao ar livre.",
    "Apresenta forte interesse por temas específicos que podem ser usados como ponte pedagógica.",
    "Reconhece letras e números do próprio nome.",
  ],
  interessesMotivacoes: [
    "Demonstra interesse por dinossauros, trens ou personagens específicos.",
    "Engaja-se melhor com atividades que envolvem música e movimento.",
    "Gosta de jogos digitais educativos com feedback imediato.",
    "Motiva-se com elogios verbais e reforço positivo visual.",
    "Demonstra interesse por desenhos, pintura e atividades manuais.",
  ],
  comportamentosRelevantes: [
    "Apresenta hipersensibilidade a sons altos (sinos, gritos, sirene).",
    "Dificuldade em transições de atividade sem aviso prévio.",
    "Necessita de rotina visual fixa para se organizar.",
    "Apresenta estereotipias (balanço, flapping) em momentos de ansiedade.",
    "Procura cantos da sala quando está sobrecarregado(a).",
  ],
  comoLidarCrises: [
    "Levar a um espaço calmo e silencioso já combinado previamente.",
    "Reduzir estímulos: diminuir luz, voz baixa, oferecer fone abafador.",
    "Validar a emoção antes de propor solução ('Vejo que está difícil').",
    "Evitar contato físico abrupto e contato visual forçado.",
    "Acionar o profissional de apoio ou coordenação se a crise durar mais de 10 min.",
  ],
  percursoEscolar: [
    "Frequentou educação infantil regular dos 3 aos 5 anos.",
    "Já passou por troca de escola no último ano, em adaptação.",
    "Foi retido(a) uma vez por defasagem de aprendizagem.",
    "Sempre estudou em escola regular, com apoio de AEE.",
  ],
  atendimentosExternos: [
    "Acompanhamento psicológico semanal.",
    "Terapia ocupacional 2x por semana.",
    "Fonoaudiologia semanal com foco em linguagem expressiva.",
    "Neuropediatra com retorno semestral.",
  ],
  resultadosIntervencoes: [
    "Houve avanço significativo na comunicação após uso de pranchas CAA.",
    "Estratégias de antecipação de rotina reduziram crises.",
    "Tutoria entre pares ajudou na socialização.",
    "Sem evolução observável nas estratégias verbais isoladas.",
  ],

  // Objetivos
  objetivosLongoPrazo: [
    "Desenvolver autonomia nas atividades de rotina escolar.",
    "Ampliar repertório de comunicação funcional (oral, CAA ou escrita).",
    "Consolidar leitura de palavras simples e escrita do próprio nome.",
    "Ampliar interação social com pares em momentos estruturados.",
    "Participar das atividades coletivas com mediação reduzida ao longo do ano.",
  ],

  // Adaptações
  adaptacoesConteudo: [
    "Reduzir quantidade de exercícios mantendo o objetivo de aprendizagem.",
    "Trabalhar habilidades anteriores quando necessário (etapas prévias).",
    "Priorizar conteúdos funcionais para a vida cotidiana.",
    "Apresentar o mesmo conteúdo em diferentes formatos (visual, oral, manipulativo).",
  ],
  adaptacoesMetodologicas: [
    "Usar material concreto e manipulável em todas as introduções de conteúdo.",
    "Dividir tarefas longas em etapas curtas com checklist visual.",
    "Aplicar instrução em pequenos grupos antes da explicação coletiva.",
    "Usar pistas visuais e modelagem antes de pedir produção autônoma.",
  ],
  adaptacoesAvaliacao: [
    "Permitir prova oral quando a escrita for barreira.",
    "Avaliar por portfólio e observação contínua.",
    "Reduzir número de questões mantendo as principais habilidades.",
    "Oferecer apoio na leitura do enunciado quando solicitado.",
    "Considerar o processo, não apenas o produto final.",
  ],
  adaptacoesTempo: [
    "Conceder tempo adicional de 50% em provas e tarefas.",
    "Permitir pausas a cada 15 minutos de atividade.",
    "Dividir avaliações longas em mais de um dia.",
  ],
  adaptacoesEspaco: [
    "Posicionar próximo(a) ao quadro e à professora.",
    "Sentar longe de portas e janelas para reduzir distração auditiva.",
    "Disponibilizar canto calmo na sala para autorregulação.",
    "Garantir iluminação suave e ruído controlado.",
  ],
  estrategiasArea: [
    "Português: leitura em voz alta com modelo do adulto antes da leitura individual.",
    "Matemática: uso de material dourado e ábaco em todas as operações.",
    "Ciências: experimentação concreta antes da sistematização escrita.",
    "Arte: oferecer pinça/engrossador para o manuseio de materiais finos.",
  ],
  estrategiasInclusaoColetiva: [
    "Sistema de tutoria entre pares com rodízio quinzenal.",
    "Trabalhos em duplas heterogêneas com função definida para cada um.",
    "Apresentar os combinados da turma também em formato visual.",
    "Atividades cooperativas em vez de competitivas.",
  ],
  softwaresAplicativos: [
    "Livox para comunicação alternativa.",
    "LetMeTalk como apoio à fala.",
    "Khan Academy Kids para reforço pedagógico.",
    "ARASAAC para criação de pictogramas e rotinas visuais.",
  ],
  adaptacoesFisicasMateriais: [
    "Engrossador de lápis para melhor preensão.",
    "Tesoura adaptada com mola.",
    "Caderno com pauta ampliada e margem reforçada.",
    "Suporte inclinado para escrita.",
  ],
  objetivosAEE: [
    "Desenvolver estratégias de comunicação alternativa.",
    "Trabalhar habilidades de autorregulação emocional.",
    "Apoiar a alfabetização com recursos específicos.",
    "Desenvolver autonomia nas atividades de vida diária escolar.",
  ],
  funcaoProfissionalApoio: [
    "Mediar a comunicação com colegas e professora.",
    "Apoiar a execução das atividades sem fazer pelo aluno.",
    "Auxiliar nas transições e na organização da rotina.",
    "Acompanhar nos momentos de pátio, refeitório e banheiro.",
  ],
  comoFamiliaApoia: [
    "Manter rotina visual em casa similar à da escola.",
    "Ler diariamente com a criança por 15 minutos.",
    "Reforçar combinados de autonomia (vestir-se, organizar mochila).",
    "Comunicar à escola qualquer mudança relevante em casa.",
  ],
  combinadosFamilia: [
    "Comunicação semanal por agenda ou aplicativo.",
    "Reuniões bimestrais para revisão de metas.",
    "Alinhar estratégias de manejo de crises entre casa e escola.",
    "Compartilhar relatórios de profissionais externos.",
  ],
  criteriosAtualizacao: [
    "Atingimento de mais de 70% das metas de curto prazo.",
    "Mudança significativa no quadro clínico ou emocional do aluno.",
    "Solicitação da família ou da equipe pedagógica.",
    "Início ou interrupção de atendimentos externos.",
    "Mudança de turma, professor ou nível de ensino.",
  ],

  // Avaliação pedagógica — observações por área
  aval_obs: [
    "Necessita de modelo do adulto antes de produzir.",
    "Realiza com apoio visual e instruções fracionadas.",
    "Realiza com autonomia em contextos familiares.",
    "Apresenta defasagem em relação ao ano de referência.",
    "Demonstra avanço consistente nas últimas semanas.",
  ],

  // Metas curto prazo
  meta_texto: [
    "Permanecer engajado(a) em atividade dirigida por pelo menos 10 minutos.",
    "Escrever o próprio nome de forma legível sem modelo.",
    "Identificar e nomear as letras do próprio nome.",
    "Realizar contagem até 20 com apoio de material concreto.",
    "Solicitar ajuda verbalmente ou via CAA quando necessário.",
    "Aguardar a sua vez em pelo menos 3 momentos coletivos por dia.",
  ],
  meta_indicador: [
    "Registrado em 4 de 5 observações ao longo da semana.",
    "Avaliado por meio de rubrica preenchida quinzenalmente.",
    "Evidência em portfólio de produções do aluno.",
    "Relato consistente da família e do AEE.",
  ],
};

type Props = {
  fieldKey: keyof typeof PEI_SUGGESTIONS | string;
  onPick: (text: string) => void;
  label?: string;
};

/**
 * Caixa de sugestões rápidas, oculta por padrão. Aparece ao clicar em "Sugestões".
 * Ao clicar em um chip, o texto é enviado para `onPick` (que normalmente faz append
 * no campo de texto do PEI).
 */
export function PEISuggestions({ fieldKey, onPick, label = "Sugestões rápidas" }: Props) {
  const [open, setOpen] = useState(false);
  const opts = PEI_SUGGESTIONS[fieldKey] || [];
  if (opts.length === 0) return null;

  return (
    <div style={{ marginTop: 4 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          fontSize: 11,
          padding: "3px 8px",
          borderRadius: 999,
          border: "1px dashed var(--border)",
          background: open ? "var(--accent-soft)" : "#fff",
          color: open ? "#B8410E" : "var(--muted)",
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
        aria-expanded={open}
      >
        <Lightbulb size={11} />
        {label}
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && (
        <div
          style={{
            marginTop: 6,
            padding: 8,
            borderRadius: 8,
            border: "1px dashed var(--border)",
            background: "#FFFBF5",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {opts.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onPick(o)}
              title="Clique para inserir no campo"
              style={{
                fontSize: 11,
                padding: "4px 9px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "#fff",
                color: "var(--text)",
                cursor: "pointer",
                textAlign: "left",
                maxWidth: "100%",
              }}
            >
              + {o}
            </button>
          ))}
          <span style={{ fontSize: 10, color: "var(--muted)", width: "100%", marginTop: 2 }}>
            Toque em uma sugestão para inseri-la. Você pode editar livremente depois.
          </span>
        </div>
      )}
    </div>
  );
}

/** Acrescenta `extra` ao final de `current`, separando por espaço/quebra de linha. */
export function appendText(current: string, extra: string): string {
  const cur = (current || "").trimEnd();
  if (!cur) return extra;
  // Se o campo termina com pontuação, vai em nova linha; caso contrário, espaço.
  const sep = /[.!?…]$/.test(cur) ? " " : (cur.length > 80 ? "\n" : " ");
  return cur + sep + extra;
}