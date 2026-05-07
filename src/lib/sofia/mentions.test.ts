import { describe, it, expect } from "vitest";
import { mentionsName, norm } from "./mentions";

describe("norm", () => {
  it("lower-cases and strips diacritics", () => {
    expect(norm("João")).toBe("joao");
    expect(norm("ÁÉÍÓÚ ÃÕ Ç")).toBe("aeiou ao c");
    expect(norm("")).toBe("");
  });
});

describe("mentionsName — case & accents", () => {
  it("matches with different case", () => {
    expect(mentionsName("falei com ANA hoje", "Ana")).toBe(true);
    expect(mentionsName("Falei com ana hoje", "ANA")).toBe(true);
  });

  it("matches across accent variations both ways", () => {
    expect(mentionsName("conversei com Joao", "João")).toBe(true);
    expect(mentionsName("conversei com João", "Joao")).toBe(true);
    expect(mentionsName("a Inês participou", "Ines Souza")).toBe(true);
    expect(mentionsName("Cesária trouxe lição", "Cesaria")).toBe(true);
  });
});

describe("mentionsName — word boundary", () => {
  it("does NOT match a name embedded inside another word", () => {
    expect(mentionsName("comeu uma banana", "Ana")).toBe(false);
    expect(mentionsName("usamos xarope", "Aro")).toBe(false);
    expect(mentionsName("perguntei sobre joaozinho", "Joao")).toBe(false);
  });

  it("matches with punctuation as boundary", () => {
    expect(mentionsName("Ana, atenta hoje.", "Ana")).toBe(true);
    expect(mentionsName("(João) participou!", "João")).toBe(true);
    expect(mentionsName("— Maria?", "Maria")).toBe(true);
    expect(mentionsName("…ana.", "Ana")).toBe(true);
  });

  it("matches at start and end of text", () => {
    expect(mentionsName("Ana chegou cedo", "Ana")).toBe(true);
    expect(mentionsName("conversei com Ana", "Ana")).toBe(true);
    expect(mentionsName("Ana", "Ana")).toBe(true);
  });
});

describe("mentionsName — full name vs parts", () => {
  it("matches by first name when full name is registered", () => {
    expect(mentionsName("Maria foi muito participativa", "Maria Silva")).toBe(true);
  });

  it("matches by last name when full name is registered", () => {
    expect(mentionsName("o Souza ajudou os colegas", "Pedro Souza")).toBe(true);
  });

  it("matches the full name as a phrase", () => {
    expect(mentionsName("hoje a Ana Beatriz brilhou", "Ana Beatriz")).toBe(true);
  });

  it("ignores name parts shorter than 3 chars", () => {
    // "Lu" não deve casar isoladamente em "luminária".
    expect(mentionsName("trouxe uma luminaria", "Lu Souza")).toBe(false);
    // mas casa pelo sobrenome com 3+ chars
    expect(mentionsName("a Souza colaborou", "Lu Souza")).toBe(true);
  });
});

describe("mentionsName — edge cases", () => {
  it("returns false on empty text or empty name", () => {
    expect(mentionsName("", "Ana")).toBe(false);
    expect(mentionsName("texto qualquer", "")).toBe(false);
    expect(mentionsName("", "")).toBe(false);
  });

  it("escapes regex metacharacters in names", () => {
    // Apóstrofo no nome não quebra a regex (escape correto).
    expect(mentionsName("falei com d'Ávila hoje", "D'Avila")).toBe(true);
    // Nome com ponto também não vira "qualquer caractere".
    expect(mentionsName("ana xyz silva", "A.S")).toBe(false);
  });

  it("handles names with hyphen", () => {
    // O nome "Ana-Lucia" é tratado como token único (split /\s+/), então
    // só casa quando o texto reproduz o hífen.
    expect(mentionsName("Ana-Lucia chegou", "Ana-Lucia")).toBe(true);
    expect(mentionsName("falei com Ana Lucia", "Ana-Lucia")).toBe(false);
  });
});
