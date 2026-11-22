// Arquivo ou foto enviados no chat da Sofia.
// - Foto: reduzida no próprio aparelho (até 1600 px) e enviada junto da pergunta.
// - Texto (.txt, .csv, .md) e Word (.docx): o texto entra na mensagem.
// PDF ainda não: a Sofia pede para mandar foto da página ou colar o texto.

export type Anexo =
  | { tipo: "imagem"; nome: string; dataUrl: string }
  | { tipo: "texto"; nome: string; texto: string };

const MAX_TEXTO = 10_000; // a mensagem inteira vai até 12 mil caracteres
const LADO_MAX = 1600;

function lerComo(file: File, modo: "dataUrl" | "texto" | "buffer"): Promise<string | ArrayBuffer> {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string | ArrayBuffer);
    r.onerror = () => falha(r.error);
    if (modo === "dataUrl") r.readAsDataURL(file);
    else if (modo === "texto") r.readAsText(file);
    else r.readAsArrayBuffer(file);
  });
}

async function reduzirImagem(file: File): Promise<string> {
  const original = (await lerComo(file, "dataUrl")) as string;
  const img = await new Promise<HTMLImageElement>((ok, falha) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => falha(new Error("imagem"));
    i.src = original;
  });
  const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * escala));
  c.height = Math.max(1, Math.round(img.height * escala));
  const ctx = c.getContext("2d");
  if (!ctx) return original;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

/** Texto de um .docx (só os parágrafos, sem formatação). */
export async function textoDoDocx(buf: ArrayBuffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function lerAnexo(file: File): Promise<Anexo | { erro: string }> {
  const nome = file.name || "arquivo";
  const ext = nome.toLowerCase().split(".").pop() ?? "";
  if (file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) {
    if (file.size > 25 * 1024 * 1024) return { erro: "A foto é grande demais. Tente uma menor." };
    try {
      return { tipo: "imagem", nome, dataUrl: await reduzirImagem(file) };
    } catch {
      return { erro: "Não consegui abrir esta foto. Tente tirar de novo ou mandar em JPG." };
    }
  }
  if (["txt", "csv", "md", "tsv"].includes(ext) || file.type.startsWith("text/")) {
    const t = String(await lerComo(file, "texto")).trim();
    if (!t) return { erro: "O arquivo está vazio." };
    return { tipo: "texto", nome, texto: t.slice(0, MAX_TEXTO) };
  }
  if (ext === "docx") {
    try {
      const t = await textoDoDocx((await lerComo(file, "buffer")) as ArrayBuffer);
      if (!t) return { erro: "Não achei texto neste arquivo do Word." };
      return { tipo: "texto", nome, texto: t.slice(0, MAX_TEXTO) };
    } catch {
      return { erro: "Não consegui ler este arquivo do Word." };
    }
  }
  if (ext === "pdf")
    return { erro: "PDF ainda não. Mande uma foto da página ou copie e cole o texto." };
  return { erro: "Este tipo de arquivo ainda não. Mande foto, Word (.docx) ou texto (.txt)." };
}

/** Mensagem que vai para a Sofia, já com o texto do arquivo quando houver. */
export function mensagemComAnexo(pergunta: string, anexo: Anexo | null): string {
  const p = pergunta.trim();
  if (!anexo) return p;
  if (anexo.tipo === "imagem") return `${p || "O que você vê nesta foto?"}\n\n(📷 foto anexada: ${anexo.nome})`;
  const pedido = p || "Leia este arquivo e me diga como posso usar em sala.";
  return `${pedido}\n\n📎 Arquivo "${anexo.nome}":\n"""\n${anexo.texto}\n"""`;
}
