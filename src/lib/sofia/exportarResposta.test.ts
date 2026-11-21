import { describe, expect, it } from "vitest";
import { limparHtmlResposta, tituloDaResposta } from "./exportarResposta";

describe("exportar resposta da Sofia", () => {
  it("usa o primeiro título como nome", () => {
    expect(tituloDaResposta("Claro!\n\n## Plano de aula: **Frações**\n- a")).toBe("Plano de aula: Frações");
    expect(tituloDaResposta("Texto simples")).toBe("Texto simples");
  });
  it("tira botões e atributos de tela", () => {
    expect(limparHtmlResposta('<p class="x">Oi</p><button onclick="y">Copiar</button>')).toBe("<p>Oi</p>");
  });
});
