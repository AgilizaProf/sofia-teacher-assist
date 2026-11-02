import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingDone, shouldShowOnboarding } from "@/lib/onboarding";
import { trackEvent } from "@/lib/tracking";
import { PencilLogo } from "@/components/painel/PainelNav";

// Primeiro acesso: pede apenas nome e WhatsApp e leva direto à página inicial.
// A rota continua sendo "/onboarding" porque o guard de autenticação
// (useAuthGuard) e o pós-login (Auth.tsx) redirecionam pra cá enquanto o
// perfil não tem telefone válido.
export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Bem-vindo(a) · AgilizaProf" },
      { name: "description", content: "Complete seu cadastro para começar a usar o AgilizaProf." },
    ],
  }),
  component: PrimeiroAcessoPage,
});

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const css = `
.pa-root{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:24px 16px;font-family:'DM Sans',-apple-system,sans-serif;color:#14161F;background:#EDF0F5;}
.pa-brand{display:inline-flex;align-items:center;gap:8px;font-family:'Sora',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.04em;}
.pa-brand b{color:#0B7A55;font-weight:800;}
.pa-card{width:100%;max-width:440px;background:#fff;border:2px solid #14161F;border-radius:20px;box-shadow:6px 6px 0 #14161F;padding:28px 26px;}
.pa-card h1{margin:0 0 6px;font-family:'Sora',sans-serif;font-weight:800;font-size:28px;letter-spacing:-.045em;line-height:1.12;}
.pa-card p.sub{margin:0 0 22px;color:#596074;font-size:15px;line-height:1.5;}
.pa-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
.pa-field label{font-family:'Sora',sans-serif;font-size:14px;font-weight:700;letter-spacing:-.01em;}
.pa-field input{height:50px;border:1.5px solid #D6DBE5;border-radius:12px;padding:0 14px;font-size:16px;font-family:inherit;color:#14161F;background:#fff;transition:border-color .15s,box-shadow .15s;}
.pa-field input:focus{outline:none;border-color:#14161F;box-shadow:0 0 0 3px #CDEFE2;}
.pa-hint{font-size:12.5px;color:#596074;}
.pa-error{font-size:13.5px;font-weight:600;color:#A3301F;background:#FDE3DE;border:1.5px solid #F2604B;border-radius:12px;padding:10px 12px;margin-bottom:14px;}
.pa-btn{width:100%;height:52px;border:2px solid #14161F;border-radius:12px;font-family:'Sora',sans-serif;font-size:16px;font-weight:800;letter-spacing:-.02em;color:#fff;cursor:pointer;background:#0B7A55;box-shadow:4px 4px 0 #14161F;transition:transform .12s,box-shadow .12s;}
.pa-btn:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 #14161F;}
.pa-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #14161F;}
.pa-btn:disabled{opacity:.6;cursor:default;transform:none;}
`;

function PrimeiroAcessoPage() {
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("onboarding_iniciado", { location: "onboarding" });
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (user) {
          const show = await shouldShowOnboarding(user.id);
          if (!show) {
            window.location.replace("/");
            return;
          }
          const { data: prof } = await supabase
            .from("profiles")
            .select("display_name, telefone")
            .eq("user_id", user.id)
            .maybeSingle();
          const meta = user.user_metadata as Record<string, unknown> | undefined;
          const metaName =
            typeof meta?.full_name === "string"
              ? meta.full_name
              : typeof meta?.name === "string"
                ? meta.name
                : "";
          if (!cancelled) {
            setName((prof?.display_name || metaName || "").trim());
            if (prof?.telefone) setPhone(formatPhone(prof.telefone));
          }
        }
      } catch {
        /* ignore — o formulário funciona mesmo sem pré-preenchimento */
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const nome = name.trim();
    const digits = phone.replace(/\D/g, "");
    if (nome.length < 2) {
      setError("Diga como podemos te chamar.");
      return;
    }
    if (digits.length < 10 || digits.length > 11) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }
    setSaving(true);
    const ok = await markOnboardingDone({ name: nome, phone: digits });
    if (ok) {
      trackEvent("onboarding_concluido", { location: "onboarding" });
      window.location.assign("/");
      return;
    }
    setSaving(false);
    setError("Não foi possível salvar agora. Tente novamente.");
  }

  if (!ready) return null;

  return (
    <div className="pa-root">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="pa-brand">
        <PencilLogo size={40} />
        <span>
          Agiliza<b>Prof</b>
        </span>
      </div>
      <form className="pa-card" onSubmit={onSubmit} noValidate>
        <h1>Que bom ter você aqui!</h1>
        <p className="sub">
          Antes de começar, só duas coisas: como podemos te chamar e o seu celular.
        </p>

        <div className="pa-field">
          <label htmlFor="pa-nome">Como podemos te chamar?</label>
          <input
            id="pa-nome"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Prof. Ana"
            autoFocus
          />
        </div>

        <div className="pa-field">
          <label htmlFor="pa-tel">Número do celular (WhatsApp)</label>
          <input
            id="pa-tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(11) 91234-5678"
          />
          <span className="pa-hint">Usamos só para avisos importantes da sua conta.</span>
        </div>

        {error && (
          <div className="pa-error" role="alert">
            {error}
          </div>
        )}

        <button className="pa-btn" type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Começar"}
        </button>
      </form>
    </div>
  );
}
