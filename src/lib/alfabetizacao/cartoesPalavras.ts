// Bancos de sílabas e palavras dos cartões de leitura (níveis 1, 2 e 3).

/** Famílias silábicas simples (consoante + vogal). */
export const FAMILIAS: Array<{ letra: string; silabas: string[] }> = [
  { letra: "B", silabas: ["ba", "be", "bi", "bo", "bu"] },
  { letra: "C", silabas: ["ca", "co", "cu"] },
  { letra: "D", silabas: ["da", "de", "di", "do", "du"] },
  { letra: "F", silabas: ["fa", "fe", "fi", "fo", "fu"] },
  { letra: "G", silabas: ["ga", "go", "gu"] },
  { letra: "J", silabas: ["ja", "je", "ji", "jo", "ju"] },
  { letra: "L", silabas: ["la", "le", "li", "lo", "lu"] },
  { letra: "M", silabas: ["ma", "me", "mi", "mo", "mu"] },
  { letra: "N", silabas: ["na", "ne", "ni", "no", "nu"] },
  { letra: "P", silabas: ["pa", "pe", "pi", "po", "pu"] },
  { letra: "R", silabas: ["ra", "re", "ri", "ro", "ru"] },
  { letra: "S", silabas: ["sa", "se", "si", "so", "su"] },
  { letra: "T", silabas: ["ta", "te", "ti", "to", "tu"] },
  { letra: "V", silabas: ["va", "ve", "vi", "vo", "vu"] },
  { letra: "X", silabas: ["xa", "xe", "xi", "xo", "xu"] },
  { letra: "Z", silabas: ["za", "ze", "zi", "zo", "zu"] },
];

export const VOGAIS = ["a", "e", "i", "o", "u"];
export const ENCONTROS_VOCALICOS = ["ai", "ei", "oi", "ui", "au", "eu", "ou", "ia", "io", "ua"];

/** Palavras só com sílabas simples (consoante + vogal, ou vogal sozinha). */
export const PALAVRAS_SIMPLES: string[] = `
bala bola bolo boca bota bebê babá bico bife bule beco batata banana boneca bonito bigode boiada buzina
casa copo cama cola coco cubo café cavalo camelo canudo caneca cabelo cabana comida cocada cabide caju coruja careca cadeado
dado dedo dama data dia doce duna dominó ditado dúvida
faca fada fita foca fogo fila figo fubá fivela fofoca farofa fulano
gato galo gota gude gola goma gado gaveta galope garoto gaiola goiaba
jaca jipe juba jogo janela jiló jabuti jacaré javali jujuba
lata lado lama lobo lua luva lixo lima lona lupa limonada lagoa
mala mato meia mico moto mula mesa mapa medo moeda macaco menino menina mágico moleza madeira maleta marido medida melado metade miolo mudo muro
nabo nata navio neve nome nove nuca novela noite número namorado natureza neto neta
pato pipa pote pulo pena pia pé pele peteca panela pijama pipoca pepino piano paletó pirata picolé pomada padaria pagode parede patinete pedido pesado piada pirulito poema
rato rede rio roda rua rei remo rosa roupa rabo rima robô raposa remédio rapadura rabanete recado risada rodada roseira
sapo sala selo sino suco sopa sofá saia sede sacola sapato salada sabonete sábado semana saúde sabiá saci sacada salame saliva seda
tatu teia tela tijolo time toca tubo taco topo tapete tomate telefone tucano tomada tabela tarefa tecido teimoso tesoura tigela tulipa
uva urubu
vaca vela vila voto vida vovó vovô viola violino vagalume vacina vareta veludo
xale xícara xarope xereta
zebu zero zoada
abacate abacaxi amigo amiga apito areia aluno aluna avô avó apelido
ema educado ioiô ovo oito ouro
cutia paca peru perua girafa gelo gema gibi cebola cidade cinema cipó
`
  .split(/\s+/)
  .filter(Boolean);

/** Palavras com sílabas difíceis, por padrão ortográfico. */
export const PADROES: Array<{ id: string; foco: string; palavras: string[] }> = [
  {
    id: "lh",
    foco: "LH",
    palavras:
      "palha telha folha milho coelho abelha olho ilha galho toalha joelho orelha ovelha agulha repolho palhaço bilhete medalha molho velho filho filha espelho trabalho barulho mulher colher vermelho julho piolho".split(
        " ",
      ),
  },
  {
    id: "nh",
    foco: "NH",
    palavras:
      "ninho vinho unha sonho banho linha galinha minhoca cozinha dinheiro caminho aranha montanha sozinho passarinho joaninha rainha farinha desenho tamanho lenha golfinho espinho manhã cegonha carinho vizinho moinho pinheiro castanha".split(
        " ",
      ),
  },
  {
    id: "ch",
    foco: "CH",
    palavras:
      "chave chuva chá chapéu chinelo chocolate bicho cachorro mochila machado chuveiro fechadura bochecha ficha flecha chiclete chupeta churrasco cachoeira lancheira salsicha borracha chaminé chicote cheiro chefe tocha mancha concha colchão".split(
        " ",
      ),
  },
  {
    id: "rr",
    foco: "RR",
    palavras:
      "carro burro terra ferro jarra torre serra barro garrafa cachorro corrida barriga ferrugem gorro marreco serrote torrada carroça cigarra beterraba corrente arroz erro sorriso terreno morro churrasco borracha verruga guitarra".split(
        " ",
      ),
  },
  {
    id: "ss",
    foco: "SS",
    palavras:
      "osso massa pássaro passeio tosse missa assado vassoura girassol professor pessoa pêssego sossego passo nosso isso assunto dezesseis amassar bússola assobio travesseiro classe pressa gesso russo grosso missão sessenta assinar".split(
        " ",
      ),
  },
  {
    id: "qu-gu",
    foco: "QU e GU",
    palavras:
      "queijo quilo quiabo quente querido quintal máquina moleque leque esquilo mosquito periquito pequeno caqui parque guerra guitarra foguete águia fogueira guizo guia sangue formiguinha jegue mangueira preguiça açougue quadro aquário".split(
        " ",
      ),
  },
  {
    id: "r-final",
    foco: "R no fim da sílaba",
    palavras:
      "porta carta barco circo corda formiga tartaruga árvore urso irmão verde garfo martelo sorvete perna borboleta jardim margarida colar mar dor amor calor pintor açúcar lugar cantar dormir correr tambor".split(
        " ",
      ),
  },
  {
    id: "s-final",
    foco: "S no fim da sílaba",
    palavras:
      "escola espada estrela festa pasta pista cesta mosca casca rosto lápis ônibus pires tênis vestido costas biscoito castelo espelho escada esquilo floresta pastel pescador susto gosto mês três dois seis".split(
        " ",
      ),
  },
  {
    id: "l-final",
    foco: "L no fim da sílaba",
    palavras:
      "sol sal mel anel papel pastel jornal animal hospital funil barril anzol caracol lençol farol balde calça bolsa palma soldado alface almoço pulga filme azul girassol futebol quintal natal selva".split(
        " ",
      ),
  },
  {
    id: "nasais",
    foco: "M e N no fim da sílaba",
    palavras:
      "campo bombom tampa bomba pomba samba tambor limpo sombra lâmpada computador empada umbigo tempo canto dente ponte mundo fundo onda anjo pente tinta elefante janta laranja príncipe sanfona montanha cinto".split(
        " ",
      ),
  },
  {
    id: "ao",
    foco: "ÃO, Ã e ÕES",
    palavras:
      "pão mão cão chão limão avião balão botão coração leão mamão pião sabão violão caminhão feijão melão portão irmã maçã lã rã manhã romã mãe pães cães botões limões aviões".split(
        " ",
      ),
  },
  {
    id: "encontro-r",
    foco: "BR, CR, DR, FR, GR, PR, TR",
    palavras:
      "braço brinco cobra cabra zebra cravo creme escrever dragão pedra vidro madrinha fruta frio cofre grilo tigre magro prato prego primo professor trem trigo estrela quatro livro palavra abraço criança".split(
        " ",
      ),
  },
  {
    id: "encontro-l",
    foco: "BL, CL, FL, GL, PL",
    palavras:
      "bloco blusa bicicleta clube claro classe chiclete flor flauta floresta flecha globo glória inglês planta placa pluma planeta atleta problema público nublado bíblia clima flanela flocos iglu aplauso diploma explicar".split(
        " ",
      ),
  },
  {
    id: "c-cedilha",
    foco: "Ç, CE e CI",
    palavras:
      "maçã poço laço taça moça açúcar palhaço cabeça criança onça lençol almoço pescoço caçador cebola cinema cidade cenoura cigarra circo cereja cinco cem céu macio bacia doce você alface vacina".split(
        " ",
      ),
  },
  {
    id: "g-j",
    foco: "GE, GI e J",
    palavras:
      "gelo gema gente girafa gigante gibi mágico página tigela relógio viagem garagem coragem colégio gemada geleia gesso ginásio girassol jeito jiboia jipe laranjeira hoje sujeira berinjela lojinha canjica majestade jejum".split(
        " ",
      ),
  },
  {
    id: "x",
    foco: "X",
    palavras:
      "xícara xale xarope peixe caixa ameixa abacaxi lixo bruxa enxada mexerica faxina roxo baixo queixo táxi exame exemplo existir próximo máximo texto explicar sexta boxe fixo xadrez coxinha lagartixa enxame".split(
        " ",
      ),
  },
  {
    id: "h",
    foco: "H no começo",
    palavras:
      "hoje hora homem hino hotel horta hospital história herói hélice hipopótamo harpa humano humor higiene hábito hóspede havia honra haste horizonte hortelã hiena hífen horrível horário humilde harmonia helicóptero habitar".split(
        " ",
      ),
  },
  {
    id: "z-s",
    foco: "Z e S com som de Z",
    palavras:
      "zebra zero zíper azul azeite buzina cozinha dúzia vazio natureza beleza amizade vizinho batizado casa mesa rosa vaso camisa tesoura música raposa besouro mesada visita parafuso casaco presente tesouro asa".split(
        " ",
      ),
  },
];
