// Sugestões rápidas do PEI de acordo com o diagnóstico (CID) do aluno.
//
// O CID do cadastro (CID-10 ou CID-11) e o texto do diagnóstico indicam a
// condição; cada condição tem frases prontas para os campos em que o
// diagnóstico muda o que a professora costuma escrever (crises, adaptações,
// recursos, AEE, família). São pontos de partida: a professora ajusta ao aluno.

export type Condicao =
  | "tea"
  | "tdah"
  | "di"
  | "aprendizagem"
  | "down"
  | "auditiva"
  | "visual"
  | "fisica"
  | "ahsd";

function sem(t: string) {
  return (t || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Código do CID (10 ou 11) → condição. Testa o começo do código, sem ponto. */
const POR_CODIGO: Array<[RegExp, Condicao]> = [
  [/^(F84|6A02)/, "tea"],
  [/^(F90|6A05)/, "tdah"],
  [/^(F7[0-9]|6A00)/, "di"],
  [/^(F81|6A03)/, "aprendizagem"],
  [/^(Q90|LD40)/, "down"],
  [/^(H90|H91|AB5[0-2])/, "auditiva"],
  [/^(H54|9D90)/, "visual"],
  [/^(G80|8D2)/, "fisica"],
];

const POR_TEXTO: Array<[RegExp, Condicao]> = [
  [/\btea\b|autis|asperger/, "tea"],
  [/\btdah?\b|deficit de atencao|hiperativ/, "tdah"],
  [/deficiencia intelectual|\bdi\b|atraso global/, "di"],
  [
    /dislexi|discalculi|disgrafi|disortografi|transtorno (especifico )?d[ae] aprendizagem/,
    "aprendizagem",
  ],
  [/\bdown\b|trissomia (do )?21|\bt21\b/, "down"],
  [/surd|deficiencia auditiva|perda auditiva|implante coclear/, "auditiva"],
  [/cegueira|\bceg[oa]\b|baixa visao|deficiencia visual/, "visual"],
  [/paralisia cerebral|deficiencia fisica|cadeirante|mielomeningocele|distrofia/, "fisica"],
  [/altas habilidades|superdota|\bah\/?sd\b/, "ahsd"],
];

/**
 * Condições do aluno a partir do CID e do diagnóstico escritos no cadastro ou
 * no PEI. Aceita vários códigos ("F84.0, F90.0") e devolve sem repetir.
 */
export function condicoesDoAluno(cid?: string | null, diagnostico?: string | null): Condicao[] {
  const out: Condicao[] = [];
  const por = (c: Condicao) => {
    if (!out.includes(c)) out.push(c);
  };
  // Cada pedaço separado por vírgula, ponto e vírgula, barra ou espaço é um código
  // ("F84.0", "6A02"). O ponto sai para comparar só o começo do código.
  for (const bruto of (cid || "").toUpperCase().split(/[\s,;/]+/)) {
    const cod = bruto.replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z0-9]{3,7}$/.test(cod) || !/\d/.test(cod)) continue;
    for (const [re, c] of POR_CODIGO) if (re.test(cod)) por(c);
  }
  const texto = sem(`${diagnostico || ""} ${cid || ""}`);
  for (const [re, c] of POR_TEXTO) if (re.test(texto)) por(c);
  return out;
}

export const NOME_CONDICAO: Record<Condicao, string> = {
  tea: "TEA",
  tdah: "TDAH",
  di: "Deficiência intelectual",
  aprendizagem: "Dislexia e transtornos de aprendizagem",
  down: "Síndrome de Down",
  auditiva: "Deficiência auditiva",
  visual: "Deficiência visual",
  fisica: "Deficiência física",
  ahsd: "Altas habilidades",
};

/** condição → campo do PEI → frases. */
export const SUGESTOES_CID: Record<Condicao, Record<string, string[]>> = {
  tea: {
    comportamentosRelevantes: [
      "Apresenta melhor participação quando a rotina é antecipada com apoio visual.",
      "Demonstra sensibilidade a barulho, toque ou luz intensa em alguns momentos do dia.",
      "Mantém interesses específicos que podem ser usados como porta de entrada para as atividades.",
    ],
    comoLidarCrises: [
      "Reduzir estímulos (barulho, luz, pessoas ao redor) e oferecer um espaço calmo combinado previamente.",
      "Falar pouco, em frases curtas, e esperar a regulação antes de retomar a atividade.",
      "Antecipar mudanças de rotina com apoio visual para prevenir a desregulação.",
      "Oferecer o objeto ou a atividade reguladora combinada com a família.",
    ],
    adaptacoesMetodologicas: [
      "Rotina visual do dia com imagens, antecipando cada troca de atividade.",
      "Instruções curtas, uma de cada vez, acompanhadas de modelo ou imagem.",
      "Atividades estruturadas com começo, meio e fim claros (o que fazer, quanto fazer, o que vem depois).",
      "Uso dos interesses do aluno como tema das atividades.",
    ],
    adaptacoesAvaliacao: [
      "Avaliação em ambiente com poucos estímulos e com enunciados objetivos e diretos.",
      "Possibilidade de responder apontando, por imagens, oralmente ou por comunicação alternativa.",
      "Registro do processo por observação e portfólio, além da prova.",
    ],
    adaptacoesTempo: [
      "Pausas sensoriais combinadas ao longo do período.",
      "Tempo ampliado nas transições entre atividades, com aviso antecipado.",
    ],
    adaptacoesEspaco: [
      "Lugar fixo, longe de fontes de barulho e de passagem.",
      "Cantinho da calma disponível na sala para momentos de sobrecarga.",
      "Organização visual do espaço e dos materiais (etiquetas e imagens).",
    ],
    estrategiasArea: [
      "Linguagem: apoio de imagens e histórias sociais para compreensão de textos e situações.",
      "Matemática: material concreto e sequências visuais passo a passo.",
      "Atividades em grupo: papel definido para o aluno e mediação nas trocas com os colegas.",
    ],
    adaptacoesFisicasMateriais: [
      "Prancha de comunicação alternativa e cartões de rotina.",
      "Abafador de ruído e objetos reguladores de uso combinado.",
      "Cronômetro visual (timer) para marcar o tempo das atividades.",
    ],
    objetivosAEE: [
      "Ampliar a comunicação funcional, com apoio de comunicação alternativa quando necessário.",
      "Desenvolver a flexibilidade diante de mudanças de rotina.",
      "Favorecer a interação com os colegas em situações mediadas.",
    ],
    comoFamiliaApoia: [
      "Manter em casa a mesma rotina visual usada na escola.",
      "Avisar a escola sobre mudanças de sono, alimentação ou medicação.",
    ],
  },
  tdah: {
    comportamentosRelevantes: [
      "Mantém a atenção por períodos curtos e se beneficia de tarefas divididas em etapas.",
      "Apresenta agitação motora e precisa de momentos de movimento ao longo da aula.",
      "Responde bem a combinados claros e a retorno imediato sobre o que fez.",
    ],
    comoLidarCrises: [
      "Oferecer uma pausa com movimento (levar um recado, beber água) antes de retomar a tarefa.",
      "Retomar o combinado em particular, com calma, sem expor o aluno diante da turma.",
      "Reforçar de imediato o comportamento esperado quando ele aparece.",
    ],
    adaptacoesMetodologicas: [
      "Tarefas divididas em etapas curtas, com conferência a cada etapa.",
      "Instruções dadas uma de cada vez, com o aluno repetindo o que deve fazer.",
      "Alternância entre atividades de mesa e atividades com movimento.",
      "Roteiro visual ou lista de passos na carteira.",
    ],
    adaptacoesAvaliacao: [
      "Prova dividida em partes menores, com intervalos.",
      "Enunciados curtos, com as palavras-chave destacadas.",
      "Avaliação em local com menos distrações.",
    ],
    adaptacoesTempo: [
      "Tempo ampliado para provas e atividades escritas.",
      "Pausas curtas programadas a cada etapa concluída.",
    ],
    adaptacoesEspaco: [
      "Lugar próximo à professora e longe de janelas e portas.",
      "Carteira só com o material da atividade do momento.",
    ],
    estrategiasArea: [
      "Leitura: textos curtos, com perguntas feitas a cada trecho.",
      "Matemática: um problema por vez, com espaço amplo para o registro.",
      "Uso de agenda e lista de tarefas para organizar os estudos.",
    ],
    objetivosAEE: [
      "Desenvolver estratégias de organização e planejamento das tarefas.",
      "Ampliar o tempo de atenção sustentada em atividades dirigidas.",
      "Trabalhar o autocontrole e a espera da vez.",
    ],
    comoFamiliaApoia: [
      "Manter horário e local fixos para as tarefas de casa.",
      "Conferir a agenda diariamente com a criança.",
    ],
  },
  di: {
    comportamentosRelevantes: [
      "Aprende melhor com material concreto, repetição e exemplos do dia a dia.",
      "Precisa de mais tempo e de apoio do adulto para compreender instruções novas.",
    ],
    comoLidarCrises: [
      "Acolher, usar linguagem simples e oferecer uma escolha entre duas opções.",
      "Retomar a rotina com uma tarefa que o aluno já domina.",
    ],
    adaptacoesConteudo: [
      "Priorizar as aprendizagens essenciais do ano de referência do aluno.",
      "Reduzir a quantidade de conteúdo novo por vez, mantendo o mesmo tema da turma.",
    ],
    adaptacoesMetodologicas: [
      "Uso de material concreto e de situações do cotidiano do aluno.",
      "Ensino passo a passo, com modelo, repetição e retomada frequente.",
      "Enunciados curtos, em linguagem simples, com apoio de imagens.",
      "Apoio de um colega tutor nas atividades em dupla.",
    ],
    adaptacoesAvaliacao: [
      "Avaliação com base nos objetivos do PEI, não só nos da turma.",
      "Questões com menos alternativas e com apoio de imagens.",
      "Avaliação oral ou prática, com registro feito pela professora.",
    ],
    adaptacoesTempo: [
      "Tempo ampliado em todas as atividades avaliativas.",
      "Mais tempo de prática antes de avançar para um conteúdo novo.",
    ],
    estrategiasArea: [
      "Alfabetização: letras móveis, palavras do interesse do aluno e leitura compartilhada.",
      "Matemática: contagem com objetos, dinheiro de brinquedo e jogos.",
      "Vida prática: atividades de autonomia ligadas à rotina escolar.",
    ],
    objetivosAEE: [
      "Desenvolver habilidades de autonomia e de vida diária.",
      "Ampliar a comunicação e o vocabulário funcional.",
      "Trabalhar atenção, memória e noções básicas de tempo e quantidade.",
    ],
    comoFamiliaApoia: [
      "Dar pequenas responsabilidades em casa para treinar a autonomia.",
      "Retomar em casa, de forma lúdica, o que foi trabalhado na escola.",
    ],
  },
  aprendizagem: {
    comportamentosRelevantes: [
      "Compreende bem o que ouve, mas apresenta dificuldade na leitura e na escrita.",
      "Evita ler em voz alta e precisa de incentivo para não desistir das atividades escritas.",
    ],
    adaptacoesMetodologicas: [
      "Leitura dos enunciados em voz alta pela professora ou por um colega.",
      "Textos com letra maior, espaçamento ampliado e pouca informação por página.",
      "Apoio de recursos orais e visuais (áudio, vídeo, esquemas e mapas mentais).",
      "Trabalho sistemático com consciência fonológica e relação entre letra e som.",
    ],
    adaptacoesAvaliacao: [
      "Prova lida em voz alta e possibilidade de resposta oral.",
      "Erros de ortografia não descontados quando o conteúdo avaliado é outro.",
      "Uso de tabuada, calculadora ou formulário quando o objetivo não for o cálculo.",
    ],
    adaptacoesTempo: [
      "Tempo ampliado para leitura e produção de texto.",
      "Menos cópia do quadro: entregar o texto impresso.",
    ],
    estrategiasArea: [
      "Língua Portuguesa: leitura em dupla e produção de texto com apoio de roteiro.",
      "Matemática: problemas lidos em voz alta e uso de material concreto.",
      "Demais componentes: avaliação do conteúdo por meio oral ou por esquema.",
    ],
    softwaresAplicativos: [
      "Leitor de tela ou recurso de leitura em voz alta para textos longos.",
      "Digitação por voz para a produção de textos.",
    ],
    objetivosAEE: [
      "Desenvolver a consciência fonológica e a fluência de leitura.",
      "Ensinar estratégias de estudo com apoio de esquemas e gravações.",
      "Fortalecer a confiança do aluno diante das atividades de leitura e escrita.",
    ],
  },
  down: {
    comportamentosRelevantes: [
      "Aprende bem por imitação e com apoio visual.",
      "Demonstra boa interação social e gosta de participar das atividades em grupo.",
      "Cansa com mais facilidade e precisa de pausas.",
    ],
    comoLidarCrises: [
      "Acolher com afeto, dar tempo e oferecer uma escolha simples.",
      "Usar apoio visual para mostrar o que vem depois.",
    ],
    adaptacoesMetodologicas: [
      "Apoio visual constante: imagens, gestos e demonstração.",
      "Frases curtas e pausadas, com tempo para o aluno responder.",
      "Repetição e retomada frequente do que foi ensinado.",
      "Atividades curtas, com material concreto.",
    ],
    adaptacoesAvaliacao: [
      "Avaliação com base nos objetivos do PEI, com apoio de imagens.",
      "Resposta por apontar, oralmente ou em atividade prática.",
    ],
    adaptacoesFisicasMateriais: [
      "Lápis mais grosso ou com adaptador, tesoura adaptada e folha com pauta ampliada.",
      "Apoio para os pés e mobiliário na altura adequada.",
    ],
    estrategiasArea: [
      "Linguagem: leitura global de palavras ligadas ao cotidiano, com imagens.",
      "Matemática: contagem e quantidades com objetos e jogos.",
      "Coordenação motora: atividades de encaixe, recorte e modelagem.",
    ],
    objetivosAEE: [
      "Ampliar a linguagem oral e a clareza da fala.",
      "Desenvolver a coordenação motora fina e a autonomia.",
      "Trabalhar atenção e memória com apoio visual.",
    ],
    comoFamiliaApoia: [
      "Incentivar a autonomia nas rotinas de casa (vestir-se, guardar os materiais).",
      "Manter a troca de informações com a fonoaudióloga e demais terapias.",
    ],
  },
  auditiva: {
    comportamentosRelevantes: [
      "Acompanha melhor a aula quando vê o rosto de quem fala.",
      "Comunica-se por Libras, leitura labial ou com apoio de aparelho auditivo.",
    ],
    adaptacoesMetodologicas: [
      "Falar de frente para o aluno, sem cobrir a boca e sem dar as costas ao escrever no quadro.",
      "Apoio visual em todas as explicações: imagens, esquemas e palavras-chave no quadro.",
      "Presença de intérprete de Libras e ensino de sinais básicos para a turma.",
      "Vídeos sempre com legenda ou janela de Libras.",
    ],
    adaptacoesAvaliacao: [
      "Prova com enunciados objetivos e apoio de imagens.",
      "Correção da escrita considerando o português como segunda língua.",
      "Possibilidade de resposta em Libras, com tradução do intérprete.",
    ],
    adaptacoesEspaco: [
      "Lugar na frente, com boa visão da professora, do quadro e do intérprete.",
      "Sala com menos ruído de fundo e boa iluminação.",
      "Organização das carteiras em roda nas discussões, para o aluno ver quem fala.",
    ],
    adaptacoesFisicasMateriais: [
      "Sistema FM ou microfone remoto, quando indicado.",
      "Materiais impressos com resumo e glossário do conteúdo.",
    ],
    estrategiasArea: [
      "Língua Portuguesa: ensino como segunda língua, com apoio visual e de Libras.",
      "Demais componentes: glossário de termos novos antes de cada conteúdo.",
    ],
    objetivosAEE: [
      "Desenvolver a Libras como primeira língua.",
      "Ensinar o português escrito como segunda língua.",
      "Orientar a turma e a equipe sobre a comunicação com o aluno.",
    ],
  },
  visual: {
    comportamentosRelevantes: [
      "Explora os materiais pelo tato e pela audição.",
      "Precisa de descrição oral do que está no quadro e nas imagens.",
    ],
    adaptacoesMetodologicas: [
      "Descrever em voz alta tudo o que for escrito no quadro ou mostrado em imagem.",
      "Uso de material concreto e em relevo para os conceitos novos.",
      "Antecipar o material da aula em formato acessível (ampliado, em braile ou digital).",
    ],
    adaptacoesAvaliacao: [
      "Prova ampliada ou em braile, ou aplicada com ledor e transcritor.",
      "Descrição das imagens, gráficos e tabelas das questões.",
    ],
    adaptacoesTempo: ["Tempo ampliado para leitura e registro das atividades e provas."],
    adaptacoesEspaco: [
      "Lugar na frente, com boa iluminação e sem reflexo no quadro.",
      "Sala com os móveis sempre no mesmo lugar e com a passagem livre.",
      "Apresentar ao aluno os espaços da escola e avisar quando houver mudança.",
    ],
    adaptacoesFisicasMateriais: [
      "Textos com fonte ampliada e alto contraste.",
      "Lupa, plano inclinado e caderno com pauta ampliada.",
      "Reglete e punção, máquina braile e soroban.",
    ],
    softwaresAplicativos: [
      "Leitor de tela no computador e no celular.",
      "Ampliador de tela e audiolivros.",
    ],
    objetivosAEE: [
      "Ensinar o sistema braile e o uso do soroban.",
      "Desenvolver orientação e mobilidade nos espaços da escola.",
      "Ensinar o uso de recursos de tecnologia assistiva.",
    ],
  },
  fisica: {
    comportamentosRelevantes: [
      "Compreende o conteúdo, mas precisa de apoio para o registro escrito.",
      "Cansa com mais facilidade em atividades motoras longas.",
    ],
    adaptacoesMetodologicas: [
      "Registro das respostas por meios alternativos: oral, digitado ou com escriba.",
      "Menos quantidade de escrita, mantendo o mesmo conteúdo.",
      "Participação nas atividades práticas com adaptação do movimento exigido.",
    ],
    adaptacoesAvaliacao: [
      "Prova oral, digitada ou com transcritor.",
      "Questões de marcar em vez de respostas longas escritas à mão.",
    ],
    adaptacoesTempo: [
      "Tempo ampliado para atividades escritas e deslocamentos.",
      "Pausas para mudança de posição e descanso.",
    ],
    adaptacoesEspaco: [
      "Sala no térreo ou com acesso por rampa ou elevador.",
      "Espaço livre para circulação da cadeira de rodas ou do andador.",
      "Lugar próximo à porta e ao banheiro acessível.",
    ],
    adaptacoesFisicasMateriais: [
      "Mesa adaptada à cadeira de rodas e apoio para os pés.",
      "Engrossador de lápis, tesoura adaptada e plano inclinado.",
      "Prancha de comunicação ou acionador, quando necessário.",
    ],
    softwaresAplicativos: [
      "Teclado e mouse adaptados ou digitação por voz.",
      "Aplicativo de comunicação alternativa.",
    ],
    objetivosAEE: [
      "Indicar e ensinar o uso de recursos de tecnologia assistiva.",
      "Desenvolver formas alternativas de registro e de comunicação.",
      "Orientar a equipe sobre posicionamento e acessibilidade.",
    ],
  },
  ahsd: {
    comportamentosRelevantes: [
      "Termina as atividades antes da turma e busca desafios maiores.",
      "Demonstra interesse aprofundado por temas específicos.",
      "Pode se desinteressar por tarefas repetitivas.",
    ],
    adaptacoesConteudo: [
      "Aprofundamento dos conteúdos nas áreas de maior interesse do aluno.",
      "Compactação do currículo: dispensar a repetição do que o aluno já domina.",
    ],
    adaptacoesMetodologicas: [
      "Projetos de pesquisa sobre temas escolhidos pelo aluno.",
      "Atividades com problemas abertos e mais de um caminho de solução.",
      "Monitoria de colegas, com cuidado para não sobrecarregar o aluno.",
    ],
    adaptacoesAvaliacao: [
      "Avaliação por projetos, produções e apresentações.",
      "Questões-desafio opcionais além das da turma.",
    ],
    estrategiasArea: [
      "Enriquecimento curricular na área de destaque do aluno.",
      "Participação em olimpíadas, feiras e clubes de ciências, leitura ou matemática.",
    ],
    objetivosAEE: [
      "Oferecer atividades de enriquecimento e aprofundamento.",
      "Desenvolver habilidades socioemocionais e de trabalho em grupo.",
      "Orientar a família e a equipe sobre as necessidades do aluno.",
    ],
  },
};

export type GrupoCid = { condicao: Condicao; nome: string; frases: string[] };

/** Frases do campo para as condições do aluno (grupos vazios ficam de fora). */
export function sugestoesDoCid(fieldKey: string, condicoes: Condicao[]): GrupoCid[] {
  const out: GrupoCid[] = [];
  for (const c of condicoes) {
    const frases = SUGESTOES_CID[c][fieldKey];
    if (frases?.length) out.push({ condicao: c, nome: NOME_CONDICAO[c], frases });
  }
  return out;
}
