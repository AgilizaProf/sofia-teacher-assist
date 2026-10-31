import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingDone, shouldShowOnboarding } from "@/lib/onboarding";
import { trackEvent } from "@/lib/tracking";
import logoImg from "@/assets/agilizaprof-logo.webp";

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
.pa-root{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px;font-family:'Inter',-apple-system,sans-serif;color:#0F172A;background:#F8FAFC;position:relative;overflow:hidden;}
.pa-card{position:relative;z-index:1;width:100%;max-width:420px;background:#fff;border-radius:16px;padding:32px 28px;border:1px solid #E2E8F0;box-shadow:0 10px 30px rgba(15,23,42,.06);animation:pa-in .5s cubic-bezier(.2,.8,.2,1) both;}
@keyframes pa-in{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:none;}}
.pa-logo{width:48px;height:48px;border-radius:14px;overflow:hidden;margin-bottom:18px;}
.pa-logo img{width:100%;height:100%;object-fit:cover;display:block;}
.pa-card h1{margin:0 0 6px;font-weight:700;font-size:24px;letter-spacing:-.02em;line-height:1.15;}
.pa-card p.sub{margin:0 0 24px;color:#64748B;font-size:14.5px;line-height:1.5;}
.pa-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
.pa-field label{font-size:13px;font-weight:700;color:#334155;}
.pa-field input{height:48px;border:1.5px solid #E2E8F0;border-radius:12px;padding:0 14px;font-size:16px;font-family:inherit;color:#1E293B;background:#F8FAFC;transition:border-color .15s,background .15s,box-shadow .15s;}
.pa-field input:focus{outline:none;border-color:#2563EB;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.15);}
.pa-hint{font-size:12px;color:#94A3B8;}
.pa-error{font-size:13px;color:#DC2626;background:#FEF2F2;border-radius:10px;padding:10px 12px;margin-bottom:14px;}
.pa-btn{width:100%;height:48px;border:0;border-radius:10px;font-family:inherit;font-size:15px;font-weight:600;color:#fff;cursor:pointer;background:#2563EB;transition:background .15s;}
.pa-btn:hover{background:#1D4ED8;}
.pa-btn:disabled{opacity:.6;cursor:default;}
@media (prefers-reduced-motion: reduce){`;

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
      setError("Informe seu nome.");
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
      <form className="pa-card" onSubmit={onSubmit} noValidate>
        <div className="pa-logo">
          <img src={logoImg} alt="AgilizaProf" />
        </div>
        <h1>Bem-vindo(a) ao AgilizaProf</h1>
        <p className="sub">Antes de começar, confirme seu nome e WhatsApp.</p>

        <div className="pa-field">
          <label htmlFor="pa-nome">Seu nome</label>
          <input
            id="pa-nome"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como você quer ser chamado(a)?"
            autoFocus
          />
        </div>

        <div className="pa-field">
          <label htmlFor="pa-tel">WhatsApp</label>
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
