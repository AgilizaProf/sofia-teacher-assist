import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { PEIBnccPanel } from "./PEIBnccPanel";
import { componentePadrao, fraseServeAoNivel, type NivelBncc } from "@/lib/pei/bncc";
import { condicoesDoAluno, sugestoesDoCid } from "@/lib/pei/sugestoesPorCid";

// Catálogo de sugestões rápidas por campo do PEI.
// As frases foram redigidas para serem clicáveis e inseridas no texto.
// Os códigos entre parênteses são da BNCC (EI = objetivos de aprendizagem da
// Educação Infantil; EF/EM = habilidades). Além destas frases, os campos
// pedagógicos mostram a lista completa da BNCC do ano do aluno (PEIBnccPanel).
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
  "aval_obs:leitura_escrita": [
    "Reconhece e nomeia as letras do próprio nome.",
    "Faz correspondência som-letra com apoio.",
    "Lê palavras simples (sílabas canônicas) com mediação.",
    "Produz escrita espontânea em nível pré-silábico/silábico.",
    "Apresenta defasagem na leitura em relação ao ano de referência.",
  ],
  "aval_obs:raciocinio_logico": [
    "Conta oralmente e associa quantidade ao numeral até 10 com apoio.",
    "Resolve problemas simples com material concreto.",
    "Identifica e continua padrões e sequências.",
    "Compreende noções de mais/menos, maior/menor.",
    "Necessita de manipuláveis para operações básicas.",
  ],
  "aval_obs:motor_fino": [
    "Segura o lápis com preensão ainda em desenvolvimento.",
    "Recorta com tesoura seguindo linha reta com apoio.",
    "Realiza traçado e cobertura de letras com mediação.",
    "Encaixa e manipula peças pequenas com precisão crescente.",
    "Cansa-se rápido em tarefas de escrita prolongada.",
  ],
  "aval_obs:motor_grosso": [
    "Corre, salta e sobe degraus com equilíbrio adequado.",
    "Participa de brincadeiras motoras com os pares.",
    "Apresenta descoordenação em movimentos amplos.",
    "Necessita de apoio para equilíbrio em circuitos.",
    "Demonstra boa consciência corporal no espaço.",
  ],
  "aval_obs:linguagem_oral": [
    "Comunica necessidades por frases curtas.",
    "Amplia vocabulário em contextos de interesse.",
    "Usa CAA/pictogramas para se comunicar.",
    "Apresenta fala pouco inteligível para desconhecidos.",
    "Compreende ordens simples; ordens complexas com apoio.",
  ],
  "aval_obs:atencao": [
    "Mantém foco por curtos períodos com mediação.",
    "Distrai-se com estímulos do ambiente.",
    "Sustenta atenção em atividades de interesse.",
    "Necessita de pausas e tarefas fracionadas.",
    "Melhora o foco com rotina visual e antecipação.",
  ],
  "aval_obs:memoria": [
    "Recupera rotinas e sequências conhecidas.",
    "Memoriza com apoio de pistas visuais.",
    "Retém informação nova com repetição espaçada.",
    "Esquece instruções de múltiplos passos.",
    "Lembra de combinados quando há suporte visual.",
  ],
  "aval_obs:socializacao": [
    "Interage com 1 ou 2 colegas em situações estruturadas.",
    "Participa de brincadeiras em grupo com mediação.",
    "Respeita combinados e turnos com lembretes.",
    "Prefere brincar sozinho(a); aproxima-se com apoio.",
    "Demonstra empatia e busca o adulto de referência.",
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
  "meta_texto:Cognitiva/Pedagógica": [
    "Reconhecer e nomear todas as letras do alfabeto em 8 semanas.",
    "Realizar contagem até 20 com apoio de material concreto.",
    "Escrever o próprio nome de forma legível sem modelo.",
    "Compreender enunciados curtos lidos em voz alta pelo adulto.",
    "Resolver situações-problema simples (adição/subtração) com material manipulável.",
    "Permanecer engajado(a) em atividade dirigida por pelo menos 15 minutos.",
  ],
  "meta_texto:Social e emocional": [
    "Cumprimentar colegas e professora ao chegar à sala.",
    "Aguardar a sua vez em pelo menos 3 momentos coletivos por dia.",
    "Identificar e nomear emoções básicas (alegria, raiva, tristeza, medo).",
    "Pedir ajuda ao adulto em situações de desconforto, sem crise.",
    "Participar de brincadeiras em grupo por pelo menos 10 minutos.",
    "Respeitar combinados da turma com apoio visual de lembretes.",
  ],
  "meta_texto:Motora": [
    "Realizar o traçado de letras do próprio nome com preensão adequada.",
    "Recortar figuras simples seguindo a linha com tesoura adaptada.",
    "Subir e descer escadas alternando os pés com apoio mínimo.",
    "Realizar atividades de encaixe e empilhamento com autonomia.",
    "Manusear lápis e materiais escolares com pinça funcional.",
    "Participar de jogos motores coletivos respeitando regras simples.",
  ],
  "meta_texto:Comunicação e linguagem": [
    "Solicitar ajuda verbalmente ou via CAA quando necessário.",
    "Ampliar vocabulário expressivo em pelo menos 20 palavras novas no semestre.",
    "Responder a perguntas simples (sim/não, o quê, quem) em sala.",
    "Usar prancha de comunicação alternativa em 3 contextos diários.",
    "Iniciar interação verbal com um colega por dia em momento estruturado.",
    "Narrar oralmente uma sequência de 3 fatos vivenciados na rotina.",
  ],
  "meta_texto:Autonomia e independência": [
    "Organizar a própria mochila ao final do dia, sem auxílio.",
    "Ir ao banheiro de forma independente, comunicando a necessidade.",
    "Alimentar-se sozinho(a) durante o lanche e o almoço.",
    "Vestir e tirar o agasalho de forma autônoma.",
    "Cumprir a rotina visual da sala sem mediação constante.",
    "Guardar materiais utilizados após cada atividade.",
  ],
  meta_indicador: [
    "Registrado em 4 de 5 observações ao longo da semana.",
    "Avaliado por meio de rubrica preenchida quinzenalmente.",
    "Evidência em portfólio de produções do aluno.",
    "Relato consistente da família e do AEE.",
  ],

  // ===== Versões para Educação Infantil (0 a 5 anos) =====
  "ei:potencialidades": [
    "Demonstra curiosidade ativa por objetos, sons e texturas novas.",
    "Imita gestos, sons e expressões dos adultos de referência.",
    "Engaja-se em brincadeiras de faz de conta com mediação.",
    "Reconhece rostos familiares e responde com afeto.",
    "Explora o espaço da sala com autonomia crescente.",
  ],
  "ei:interessesMotivacoes": [
    "Demonstra interesse por músicas, cantigas e brincadeiras de roda.",
    "Engaja-se com livros de imagens, fantoches e dedoches.",
    "Gosta de brincadeiras sensoriais (água, areia, massinha, tinta).",
    "Motiva-se com personagens de desenhos preferidos.",
    "Demonstra interesse por animais, carrinhos ou bonecas.",
  ],
  "ei:objetivosLongoPrazo": [
    "Comunicar-se com colegas e adultos, fazendo-se compreender por gestos, palavras ou CAA (EI02EO04 / EI03EO04).",
    "Demonstrar progressiva independência no cuidado do próprio corpo: alimentação, higiene e vestir (EI02CG04 / EI03CG04).",
    "Ampliar as relações com os colegas, participando e cooperando nas brincadeiras com mediação reduzida (EI03EO03).",
    "Expressar-se livremente por desenho, pintura, colagem e modelagem (EI03TS02).",
    "Demonstrar imagem positiva de si e confiança para enfrentar desafios da rotina (EI02EO02).",
  ],
  "ei:objetivosAEE": [
    "Estimular a comunicação alternativa por meio do brincar.",
    "Apoiar o desenvolvimento sensório-motor com atividades lúdicas.",
    "Favorecer a autorregulação por meio de rotinas previsíveis e visuais.",
    "Promover a interação com pares em pequenos grupos.",
  ],
  "ei:meta_texto:Cognitiva/Pedagógica": [
    "Contar oralmente objetos e pessoas em situações do dia a dia (EI02ET07).",
    "Encaixar peças em quebra-cabeças de 4 a 8 peças com autonomia.",
    "Imitar sequências curtas de movimentos em brincadeiras dirigidas.",
    "Demonstrar interesse e atenção ao ouvir histórias, acompanhando as ilustrações (EI02EF03).",
    "Permanecer em atividade dirigida por pelo menos 8 minutos.",
    "Classificar objetos por cor, forma e tamanho em situações lúdicas (EI02ET05).",
  ],
  "ei:meta_texto:Social e emocional": [
    "Brincar lado a lado com um colega por pelo menos 5 minutos.",
    "Despedir-se do(a) responsável na entrada sem crise prolongada.",
    "Reconhecer e apontar emoções básicas em figuras ou espelho.",
    "Respeitar regras básicas de convívio nas brincadeiras, como aguardar a vez (EI02EO06).",
    "Aceitar o toque afetuoso de adultos de referência.",
    "Participar de momentos de roda com apoio do adulto.",
  ],
  "ei:meta_texto:Motora": [
    "Deslocar-se no espaço (pular, saltar, dançar) seguindo orientações (EI02CG03).",
    "Desenhar, pintar, rasgar e folhear com controle progressivo das mãos (EI02CG05).",
    "Empilhar 4 a 6 blocos com coordenação adequada à idade.",
    "Encaixar peças grandes (LEGO Duplo, blocos de montar).",
    "Andar em diferentes superfícies mantendo o equilíbrio.",
    "Manusear colher e copo durante o lanche com autonomia.",
  ],
  "ei:meta_texto:Comunicação e linguagem": [
    "Apontar para o que deseja em vez de chorar ou gritar.",
    "Dialogar com crianças e adultos expressando desejos e necessidades com 5 a 10 palavras ou sinais (EI02EF01).",
    "Responder ao próprio nome olhando para o adulto.",
    "Identificar sons e rimas em cantigas de roda, acompanhando com gestos (EI02EF02).",
    "Usar prancha CAA com 4 a 6 figuras em rotinas (banheiro, água, ajuda).",
    "Imitar sons de animais e objetos em brincadeiras dirigidas.",
  ],
  "ei:meta_texto:Autonomia e independência": [
    "Comunicar a necessidade de ir ao banheiro (gesto, palavra ou CAA).",
    "Alimentar-se sozinho(a) com colher, com mínima ajuda.",
    "Calçar e descalçar sapatos com velcro de forma autônoma.",
    "Guardar brinquedos no lugar combinado após a brincadeira.",
    "Lavar as mãos seguindo a sequência visual da rotina (EI03CG04).",
    "Beber água na garrafinha sem auxílio.",
  ],

  // ===== Objetivos e metas com códigos da BNCC — Fundamental I =====
  "fund1:objetivosLongoPrazo": [
    "Consolidar a alfabetização: escrever palavras e frases de forma alfabética (EF01LP02) e ler palavras de uso frequente com precisão (EF12LP01).",
    "Localizar informações explícitas em textos curtos do cotidiano (EF15LP03).",
    "Expressar-se oralmente com clareza nas conversas da turma, respeitando os turnos de fala (EF15LP09 / EF15LP11).",
    "Construir fatos básicos da adição e da subtração e usá-los para resolver problemas (EF02MA05 / EF02MA06).",
    "Participar de brincadeiras e jogos coletivos respeitando as regras e os colegas (EF12EF01).",
    "Desenvolver autonomia na rotina escolar e na organização dos próprios materiais.",
  ],
  "fund1:meta_texto:Cognitiva/Pedagógica": [
    "Segmentar oralmente palavras em sílabas (EF01LP06).",
    "Relacionar sílabas e sons à sua representação escrita (EF01LP08).",
    "Escrever palavras e frases de forma alfabética, por ditado ou espontaneamente (EF01LP02).",
    "Ler palavras de uso frequente com precisão na decodificação (EF12LP01).",
    "Contar quantidades usando estratégias como o pareamento e agrupamentos (EF01MA02).",
    "Resolver problemas de adição e subtração com números de até dois algarismos, com material concreto (EF01MA08).",
    "Identificar e nomear círculo, quadrado, retângulo e triângulo (EF01MA14).",
  ],
  "fund1:meta_texto:Comunicação e linguagem": [
    "Expressar-se em situações de conversa com clareza e tom de voz audível (EF15LP09).",
    "Escutar com atenção as falas da professora e dos colegas, fazendo perguntas sobre o tema (EF15LP10).",
    "Respeitar os turnos de fala nas conversas da turma (EF15LP11).",
    "Usar prancha de comunicação alternativa em 3 contextos diários.",
    "Narrar oralmente uma sequência de 3 fatos vivenciados na rotina.",
  ],
  "fund1:meta_texto:Motora": [
    "Experimentar elementos básicos da ginástica (equilíbrios, saltos, giros) com apoio (EF12EF07).",
    "Participar de brincadeiras e jogos populares respeitando regras simples (EF12EF01 / EF35EF01).",
    "Realizar o traçado de letras do próprio nome com preensão adequada.",
    "Recortar figuras simples seguindo a linha com tesoura adaptada.",
  ],
  "fund1:aval_obs:leitura_escrita": [
    "Segmenta oralmente palavras em sílabas com apoio (EF01LP06).",
    "Escreve palavras de forma alfabética com mediação (EF01LP02).",
    "Lê palavras de uso frequente com apoio (EF12LP01).",
    "Localiza informações explícitas em textos curtos lidos pelo adulto (EF15LP03).",
    "Apresenta defasagem na leitura em relação ao ano de referência.",
  ],
  "fund1:aval_obs:raciocinio_logico": [
    "Conta quantidades com estratégias de pareamento e agrupamento (EF01MA02).",
    "Compõe e decompõe números de até duas ordens com material manipulável (EF01MA07).",
    "Resolve problemas simples de adição e subtração com material concreto (EF01MA08).",
    "Necessita de manipuláveis para operações básicas.",
  ],

  // ===== Objetivos e metas com códigos da BNCC — Fundamental II =====
  "fund2:objetivosLongoPrazo": [
    "Ler e compreender textos de diferentes gêneros, identificando o fato central de notícias e reportagens (EF69LP03).",
    "Produzir textos adequados à situação de comunicação, com apoio de roteiro (EF69LP07).",
    "Participar de discussões da turma respeitando os turnos de fala (EF69LP15).",
    "Resolver problemas com números naturais usando estratégias variadas e calculadora quando necessário (EF06MA03).",
    "Desenvolver organização e autonomia nos estudos (agenda, prazos e materiais).",
  ],
  "fund2:meta_texto:Cognitiva/Pedagógica": [
    "Identificar o fato central de uma notícia curta com apoio de perguntas-guia (EF69LP03).",
    "Comparar, ordenar, ler e escrever números naturais e decimais usando a reta numérica (EF06MA01).",
    "Resolver problemas com números naturais por estratégias variadas (EF06MA03).",
    "Produzir um parágrafo com planejamento prévio em organizador gráfico (EF69LP07).",
    "Permanecer engajado(a) em atividade dirigida por pelo menos 20 minutos.",
  ],

  // ===== Ensino Médio =====
  "em:objetivosLongoPrazo": [
    "Analisar o funcionamento das linguagens para interpretar e produzir textos de diversas semioses (EM13LGG103).",
    "Relacionar o texto às suas condições de produção e circulação na leitura e na escrita (EM13LP01).",
    "Analisar tabelas e gráficos de pesquisas divulgadas na mídia (EM13MAT102).",
    "Construir um projeto de vida com metas de curto e médio prazo.",
  ],

  // ===== Adaptações — Educação Infantil =====
  "ei:adaptacoesConteudo": [
    "Trabalhar campos de experiência da BNCC por meio do brincar.",
    "Priorizar conteúdos sensoriais, corporais e da rotina diária.",
    "Reduzir tempo de exposição a atividades dirigidas (5–10 min).",
    "Apresentar o mesmo conceito em múltiplas linguagens (música, corpo, artes).",
  ],
  "ei:adaptacoesMetodologicas": [
    "Usar histórias, fantoches e dedoches para introduzir conceitos.",
    "Apoiar a rotina com painel visual (chegada, roda, lanche, parque, saída).",
    "Oferecer modelagem do adulto antes de qualquer demanda.",
    "Trabalhar em pequenos grupos ou duplas para reduzir estímulos.",
    "Antecipar transições com música ou objeto de referência.",
  ],
  "ei:adaptacoesAvaliacao": [
    "Avaliar pela observação contínua e registro fotográfico das vivências.",
    "Construir portfólio com produções e falas do(a) aluno(a).",
    "Usar rubrica simples baseada nos campos de experiência da BNCC.",
    "Evitar avaliações formais; priorizar registros narrativos.",
  ],
  "ei:adaptacoesTempo": [
    "Reduzir tempo das atividades dirigidas para 5–10 minutos.",
    "Permitir pausas sensoriais entre uma atividade e outra.",
    "Respeitar o ritmo da criança nas trocas, alimentação e higiene.",
  ],
  "ei:adaptacoesEspaco": [
    "Garantir cantinho calmo com almofadas e materiais sensoriais.",
    "Organizar a sala com cantos temáticos (leitura, casinha, blocos).",
    "Demarcar visualmente lugares de cada criança e materiais.",
    "Reduzir poluição visual nas paredes próximas ao painel da rotina.",
  ],
  "ei:estrategiasArea": [
    "Eu e o outro: rodas de conversa curtas com mediação afetiva.",
    "Corpo, gestos e movimentos: circuitos motores com apoio visual.",
    "Traços, sons, cores e formas: artes com materiais sensoriais variados.",
    "Escuta, fala, pensamento e imaginação: leitura compartilhada diária.",
    "Espaços, tempos, quantidades, relações: brincadeiras com materiais concretos.",
  ],
  "ei:estrategiasInclusaoColetiva": [
    "Brincadeiras cooperativas em vez de competitivas.",
    "Pares-tutor com rodízio nas brincadeiras dirigidas.",
    "Combinados da turma também em formato visual com pictogramas.",
    "Histórias que abordem diversidade e diferenças.",
  ],

  // ===== Adaptações — Fundamental I (1º a 5º ano) =====
  "fund1:adaptacoesConteudo": [
    "Garantir consolidação da alfabetização antes de avançar para textos longos.",
    "Reduzir quantidade de exercícios mantendo o objetivo de aprendizagem.",
    "Trabalhar fatos básicos das operações com material dourado e ábaco.",
    "Priorizar leitura e produção de textos do cotidiano (bilhete, lista, receita).",
    "Retomar conteúdos de anos anteriores quando necessário.",
  ],
  "fund1:adaptacoesMetodologicas": [
    "Dividir tarefas longas em etapas curtas com checklist visual.",
    "Usar material concreto em todas as introduções de matemática.",
    "Aplicar leitura compartilhada antes da leitura individual.",
    "Modelar a resolução de problemas em voz alta antes da prática.",
    "Usar jogos pedagógicos para fixar conceitos.",
  ],
  "fund1:adaptacoesAvaliacao": [
    "Permitir prova oral quando a escrita for barreira.",
    "Reduzir número de questões mantendo as principais habilidades.",
    "Oferecer apoio na leitura dos enunciados quando solicitado.",
    "Avaliar por meio de portfólio e observação contínua.",
    "Usar provas com fontes ampliadas e mais espaço para resposta.",
  ],
  "fund1:adaptacoesTempo": [
    "Conceder tempo adicional de 50% em provas e tarefas.",
    "Permitir pausas a cada 15–20 minutos de atividade.",
    "Dividir avaliações longas em mais de um dia.",
  ],
  "fund1:adaptacoesEspaco": [
    "Posicionar próximo(a) ao quadro e à professora.",
    "Sentar longe de portas e janelas para reduzir distração.",
    "Disponibilizar canto calmo na sala para autorregulação.",
  ],
  "fund1:estrategiasArea": [
    "Português: leitura em voz alta com modelo do adulto antes da leitura individual.",
    "Matemática: uso de material dourado e ábaco em todas as operações.",
    "Ciências: experimentação concreta antes da sistematização escrita.",
    "História/Geografia: linha do tempo visual e mapas táteis.",
    "Arte: oferecer pinça/engrossador para o manuseio de materiais finos.",
  ],
  "fund1:estrategiasInclusaoColetiva": [
    "Tutoria entre pares com rodízio quinzenal.",
    "Trabalhos em duplas heterogêneas com função definida para cada um.",
    "Combinados da turma também em formato visual.",
    "Atividades cooperativas em vez de competitivas.",
  ],

  // ===== Adaptações — Fundamental II (6º a 9º ano) =====
  "fund2:adaptacoesConteudo": [
    "Identificar conteúdos essenciais por componente e priorizá-los.",
    "Reduzir quantidade de exercícios mantendo o nível de complexidade central.",
    "Oferecer materiais de apoio (resumos, mapas mentais, glossários).",
    "Trabalhar gêneros textuais funcionais para a vida adulta.",
    "Retomar pré-requisitos do conteúdo quando necessário.",
  ],
  "fund2:adaptacoesMetodologicas": [
    "Antecipar a aula com roteiro escrito da sequência didática.",
    "Usar mapas mentais e organizadores gráficos antes da escrita extensa.",
    "Aplicar metodologias ativas em pequenos grupos com papéis definidos.",
    "Reduzir cópia do quadro; oferecer material impresso ou digital.",
    "Usar recursos audiovisuais e simulações para conceitos abstratos.",
  ],
  "fund2:adaptacoesAvaliacao": [
    "Reduzir número de questões mantendo as habilidades essenciais.",
    "Permitir avaliações em formatos alternativos (oral, seminário, vídeo).",
    "Oferecer consulta a glossário ou caderno em parte da prova.",
    "Avaliar produção em etapas, com devolutivas formativas.",
    "Aplicar avaliações em ambiente com menor estímulo sensorial.",
  ],
  "fund2:adaptacoesTempo": [
    "Conceder tempo adicional de 50% em provas e trabalhos.",
    "Dividir provas longas em dois dias.",
    "Permitir pausas programadas em avaliações longas.",
    "Estabelecer prazos intermediários para entregas grandes.",
  ],
  "fund2:adaptacoesEspaco": [
    "Posicionar em lugar de baixo fluxo de circulação.",
    "Permitir o uso de fone abafador em momentos de leitura/prova.",
    "Disponibilizar sala paralela para provas, quando necessário.",
  ],
  "fund2:estrategiasArea": [
    "Língua Portuguesa: produção textual em etapas (planejamento, escrita, revisão).",
    "Matemática: uso de calculadora em fatos básicos para focar no raciocínio.",
    "Ciências da Natureza: laboratório virtual e simulações antes da formalização.",
    "Ciências Humanas: linhas do tempo e mapas conceituais visuais.",
    "Língua Inglesa: foco em vocabulário funcional e expressões do cotidiano.",
  ],
  "fund2:estrategiasInclusaoColetiva": [
    "Trabalhos em grupos cooperativos com papéis rotativos.",
    "Projetos interdisciplinares com produtos finais variados (vídeo, podcast, cartaz).",
    "Combinados da turma revisitados a cada bimestre.",
    "Mediação de conflitos com escuta ativa e contratos pedagógicos.",
  ],

  // ===== Adaptações — Ensino Médio =====
  "em:adaptacoesConteudo": [
    "Priorizar competências da BNCC e do itinerário formativo escolhido.",
    "Identificar conteúdos essenciais por área e reduzir o supérfluo.",
    "Conectar conteúdos a projetos de vida e ao mundo do trabalho.",
    "Oferecer materiais de aprofundamento ou de retomada conforme demanda.",
  ],
  "em:adaptacoesMetodologicas": [
    "Usar metodologias ativas (sala de aula invertida, ABP, estudo de caso).",
    "Disponibilizar material em formato digital acessível previamente.",
    "Trabalhar pesquisa orientada com fontes confiáveis e roteiro estruturado.",
    "Apoiar a produção textual com mapas mentais e revisão em pares.",
    "Estimular autorregulação com agenda, metas e auto-monitoramento.",
  ],
  "em:adaptacoesAvaliacao": [
    "Permitir formatos alternativos: seminário, ensaio, projeto, prova oral.",
    "Reduzir número de questões mantendo o nível de exigência cognitiva.",
    "Oferecer simulados com correção formativa antes do ENEM e vestibulares.",
    "Avaliar por meio de portfólio e produções autorais.",
  ],
  "em:adaptacoesTempo": [
    "Conceder tempo adicional de 50% em provas e simulados.",
    "Dividir avaliações extensas em dois dias.",
    "Negociar cronograma de entregas em períodos de maior demanda.",
  ],
  "em:adaptacoesEspaco": [
    "Sala separada para provas, quando necessário.",
    "Permitir uso de fone abafador e quebra de estímulos visuais.",
    "Disponibilizar mobiliário adequado e tomada para tecnologia assistiva.",
  ],
  "em:estrategiasArea": [
    "Linguagens: produção em múltiplos suportes (texto, vídeo, podcast).",
    "Matemática: foco em raciocínio com apoio de calculadora para fatos básicos.",
    "Ciências da Natureza: laboratório virtual e modelos 3D.",
    "Ciências Humanas: mapas conceituais, linhas do tempo e debates estruturados.",
    "Projeto de vida: mentorias e planejamento de curto/médio prazo.",
  ],
  "em:estrategiasInclusaoColetiva": [
    "Trabalhos em grupos cooperativos com avaliação por pares.",
    "Projetos integradores entre áreas e itinerários formativos.",
    "Roda de conversa periódica sobre clima de turma e convivência.",
    "Apoio entre pares para preparação de avaliações externas.",
  ],
};

type Props = {
  fieldKey: keyof typeof PEI_SUGGESTIONS | string;
  fallbackKey?: string;
  prefix?: string;
  onPick: (text: string) => void;
  label?: string;
  /**
   * Mostra também as habilidades da BNCC do ano do aluno. `campo` escolhe o
   * componente que abre primeiro (ver componentePadrao); `nivel` vem da série.
   */
  bncc?: { campo: string; nivel: NivelBncc | null };
  /** CID e diagnóstico do aluno: trazem sugestões próprias da condição (TEA, TDAH...). */
  cid?: string;
  diagnostico?: string;
};

/**
 * Caixa de sugestões rápidas, oculta por padrão. Aparece ao clicar em "Sugestões".
 * Ao clicar em um chip, o texto é enviado para `onPick` (que normalmente faz append
 * no campo de texto do PEI).
 */
export function PEISuggestions({ fieldKey, fallbackKey, prefix, onPick, label = "Sugestões rápidas", bncc, cid, diagnostico }: Props) {
  const [open, setOpen] = useState(false);
  const prefixed = prefix ? PEI_SUGGESTIONS[`${prefix}${fieldKey}`] : undefined;
  const direct = PEI_SUGGESTIONS[fieldKey];
  const fb = fallbackKey ? (prefix ? PEI_SUGGESTIONS[`${prefix}${fallbackKey}`] : undefined) || PEI_SUGGESTIONS[fallbackKey] : undefined;
  // Frases prontas com código da BNCC só aparecem se o código for do ano do aluno.
  const opts = (prefixed || direct || fb || []).filter((o) => fraseServeAoNivel(o, bncc?.nivel));
  // A BNCC aparece nos campos ligados a um componente. Sem a série do aluno,
  // abre no 1º ano e pede para a professora escolher o ano.
  const nivelBase: NivelBncc = bncc?.nivel || { etapa: "ef", ano: 1 };
  const nivelBncc = bncc && componentePadrao(bncc.campo, nivelBase.etapa) ? nivelBase : null;
  // Sugestões da condição do aluno (pelo CID ou pelo diagnóstico escrito).
  const doCid = sugestoesDoCid(fieldKey, condicoesDoAluno(cid, diagnostico));
  if (opts.length === 0 && !nivelBncc && doCid.length === 0) return null;
  const chip: React.CSSProperties = {
    fontSize: 11,
    padding: "4px 9px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "#fff",
    color: "var(--text)",
    cursor: "pointer",
    textAlign: "left",
    maxWidth: "100%",
  };

  return (
    <div style={{ marginTop: 4 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pei-sug-toggle"
        style={{
          fontSize: 11,
          padding: "3px 8px",
          borderRadius: 999,
          border: "1px dashed var(--border)",
          background: open ? "var(--accent-soft)" : "#fff",
          color: open ? "#096746" : "var(--muted)",
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
          {doCid.map((g) => (
            <div key={g.condicao} style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#7A3E9D", width: "100%" }}>
                Para {g.nome}
                {cid ? ` (CID ${cid.replace(/^\s*cid\s*/i, "")})` : ""}:
              </span>
              {g.frases.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => onPick(o)}
                  title="Clique para inserir no campo"
                  className="pei-chip"
                  style={{ ...chip, borderColor: "#D9C2EA", background: "#FBF6FF" }}
                >
                  + {o}
                </button>
              ))}
            </div>
          ))}
          {open && nivelBncc && bncc && (
            <PEIBnccPanel campo={bncc.campo} nivel={nivelBncc} incerto={!bncc.nivel} onPick={onPick} />
          )}
          {(nivelBncc || doCid.length > 0) && opts.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", width: "100%" }}>Outras sugestões:</span>
          )}
          {opts.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onPick(o)}
              title="Clique para inserir no campo"
              className="pei-chip"
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
