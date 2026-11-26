import { describe, expect, it } from "vitest";
import { imagemValida, parseChatInput } from "./sofia-chat.server";

describe("foto no chat da Sofia", () => {
  it("aceita só data URL de imagem", () => {
    expect(imagemValida("data:image/jpeg;base64,AAAA")).toBe("data:image/jpeg;base64,AAAA");
    expect(imagemValida("data:text/html;base64,AAAA")).toBeUndefined();
    expect(imagemValida("https://exemplo.com/a.jpg")).toBeUndefined();
  });
  it("leva a foto válida no pedido", () => {
    const d = parseChatInput({ messages: [{ role: "user", content: "oi" }], imagem: "data:image/png;base64,QQ==" });
    expect(d.imagem).toBe("data:image/png;base64,QQ==");
  });
});
