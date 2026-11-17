import { describe, expect, it } from "vitest";
import { campoDoModelo } from "./camposModelo";
import type { Lacuna } from "./modeloRede";

const l = (rotulo: string, tipo: Lacuna["tipo"] = "celula", secao = ""): Lacuna => ({
  id: "L1",
  tipo,
  rotulo,
  secao,
});

describe("campoDoModelo", () => {
  it("dados de identificação viram campo curto, sem sugestões", () => {
    for (const r of [
      "Nome do aluno",
      "Data de nascimento",
      "CID",
      "Idade",
      "Ano/Turma",
      "Telefone",
    ])
      expect(campoDoModelo(l(r)).curto, r).toBe(true);
  });

  it("não confunde pedaços de palavra com identificação", () => {
    // "cid" em capacidade, "idade" em habilidades/necessidades, "ano" em plano, "fim" em afim
    for (const r of [
      "Potencialidades",
      "Habilidades",
      "Dificuldades",
      "Necessidades específicas",
      "Plano de ação",
      "Capacidades",
    ])
      expect(campoDoModelo(l(r)).curto, r).toBe(false);
    expect(campoDoModelo(l("Potencialidades")).sugestao).toBe("potencialidades");
  });

  it("AEE vem antes de atendimento clínico", () => {
    expect(campoDoModelo(l("Atendimento Educacional Especializado")).sugestao).toBe("objetivosAEE");
    expect(campoDoModelo(l("Atendimentos clínicos")).sugestao).toBe("atendimentosExternos");
  });

  it("metas abrem a BNCC no componente citado no rótulo", () => {
    expect(campoDoModelo(l("Meta (BNCC) — Matemática"))).toMatchObject({
      sugestao: "objetivosLongoPrazo",
      bncc: "aval_obs:raciocinio_logico",
    });
    expect(campoDoModelo(l("Objetivos")).bncc).toBe("objetivosLongoPrazo");
  });

  it("rótulo genérico usa a seção do documento", () => {
    expect(campoDoModelo(l("Língua Portuguesa", "celula", "3. METAS")).sugestao).toBe(
      "objetivosLongoPrazo",
    );
  });
});
