// Abre a foto da folha no navegador e entrega os tons de cinza para a leitura.
// A foto fica só na memória da aba: não é enviada nem guardada.
import type { Caixa, FonteDaFoto, Imagem } from "./folha";

/**
 * Abre a foto. Devolve um jeito de pegar a foto inteira reduzida ou só um
 * pedaço dela com todo o detalhe (para a folha fotografada de longe).
 * Chame `fechar` ao terminar.
 */
export async function abrirFoto(arquivo: Blob): Promise<FonteDaFoto & { fechar: () => void }> {
  const url = URL.createObjectURL(arquivo);
  let img: HTMLImageElement;
  try {
    img = await new Promise<HTMLImageElement>((ok, erro) => {
      const el = new Image();
      el.onload = () => ok(el);
      el.onerror = () => erro(new Error("Não consegui abrir esta foto."));
      el.src = url;
    });
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const pegar = (recorte: Caixa | null, maxLado: number): Imagem => {
    const r = recorte ?? { x0: 0, y0: 0, x1: W, y1: H };
    const rw = Math.max(1, r.x1 - r.x0);
    const rh = Math.max(1, r.y1 - r.y0);
    const escala = Math.min(1, maxLado / Math.max(rw, rh));
    const w = Math.max(1, Math.round(rw * escala));
    const h = Math.max(1, Math.round(rh * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Não consegui preparar a foto.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, r.x0, r.y0, rw, rh, 0, 0, w, h);
    const rgba = ctx.getImageData(0, 0, w, h).data;
    const cinza = new Uint8Array(w * h);
    for (let i = 0, j = 0; j < cinza.length; i += 4, j++)
      cinza[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
    // solta a memória do canvas
    canvas.width = 1;
    canvas.height = 1;
    return { cinza, w, h };
  };
  return { w: W, h: H, pegar, fechar: () => URL.revokeObjectURL(url) };
}
