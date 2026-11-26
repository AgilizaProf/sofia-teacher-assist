// Categorias de erro de escrita e a atividade de fixação de cada uma.
//
// A Sofia lê o texto da criança e classifica cada erro em uma destas
// categorias. Para cada categoria existe um banco de exercícios pronto;
// a atividade de cada aluno junta os exercícios das categorias em que ELE
// errou com as palavras do texto dele. Não usa IA nem gasta créditos.
import type { ErroEscrita } from "./tipos";

export type Categoria = {
  id: string;
  nome: string;
  /** Explicação curta para a professora (aparece na correção). */
  oQueE: string;
  /** Lembrete escrito para a criança (aparece na atividade). */
  lembrete: string;
} & (
  | {
      tipo: "lacuna";
      /** Opções para completar. "" = não precisa de letra. */
      opcoes: string[];
      /** Palavras ou frases com a parte a completar entre colchetes: "ca[m]po". */
      itens: string[];
    }
  | { tipo: "frases"; instrucao: string; itens: string[] }
  | { tipo: "livre" }
);

const p = (s: string) => s.trim().split(/\s+/);

export const CATEGORIAS: Categoria[] = [
  {
    id: "m_pb",
    nome: "M antes de P e B",
    oQueE: "Troca M por N antes de P e B (canpo, bonba).",
    lembrete: "Antes de P e B usamos M. Antes das outras consoantes usamos N.",
    tipo: "lacuna",
    opcoes: ["m", "n"],
    itens: p(
      "ca[m]po bo[m]ba ta[m]pa te[m]po sa[m]ba po[m]ba li[m]po so[m]bra ta[m]bor e[m]pada u[m]bigo lâ[m]pada co[m]prar ca[m]painha de[n]te po[n]te ca[n]to mu[n]do pe[n]te ti[n]ta o[n]da ja[n]ta fu[n]do",
    ),
  },
  {
    id: "r_rr",
    nome: "R e RR",
    oQueE: "Troca R por RR ou RR por R (caro por carro).",
    lembrete:
      "Entre duas vogais, o som forte se escreve com RR (carro). Um R só entre vogais tem som fraco (careta).",
    tipo: "lacuna",
    opcoes: ["r", "rr"],
    itens: p(
      "ca[rr]o te[rr]a ba[rr]iga ca[r]eta ba[r]ata co[rr]ida ga[rr]afa fe[rr]o pe[r]u a[r]anha bu[rr]o ja[rr]a ca[r]inho to[rr]e a[rr]oz pi[r]ata se[rr]ote ma[r]ido go[rr]o co[r]uja",
    ),
  },
  {
    id: "s_ss",
    nome: "S e SS",
    oQueE: "Troca S por SS ou SS por S (pasaro, cassa).",
    lembrete:
      "Entre duas vogais, o som de S se escreve com SS (pássaro). Um S só entre vogais tem som de Z (casa).",
    tipo: "lacuna",
    opcoes: ["s", "ss"],
    itens: p(
      "pá[ss]aro ca[s]a me[s]a o[ss]o ma[ss]a ro[s]a va[s]o pa[ss]eio to[ss]e cami[s]a va[ss]oura pe[ss]oa te[s]oura a[ss]ado vi[s]ita gira[ss]ol ca[s]aco profe[ss]or mú[s]ica pa[ss]o",
    ),
  },
  {
    id: "c_cedilha",
    nome: "C e Ç",
    oQueE: "Troca Ç, C, S ou SS (cabesa, masã, sebola).",
    lembrete: "O Ç só aparece antes de A, O e U e nunca começa palavra. Antes de E e I usamos C.",
    tipo: "lacuna",
    opcoes: ["c", "ç"],
    itens: p(
      "ma[ç]ã [c]ebola pa[ç]oca [c]idade cabe[ç]a [c]inema la[ç]o [c]enoura crian[ç]a [c]éu almo[ç]o do[c]e po[ç]o ba[c]ia a[ç]úcar [c]irco palha[ç]o vo[c]ê on[ç]a ma[c]io",
    ),
  },
  {
    id: "s_z",
    nome: "S com som de Z e Z",
    oQueE: "Troca S por Z ou Z por S (caza, cosinha).",
    lembrete:
      "O S entre duas vogais tem som de Z (casa). Algumas palavras se escrevem com Z (azul).",
    tipo: "lacuna",
    opcoes: ["s", "z"],
    itens: p(
      "ca[s]a a[z]ul me[s]a bu[z]ina ro[s]a co[z]inha va[s]o dú[z]ia cami[s]a va[z]io te[s]oura bele[z]a mú[s]ica ami[z]ade vi[s]ita a[z]eite ca[s]aco nature[z]a pre[s]ente vi[z]inho",
    ),
  },
  {
    id: "x_ch",
    nome: "X e CH",
    oQueE: "Troca X por CH ou CH por X (xuva, peiche).",
    lembrete:
      "X e CH podem ter o mesmo som. Depois de ditongo (ai, ei) e de EN, quase sempre usamos X.",
    tipo: "lacuna",
    opcoes: ["x", "ch"],
    itens: p(
      "[ch]uva [x]ícara [ch]ave pei[x]e bi[ch]o cai[x]a mo[ch]ila li[x]o [ch]inelo bru[x]a ca[ch]orro en[x]ada [ch]ocolate abaca[x]i fle[ch]a amei[x]a [x]arope fi[ch]a ro[x]o [ch]apéu",
    ),
  },
  {
    id: "g_j",
    nome: "G e J",
    oQueE: "Troca G por J ou J por G antes de E e I (jelo, tijela).",
    lembrete:
      "Antes de E e I, o G e o J têm o mesmo som. É preciso lembrar como cada palavra se escreve.",
    tipo: "lacuna",
    opcoes: ["g", "j"],
    itens: p(
      "[g]elo [j]ipe [g]irafa [j]eito má[g]ico ho[j]e [g]ente su[j]eira ti[g]ela [j]iboia pá[g]ina can[j]ica [g]ema berin[j]ela reló[g]io lo[j]inha via[g]em laran[j]eira [g]igante [j]ejum",
    ),
  },
  {
    id: "gu_g",
    nome: "G e GU",
    oQueE: "Esquece o U de GUE e GUI (fogete, gitarra).",
    lembrete: "Antes de E e I, o som de GA, GO, GU se escreve com GU: foguete, guitarra.",
    tipo: "lacuna",
    opcoes: ["g", "gu"],
    itens: p(
      "fo[gu]ete [gu]erra [g]ato [gu]itarra [g]ola á[gu]ia fo[gu]eira [g]oma san[gu]e man[gu]eira [g]ude pre[gu]iça [g]aveta [gu]ia a[g]ora formi[gu]inha ami[g]o je[gu]e la[g]oa açou[gu]e",
    ),
  },
  {
    id: "qu_c",
    nome: "C e QU",
    oQueE: "Troca QU por C ou K (ceijo, kilo).",
    lembrete: "Antes de E e I, o som de CA, CO, CU se escreve com QU: queijo, quilo.",
    tipo: "lacuna",
    opcoes: ["c", "qu"],
    itens: p(
      "[qu]eijo [c]asa [qu]ilo [c]opo má[qu]ina bo[c]a pe[qu]eno [c]ubo mos[qu]ito es[c]ola [qu]iabo ma[c]aco le[qu]e [c]ama par[qu]e pi[c]olé es[qu]ilo sa[c]ola [qu]ente [c]oruja",
    ),
  },
  {
    id: "lh",
    nome: "LH",
    oQueE: "Troca LH por L ou LI (foia, olio, abela).",
    lembrete: "O som de LH aparece em folha, milho e coelho. Não é o mesmo som do L de bola.",
    tipo: "lacuna",
    opcoes: ["l", "lh"],
    itens: p(
      "fo[lh]a mi[lh]o coe[lh]o abe[lh]a o[lh]o toa[lh]a joe[lh]o ore[lh]a agu[lh]a repo[lh]o pa[lh]aço bi[lh]ete meda[lh]a espe[lh]o baru[lh]o cava[l]o came[l]o cabe[l]o jane[l]a pane[l]a saco[l]a tijo[l]o",
    ),
  },
  {
    id: "nh",
    nome: "NH",
    oQueE: "Troca NH por N ou NI (nino, galina).",
    lembrete: "O som de NH aparece em ninho, unha e galinha. Não é o mesmo som do N de banana.",
    tipo: "lacuna",
    opcoes: ["n", "nh"],
    itens: p(
      "ni[nh]o me[n]ino u[nh]a ba[n]ana so[nh]o ca[n]eca gali[nh]a pa[n]ela cami[nh]o ja[n]ela ara[nh]a pe[n]a dese[nh]o bo[n]eca fari[nh]a ca[n]udo mi[nh]oca sabo[n]ete di[nh]eiro tuca[n]o",
    ),
  },
  {
    id: "l_u",
    nome: "L ou U no fim da sílaba",
    oQueE: "Troca L por U no fim da sílaba (sau, papeu, auface).",
    lembrete: "No fim da sílaba, o L e o U têm som parecido: sal, papel, mas chapéu e degrau.",
    tipo: "lacuna",
    opcoes: ["l", "u"],
    itens: p(
      "sa[l] pa[u] pape[l] chapé[u] ane[l] degra[u] so[l]dado sa[u]dade ba[l]de ca[l]ça fi[l]me o[u]ro jorna[l] muse[u] anima[l] caca[u] a[l]moço ro[u]pa futebo[l] berimba[u] pu[l]ga to[u]ro a[l]face co[u]ve",
    ),
  },
  {
    id: "o_u",
    nome: "O no fim da palavra",
    oQueE: "Escreve U no lugar do O final (bolu, gatu).",
    lembrete: "Muitas palavras terminam com som de U, mas se escrevem com O: bolo, gato, menino.",
    tipo: "lacuna",
    opcoes: ["o", "u"],
    itens: p(
      "bol[o] tat[u] gat[o] per[u] sap[o] caj[u] pat[o] urub[u] menin[o] bamb[u] livr[o] ang[u] dad[o] cop[o] chuch[u] macac[o] caval[o] pac[u] sapat[o] tut[u]",
    ),
  },
  {
    id: "e_i",
    nome: "E no fim da palavra",
    oQueE: "Escreve I no lugar do E final (leiti, denti).",
    lembrete: "Muitas palavras terminam com som de I, mas se escrevem com E: leite, dente, pente.",
    tipo: "lacuna",
    opcoes: ["e", "i"],
    itens: p(
      "leit[e] abacax[i] pent[e] jabut[i] dent[e] sac[i] pont[e] táx[i] tomat[e] sagu[i] doc[e] gib[i] noit[e] chav[e] rub[i] pel[e] javal[i] sorvet[e] caqu[i] tapet[e]",
    ),
  },
  {
    id: "am_ao",
    nome: "AM e ÃO no fim dos verbos",
    oQueE: "Troca AM por ÃO nos verbos (eles cantarão por cantaram).",
    lembrete:
      "O que já aconteceu termina com AM (ontem eles cantaram). O que vai acontecer termina com ÃO (amanhã eles cantarão).",
    tipo: "lacuna",
    opcoes: ["aram", "arão"],
    itens: [
      "Ontem as crianças brinc[aram] no pátio.",
      "Amanhã meus primos cheg[arão] cedo.",
      "No ano passado eles viaj[aram] de trem.",
      "Semana que vem as aulas começ[arão].",
      "Ontem os meninos jog[aram] bola.",
      "No próximo mês elas danç[arão] na festa.",
      "Hoje cedo os pássaros cant[aram].",
      "Depois de amanhã os alunos visit[arão] o museu.",
      "Ontem à noite todos jant[aram] juntos.",
      "No futuro os robôs ajud[arão] as pessoas.",
    ],
  },
  {
    id: "r_final",
    nome: "R no fim dos verbos",
    oQueE: "Esquece o R do fim do verbo (vou brinca, quero come).",
    lembrete: "Depois de gostar de, querer, ir e precisar, o verbo termina com R: gosto de cantar.",
    tipo: "lacuna",
    opcoes: ["a", "ar"],
    itens: [
      "Eu gosto de cant[ar].",
      "Ela cant[a] no coral.",
      "Vou brinc[ar] lá fora.",
      "O bebê brinc[a] no berço.",
      "Preciso estud[ar] hoje.",
      "Meu irmão estud[a] de manhã.",
      "Quero pul[ar] corda.",
      "O sapo pul[a] bem alto.",
      "Vamos jog[ar] bola.",
      "Meu tio jog[a] xadrez.",
    ],
  },
  {
    id: "h_inicial",
    nome: "H no começo da palavra",
    oQueE: "Esquece o H inicial ou põe H onde não tem (oje, hontem).",
    lembrete:
      "O H do começo não tem som. É preciso lembrar quais palavras começam com ele: hoje, hora, homem.",
    tipo: "lacuna",
    opcoes: ["h", ""],
    itens: p(
      "[h]oje []ontem [h]ora []ovo [h]omem []amigo [h]istória []escola [h]ospital []igreja [h]orta []onda [h]elicóptero []elefante [h]otel []óculos [h]umano []urso [h]ino []ilha",
    ),
  },
  {
    id: "p_b",
    nome: "P e B",
    oQueE: "Troca P por B ou B por P (pola, sabo).",
    lembrete: "Fale a palavra devagar e sinta a garganta: no B ela vibra, no P não.",
    tipo: "lacuna",
    opcoes: ["p", "b"],
    itens: p(
      "[b]ola [p]ato ca[b]ide sa[p]o [b]oneca [p]ipoca a[b]acate ta[p]ete [b]anana [p]anela ca[b]elo co[p]o [b]ebê [p]ijama",
    ),
  },
  {
    id: "t_d",
    nome: "T e D",
    oQueE: "Troca T por D ou D por T (tato por dado, gado por gato).",
    lembrete: "Fale a palavra devagar e sinta a garganta: no D ela vibra, no T não.",
    tipo: "lacuna",
    opcoes: ["t", "d"],
    itens: p(
      "[d]ado [t]atu ca[d]eado ga[t]o [d]edo [t]omate me[d]o pa[t]o [d]oce [t]ijolo sala[d]a ba[t]ata [d]ominó [t]ucano",
    ),
  },
  {
    id: "f_v",
    nome: "F e V",
    oQueE: "Troca F por V ou V por F (faca por vaca, ufa por uva).",
    lembrete: "Fale a palavra devagar e sinta a garganta: no V ela vibra, no F não.",
    tipo: "lacuna",
    opcoes: ["f", "v"],
    itens: p(
      "[f]ubá [v]ida ca[f]é ca[v]alo [f]ogo [v]ela so[f]á u[v]a [f]ita [v]iola gira[f]a lu[v]a [f]oca [v]ovó",
    ),
  },
  {
    id: "c_g",
    nome: "C e G",
    oQueE: "Troca C por G ou G por C (cato por gato, amico).",
    lembrete: "Fale a palavra devagar e sinta a garganta: no G ela vibra, no C não.",
    tipo: "lacuna",
    opcoes: ["c", "g"],
    itens: p(
      "[g]ato [c]asa ami[g]o maca[c]o [g]alinha [c]avalo [g]oiaba [c]opo la[g]oa bo[c]a [g]aveta [c]amelo bi[g]ode sa[c]ola [g]aroto [c]oruja",
    ),
  },
  {
    id: "encontro",
    nome: "Letra que falta (BR, PL, TR...)",
    oQueE: "Esquece o R ou o L do meio da sílaba (pato por prato, banco por branco).",
    lembrete:
      "Algumas sílabas têm duas consoantes juntas: PRA-to, FLOR, TREM. Fale devagar para ouvir todas.",
    tipo: "lacuna",
    opcoes: ["r", "l"],
    itens: p(
      "p[r]ato b[r]aço f[l]or p[l]anta t[r]em g[r]ilo b[l]usa c[r]avo f[r]uta d[r]agão c[l]ube ped[r]a liv[r]o vid[r]o bicic[l]eta est[r]ela g[l]obo p[r]imo f[l]auta t[r]igo",
    ),
  },
  {
    id: "ditongo",
    nome: "Vogal que some (EI, OU)",
    oQueE: "Escreve como fala e come uma vogal (pexe, otro, bejo).",
    lembrete: "Em peixe, beijo, ouro e roupa falamos rápido, mas escrevemos as duas vogais.",
    tipo: "lacuna",
    opcoes: ["e", "ei", "o", "ou"],
    itens: p(
      "p[ei]xe m[e]sa b[ei]jo p[e]na qu[ei]jo s[e]lo mant[ei]ga jan[e]la [ou]ro b[o]lo r[ou]pa c[o]po tes[ou]ra b[o]ca vass[ou]ra cen[ou]ra s[o]pa f[ei]ra",
    ),
  },
  {
    id: "segmentacao",
    nome: "Separação das palavras",
    oQueE: "Junta palavras (derepente, agente foi) ou separa no meio (a gora, em bora).",
    lembrete:
      "Cada palavra fica separada da outra por um espaço. Leia a frase batendo uma palma para cada palavra.",
    tipo: "frases",
    instrucao: "As palavras ficaram grudadas. Reescreva cada frase com os espaços no lugar certo.",
    itens: [
      "Ogatosubiunomuro.",
      "Ameninaviualua.",
      "Vovófezbolodefubá.",
      "Eugostodesucodeuva.",
      "Opatonadanorio.",
      "Derepentecomeçouachover.",
      "Agentefoiaoparque.",
      "Meuamigomoraperto.",
    ],
  },
  {
    id: "pontuacao",
    nome: "Pontuação",
    oQueE: "Não usa ponto final, vírgula ou ponto de interrogação.",
    lembrete:
      "O ponto final termina a frase. A interrogação mostra uma pergunta. A vírgula separa os itens de uma lista.",
    tipo: "frases",
    instrucao: "Reescreva as frases colocando a pontuação que falta.",
    itens: [
      "Você viu meu caderno",
      "Comprei pão leite e queijo",
      "Que dia lindo",
      "O cachorro latiu a noite toda",
      "Onde você mora",
      "Ana Bia e Caio foram ao parque",
      "Hoje choveu muito",
      "Quantos anos você tem",
    ],
  },
  {
    id: "maiuscula",
    nome: "Letra maiúscula",
    oQueE: "Não usa maiúscula no começo da frase ou em nomes próprios.",
    lembrete: "Usamos letra maiúscula no começo da frase e nos nomes de pessoas, bichos e lugares.",
    tipo: "frases",
    instrucao: "Reescreva as frases usando letra maiúscula onde for preciso.",
    itens: [
      "a menina ana mora em recife.",
      "meu cachorro se chama bolota.",
      "o rio amazonas é muito grande.",
      "pedro e lia estudam juntos.",
      "nas férias vou para salvador.",
      "a professora marta leu um livro.",
      "minha tia rosa mora em belém.",
      "o gato mimo dorme no sofá.",
    ],
  },
  {
    id: "acentuacao",
    nome: "Acentos",
    oQueE: "Esquece o acento ou o til (vovo, cafe, mao).",
    lembrete:
      "O acento mostra a sílaba mais forte e muda a palavra: vovó e vovô, pé, café. O til deixa o som pelo nariz: mão, maçã.",
    tipo: "frases",
    instrucao: "Reescreva as palavras colocando o acento ou o til que falta.",
    itens: [
      "vovo   cafe   sofa",
      "arvore   lapis   agua",
      "onibus   medico   voce",
      "mao   pao   maca",
      "picole   jacare   domino",
      "musica   numero   sabado",
    ],
  },
  {
    id: "outro",
    nome: "Outras palavras",
    oQueE: "Erros que não entram nas outras categorias.",
    lembrete: "Olhe com atenção como cada palavra se escreve.",
    tipo: "livre",
  },
];

export function categoria(id: string): Categoria {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

export function nomeCategoria(id: string): string {
  return categoria(id).nome;
}

/** Agrupa os erros por categoria, da mais frequente para a menos. */
export function errosPorCategoria(
  erros: ErroEscrita[],
): Array<{ cat: Categoria; erros: ErroEscrita[] }> {
  const mapa = new Map<string, ErroEscrita[]>();
  for (const e of erros) {
    const c = categoria(e.cat).id;
    if (!mapa.has(c)) mapa.set(c, []);
    mapa.get(c)!.push(e);
  }
  return [...mapa.entries()]
    .map(([id, lista]) => ({ cat: categoria(id), erros: lista }))
    .sort((a, b) => b.erros.length - a.erros.length);
}

// ---------- Atividade de fixação (HTML para imprimir) ----------

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sementeDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function sorteador(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escolher<T>(lista: readonly T[], n: number, rnd: () => number): T[] {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** "ca[m]po" → { antes: "ca", resp: "m", depois: "po" } */
export function partes(item: string): { antes: string; resp: string; depois: string } {
  const m = /^(.*?)\[(.*?)\](.*)$/.exec(item);
  if (!m) return { antes: item, resp: "", depois: "" };
  return { antes: m[1], resp: m[2], depois: m[3] };
}

export function palavraCerta(item: string): string {
  const x = partes(item);
  return x.antes + x.resp + x.depois;
}

function rotuloOpcao(o: string): string {
  return o === "" ? "nada" : o.toUpperCase();
}

export type BlocoAtividade = {
  cat: Categoria;
  /** Palavras do texto do aluno (forma correta), sem repetir. */
  palavrasDoAluno: string[];
  completar: string[];
  marcar: Array<{ certa: string; errada: string; certaPrimeiro: boolean }>;
  frases: string[];
};

/** Monta os exercícios de UMA categoria para um aluno (sempre iguais para a mesma semente). */
export function montarBloco(cat: Categoria, erros: ErroEscrita[], semente: string): BlocoAtividade {
  const rnd = sorteador(sementeDe(semente + "|" + cat.id));
  const palavrasDoAluno = [
    ...new Set(erros.map((e) => (e.correta || "").trim()).filter((x) => x.length > 0)),
  ].slice(0, 6);
  const bloco: BlocoAtividade = { cat, palavrasDoAluno, completar: [], marcar: [], frases: [] };
  if (cat.tipo === "lacuna") {
    const sorteados = escolher(cat.itens, Math.min(12, cat.itens.length), rnd);
    bloco.completar = sorteados.slice(0, 8);
    const ehFrase = cat.itens[0].includes(" ");
    if (!ehFrase) {
      bloco.marcar = sorteados.slice(8, 12).map((it) => {
        const x = partes(it);
        const outras = cat.opcoes.filter((o) => o !== x.resp);
        const troca = outras[Math.floor(rnd() * outras.length)] ?? "";
        return {
          certa: x.antes + x.resp + x.depois,
          errada: x.antes + troca + x.depois,
          certaPrimeiro: rnd() < 0.5,
        };
      });
    }
  } else if (cat.tipo === "frases") {
    bloco.frases = escolher(cat.itens, Math.min(5, cat.itens.length), rnd);
  }
  return bloco;
}

const CSS_ATIVIDADE = `
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:15px;line-height:1.5}
.folha{padding:14mm 14mm 10mm;page-break-after:always}
.folha:last-child{page-break-after:auto}
.topo{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;font-size:13px}
h1{font-size:19px;margin:0 0 2px}
h2{font-size:16px;margin:16px 0 4px;border-left:6px solid #0B7A55;padding-left:8px}
.lembrete{border:1.5px dashed #555;border-radius:8px;padding:6px 10px;margin:6px 0 8px;font-size:14px}
.q{margin:8px 0 4px;font-weight:bold}
.grade{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 14px;font-size:19px;letter-spacing:.5px}
.grade.frases{grid-template-columns:1fr;font-size:17px}
.lac{display:inline-block;min-width:26px;border-bottom:2px solid #111;margin:0 2px}
.ops{font-size:13px;color:#333;margin-bottom:4px}
.par{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 18px;font-size:18px}
.cx{display:inline-block;width:15px;height:15px;border:2px solid #111;border-radius:3px;margin-right:6px;vertical-align:-2px}
.linha{border-bottom:1.5px solid #555;height:30px}
.copie{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:end;font-size:18px}
.rod{margin-top:12px;font-size:11px;color:#555}
@media print{@page{size:A4;margin:0}}
`;

function htmlBloco(b: BlocoAtividade, n: { v: number }): string {
  const c = b.cat;
  let h = `<h2>${esc(c.nome)}</h2><div class="lembrete"><b>Lembre:</b> ${esc(c.lembrete)}</div>`;
  if (c.tipo === "lacuna" && b.completar.length) {
    const ehFrase = b.completar[0].includes(" ");
    h += `<div class="q">${n.v++}. Complete com ${c.opcoes.map((o) => `<b>${esc(rotuloOpcao(o))}</b>`).join(" ou ")}.</div>`;
    h += `<div class="grade${ehFrase ? " frases" : ""}">${b.completar
      .map((it) => {
        const x = partes(it);
        return `<div>${esc(x.antes)}<span class="lac">&nbsp;</span>${esc(x.depois)}</div>`;
      })
      .join("")}</div>`;
  }
  if (b.marcar.length) {
    h += `<div class="q">${n.v++}. Marque a palavra escrita do jeito certo.</div><div class="par">${b.marcar
      .map((m) => {
        const [x, y] = m.certaPrimeiro ? [m.certa, m.errada] : [m.errada, m.certa];
        return `<div><span class="cx"></span>${esc(x)} &nbsp; <span class="cx"></span>${esc(y)}</div>`;
      })
      .join("")}</div>`;
  }
  if (c.tipo === "frases" && b.frases.length) {
    h += `<div class="q">${n.v++}. ${esc(c.instrucao)}</div>${b.frases
      .map(
        (f) =>
          `<div style="font-size:17px;margin-top:6px">${esc(f)}</div><div class="linha"></div>`,
      )
      .join("")}`;
  }
  if (b.palavrasDoAluno.length) {
    h += `<div class="q">${n.v++}. Estas palavras apareceram no seu texto. Copie cada uma duas vezes.</div><div class="copie">${b.palavrasDoAluno
      .map((w) => `<div><b>${esc(w)}</b></div><div class="linha"></div>`)
      .join("")}</div>`;
  }
  return h;
}

export type AtividadeAluno = {
  alunoNome: string;
  turma?: string;
  data?: string;
  erros: ErroEscrita[];
  /** Semente para sortear os exercícios (id da avaliação). */
  semente: string;
};

/** Quantas categorias entram na folha de um aluno (as mais frequentes). */
const MAX_CATEGORIAS = 3;

export function blocosDoAluno(a: AtividadeAluno): BlocoAtividade[] {
  return errosPorCategoria(a.erros)
    .slice(0, MAX_CATEGORIAS)
    .map((g) => montarBloco(g.cat, g.erros, a.semente));
}

/** HTML completo (uma ou mais folhas, uma por aluno) pronto para imprimir. */
export function htmlAtividades(alunos: AtividadeAluno[]): string {
  const folhas = alunos
    .filter((a) => a.erros.length > 0)
    .map((a) => {
      const blocos = blocosDoAluno(a);
      const n = { v: 1 };
      const corpo = blocos.map((b) => htmlBloco(b, n)).join("");
      const palavras = [...new Set(blocos.flatMap((b) => b.palavrasDoAluno))].slice(0, 2);
      const frase =
        palavras.length > 0
          ? `<div class="q">${n.v++}. Escreva uma frase com ${palavras.map((w) => `<b>${esc(w)}</b>`).join(" e ")}.</div><div class="linha"></div><div class="linha"></div>`
          : "";
      return `<section class="folha"><div class="topo"><div><h1>Atividade de fixação</h1><div>Nome: <b>${esc(a.alunoNome)}</b>${a.turma ? ` · Turma: ${esc(a.turma)}` : ""}</div></div><div>Data: ____/____/______</div></div>${corpo}${frase}<div class="rod">AgilizaProf · atividade feita a partir do texto do aluno</div></section>`;
    });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Atividades de fixação</title><style>${CSS_ATIVIDADE}</style></head><body>${folhas.join("")}</body></html>`;
}
