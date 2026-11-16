import { describe, it, expect, vi } from "vitest";

// O roteador real não é necessário aqui (e puxa pacotes de SSR).
vi.mock("@tanstack/react-router", () => ({ Link: () => null }));
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { prepararMarkdownChat, textoParaCopiar, ehLinkInterno } from "./markdownChat";

const { sofiaMdComponents } = await import("@/components/sofia/SofiaMarkdown");
const comps = sofiaMdComponents({
  renderInternal: ({ href, children }) => (
    <a data-interno="1" href={href}>
      {children}
    </a>
  ),
});
const html = (md: string) =>
  renderToStaticMarkup(
    <ReactMarkdown components={comps}>{prepararMarkdownChat(md)}</ReactMarkdown>,
  );

describe("prepararMarkdownChat + ReactMarkdown", () => {
  it("bloco de transparência sai em linhas separadas", () => {
    const out = html(
      "📎 Fontes: registros\n🎯 Habilidades BNCC: EF04MA09\n📚 Apoio teórico: Vygotsky\n⚖️ Base legal: LDB",
    );
    expect(out.match(/<br\/>/g)?.length).toBe(3);
    expect(out).toContain("📎 Fontes: registros<br/>");
  });

  it("passo a passo 1️⃣ 2️⃣ ✅ e pergunta do nível", () => {
    const out = html("1️⃣ Abra Planejar\n2️⃣ Toque em Diário de bordo\n✅ Pronto");
    expect(out.match(/<br\/>/g)?.length).toBe(2);
    const nivel = html(
      "Com qual nível você está trabalhando?\n🧸 Educação Infantil\n📚 Ensino Fundamental",
    );
    expect(nivel.match(/<br\/>/g)?.length).toBe(2);
  });

  it("não quebra listas, títulos nem parágrafos normais", () => {
    const out = html("## Materiais\n- lápis\n- papel\n\nTexto final.");
    expect(out).toBe(
      "<h2>Materiais</h2>\n<ul>\n<li>lápis</li>\n<li>papel</li>\n</ul>\n<p>Texto final.</p>",
    );
  });

  it("tabela vira lista legível", () => {
    const out = html(
      "Veja:\n\n| Etapa | Tempo | Material |\n|---|---|---|\n| Acolhida | 10 min | roda |\n| Fechamento | 5 min | |",
    );
    expect(out).not.toContain("|");
    expect(out).toContain("<strong>Acolhida</strong>");
    expect(out).toContain("<li>Tempo: 10 min</li>");
    expect(out).toContain("<li>Material: roda</li>");
    expect(out).not.toContain("Material: </li>");
  });

  it("tabela de duas colunas vira 'título: valor'", () => {
    const out = html("| Dia | Tema |\n| :-- | --: |\n| Segunda | Frações |");
    expect(out).toContain("<li><strong>Segunda</strong>: Frações</li>");
  });

  it("link de busca do YouTube fica clicável, em nova aba", () => {
    const out = html("Busque: https://www.youtube.com/results?search_query=fracoes+4+ano.");
    expect(out).toContain(
      '<a href="https://www.youtube.com/results?search_query=fracoes+4+ano" target="_blank" rel="noopener noreferrer">',
    );
    expect(out).toContain("</a>.");
  });

  it("não duplica link Markdown já pronto", () => {
    const out = html("[BNCC](https://basenacionalcomum.mec.gov.br/)");
    expect(out.match(/<a /g)?.length).toBe(1);
  });

  it("link interno vai pelo roteador (mesma aba)", () => {
    const out = html("Abra [Planejar](/planejamento?m=m6).");
    expect(out).toContain('data-interno="1"');
    expect(out).not.toContain("_blank");
    expect(ehLinkInterno("//evil.com")).toBe(false);
  });

  it("tarefas e riscado", () => {
    const out = html("- [ ] Separar material\n- [x] Imprimir\n\n~~antigo~~ novo");
    expect(out).toContain("<li>☐ Separar material</li>");
    expect(out).toContain("<li>☑ Imprimir</li>");
    expect(out).not.toContain("~~");
  });

  it("código fica intacto", () => {
    const src = "```\na\nhttps://x.com/abc\n| a | b |\n|---|---|\n```";
    expect(prepararMarkdownChat(src)).toBe(src);
  });
});

describe("textoParaCopiar", () => {
  it("tira ** e ## e troca marcadores por •", () => {
    const md =
      "## Objetivo\n**Ler** frases curtas.\n\n### Materiais\n- lápis\n- *papel*\n  - colorido\n1. Primeiro passo\n\n[Vídeo](https://youtube.com/x)";
    expect(textoParaCopiar(md)).toBe(
      "Objetivo\nLer frases curtas.\n\nMateriais\n• lápis\n• papel\n  • colorido\n1. Primeiro passo\n\nVídeo (https://youtube.com/x)",
    );
  });

  it("preserva contas e sinais", () => {
    expect(textoParaCopiar("7 > 5 e 2 * 3 = 6")).toBe("7 > 5 e 2 * 3 = 6");
  });
});
