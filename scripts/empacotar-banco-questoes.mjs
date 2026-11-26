#!/usr/bin/env node
// Empacota o banco de questões (o arquivo .bin, gzip do JSON) dentro da edge
// function `banco-questoes`, que só entrega para quem está logado.
//
// Por que: o banco tem as 52 mil questões com gabarito. Em
// public/ferramentas/dados/ qualquer pessoa baixava o arquivo sem login, só
// sabendo o endereço. Agora ele não fica mais no site.
//
// Uso, sempre que o banco mudar:
//   node scripts/empacotar-banco-questoes.mjs caminho/para/banco-<versao>.bin
// e troque VERSAO_BANCO em public/ferramentas/questoes.html pelo mesmo
// <versao> (é o que faz os aparelhos baixarem o banco novo em vez de usar a
// cópia guardada).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("Uso: node scripts/empacotar-banco-questoes.mjs caminho/para/banco-<versao>.bin");
  process.exit(1);
}
const versao = basename(arquivo).replace(/^banco-/, "").replace(/\.bin$/, "");
const bytes = readFileSync(arquivo);
const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const destino = join(raiz, "supabase", "functions", "banco-questoes", "_gerado");
mkdirSync(destino, { recursive: true });
const ts =
  "// ARQUIVO GERADO por scripts/empacotar-banco-questoes.mjs. Não edite aqui.\n" +
  `export const VERSAO = ${JSON.stringify(versao)};\n` +
  `export const BANCO_BASE64 = ${JSON.stringify(bytes.toString("base64"))};\n`;
writeFileSync(join(destino, "banco.ts"), ts);
console.log(`banco ${versao}: ${(bytes.length / 1e6).toFixed(1)} MB (${(ts.length / 1e6).toFixed(1)} MB no arquivo gerado)`);
