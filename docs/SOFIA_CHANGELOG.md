# Changelog da Constituição da Sofia

## v1.3 — 2026-11-16

- Nova regra: nunca usar LaTeX nem cifrões em fórmulas. Frações, contas, potências e raízes são escritas como no caderno (½, 3 × 4, x², √16).
- Rede de segurança: o que ainda vier em LaTeX ($\frac{1}{2}$, \(x\), $$…$$) é convertido em texto comum no chat, nas notificações e nas atividades geradas (`src/lib/sofia/mathText.ts`).
- Uma Constituição só: a das edge functions (PEI, pareceres, relatórios, atividades) estava na v1.1 e resumida. Agora é cópia exata da do app, com teste que falha se divergirem (`src/lib/sofia/constituicaoSync.test.ts`, `client-constitution_test.ts`).
- Princípio 6 (Transparência) sem contradição: documentos formais para o(a) educador(a) ou a escola terminam com o bloco de fontes; parecer, relatório para as famílias, bilhete e respostas em JSON não levam o bloco nem citam fontes internas ("com base nos registros"). Princípios 4, 5 e 7 seguem a mesma regra.
- Regras que só o chat tinha passam para a Constituição: nunca inventar códigos BNCC ("confira o código na BNCC") e nunca usar LaTeX.
- Formato: cada item do bloco de transparência, cada passo e cada opção em uma linha. Tabelas aparecem como lista.
- Mapa do app: Diário de bordo e Trilhas semestrais (dentro do Planejar), Questões (antes Simulados; /simulados continua abrindo), Minha Biblioteca, Cadernos prontos (acesso a partir de 12/03/2027) e Para confirmar (mensagens do WhatsApp, recebimento ainda não ligado).
- Chat: quebras de linha, links (YouTube, sites) e tabelas aparecem certos; links internos abrem na mesma aba; botão Parar e tempo limite de 90 s; trocar de conversa não mistura respostas; "Copiar" leva texto limpo; botões de resposta rápida aceitam opções numeradas e em negrito e aparecem também nas notificações.
- Pareceres e relatórios: a limpeza de texto não muda mais contas e comparações ("7 > 5", "8 - 3 = 5", "(< 50%)", "LP / MA").

## v1.2 — 2026-11-02

- Novo bloco "Como pensar antes de responder": entender o objetivo, usar o contexto real, perguntar só o essencial e revisar fatos, contas e códigos BNCC.
- Padrões de qualidade para plano de aula, atividade e parecer.
- A Sofia recebe a data de hoje (horário de Brasília) e o primeiro nome do(a) educador(a).
- Nunca inventa links de vídeos: entrega link de busca do YouTube.
- Mapa do app atualizado para o visual Painel (turmas e alunos em Configurações, Jogos e atividades interativas, Simulados, Indique e ganhe, Baixar o app).
- Instrução para o bloco [OPÇÕES] (botões de resposta rápida), que antes nunca era pedido à IA.
- Validador: removidas trocas automáticas que quebravam frases ("não consegue", "atrasado", "incapaz"); avisos de BNCC/transparência deixam de aparecer para a professora.

## v1.0 — 2026-05-03

- Versão inicial.
- 7 princípios definidos.
- Blocklist inicial com 15 padrões anticapacitistas.
