#!/usr/bin/env node
// Empacota as ferramentas (Questões e Jogos) para a edge function `ferramenta`.
//
// Por que: antes esses arquivos ficavam em public/ferramentas/ e qualquer
// pessoa baixava o banco de 52 mil questões (com gabaritos) sem login, só
// sabendo o endereço. Agora os arquivos ficam em ferramentas-privadas/ (fora
// do site) e a edge function `ferramenta` só entrega o conteúdo para quem
// está logado. O app mostra a ferramenta num iframe com srcdoc.
//
// Uso (sempre que trocar um arquivo em ferramentas-privadas/):
//   node scripts/empacotar-ferramentas.mjs
// O workflow de deploy das edge functions também roda este script antes de
// publicar, então esquecer de rodar só deixa o arquivo gerado desatualizado
// no repositório, não no ar.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origem = join(raiz, "ferramentas-privadas");
const destino = join(raiz, "supabase", "functions", "ferramenta", "_gerado");

// Só estas ferramentas são servidas (simulados.html é a página antiga, sem uso).
const FERRAMENTAS = ["questoes", "jogos"];

/**
 * Ajustes para rodar dentro de um iframe com srcdoc (endereço "about:srcdoc"):
 * - location.origin vira "null" em srcdoc; window.origin continua sendo o do app
 *   (usado no postMessage do modo imersivo e na checagem de imagens);
 * - location.href vira "about:srcdoc"; document.baseURI continua sendo a página
 *   do app, então endereços relativos resolvem como antes;
 * - imagens relativas "imagens-banco/..." apontam para /ferramentas/.
 */
export function adaptarParaSrcdoc(html) {
  return html
    .replaceAll("location.origin", "window.origin")
    .replaceAll("new URL(s,location.href)", "new URL(s,document.baseURI)")
    .replaceAll('src="imagens-banco/', 'src="/ferramentas/imagens-banco/');
}

mkdirSync(destino, { recursive: true });
for (const nome of FERRAMENTAS) {
  const html = adaptarParaSrcdoc(readFileSync(join(origem, `${nome}.html`), "utf8"));
  const ts =
    "// ARQUIVO GERADO por scripts/empacotar-ferramentas.mjs a partir de\n" +
    `// ferramentas-privadas/${nome}.html. Não edite aqui.\n` +
    `export default ${JSON.stringify(html)};\n`;
  writeFileSync(join(destino, `${nome}.ts`), ts);
  console.log(`ferramenta ${nome}: ${(ts.length / 1e6).toFixed(1)} MB`);
}
