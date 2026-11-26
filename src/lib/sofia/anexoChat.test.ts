import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { mensagemComAnexo, textoDoDocx } from "./anexoChat";

describe("anexo no chat da Sofia", () => {
  it("monta a mensagem com o texto do arquivo", () => {
    const m = mensagemComAnexo("Resuma", { tipo: "texto", nome: "a.txt", texto: "linha 1" });
    expect(m).toContain("Resuma");
    expect(m).toContain('📎 Arquivo "a.txt"');
    expect(m).toContain("linha 1");
  });
  it("foto sem pergunta ganha uma pergunta padrão", () => {
    expect(mensagemComAnexo("", { tipo: "imagem", nome: "f.jpg", dataUrl: "data:" })).toMatch(/^O que você vê/);
  });
  it("lê o texto de um .docx", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", '<w:document><w:body><w:p><w:r><w:t>Olá &amp; turma</w:t></w:r></w:p><w:p><w:r><w:t>Fim</w:t></w:r></w:p></w:body></w:document>');
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    expect(await textoDoDocx(buf)).toBe("Olá & turma\nFim");
  });
});
