import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/tracking";

/**
 * Página "pagamento confirmado" (mensal/anual).
 *
 * A14: o evento Purchase do Pixel só dispara quando a assinatura Pro do
 * Mercado Pago já está ativa no banco, no ciclo certo, e uma única vez por
 * preapproval (guardado no aparelho). Recarregar a página não conta de novo.
 * Nome e e-mail vão para o recibo (iframe da mesma origem) por postMessage,
 * nunca pela URL.
 */

const VALORES = { mensal: 34.9, anual: 247 } as const;
const JANELA_MS = 2 * 24 * 60 * 60 * 1000; // assinatura ativada há no máx. 2 dias
const TENTATIVAS = 10; // o webhook pode chegar alguns segundos depois
const INTERVALO_MS = 4000;
const CHAVE = "agp_purchase_tracked";

type Ciclo = keyof typeof VALORES;

function jaRegistrado(id: string): boolean {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE) || "[]") as unknown;
    return Array.isArray(lista) && lista.includes(id);
  } catch {
    return false;
  }
}

function marcarRegistrado(id: string) {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE) || "[]") as unknown;
    const arr = Array.isArray(lista) ? (lista as string[]) : [];
    if (!arr.includes(id)) arr.push(id);
    localStorage.setItem(CHAVE, JSON.stringify(arr.slice(-20)));
  } catch {
    /* sem armazenamento: melhor não disparar do que disparar em dobro */
  }
}

/** Confere a assinatura e dispara o Purchase uma vez. Devolve a data da compra. */
async function confirmarEDispararPurchase(ciclo: Ciclo, cancelado: () => boolean) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return null;

  for (let i = 0; i < TENTATIVAS && !cancelado(); i++) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plano, ciclo, status, source, started_at, updated_at, metadata")
      .eq("user_id", uid)
      .maybeSingle();
    const s = sub as {
      plano?: string;
      ciclo?: string | null;
      status?: string;
      source?: string;
      started_at?: string | null;
      updated_at?: string | null;
      metadata?: Record<string, unknown> | null;
    } | null;
    const preId =
      s?.metadata && typeof s.metadata.preapproval_id === "string"
        ? (s.metadata.preapproval_id as string)
        : null;
    const atualizadoMs = s?.updated_at ? new Date(s.updated_at).getTime() : 0;
    const ativa =
      !!s &&
      s.plano === "pro" &&
      s.status === "active" &&
      s.source === "mercadopago" &&
      s.ciclo === ciclo &&
      !!preId &&
      Date.now() - atualizadoMs < JANELA_MS;

    if (ativa && preId) {
      const eventId = `mp_${preId}`;
      if (!jaRegistrado(eventId)) {
        marcarRegistrado(eventId);
        trackEvent("plano_contratado", {
          plan: ciclo,
          value: VALORES[ciclo],
          currency: "BRL",
          event_id: eventId,
        });
      }
      return s.started_at || s.updated_at || null;
    }
    await new Promise((r) => setTimeout(r, INTERVALO_MS));
  }
  return null;
}

export function PagamentoConfirmado({ ciclo }: { ciclo: Ciclo }) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const recibo = useRef<{ name: string; email: string; purchase: string | null }>({
    name: "",
    email: "",
    purchase: null,
  });

  const enviarRecibo = () => {
    const w = frameRef.current?.contentWindow;
    if (!w || typeof window === "undefined") return;
    w.postMessage({ type: "agp-recibo", ...recibo.current }, window.location.origin);
  };

  useEffect(() => {
    let cancelado = false;
    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      if ((ev.data as { type?: string } | null)?.type === "agp-recibo-pronto") enviarRecibo();
    };
    window.addEventListener("message", onMsg);

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      recibo.current.name =
        (user?.user_metadata?.display_name as string | undefined) ||
        (user?.user_metadata?.name as string | undefined) ||
        (user?.email ? user.email.split("@")[0] : "");
      recibo.current.email = user?.email ?? "";
      enviarRecibo();
      const compra = await confirmarEDispararPurchase(ciclo, () => cancelado);
      if (compra && !cancelado) {
        recibo.current.purchase = compra;
        enviarRecibo();
      }
    })();

    return () => {
      cancelado = true;
      window.removeEventListener("message", onMsg);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciclo]);

  return (
    <iframe
      ref={frameRef}
      src={`/pagamento-confirmado-${ciclo}.html`}
      onLoad={enviarRecibo}
      title={`Pagamento confirmado · ${ciclo === "anual" ? "Anual" : "Mensal"}`}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none" }}
    />
  );
}
