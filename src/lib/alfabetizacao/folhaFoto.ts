// Abre a foto da folha no navegador e devolve os tons de cinza para a leitura.
// A foto fica só na memória da aba: não é enviada nem guardada.
import type { Imagem } from "./folha";

export async function fotoParaImagem(arquivo: Blob, maxLado = 1700): Promise<Imagem> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const el = new Image();
      el.onload = () => ok(el);
      el.onerror = () => erro(new Error("Não consegui abrir esta foto."));
      el.src = url;
    });
    const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * escala));
    const h = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Não consegui preparar a foto.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const rgba = ctx.getImageData(0, 0, w, h).data;
    const cinza = new Uint8Array(w * h);
    for (let i = 0, j = 0; j < cinza.length; i += 4, j++)
      cinza[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
    // solta a memória do canvas
    canvas.width = 1;
    canvas.height = 1;
    return { cinza, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}
