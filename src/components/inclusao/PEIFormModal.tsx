import { useEffect, useMemo, useState } from "react";
import { X, Save, Printer, Plus, Trash2, FileText, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { usePersistentState } from "@/lib/persist/usePersistentState";
import { wrapEditorialPrintHtml as wrapStandardPrintHtml } from "@/lib/print/editorialPrint";
import { useUser } from "@/lib/mockData";

type Aluno = {
  id: string;
  name: string;
  diag?: string;
  cid?: string;
  anoEscolar?: string;
  turma?: string;
  idade?: number | string;
  aee?: string;
};

export type Objetivo = {
  id: string;
  texto: string;
  prazo: "curto" | "medio" | "longo";
  status: "nao_iniciado" | "em_andamento" | "atingido" | "revisar";
  criterios: string;
};

export type PEIData = {
  // 1. Identificação
  protocolo: string;
  vigencia: { inicio: string; fim: string };
  escola: string;
  serie: string;
  // 2. Diagnóstico / caracterização
  diagnostico: string;
  cid: string;
  laudoData: string;
  laudoProf: string;
  caracterizacao: string;
  // 3. Habilidades já desenvolvidas
  habilidadesDesenvolvidas: string;
  pontosForca: string;
  necessidadesApoio: string;
  // 4. Objetivos
  objetivos: Objetivo[];
  // 5. Estratégias e adaptações
  adaptacoesCurriculares: string;
  adaptacoesAvaliativas: string;
  recursosApoio: string;
  metodologias: string;
  // 6. Avaliação
  formasAvaliacao: string;
  periodicidadeRevisao: string;
  // 7. Equipe responsável
  equipe: { nome: string; funcao: string }[];
  // 8. Família e participação
  familiaParticipacao: string;
  acordosFamilia: string;
  // Assinaturas
  assinaturas: { professorRegente: string; coordenacao: string; aee: string; familia: string };
  // Histórico
  atualizadoEm: string;
};

function blankPEI(): PEIData {
  return {
    protocolo: `PEI-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    vigencia: { inicio: "", fim: "" },
    escola: "",
    serie: "",
    diagnostico: "",
    cid: "",
    laudoData: "",
    laudoProf: "",
    caracterizacao: "",
    habilidadesDesenvolvidas: "",
    pontosForca: "",
    necessidadesApoio: "",
    objetivos: [],
    adaptacoesCurriculares: "",
    adaptacoesAvaliativas: "",
    recursosApoio: "",
    metodologias: "",
    formasAvaliacao: "",
    periodicidadeRevisao: "Bimestral",
    equipe: [],
    familiaParticipacao: "",
    acordosFamilia: "",
    assinaturas: { professorRegente: "", coordenacao: "", aee: "", familia: "" },
    atualizadoEm: "",
  };
}

const inputCss: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1px solid var(--border)", fontSize: 13, fontFamily: "inherit",
  background: "#fff", color: "var(--text)",
};
const labelCss: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4, display: "block",
};
const sectionCss: React.CSSProperties = {
  background: "#fff", border: "1px solid var(--border)", borderRadius: 12,
  padding: 16, marginBottom: 14,
};
const sectionTitleCss: React.CSSProperties = {
  fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 10,
  display: "flex", alignItems: "center", gap: 8,
};
const sectionBadge: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
  background: "var(--accent-soft)", color: "#B8410E",
};

// ============ Sugestões por transtorno/deficiência ============
type Perfil =
  | "tea" | "tdah" | "dislexia" | "discalculia" | "di"
  | "down" | "dv" | "da" | "df" | "ah" | "generico";

function detectarPerfil(diag?: string, cid?: string): Perfil {
  const s = `${diag || ""} ${cid || ""}`.toLowerCase();
  if (/tea|autis|f84/.test(s)) return "tea";
  if (/tdah|déficit de atenção|deficit de atencao|f90/.test(s)) return "tdah";
  if (/dislex|f81\.0/.test(s)) return "dislexia";
  if (/discalcul|f81\.2/.test(s)) return "discalculia";
  if (/down|t21|q90/.test(s)) return "down";
  if (/intelect|\bdi\b|f7[01239]/.test(s)) return "di";
  if (/visual|baixa visão|cego|h54/.test(s)) return "dv";
  if (/auditiv|surd|h90/.test(s)) return "da";
  if (/física|fisica|cadeirante|paralisia|motor/.test(s)) return "df";
  if (/altas habilidades|superdota|ah\/sd/.test(s)) return "ah";
  return "generico";
}

type SugKey =
  | "caracterizacao" | "habilidades" | "pontosForca" | "necessidadesApoio"
  | "objetivoTexto" | "objetivoCriterios"
  | "adaptCurric" | "adaptAval" | "metodologias" | "recursos"
  | "formasAval" | "familiaPart" | "acordosFam"
  | "equipeFuncao";

const SUG: Record<Perfil, Partial<Record<SugKey, string[]>>> = {
  tea: {
    caracterizacao: ["Dificuldade na interação social recíproca", "Padrões restritos e repetitivos de comportamento", "Hipersensibilidade auditiva a sons altos", "Apego intenso a rotina previsível"],
    habilidades: ["Reconhece rotina visual", "Identifica letras e números", "Memória visual acima da média", "Segue instruções de 1 passo"],
    pontosForca: ["Interesse intenso por temas específicos", "Boa memória visual", "Atenção a detalhes", "Habilidade com tecnologia"],
    necessidadesApoio: ["Antecipação de mudanças na rotina", "Apoio na comunicação social", "Regulação sensorial (fones, cantinho da calma)", "Mediação em interações com pares"],
    objetivoTexto: ["Iniciar e manter interação com par por 5 minutos", "Ampliar repertório alimentar com 3 novos itens", "Comunicar necessidades básicas via PECS/fala", "Tolerar mudanças de rotina anunciadas com pictogramas"],
    objetivoCriterios: ["Em 4 de 5 oportunidades observadas", "Com mediação visual em 80% das tentativas", "Registro em 3 sessões consecutivas"],
    adaptCurric: ["Conteúdos com apoio visual e instruções segmentadas", "Priorização de habilidades funcionais e de comunicação", "Recortes da BNCC com foco em rotina e autocuidado"],
    adaptAval: ["Avaliação por observação e portfólio", "Tempo estendido e ambiente de baixa estimulação", "Itens com pictograma + texto"],
    metodologias: ["TEACCH (ensino estruturado)", "PECS / comunicação alternativa", "ABA com reforço positivo", "Histórias sociais e roteiros visuais"],
    recursos: ["Pictogramas e agenda visual", "Fones abafadores", "Cantinho da calma com objetos sensoriais", "Timer visual"],
    formasAval: ["Registro de evidências em portfólio", "Rubrica de habilidades sociais e comunicação", "Vídeo curto de evidência (com autorização)"],
    familiaPart: ["Caderno de comunicação diário", "Reuniões mensais com equipe multi", "Alinhamento com terapeutas (TO, fono, psicologia)"],
    acordosFam: ["Manter rotinas de sono e alimentação", "Comunicar previamente ausências/mudanças", "Protocolo de crise compartilhado"],
    equipeFuncao: ["Mediador(a) de inclusão", "Terapeuta ocupacional", "Fonoaudiólogo(a)", "Psicólogo(a) ABA"],
  },
  tdah: {
    caracterizacao: ["Desatenção em tarefas longas", "Hiperatividade motora em sala", "Impulsividade nas respostas", "Dificuldade em organizar materiais e tempo"],
    habilidades: ["Boa oralidade e criatividade", "Resolve tarefas curtas com sucesso", "Engaja-se em atividades de movimento"],
    pontosForca: ["Criatividade", "Energia e entusiasmo", "Pensamento divergente", "Boa memória para temas de interesse"],
    necessidadesApoio: ["Quebrar tarefas em etapas curtas", "Lembretes visuais e timer", "Pausas ativas a cada 15 minutos", "Reforço imediato e específico"],
    objetivoTexto: ["Concluir tarefa em 4 etapas com checklist", "Permanecer na atividade por 15 min com pausas", "Organizar material escolar antes da saída"],
    objetivoCriterios: ["Em 4 de 5 dias da semana", "Com no máximo 1 lembrete do adulto", "Registro semanal em rubrica"],
    adaptCurric: ["Tarefas segmentadas com checklist", "Redução de cópia, foco no essencial", "Conteúdos com apoio multimodal"],
    adaptAval: ["Tempo estendido e fracionamento", "Prova com menos itens por página", "Leitura do enunciado em voz alta"],
    metodologias: ["Ensino explícito de funções executivas", "Economia de fichas / reforço positivo", "Pausas ativas e movimento estruturado"],
    recursos: ["Timer visual", "Checklist e agenda", "Almofada / faixa elástica na cadeira", "Fone para foco"],
    formasAval: ["Rubrica de autorregulação", "Autoavaliação semanal", "Registro de tempo em tarefa"],
    familiaPart: ["Agenda compartilhada de tarefas", "Reuniões quinzenais", "Alinhamento com neuropediatria/psicologia"],
    acordosFam: ["Rotina de estudos em casa", "Sono regular", "Combinados sobre uso de telas"],
    equipeFuncao: ["Psicopedagogo(a)", "Psicólogo(a)", "Neuropediatra (referência)"],
  },
  dislexia: {
    caracterizacao: ["Dificuldade na decodificação leitora", "Trocas e omissões fonológicas", "Leitura lenta e silabada", "Dificuldade em soletrar"],
    habilidades: ["Boa compreensão oral", "Raciocínio lógico preservado", "Vocabulário adequado à idade"],
    pontosForca: ["Pensamento visual", "Criatividade narrativa oral", "Boa memória de longo prazo para histórias"],
    necessidadesApoio: ["Consciência fonológica explícita", "Leitura compartilhada e mediada", "Materiais com fonte ampliada e espaçada", "Tempo estendido na leitura"],
    objetivoTexto: ["Ler 20 palavras CV/CVC com autonomia", "Segmentar e contar fonemas em palavras de 3-4 letras", "Produzir frase de 5 palavras com apoio"],
    objetivoCriterios: ["80% de acerto em 3 sessões", "Com apoio do alfabeto móvel", "Registro em ficha de leitura"],
    adaptCurric: ["Priorização da consciência fonológica", "Textos curtos com vocabulário controlado", "Suporte de áudio para textos longos"],
    adaptAval: ["Leitura do enunciado em voz alta", "Avaliação oral complementar", "Tempo estendido e ortografia não pontuada"],
    metodologias: ["Método fônico estruturado (Orton-Gillingham)", "Multissensorial (visual + auditivo + tátil)", "Leitura compartilhada e repetida"],
    recursos: ["Texto-para-fala / audiolivro", "Fonte OpenDyslexic, espaçamento ampliado", "Marcador de linha", "Alfabeto móvel"],
    formasAval: ["Avaliação oral", "Portfólio de leitura", "Rubrica fonológica"],
    familiaPart: ["Leitura diária em casa (10 min)", "Reuniões bimestrais", "Alinhamento com fonoaudiologia"],
    acordosFam: ["Não cobrar ortografia em tarefas livres", "Valorizar produção oral", "Manter rotina de leitura prazerosa"],
    equipeFuncao: ["Fonoaudiólogo(a)", "Psicopedagogo(a)", "Professor(a) de AEE"],
  },
  discalculia: {
    caracterizacao: ["Dificuldade no senso numérico", "Trocas em fatos básicos da adição/subtração", "Dificuldade em sequência e valor posicional"],
    habilidades: ["Reconhece numerais até 20", "Faz contagem 1 a 1 com material concreto"],
    pontosForca: ["Boa expressão verbal", "Engaja-se com jogos manipulativos"],
    necessidadesApoio: ["Material concreto sempre disponível", "Tabelas de apoio (fatos, valor posicional)", "Tempo estendido em cálculo"],
    objetivoTexto: ["Resolver adições até 20 com material dourado", "Reconhecer valor posicional até a centena", "Resolver problema simples com 1 operação"],
    objetivoCriterios: ["80% de acerto com apoio concreto", "Em 3 sessões consecutivas"],
    adaptCurric: ["Uso permanente de material concreto", "Tabela de fatos disponível na avaliação", "Problemas com enunciado curto e ilustrado"],
    adaptAval: ["Calculadora ou tabela de fatos liberada", "Tempo estendido", "Avaliação oral do raciocínio"],
    metodologias: ["Método CPA (Concreto-Pictórico-Abstrato)", "Singapura", "Numicon, ábaco, material dourado"],
    recursos: ["Material dourado", "Numicon / ábaco", "Tabela de fatos", "Reta numérica"],
    formasAval: ["Observação de raciocínio com material", "Portfólio de problemas", "Entrevista clínica (Piaget)"],
    familiaPart: ["Jogos matemáticos em casa", "Reuniões bimestrais"],
    acordosFam: ["Evitar cobrança de cálculo mental sem apoio", "Valorizar o processo e não só o resultado"],
    equipeFuncao: ["Psicopedagogo(a)", "Professor(a) de AEE"],
  },
  di: {
    caracterizacao: ["Atraso global no desenvolvimento", "Necessidade de mais tempo para internalizar conteúdos", "Funcionalidade preservada com apoio"],
    habilidades: ["Realiza autocuidado com supervisão", "Reconhece o próprio nome", "Segue rotinas conhecidas"],
    pontosForca: ["Afetividade", "Engajamento em tarefas práticas", "Interesse por música/arte"],
    necessidadesApoio: ["Instrução repetida e modelada", "Apoio visual permanente", "Generalização em contextos variados"],
    objetivoTexto: ["Reconhecer e escrever o próprio nome", "Identificar números de 1 a 10 com material concreto", "Realizar autocuidado (banheiro/lanche) com autonomia"],
    objetivoCriterios: ["Em 4 de 5 oportunidades", "Com modelagem inicial e desfade gradual"],
    adaptCurric: ["Currículo funcional com habilidades de vida diária", "Recortes da BNCC priorizando comunicação e autonomia"],
    adaptAval: ["Avaliação por observação e registro", "Tarefas com apoio visual e modelo", "Ênfase no processo"],
    metodologias: ["Ensino estruturado (TEACCH)", "Modelagem + desvanecimento de pistas", "Aprendizagem cooperativa com tutoria de pares"],
    recursos: ["Pictogramas", "Material concreto manipulável", "Vídeos-modelo curtos"],
    formasAval: ["Portfólio com fotos", "Rubrica de funcionalidade", "Observação direta"],
    familiaPart: ["Treino de habilidades de vida em casa", "Reuniões mensais"],
    acordosFam: ["Reforçar autonomia nas tarefas diárias", "Manter rotina previsível"],
    equipeFuncao: ["Mediador(a)", "Terapeuta ocupacional", "Professor(a) de AEE"],
  },
  down: {
    caracterizacao: ["Hipotonia muscular leve", "Atraso na linguagem expressiva", "Boa memória visual e imitação"],
    habilidades: ["Imita gestos e ações", "Reconhece familiares e rotina"],
    pontosForca: ["Sociabilidade", "Memória visual", "Engajamento em música e dança"],
    necessidadesApoio: ["Estímulo à linguagem oral", "Atividades de motricidade fina", "Instruções curtas e visuais"],
    objetivoTexto: ["Ampliar vocabulário expressivo (50 palavras)", "Realizar pinça digital em atividades de recorte", "Reconhecer letras do próprio nome"],
    objetivoCriterios: ["Em 4 de 5 sessões", "Com apoio visual e modelagem"],
    adaptCurric: ["Foco em comunicação e funcionalidade", "Atividades concretas e contextualizadas"],
    adaptAval: ["Avaliação por observação", "Tarefas com apoio visual"],
    metodologias: ["Método das Boquinhas (alfabetização)", "PODD / comunicação alternativa", "Multissensorial"],
    recursos: ["Pranchas de comunicação", "Material concreto", "Apoio visual constante"],
    formasAval: ["Portfólio", "Registro de evidências em vídeo"],
    familiaPart: ["Estimulação da linguagem em casa", "Acompanhamento com equipe multi"],
    acordosFam: ["Frequência regular nas terapias", "Comunicação semanal com a escola"],
    equipeFuncao: ["Fonoaudiólogo(a)", "Terapeuta ocupacional", "Fisioterapeuta"],
  },
  dv: {
    caracterizacao: ["Baixa visão / cegueira", "Necessita material em alto contraste ou Braille", "Boa percepção auditiva e tátil"],
    habilidades: ["Orienta-se em ambientes conhecidos", "Reconhece objetos pelo tato"],
    pontosForca: ["Memória auditiva", "Atenção sustentada à fala", "Discriminação tátil"],
    necessidadesApoio: ["Material ampliado / Braille / áudio", "Descrição verbal de imagens", "Mobilidade orientada no ambiente"],
    objetivoTexto: ["Ler texto em fonte ampliada/Braille com fluência", "Locomover-se com autonomia em rotas escolares", "Usar leitor de tela em tarefas digitais"],
    objetivoCriterios: ["Com tempo estendido", "Em 80% das tentativas"],
    adaptCurric: ["Materiais transcritos para Braille / ampliados", "Descrição verbal sistemática de imagens", "Atividades táteis e sonoras"],
    adaptAval: ["Provas em Braille / ampliadas / áudio", "Tempo estendido (até 50%)", "Ledor(a) quando necessário"],
    metodologias: ["Sorobã", "Braille / Reglete", "Tecnologia assistiva (NVDA, DOSVOX)"],
    recursos: ["Lupa eletrônica", "Sorobã", "Reglete e punção", "Leitor de tela"],
    formasAval: ["Avaliação oral e tátil", "Portfólio em formato acessível"],
    familiaPart: ["Treino de orientação e mobilidade em casa", "Reuniões mensais"],
    acordosFam: ["Manter materiais acessíveis em casa", "Estimular autonomia"],
    equipeFuncao: ["Professor(a) de AEE com Braille", "Instrutor(a) de orientação e mobilidade"],
  },
  da: {
    caracterizacao: ["Surdez / deficiência auditiva", "Comunicação prioritária em Libras", "Português como L2"],
    habilidades: ["Comunica-se em Libras com fluência", "Boa percepção visual"],
    pontosForca: ["Memória visual", "Expressividade gestual", "Atenção visual"],
    necessidadesApoio: ["Intérprete de Libras", "Material visual e legendado", "Português escrito como L2"],
    objetivoTexto: ["Produzir narrativa em Libras com início, meio e fim", "Ler e compreender texto curto em português", "Escrever frase em português com apoio visual"],
    objetivoCriterios: ["Com mediação do intérprete", "Em 4 de 5 produções"],
    adaptCurric: ["Bilíngue Libras–Português escrito", "Conteúdos com forte apoio visual", "Glossários ilustrados"],
    adaptAval: ["Prova em Libras (vídeo)", "Avaliação visual e escrita", "Tempo estendido"],
    metodologias: ["Educação Bilíngue (Libras L1, Português L2)", "Pedagogia visual"],
    recursos: ["Intérprete de Libras", "Vídeos legendados", "Glossário visual"],
    formasAval: ["Vídeo de produção em Libras", "Portfólio bilíngue"],
    familiaPart: ["Estimular Libras em família", "Participar de cursos de Libras"],
    acordosFam: ["Comunicação acessível em casa", "Frequência ao AEE bilíngue"],
    equipeFuncao: ["Intérprete de Libras", "Professor(a) bilíngue", "Fonoaudiólogo(a)"],
  },
  df: {
    caracterizacao: ["Deficiência física / motora", "Mobilidade reduzida", "Funções cognitivas preservadas"],
    habilidades: ["Acompanha o conteúdo cognitivamente", "Comunica-se com clareza"],
    pontosForca: ["Raciocínio preservado", "Persistência", "Boa expressão verbal"],
    necessidadesApoio: ["Acessibilidade arquitetônica", "Mobiliário adaptado", "Tecnologia assistiva para escrita"],
    objetivoTexto: ["Registrar atividades com tecnologia assistiva", "Participar de atividades coletivas com adaptação", "Realizar autocuidado com adaptações"],
    objetivoCriterios: ["Em 100% das aulas", "Com recurso assistivo disponível"],
    adaptCurric: ["Substituir registro escrito por digital quando necessário", "Atividades adaptadas para participação plena"],
    adaptAval: ["Prova digital / oral", "Tempo estendido", "Ledor(a) ou escriba"],
    metodologias: ["Desenho Universal para Aprendizagem (DUA)", "Tecnologia assistiva", "Aprendizagem cooperativa"],
    recursos: ["Engrossador de lápis", "Teclado adaptado", "Notebook / tablet", "Plano inclinado"],
    formasAval: ["Avaliação digital", "Registro em vídeo/áudio"],
    familiaPart: ["Acompanhamento fisioterápico", "Reuniões mensais"],
    acordosFam: ["Manter equipamentos em uso", "Estimular autonomia"],
    equipeFuncao: ["Fisioterapeuta", "Terapeuta ocupacional", "Cuidador(a)"],
  },
  ah: {
    caracterizacao: ["Altas habilidades / superdotação", "Avanço em área específica", "Possível assincronia (cognitivo > socioemocional)"],
    habilidades: ["Domina conteúdos do ano em aprofundamento", "Resolve problemas complexos"],
    pontosForca: ["Curiosidade intelectual", "Criatividade", "Liderança"],
    necessidadesApoio: ["Enriquecimento curricular", "Mentoria em área de interesse", "Apoio socioemocional"],
    objetivoTexto: ["Desenvolver projeto de aprofundamento em área de interesse", "Apresentar produção autoral à turma", "Participar de atividade de enriquecimento extraclasse"],
    objetivoCriterios: ["Entrega bimestral", "Avaliação por rubrica de projeto"],
    adaptCurric: ["Compactação curricular do já dominado", "Aprofundamento e ampliação", "Projetos investigativos"],
    adaptAval: ["Avaliação por projeto e produção autoral", "Rubrica avançada"],
    metodologias: ["Modelo Triádico de Renzulli", "Aprendizagem por projetos (PBL)", "Mentoria"],
    recursos: ["Acesso a biblioteca/laboratório", "Mentor(a) externo(a)", "Materiais de aprofundamento"],
    formasAval: ["Portfólio de projetos", "Apresentação pública", "Rubrica de criatividade e profundidade"],
    familiaPart: ["Apoiar projetos em casa", "Buscar atividades de enriquecimento"],
    acordosFam: ["Equilibrar desafio acadêmico e socioemocional", "Estimular convivência com pares de interesse"],
    equipeFuncao: ["Professor(a) de sala de recursos AH/SD", "Mentor(a) de área", "Psicólogo(a) escolar"],
  },
  generico: {
    caracterizacao: ["Descrever histórico escolar relevante", "Intervenções já realizadas", "Preferências e barreiras observadas"],
    habilidades: ["Listar habilidades já consolidadas", "Indicar nível de leitura/escrita/cálculo"],
    pontosForca: ["Interesses e talentos", "Recursos pessoais e familiares"],
    necessidadesApoio: ["Tipos de apoio (pedagógico, sensorial, comunicação)", "Frequência do apoio necessário"],
    objetivoTexto: ["Definir meta observável e mensurável"],
    objetivoCriterios: ["80% de acerto em 3 sessões consecutivas"],
    adaptCurric: ["Recortes da BNCC priorizados"],
    adaptAval: ["Tempo estendido", "Leitura em voz alta", "Redução de itens"],
    metodologias: ["DUA", "Ensino explícito", "Aprendizagem cooperativa"],
    recursos: ["Material concreto", "Apoio visual", "Tecnologia assistiva"],
    formasAval: ["Observação", "Portfólio", "Rubrica"],
    familiaPart: ["Reuniões periódicas", "Comunicação contínua"],
    acordosFam: ["Combinados de rotina", "Protocolo de comunicação"],
    equipeFuncao: ["Professor(a) regente", "Coordenação", "AEE"],
  },
};

// Sugestões adicionais comuns a qualquer perfil — ampliam as opções rápidas.
const EXTRA_COMUM: Partial<Record<SugKey, string[]>> = {
  caracterizacao: [
    "Histórico de intervenções pedagógicas anteriores",
    "Boa relação com colegas em pequenos grupos",
    "Apresenta períodos de desregulação emocional",
    "Frequência escolar regular / irregular",
    "Acompanhamento clínico em andamento",
    "Demonstra interesse por temas práticos",
  ],
  habilidades: [
    "Reconhece o próprio nome (oral e escrito)",
    "Realiza contagem oral até 20",
    "Compreende comandos simples de 1 a 2 passos",
    "Copia palavras do quadro",
    "Participa de rodas de conversa",
    "Realiza tarefas de recorte e colagem com apoio",
  ],
  pontosForca: [
    "Persistência diante de desafios",
    "Cooperação com colegas",
    "Boa coordenação motora ampla",
    "Senso de humor e empatia",
    "Curiosidade investigativa",
    "Vínculo afetivo com a professora",
  ],
  necessidadesApoio: [
    "Mediação individualizada em momentos-chave",
    "Antecipação verbal de transições",
    "Reforço positivo contingente",
    "Ambiente com baixa estimulação visual/sonora",
    "Apoio para regulação emocional",
    "Adaptação do tempo de execução",
  ],
  objetivoTexto: [
    "Ampliar autonomia em rotinas escolares",
    "Desenvolver habilidades de leitura funcional",
    "Resolver situações-problema do cotidiano",
    "Participar de atividades em pequenos grupos",
    "Expressar sentimentos com apoio de pranchas",
    "Cumprir combinados de convivência",
  ],
  objetivoCriterios: [
    "Em pelo menos 3 contextos diferentes",
    "Com fade-out gradual da mediação",
    "Avaliado por rubrica trimestral",
    "Registrado em diário de bordo do(a) professor(a)",
    "Sem necessidade de reforço externo",
  ],
  adaptCurric: [
    "Conteúdos contextualizados ao interesse do aluno",
    "Atividades com múltiplas formas de resposta (DUA)",
    "Redução do volume de exercícios mantendo o objetivo",
    "Material com linguagem simples e direta",
    "Texto adaptado em frases curtas",
  ],
  adaptAval: [
    "Avaliação contínua por evidências",
    "Permitir resposta oral, escrita ou desenhada",
    "Itens com apoio de imagem",
    "Aplicação em momentos curtos e fracionados",
    "Reforço da consigna individualmente",
  ],
  metodologias: [
    "Desenho Universal para Aprendizagem (DUA)",
    "Aprendizagem cooperativa entre pares",
    "Ensino por projetos",
    "Gamificação de tarefas",
    "Sequências didáticas multissensoriais",
    "Tutoria de pares",
  ],
  recursos: [
    "Pictogramas e apoio visual",
    "Material concreto manipulável",
    "Tablet com apps educativos",
    "Quadro de rotina",
    "Cronômetro / timer visual",
    "Caderno com pauta ampliada",
  ],
  formasAval: [
    "Portfólio com produções do aluno",
    "Rubrica descritiva por habilidade",
    "Autoavaliação com apoio visual",
    "Registro fotográfico/vídeo (com autorização)",
    "Observação sistemática registrada em ficha",
  ],
  familiaPart: [
    "Reuniões periódicas com a família",
    "Caderno de comunicação diário",
    "Compartilhamento de combinados de rotina",
    "Participação em encontros pedagógicos",
    "Devolutiva trimestral por escrito",
  ],
  acordosFam: [
    "Manter rotina previsível em casa",
    "Comunicar mudanças relevantes à escola",
    "Reforçar autonomia em tarefas diárias",
    "Limite saudável ao uso de telas",
    "Acompanhamento regular nas terapias",
  ],
  equipeFuncao: [
    "Professor(a) regente",
    "Coordenação pedagógica",
    "Professor(a) de AEE",
    "Mediador(a) escolar",
    "Psicólogo(a) escolar",
    "Fonoaudiólogo(a)",
    "Terapeuta ocupacional",
    "Família / responsáveis",
  ],
};

function mergeSug(
  base: Partial<Record<SugKey, string[]>>,
  extra: Partial<Record<SugKey, string[]>>,
): Partial<Record<SugKey, string[]>> {
  const out: Partial<Record<SugKey, string[]>> = {};
  const keys = new Set<SugKey>([
    ...(Object.keys(base) as SugKey[]),
    ...(Object.keys(extra) as SugKey[]),
  ]);
  for (const k of keys) {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const s of [...(base[k] || []), ...(extra[k] || [])]) {
      const key = s.trim().toLowerCase();
      if (!seen.has(key)) { seen.add(key); merged.push(s); }
    }
    out[k] = merged;
  }
  return out;
}

function SugChips({ items, onPick }: { items?: string[]; onPick: (s: string) => void }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, alignItems: "center" }}>
      <span style={{ fontSize: 10, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 700 }}>
        <Wand2 size={10} /> Sugestões:
      </span>
      {items.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(s)}
          style={{
            fontSize: 11, padding: "3px 8px", borderRadius: 999,
            border: "1px solid var(--border)", background: "#FFF7F2",
            color: "#B8410E", cursor: "pointer", fontWeight: 600,
          }}
          title="Clique para inserir no campo"
        >
          + {s}
        </button>
      ))}
    </div>
  );
}

function append(prev: string, add: string): string {
  const t = (prev || "").trim();
  if (!t) return add;
  if (t.includes(add)) return t;
  return t.endsWith(".") || t.endsWith(";") ? `${t} ${add}` : `${t}; ${add}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  aluno: Aluno | null;
};

export function PEIFormModal({ open, onClose, aluno }: Props) {
  const user = useUser();
  const [peiByStudent, setPeiByStudent] = usePersistentState<Record<string, PEIData>>("inc_pei", {});
  const dataAtual = aluno ? (peiByStudent[aluno.id] ?? blankPEI()) : blankPEI();
  const [draft, setDraft] = useState<PEIData>(dataAtual);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (open && aluno) {
      const existing = peiByStudent[aluno.id];
      if (existing) {
        setDraft(existing);
      } else {
        const seed = blankPEI();
        seed.diagnostico = aluno.diag || "";
        seed.cid = aluno.cid || "";
        seed.serie = aluno.anoEscolar || "";
        setDraft(seed);
      }
      setDirty(false);
    }
  }, [open, aluno?.id]);

  const set = <K extends keyof PEIData>(k: K, v: PEIData[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setDirty(true);
  };

  const updObjetivo = (id: string, patch: Partial<Objetivo>) => {
    setDraft((d) => ({ ...d, objetivos: d.objetivos.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
    setDirty(true);
  };
  const addObjetivo = () => {
    setDraft((d) => ({
      ...d,
      objetivos: [
        ...d.objetivos,
        { id: Math.random().toString(36).slice(2, 8), texto: "", prazo: "curto", status: "nao_iniciado", criterios: "" },
      ],
    }));
    setDirty(true);
  };
  const delObjetivo = (id: string) => {
    setDraft((d) => ({ ...d, objetivos: d.objetivos.filter((o) => o.id !== id) }));
    setDirty(true);
  };

  const addEquipe = () => {
    setDraft((d) => ({ ...d, equipe: [...d.equipe, { nome: "", funcao: "" }] }));
    setDirty(true);
  };
  const updEquipe = (idx: number, patch: Partial<{ nome: string; funcao: string }>) => {
    setDraft((d) => ({ ...d, equipe: d.equipe.map((e, i) => (i === idx ? { ...e, ...patch } : e)) }));
    setDirty(true);
  };
  const delEquipe = (idx: number) => {
    setDraft((d) => ({ ...d, equipe: d.equipe.filter((_, i) => i !== idx) }));
    setDirty(true);
  };

  const salvar = () => {
    if (!aluno) return;
    const upd = { ...draft, atualizadoEm: new Date().toISOString() };
    setPeiByStudent((prev) => ({ ...prev, [aluno.id]: upd }));
    setDraft(upd);
    setDirty(false);
    toast.success("PEI salvo · Lei 14.254/2021");
  };

  const imprimir = () => {
    if (dirty) salvar();
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (s: string) =>
      String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const obj = draft.objetivos.map((o, i) =>
      `<li><b>#${i + 1} (${o.prazo === "curto" ? "Curto prazo" : o.prazo === "medio" ? "Médio prazo" : "Longo prazo"})</b> — ${esc(o.texto)}<br/><i>Critérios:</i> ${esc(o.criterios || "—")} · <i>Status:</i> ${esc(o.status)}</li>`,
    ).join("");
    const eq = draft.equipe.map((e) => `<li>${esc(e.nome)} — ${esc(e.funcao)}</li>`).join("");
    const extraCss = `
      h1{font-size:16pt;margin:0 0 6pt;border-bottom:2px solid #FF7A45;padding-bottom:4pt;}
      h2{font-size:12pt;margin:14pt 0 4pt;color:#FF7A45;text-transform:uppercase;letter-spacing:.05em;}
      .meta{font-size:11pt;color:#6B7691;margin-bottom:10pt;}
      .ident{display:grid;grid-template-columns:1fr 1fr;gap:4pt 16pt;margin-bottom:10pt;}
      ul{margin:0;padding-left:14pt;}
      .legal{margin-top:16pt;font-size:10pt;color:#6B7691;border-top:1px dashed #ccc;padding-top:6pt;}
      .sig{margin-top:18pt;display:grid;grid-template-columns:1fr 1fr;gap:24pt;}
      .sig div{border-top:1px solid #333;padding-top:4pt;font-size:11pt;text-align:center;}
      .toolbar{position:fixed;top:8px;right:8px;}
    `;
    const inner = `
      <div class="toolbar"><button onclick="window.print()">Imprimir</button></div>
      <h1>Plano Educacional Individualizado (PEI)</h1>
      <div class="meta">Protocolo ${esc(draft.protocolo)} · Vigência ${esc(draft.vigencia.inicio || "—")} a ${esc(draft.vigencia.fim || "—")} · Lei 14.254/2021</div>
      <h2>1. Identificação do educando</h2>
      <div class="ident">
        <span><b>Nome:</b> ${esc(aluno?.name || "—")}</span>
        <span><b>Idade:</b> ${esc(String(aluno?.idade ?? "—"))}</span>
        <span><b>Escola:</b> ${esc(draft.escola || "—")}</span>
        <span><b>Turma/Ano:</b> ${esc(draft.serie || aluno?.anoEscolar || "—")}</span>
        <span><b>Diagnóstico:</b> ${esc(draft.diagnostico || "—")}</span>
        <span><b>CID:</b> ${esc(draft.cid || "—")}</span>
        <span><b>Laudo:</b> ${esc(draft.laudoProf || "—")} · ${esc(draft.laudoData || "—")}</span>
        <span><b>AEE:</b> ${esc(aluno?.aee || "—")}</span>
      </div>
      <h2>2. Caracterização e histórico</h2>
      <p>${esc(draft.caracterizacao || "—")}</p>
      <h2>3. Habilidades já desenvolvidas</h2>
      <p><b>Habilidades:</b> ${esc(draft.habilidadesDesenvolvidas || "—")}</p>
      <p><b>Potencialidades:</b> ${esc(draft.pontosForca || "—")}</p>
      <p><b>Necessidades de apoio:</b> ${esc(draft.necessidadesApoio || "—")}</p>
      <h2>4. Objetivos pedagógicos individualizados</h2>
      <ul>${obj || "<li>—</li>"}</ul>
      <h2>5. Estratégias pedagógicas e adaptações</h2>
      <p><b>Adaptações curriculares:</b> ${esc(draft.adaptacoesCurriculares || "—")}</p>
      <p><b>Adaptações avaliativas:</b> ${esc(draft.adaptacoesAvaliativas || "—")}</p>
      <p><b>Metodologias:</b> ${esc(draft.metodologias || "—")}</p>
      <p><b>Recursos de apoio:</b> ${esc(draft.recursosApoio || "—")}</p>
      <h2>6. Avaliação contínua</h2>
      <p><b>Formas de avaliação:</b> ${esc(draft.formasAvaliacao || "—")}</p>
      <p><b>Periodicidade de revisão:</b> ${esc(draft.periodicidadeRevisao || "—")}</p>
      <h2>7. Equipe responsável</h2>
      <ul>${eq || "<li>—</li>"}</ul>
      <h2>8. Participação da família</h2>
      <p>${esc(draft.familiaParticipacao || "—")}</p>
      <p><b>Acordos:</b> ${esc(draft.acordosFamilia || "—")}</p>
      <div class="sig">
        <div>${esc(draft.assinaturas.professorRegente || "Professor(a) regente")}</div>
        <div>${esc(draft.assinaturas.coordenacao || "Coordenação pedagógica")}</div>
        <div>${esc(draft.assinaturas.aee || "Profissional do AEE")}</div>
        <div>${esc(draft.assinaturas.familia || "Família / responsável")}</div>
      </div>
      <div class="legal">Documento elaborado conforme a <b>Lei nº 14.254/2021</b>, que dispõe sobre o acompanhamento integral para educandos com dislexia, TDAH e outros transtornos de aprendizagem, e em consonância com a <b>Lei nº 13.146/2015</b> (LBI), <b>Lei nº 12.764/2012</b> (PNPDTEA) e a <b>BNCC</b>.</div>
    `;
    w.document.write(wrapStandardPrintHtml(`PEI · ${esc(aluno?.name || "")}`, inner, {
      extraCss,
      professorNome: user.name,
      docType: "pei",
    }));
    w.document.close();
    setTimeout(() => w.focus(), 200);
  };

  const eixosPreenchidos = useMemo(() => {
    const camposCheck: Array<keyof PEIData> = [
      "diagnostico", "caracterizacao", "habilidadesDesenvolvidas",
      "adaptacoesCurriculares", "formasAvaliacao", "familiaParticipacao",
    ];
    let n = 0;
    camposCheck.forEach((k) => { if (String(draft[k] || "").trim().length > 5) n++; });
    if (draft.objetivos.length > 0) n++;
    if (draft.equipe.length > 0) n++;
    return n;
  }, [draft]);

  const perfil = useMemo(() => detectarPerfil(aluno?.diag, aluno?.cid || draft.cid), [aluno?.diag, aluno?.cid, draft.cid]);
  const sug = SUG[perfil] || SUG.generico;
  const pickInto = <K extends keyof PEIData>(k: K) => (s: string) => {
    setDraft((d) => ({ ...d, [k]: append(String(d[k] || ""), s) as PEIData[K] }));
    setDirty(true);
  };
  const pickAssinatura = (k: keyof PEIData["assinaturas"]) => (s: string) => {
    setDraft((d) => ({ ...d, assinaturas: { ...d.assinaturas, [k]: append(String(d.assinaturas[k] || ""), s) } }));
    setDirty(true);
  };

  if (!open) return null;

  return (
    <div
      className="inc-modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (dirty && !window.confirm("Há alterações não salvas. Fechar mesmo assim?")) return;
          onClose();
        }
      }}
    >
      <div className="inc-modal" style={{ maxWidth: 980 }}>
        <div className="inc-modal-bar" />
        <div className="inc-modal-head">
          <div>
            <h2>Plano Educacional Individualizado{aluno ? ` · ${aluno.name}` : ""}</h2>
            <span className="meta" style={{ display: "block", marginTop: 4 }}>
              Protocolo {draft.protocolo} · Lei 14.254/2021 · {eixosPreenchidos}/8 eixos preenchidos
              {dirty && <span style={{ color: "var(--accent)", fontWeight: 700 }}> · alterações não salvas</span>}
            </span>
          </div>
          <button className="inc-modal-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>

        <div className="inc-modal-body" style={{ background: "var(--bg)" }}>
          {/* 1. Identificação */}
          <div style={sectionCss}>
            <div style={sectionTitleCss}><span style={sectionBadge}>1</span>Identificação do educando</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelCss}>Nome</label>
                <input style={inputCss} value={aluno?.name || ""} disabled />
              </div>
              <div>
                <label style={labelCss}>Idade</label>
                <input style={inputCss} value={String(aluno?.idade ?? "")} disabled />
              </div>
              <div>
                <label style={labelCss}>Escola</label>
                <input style={inputCss} value={draft.escola} onChange={(e) => set("escola", e.target.value)} placeholder="Nome da escola" />
              </div>
              <div>
                <label style={labelCss}>Turma · ano de referência</label>
                <input style={inputCss} value={draft.serie} onChange={(e) => set("serie", e.target.value)} placeholder="Ex.: 2º Ano A" />
              </div>
              <div>
                <label style={labelCss}>Vigência (início)</label>
                <input type="date" style={inputCss} value={draft.vigencia.inicio} onChange={(e) => set("vigencia", { ...draft.vigencia, inicio: e.target.value })} />
              </div>
              <div>
                <label style={labelCss}>Vigência (fim)</label>
                <input type="date" style={inputCss} value={draft.vigencia.fim} onChange={(e) => set("vigencia", { ...draft.vigencia, fim: e.target.value })} />
              </div>
            </div>
          </div>

          {/* 2. Diagnóstico */}
          <div style={sectionCss}>
            <div style={sectionTitleCss}><span style={sectionBadge}>2</span>Diagnóstico e caracterização</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelCss}>Diagnóstico clínico</label>
                <input style={inputCss} value={draft.diagnostico} onChange={(e) => set("diagnostico", e.target.value)} placeholder="Ex.: TEA Nível 1" />
              </div>
              <div>
                <label style={labelCss}>CID</label>
                <input style={inputCss} value={draft.cid} onChange={(e) => set("cid", e.target.value)} placeholder="Ex.: F84.0" />
              </div>
              <div>
                <label style={labelCss}>Profissional responsável pelo laudo</label>
                <input style={inputCss} value={draft.laudoProf} onChange={(e) => set("laudoProf", e.target.value)} placeholder="Ex.: Dra. Ana Lima — CRM 12345" />
              </div>
              <div>
                <label style={labelCss}>Data do laudo</label>
                <input type="date" style={inputCss} value={draft.laudoData} onChange={(e) => set("laudoData", e.target.value)} />
              </div>
            </div>
            <label style={labelCss}>Caracterização e histórico pedagógico</label>
            <textarea style={{ ...inputCss, minHeight: 80, resize: "vertical" }}
              value={draft.caracterizacao}
              onChange={(e) => set("caracterizacao", e.target.value)}
              placeholder="Descreva o histórico escolar, comportamento em sala, intervenções já realizadas, preferências e barreiras observadas." />
            <SugChips items={sug.caracterizacao} onPick={pickInto("caracterizacao")} />
          </div>

          {/* 3. Habilidades */}
          <div style={sectionCss}>
            <div style={sectionTitleCss}><span style={sectionBadge}>3</span>Habilidades já desenvolvidas e potencialidades</div>
            <label style={labelCss}>Habilidades já desenvolvidas</label>
            <textarea style={{ ...inputCss, minHeight: 60, resize: "vertical", marginBottom: 10 }}
              value={draft.habilidadesDesenvolvidas}
              onChange={(e) => set("habilidadesDesenvolvidas", e.target.value)}
              placeholder="Ex.: Reconhece o alfabeto, lê palavras CV com mediação, conta até 50 com material concreto." />
            <SugChips items={sug.habilidades} onPick={pickInto("habilidadesDesenvolvidas")} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelCss}>Potencialidades / interesses</label>
                <textarea style={{ ...inputCss, minHeight: 60, resize: "vertical" }}
                  value={draft.pontosForca}
                  onChange={(e) => set("pontosForca", e.target.value)}
                  placeholder="Interesses, talentos, recursos pessoais e apoios da família." />
                <SugChips items={sug.pontosForca} onPick={pickInto("pontosForca")} />
              </div>
              <div>
                <label style={labelCss}>Necessidades de apoio</label>
                <textarea style={{ ...inputCss, minHeight: 60, resize: "vertical" }}
                  value={draft.necessidadesApoio}
                  onChange={(e) => set("necessidadesApoio", e.target.value)}
                  placeholder="Sensorial, comunicação, motor, atenção, organização." />
                <SugChips items={sug.necessidadesApoio} onPick={pickInto("necessidadesApoio")} />
              </div>
            </div>
          </div>

          {/* 4. Objetivos */}
          <div style={sectionCss}>
            <div style={sectionTitleCss}>
              <span style={sectionBadge}>4</span>Objetivos pedagógicos individualizados
              <button onClick={addObjetivo} className="inc-btn-ghost" style={{ marginLeft: "auto" }}>
                <Plus size={12} /> Adicionar objetivo
              </button>
            </div>
            {draft.objetivos.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Nenhum objetivo cadastrado. Acrescente metas mensuráveis (curto, médio e longo prazo).</p>
            )}
            {draft.objetivos.map((o, i) => (
              <div key={o.id} style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ ...sectionBadge, background: "#E9F0FF", color: "#1F4FB8" }}>#{i + 1}</span>
                  <select value={o.prazo} onChange={(e) => updObjetivo(o.id, { prazo: e.target.value as Objetivo["prazo"] })}
                    style={{ ...inputCss, width: "auto" }}>
                    <option value="curto">Curto prazo</option>
                    <option value="medio">Médio prazo</option>
                    <option value="longo">Longo prazo</option>
                  </select>
                  <select value={o.status} onChange={(e) => updObjetivo(o.id, { status: e.target.value as Objetivo["status"] })}
                    style={{ ...inputCss, width: "auto" }}>
                    <option value="nao_iniciado">Não iniciado</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="atingido">Atingido</option>
                    <option value="revisar">Revisar</option>
                  </select>
                  <button onClick={() => delObjetivo(o.id)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#C62B2B", cursor: "pointer" }} aria-label="Remover">
                    <Trash2 size={14} />
                  </button>
                </div>
                <label style={labelCss}>Objetivo</label>
                <textarea style={{ ...inputCss, minHeight: 50, resize: "vertical", marginBottom: 6 }}
                  value={o.texto} onChange={(e) => updObjetivo(o.id, { texto: e.target.value })}
                  placeholder="Ex.: Ler 20 palavras com encontro consonantal com mediação visual." />
                <SugChips items={sug.objetivoTexto} onPick={(s) => updObjetivo(o.id, { texto: append(o.texto, s) })} />
                <label style={labelCss}>Critérios de avaliação</label>
                <input style={inputCss} value={o.criterios} onChange={(e) => updObjetivo(o.id, { criterios: e.target.value })}
                  placeholder="Ex.: 80% de acerto em 3 sessões consecutivas." />
                <SugChips items={sug.objetivoCriterios} onPick={(s) => updObjetivo(o.id, { criterios: append(o.criterios, s) })} />
              </div>
            ))}
          </div>

          {/* 5. Estratégias */}
          <div style={sectionCss}>
            <div style={sectionTitleCss}><span style={sectionBadge}>5</span>Estratégias pedagógicas e adaptações</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelCss}>Adaptações curriculares</label>
                <textarea style={{ ...inputCss, minHeight: 70, resize: "vertical" }}
                  value={draft.adaptacoesCurriculares} onChange={(e) => set("adaptacoesCurriculares", e.target.value)}
                  placeholder="Conteúdos priorizados, ajustes de complexidade, recortes da BNCC." />
                <SugChips items={sug.adaptCurric} onPick={pickInto("adaptacoesCurriculares")} />
              </div>
              <div>
                <label style={labelCss}>Adaptações avaliativas</label>
                <textarea style={{ ...inputCss, minHeight: 70, resize: "vertical" }}
                  value={draft.adaptacoesAvaliativas} onChange={(e) => set("adaptacoesAvaliativas", e.target.value)}
                  placeholder="Ex.: tempo estendido, prova oral, redução de itens, leitura em voz alta." />
                <SugChips items={sug.adaptAval} onPick={pickInto("adaptacoesAvaliativas")} />
              </div>
              <div>
                <label style={labelCss}>Metodologias e estratégias</label>
                <textarea style={{ ...inputCss, minHeight: 70, resize: "vertical" }}
                  value={draft.metodologias} onChange={(e) => set("metodologias", e.target.value)}
                  placeholder="DUA, TEACCH, PECS, rotina visual, ensino estruturado, mediação por pares." />
                <SugChips items={sug.metodologias} onPick={pickInto("metodologias")} />
              </div>
              <div>
                <label style={labelCss}>Recursos de apoio</label>
                <textarea style={{ ...inputCss, minHeight: 70, resize: "vertical" }}
                  value={draft.recursosApoio} onChange={(e) => set("recursosApoio", e.target.value)}
                  placeholder="Pictogramas, fones abafadores, material concreto, tecnologia assistiva, mediadora." />
                <SugChips items={sug.recursos} onPick={pickInto("recursosApoio")} />
              </div>
            </div>
          </div>

          {/* 6. Avaliação */}
          <div style={sectionCss}>
            <div style={sectionTitleCss}><span style={sectionBadge}>6</span>Avaliação contínua e revisão</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
              <div>
                <label style={labelCss}>Formas de avaliação</label>
                <textarea style={{ ...inputCss, minHeight: 60, resize: "vertical" }}
                  value={draft.formasAvaliacao} onChange={(e) => set("formasAvaliacao", e.target.value)}
                  placeholder="Observação, portfólio, rubrica, registro de evidências, autoavaliação." />
                <SugChips items={sug.formasAval} onPick={pickInto("formasAvaliacao")} />
              </div>
              <div>
                <label style={labelCss}>Periodicidade de revisão</label>
                <select style={inputCss} value={draft.periodicidadeRevisao} onChange={(e) => set("periodicidadeRevisao", e.target.value)}>
                  <option>Bimestral</option>
                  <option>Trimestral</option>
                  <option>Semestral</option>
                  <option>Anual</option>
                </select>
              </div>
            </div>
          </div>

          {/* 7. Equipe */}
          <div style={sectionCss}>
            <div style={sectionTitleCss}>
              <span style={sectionBadge}>7</span>Equipe responsável
              <button onClick={addEquipe} className="inc-btn-ghost" style={{ marginLeft: "auto" }}>
                <Plus size={12} /> Adicionar membro
              </button>
            </div>
            {draft.equipe.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Inclua professor(a) regente, coordenação, AEE, terapeutas e mediadores.</p>
            )}
            {draft.equipe.map((m, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr auto", gap: 8, marginBottom: 6 }}>
                <input style={inputCss} value={m.nome} onChange={(e) => updEquipe(i, { nome: e.target.value })} placeholder="Nome" />
                <input style={inputCss} value={m.funcao} onChange={(e) => updEquipe(i, { funcao: e.target.value })} placeholder="Função (ex.: Profa. regente, AEE, Fono)" />
                <button onClick={() => delEquipe(i)} style={{ background: "transparent", border: "none", color: "#C62B2B", cursor: "pointer" }} aria-label="Remover"><Trash2 size={14} /></button>
              </div>
            ))}
            {draft.equipe.length > 0 && (
              <SugChips items={sug.equipeFuncao} onPick={(s) => {
                const idx = draft.equipe.length - 1;
                updEquipe(idx, { funcao: s });
              }} />
            )}
          </div>

          {/* 8. Família */}
          <div style={sectionCss}>
            <div style={sectionTitleCss}><span style={sectionBadge}>8</span>Participação da família</div>
            <label style={labelCss}>Como a família participa do processo</label>
            <textarea style={{ ...inputCss, minHeight: 60, resize: "vertical", marginBottom: 10 }}
              value={draft.familiaParticipacao} onChange={(e) => set("familiaParticipacao", e.target.value)}
              placeholder="Reuniões, comunicação semanal, apoio em rotinas, encaminhamentos terapêuticos." />
            <SugChips items={sug.familiaPart} onPick={pickInto("familiaParticipacao")} />
            <label style={labelCss}>Acordos firmados com a família</label>
            <textarea style={{ ...inputCss, minHeight: 50, resize: "vertical" }}
              value={draft.acordosFamilia} onChange={(e) => set("acordosFamilia", e.target.value)}
              placeholder="Compromissos de ambas as partes, frequência de devolutivas, protocolo de crise." />
            <SugChips items={sug.acordosFam} onPick={pickInto("acordosFamilia")} />
          </div>

          {/* Assinaturas */}
          <div style={sectionCss}>
            <div style={sectionTitleCss}><Sparkles size={14} /> Assinaturas (impressão)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelCss}>Professor(a) regente</label>
                <input style={inputCss} value={draft.assinaturas.professorRegente}
                  onChange={(e) => set("assinaturas", { ...draft.assinaturas, professorRegente: e.target.value })} placeholder="Nome completo" />
              </div>
              <div>
                <label style={labelCss}>Coordenação pedagógica</label>
                <input style={inputCss} value={draft.assinaturas.coordenacao}
                  onChange={(e) => set("assinaturas", { ...draft.assinaturas, coordenacao: e.target.value })} placeholder="Nome completo" />
              </div>
              <div>
                <label style={labelCss}>Profissional do AEE</label>
                <input style={inputCss} value={draft.assinaturas.aee}
                  onChange={(e) => set("assinaturas", { ...draft.assinaturas, aee: e.target.value })} placeholder="Nome completo" />
              </div>
              <div>
                <label style={labelCss}>Família / responsável</label>
                <input style={inputCss} value={draft.assinaturas.familia}
                  onChange={(e) => set("assinaturas", { ...draft.assinaturas, familia: e.target.value })} placeholder="Nome completo" />
              </div>
            </div>
          </div>

          <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "10px 0 0" }}>
            Conforme <b>Lei 14.254/2021</b> · <b>Lei 13.146/2015 (LBI)</b> · <b>Lei 12.764/2012 (PNPDTEA)</b> · BNCC.
          </p>
        </div>

        <div className="inc-modal-foot">
          <span className="legal">{dirty ? "Alterações pendentes" : draft.atualizadoEm ? `Salvo em ${new Date(draft.atualizadoEm).toLocaleString("pt-BR")}` : "Não salvo ainda"}</span>
          <button className="inc-btn-ghost" onClick={imprimir}><Printer size={14} /> Imprimir / PDF</button>
          <button className="btn btn-primary" onClick={salvar} disabled={!dirty}>
            <Save size={14} /> Salvar PEI
          </button>
        </div>
      </div>
    </div>
  );
}

export { FileText };