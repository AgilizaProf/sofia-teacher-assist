import { toast } from "sonner";

// Aviso quando a gravação na nuvem falha.
//
// Antes, se a internet caía ou o servidor recusava, o erro era engolido: a
// professora achava que estava salvo e, em outro aparelho, o trabalho não
// aparecia. Agora o que não subiu fica numa fila, o app avisa uma vez, tenta de
// novo sozinho (com intervalos maiores a cada falha e quando a internet volta) e
// avisa quando tudo subiu. Se ela tentar fechar a página com algo na fila, o
// navegador pergunta antes.

type Tentativa = () => Promise<boolean>;

const pendentes = new Map<string, Tentativa>();
let falhasSeguidas = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let avisou = false;
let ligado = false;

function ligar() {
  if (ligado || typeof window === "undefined") return;
  ligado = true;
  window.addEventListener("online", () => void tentarTudo());
  window.addEventListener("beforeunload", (e) => {
    // Depois de muitas falhas seguidas (servidor recusando sempre), não prende a página.
    if (pendentes.size === 0 || falhasSeguidas >= 10) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

function agendar() {
  if (timer) clearTimeout(timer);
  const espera = Math.min(60_000, 4_000 * 2 ** Math.min(falhasSeguidas, 4));
  timer = setTimeout(() => void tentarTudo(), espera);
}

async function tentarTudo() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  for (const [chave, tentar] of [...pendentes]) {
    let ok = false;
    try {
      ok = await tentar();
    } catch {
      ok = false;
    }
    if (ok) pendentes.delete(chave);
  }
  if (pendentes.size === 0) {
    falhasSeguidas = 0;
    if (avisou) {
      avisou = false;
      toast.success("Pronto: tudo o que faltava foi salvo na sua conta.", { id: "aprof-nuvem" });
    }
    return;
  }
  falhasSeguidas++;
  agendar();
}

/** Chame quando uma gravação na nuvem falhar. `tentar` refaz o envio com o valor mais novo. */
export function falhouSalvarNaNuvem(chave: string, tentar: Tentativa) {
  ligar();
  pendentes.set(chave, tentar);
  if (!avisou) {
    avisou = true;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    toast.warning(
      offline
        ? "Sem internet: o que você fizer fica guardado neste aparelho e vai para a sua conta quando a conexão voltar."
        : "Não consegui salvar na sua conta agora. Está guardado neste aparelho e vou tentar de novo sozinho.",
      { id: "aprof-nuvem", duration: 8000, action: { label: "Tentar agora", onClick: () => void tentarTudo() } },
    );
  }
  agendar();
}

/** Chame quando uma gravação der certo (tira a chave da fila). */
export function salvouNaNuvem(chave: string) {
  if (!pendentes.delete(chave)) return;
  if (pendentes.size === 0) void tentarTudo();
}

/** Para testes. */
export function pendentesNaNuvem(): number {
  return pendentes.size;
}
