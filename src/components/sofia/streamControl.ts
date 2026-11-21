// Controle do texto que chega da Sofia: permite parar a resposta e dá um
// tempo limite quando nada chega por muito tempo (gateway travado).

export const SOFIA_TEMPO_LIMITE_MS = 90_000;
export const MSG_TEMPO_ESGOTADO = "A Sofia demorou demais para responder. Tente de novo.";

export class SofiaCanceladaError extends Error {
  constructor() {
    super("Resposta interrompida.");
    this.name = "SofiaCanceladaError";
  }
}

export class SofiaTempoEsgotadoError extends Error {
  constructor() {
    super(MSG_TEMPO_ESGOTADO);
    this.name = "SofiaTempoEsgotadoError";
  }
}

/**
 * Lê `fonte` pedaço a pedaço. Para quando `signal` for abortado
 * (SofiaCanceladaError) ou quando passar `tempoLimiteMs` sem nenhum pedaço
 * novo (SofiaTempoEsgotadoError).
 */
export async function* comControle<T>(
  fonte: AsyncIterable<T>,
  opts: { signal: AbortSignal; tempoLimiteMs?: number },
): AsyncGenerator<T> {
  const it = fonte[Symbol.asyncIterator]();
  const limite = opts.tempoLimiteMs ?? SOFIA_TEMPO_LIMITE_MS;
  const encerrar = () => {
    try {
      void it.return?.()?.catch?.(() => {});
    } catch {
      /* ignore */
    }
  };
  try {
    for (;;) {
      if (opts.signal.aborted) throw new SofiaCanceladaError();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let onAbort: (() => void) | undefined;
      const parada = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SofiaTempoEsgotadoError()), limite);
        onAbort = () => reject(new SofiaCanceladaError());
        opts.signal.addEventListener("abort", onAbort, { once: true });
      });
      let r: IteratorResult<T>;
      try {
        r = await Promise.race([it.next(), parada]);
      } finally {
        if (timer) clearTimeout(timer);
        if (onAbort) opts.signal.removeEventListener("abort", onAbort);
      }
      if (r.done) return;
      yield r.value;
    }
  } catch (err) {
    encerrar();
    throw err;
  }
}
