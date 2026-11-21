// Gravação da leitura no navegador.
//
// O áudio fica só na memória desta aba: não vai para o armazenamento do app
// nem para o celular. Ele é enviado uma vez para a Sofia transcrever e é
// descartado quando a professora confirma (ou desiste da) avaliação.

export type Gravacao = {
  /** Áudio original, para a professora ouvir durante a revisão. */
  blob: Blob;
  segundos: number;
};

export type Gravador = {
  parar: () => Promise<Gravacao>;
  cancelar: () => void;
};

export function podeGravar(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

export function mensagemErroMicrofone(e: unknown): string {
  const nome = (e as { name?: string })?.name || "";
  if (nome === "NotAllowedError" || nome === "SecurityError")
    return "O navegador não deixou usar o microfone. Toque no cadeado ao lado do endereço e permita o microfone.";
  if (nome === "NotFoundError") return "Não encontrei um microfone neste aparelho.";
  if (nome === "NotReadableError")
    return "O microfone está em uso por outro aplicativo. Feche o outro aplicativo e tente de novo.";
  return "Não consegui começar a gravar. Tente de novo.";
}

export async function iniciarGravacao(): Promise<Gravador> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const tipos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  const mimeType = tipos.find((t) => MediaRecorder.isTypeSupported?.(t));
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const pedacos: BlobPart[] = [];
  rec.ondataavailable = (ev) => {
    if (ev.data && ev.data.size) pedacos.push(ev.data);
  };
  const inicio = Date.now();
  rec.start(500);
  const soltar = () => stream.getTracks().forEach((t) => t.stop());
  return {
    parar: () =>
      new Promise<Gravacao>((resolve) => {
        const fim = () => {
          soltar();
          resolve({
            blob: new Blob(pedacos, { type: rec.mimeType || mimeType || "audio/webm" }),
            segundos: Math.max(1, Math.round((Date.now() - inicio) / 1000)),
          });
        };
        if (rec.state === "inactive") return fim();
        rec.onstop = fim;
        rec.stop();
      }),
    cancelar: () => {
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch {
        /* já parado */
      }
      soltar();
    },
  };
}

function paraBase64(bytes: Uint8Array): string {
  let bin = "";
  const passo = 0x8000;
  for (let i = 0; i < bytes.length; i += passo)
    bin += String.fromCharCode(...bytes.subarray(i, i + passo));
  return btoa(bin);
}

/** PCM 16 bits mono → arquivo WAV. */
export function montarWav(amostras: Float32Array, taxa: number): Uint8Array {
  const buf = new ArrayBuffer(44 + amostras.length * 2);
  const v = new DataView(buf);
  const txt = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i));
  };
  txt(0, "RIFF");
  v.setUint32(4, 36 + amostras.length * 2, true);
  txt(8, "WAVE");
  txt(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  txt(36, "data");
  v.setUint32(40, amostras.length * 2, true);
  for (let i = 0; i < amostras.length; i++) {
    const s = Math.max(-1, Math.min(1, amostras[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

/**
 * Converte a gravação para WAV mono 16 kHz (formato que a IA aceita em
 * qualquer celular). Se o navegador não conseguir converter, manda o
 * arquivo original.
 */
export async function prepararParaEnvio(g: Gravacao): Promise<{ base64: string; mime: string }> {
  const original = new Uint8Array(await g.blob.arrayBuffer());
  try {
    const Ctx: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const decodificado = await ctx.decodeAudioData(original.slice().buffer);
    void ctx.close();
    const TAXA = 16000;
    const quadros = Math.max(1, Math.ceil(decodificado.duration * TAXA));
    const off = new OfflineAudioContext(1, quadros, TAXA);
    const fonte = off.createBufferSource();
    fonte.buffer = decodificado;
    fonte.connect(off.destination);
    fonte.start();
    const pronto = await off.startRendering();
    return { base64: paraBase64(montarWav(pronto.getChannelData(0), TAXA)), mime: "audio/wav" };
  } catch {
    const mime = (g.blob.type || "audio/webm").split(";")[0];
    return { base64: paraBase64(original), mime };
  }
}
