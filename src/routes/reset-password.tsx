import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Redefinir senha · AgilizaProf" }],
  }),
  component: ResetPasswordPage,
});

function evaluatePassword(pw: string) {
  const checks = {
    length: pw.length >= 10,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

/** true se o token veio de um link de recuperação de senha aberto há pouco. */
function isRecoverySession(accessToken: string): boolean {
  try {
    const part = accessToken.split(".")[1] ?? "";
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    const amr: { method?: string; timestamp?: number }[] = Array.isArray(json?.amr) ? json.amr : [];
    const now = Date.now() / 1000;
    return amr.some(
      (m) => (m.method === "recovery" || m.method === "otp") && (!m.timestamp || now - m.timestamp < 60 * 60),
    );
  } catch {
    return false;
  }
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Segurança: aceitar APENAS sessões originadas do link de recuperação
    // recém-aberto. Se houver uma sessão antiga no navegador (ex.: dispositivo
    // compartilhado), ela é descartada para impedir que outro usuário troque
    // a senha de quem estava logado anteriormente.
    let cancelled = false;
    let recovered = false;

    const finalizeRecovery = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setInvalidLink(true);
        return;
      }
      recovered = true;
      setRecoveryUserId(data.user.id);
      setRecoveryEmail(data.user.email ?? null);
      setReady(true);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") void finalizeRecovery();
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash || "";
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash") || hashParams.get("token_hash");
        const type = url.searchParams.get("type") || hashParams.get("type");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        // O cliente do Supabase já lê o link sozinho (detectSessionInUrl) e
        // costuma criar a sessão de recuperação antes desta tela abrir. Antes,
        // esta tela encerrava a sessão logo em seguida e o link era dado como
        // inválido. Agora aplicamos o token só se ele ainda estiver na URL e,
        // no fim, aceitamos apenas uma sessão que veio de um link de
        // recuperação recente (claim "amr" do token). Uma sessão antiga do
        // navegador (ex.: dispositivo compartilhado) continua sendo descartada.
        if (code) {
          await supabase.auth.exchangeCodeForSession(code).catch(() => {});
        } else if (tokenHash && type === "recovery") {
          await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash }).catch(() => {});
        } else if (accessToken && refreshToken && type === "recovery") {
          await supabase.auth
            .setSession({ access_token: accessToken, refresh_token: refreshToken })
            .catch(() => {});
        }
        // Limpa imediatamente os tokens da URL para evitar vazamento via
        // histórico do navegador, referer ou compartilhamento de link.
        if (code || tokenHash || accessToken) {
          window.history.replaceState({}, "", window.location.pathname);
        }
        if (cancelled || recovered) return;

        const { data } = await supabase.auth.getSession();
        if (cancelled || recovered) return;
        if (data.session && isRecoverySession(data.session.access_token)) {
          await finalizeRecovery();
        } else {
          if (data.session) await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          if (!cancelled) setInvalidLink(true);
        }
      } catch (err) {
        if (!cancelled) setInvalidLink(true);
      }
    })();

    const timer = setTimeout(() => {
      if (!recovered && !cancelled) setInvalidLink(true);
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const { checks, score } = evaluatePassword(password);
  const meets = checks.length && checks.upper && checks.lower && checks.digit && checks.special;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meets) return toast.error("A senha não atende aos requisitos mínimos de segurança.");
    if (password !== confirm) return toast.error("As senhas não coincidem.");
    if (recoveryEmail && password.toLowerCase().includes(recoveryEmail.split("@")[0].toLowerCase())) {
      return toast.error("A senha não pode conter partes do seu e-mail.");
    }
    // Garantir que ainda há sessão de recuperação ativa.
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session || !recoveryUserId || sess.session.user.id !== recoveryUserId) {
      toast.error("Sessão de recuperação expirada. Solicite um novo link.");
      setInvalidLink(true);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Invalida TODAS as sessões ativas em qualquer dispositivo,
      // garantindo que apenas o dono do e-mail consiga entrar novamente.
      await supabase.auth.signOut({ scope: "global" }).catch(() => {});
      toast.success("Senha atualizada! Por segurança, todas as sessões foram encerradas. Faça login novamente.");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  const barColors = ["#C2410C", "#B45309", "#B45309", "#3D8BFD", "#0B7A55"];
  const barLabels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
  // score vai de 1 a 5 com a senha preenchida; antes usava barColors[5] (inexistente)
  // e a barra e o rótulo "Forte" sumiam justamente na senha mais forte.
  const lvl = Math.min(4, Math.max(0, score - 1));
  const canSubmit = !loading && meets && password === confirm;
  const req: [boolean, string][] = [
    [checks.length, "Mínimo 10 caracteres"],
    [checks.upper, "Letra maiúscula"],
    [checks.lower, "Letra minúscula"],
    [checks.digit, "Número"],
    [checks.special, "Caractere especial (!@#$...)"],
  ];

  return (
    <div className="rp-root">
      <style>{rpCss}</style>
      <a href="/auth" className="rp-logo" aria-label="AgilizaProf">
        <svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="10" y="40" width="12" height="22" rx="5" fill="#F2604B" />
          <rect x="20" y="40" width="10" height="22" fill="#3D8BFD" />
          <rect x="30" y="40" width="40" height="22" fill="#0B7A55" />
          <polygon points="70,40 92,51 70,62" fill="#FFB224" />
          <polygon points="85,47.5 92,51 85,54.5" fill="#14161F" />
          <line x1="14" y1="28" x2="44" y2="28" stroke="#14161F" strokeWidth="6" strokeLinecap="round" />
          <line x1="6" y1="74" x2="32" y2="74" stroke="#14161F" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <span>
          Agiliza<b>Prof</b>
        </span>
      </a>
      <div className="rp-card">
        <h1>Redefinir senha</h1>
        <p className="rp-sub" role="status">
          {invalidLink
            ? "Este link é inválido ou já expirou. Volte para o login e peça um novo e-mail de recuperação."
            : ready
              ? "Escolha uma nova senha forte para a sua conta."
              : "Validando o link de recuperação..."}
        </p>
        {!ready && !invalidLink && <div className="rp-spin" aria-hidden="true" />}
        {invalidLink && (
          <button type="button" className="rp-btn" onClick={() => navigate({ to: "/auth" })}>
            Voltar para o login
          </button>
        )}
        {ready && !invalidLink && (
          <form onSubmit={submit} className="rp-form">
            <label className="rp-label" htmlFor="rp-pw">
              Nova senha
            </label>
            <div className="rp-field">
              <input
                id="rp-pw"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={10}
                required
                autoComplete="new-password"
              />
              <button type="button" className="rp-eye" onClick={() => setShow((v) => !v)}>
                {show ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {password.length > 0 && (
              <div>
                <div className="rp-bars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ background: i < score ? barColors[lvl] : "#D6DBE5" }} />
                  ))}
                </div>
                <div className="rp-strength" style={{ color: barColors[lvl] }}>
                  {barLabels[lvl]}
                </div>
                <ul className="rp-req">
                  {req.map(([ok, t]) => (
                    <li key={t} className={ok ? "ok" : ""}>
                      {ok ? "✓" : "○"} {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <label className="rp-label" htmlFor="rp-pw2">
              Confirme a nova senha
            </label>
            <div className="rp-field">
              <input
                id="rp-pw2"
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={10}
                required
                autoComplete="new-password"
              />
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="rp-err">As senhas ainda não são iguais.</p>
            )}
            <button type="submit" className="rp-btn" disabled={!canSubmit}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
            <p className="rp-foot">Sua senha é verificada contra vazamentos conhecidos antes de ser aceita.</p>
          </form>
        )}
      </div>
    </div>
  );
}

const rpCss = `
.rp-root{min-height:100dvh;background:#EDF0F5;color:#14161F;font-family:'DM Sans',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:24px 16px}
.rp-logo{display:flex;align-items:center;gap:10px;font-family:'Sora',system-ui,sans-serif;font-weight:800;font-size:24px;letter-spacing:-.03em;color:#14161F;text-decoration:none}
.rp-logo b{color:#0B7A55}
.rp-card{width:100%;max-width:440px;background:#fff;border:2px solid #14161F;border-radius:20px;box-shadow:5px 5px 0 #14161F;padding:28px}
.rp-card h1{font-family:'Sora',system-ui,sans-serif;font-weight:800;font-size:28px;letter-spacing:-.03em;margin:0}
.rp-sub{color:#596074;font-size:15px;margin:6px 0 20px}
.rp-spin{width:28px;height:28px;border-radius:50%;border:3px solid #CDEFE2;border-top-color:#0B7A55;animation:rpspin .8s linear infinite}
@keyframes rpspin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.rp-spin{animation:none}}
.rp-form{display:grid;gap:10px}
.rp-label{font-weight:700;font-size:14px;margin-top:4px}
.rp-field{display:flex;align-items:center;border:1.5px solid #D6DBE5;border-radius:12px;background:#fff}
.rp-field:focus-within{border-color:#0B7A55;box-shadow:0 0 0 3px #CDEFE2}
.rp-field input{flex:1;min-width:0;border:0;outline:0;background:transparent;padding:13px 14px;font:inherit;font-size:16px;color:#14161F}
.rp-eye{border:0;background:none;color:#0B7A55;font-weight:700;font-size:13px;padding:0 14px;min-height:44px;cursor:pointer}
.rp-bars{display:flex;gap:4px;margin:2px 0 6px}.rp-bars div{flex:1;height:5px;border-radius:3px}
.rp-strength{font-size:12px;font-weight:700;margin-bottom:6px}
.rp-req{list-style:none;padding:0;margin:0;display:grid;gap:3px;font-size:13px;color:#596074}
.rp-req li.ok{color:#0B7A55;font-weight:600}
.rp-err{color:#C2410C;font-size:13px;margin:0}
.rp-btn{margin-top:8px;width:100%;min-height:50px;border-radius:14px;border:2px solid #14161F;box-shadow:3px 3px 0 #14161F;background:#0B7A55;color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer}
.rp-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
.rp-btn:focus-visible,.rp-eye:focus-visible{outline:3px solid #FFB224;outline-offset:2px}
.rp-foot{font-size:12px;color:#596074;text-align:center;margin:4px 0 0}
`;
