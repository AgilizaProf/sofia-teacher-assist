// Foto do texto da criança: reduz no navegador antes de enviar.
// A foto fica só na memória da aba e some quando a professora confirma.

export async function prepararFoto(
  arquivo: Blob,
  maxLado = 1800,
): Promise<{ base64: string; mime: string; url: string }> {
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
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não consegui preparar a foto.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return { base64: dataUrl.replace(/^data:[^,]*,/, ""), mime: "image/jpeg", url: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}
