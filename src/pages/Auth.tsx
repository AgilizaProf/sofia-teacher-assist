import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { captureReferralFromUrl, getPendingReferral } from "@/lib/referral";
import { shouldShowOnboarding } from "@/lib/onboarding";
import { PencilLogo } from "@/components/painel/PainelNav";
import { trackEvent } from "@/lib/tracking";

async function postLoginRoute(): Promise<"/" | "/onboarding"> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return "/";
    const show = await shouldShowOnboarding(uid);
    return show ? "/onboarding" : "/";
  } catch {
    return "/";
  }
}

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    captureReferralFromUrl();
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const to = await postLoginRoute();
        navigate({ to });
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (mode === "login") {
      trackEvent("page_view_login", { location: "login_page" });
    } else {
      trackEvent("page_view_cadastro", { location: "register_page" });
    }
  }, [mode]);

  const checkStrength = (v: string) => {
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    setStrength(s);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        trackEvent("click_cadastrar_gratis", { location: "register_page" });
        const ref = getPendingReferral();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name, ref_code: ref || undefined },
          },
        });
        if (error) throw error;
        trackEvent("cadastro_concluido", { location: "register_page" });
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        trackEvent("click_logar", { location: "login_page" });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        try {
          if (remember) {
            localStorage.removeItem("sofia_no_persist");
          } else {
            localStorage.setItem("sofia_no_persist", "1");
          }
          sessionStorage.setItem("sofia_tab_alive", "1");
        } catch {
          /* ignore */
        }
        trackEvent("login_concluido", { location: "login_page" });
        navigate({ to: await postLoginRoute() });
      }
    } catch (err) {
      trackEvent("form_error", {
        location: mode === "login" ? "login_page" : "register_page",
        error: err instanceof Error ? err.message : "auth_error",
      });
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google. Tente novamente.");
      console.error("OAuth error:", result.error);
      return;
    }
    if (result.redirected) {
      return;
    }
  };
  const apple = async () => {
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com a Apple.");
      console.error("OAuth error:", result.error);
      return;
    }
    if (result.redirected) {
      return;
    }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const { requestPasswordReset } = await import("@/lib/passwordReset.functions");
      const res = await requestPasswordReset({
        data: { email: forgotEmail, redirectTo: `${window.location.origin}/reset-password` },
      });
      if (!res.ok && res.blocked) {
        const motivo = res.reason === "email"
          ? "Muitas tentativas para este e-mail."
          : "Muitas tentativas a partir desta rede.";
        toast.error(`${motivo} Tente novamente em ~${res.waitMinutes} min.`);
        return;
      }
      toast.success("Se o e-mail estiver cadastrado, enviaremos um link de redefinição em instantes.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o e-mail.");
    } finally {
      setForgotLoading(false);
    }
  };

  const pcts = ["25%", "50%", "75%", "100%"];
  const colors = ["#EF4444", "#F59E0B", "#3B82F6", "#10B981"];
  const labels = ["Fraca", "Razoável", "Boa", "Forte"];

  return (
    <>
      <style>{css}</style>
      <div className="split">
        <aside className="left">
          <div className="left-inner">
            <div className="logo"><PencilLogo size={46} /><span>Agiliza<b>Prof</b></span></div>
            <div className="headline-block">
              <span className="eyebrow"><span className="star">★</span> Feito de professores para professores</span>
              <h1 className="headline">A <span className="accent">1ª IA pedagógica</span> treinada e alinhada à BNCC do Brasil.</h1>
              <p className="subhead">Pareceres, planejamentos e atividades inclusivas em <strong>5 minutos</strong>. Feita exclusivamente para a Educação Infantil e o Fundamental I.</p>
              <div className="uol-card">
                <span className="uol-icon">🗞️</span>
                <div className="uol-body">
                  <div className="uol-line">
                    <span className="uol-logo">UOL</span>
                    <span className="uol-tag">⭐ Destaque nacional</span>
                  </div>
                  <p className="uol-quote">"Aplicativo nasce da exaustão docente e propõe devolver tempo aos professores."</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="right">
          <div className="right-shell">
            <div className="tabs">
              <button type="button" className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Entrar</button>
              <button type="button" className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => { trackEvent("click_cadastrar_gratis", { location: "login_page" }); setMode("register"); }}>Cadastrar grátis</button>
            </div>

            <h2 className="form-title">{mode === "login" ? "Bem-vindo(a) de volta" : "Comece grátis hoje"}</h2>
            <p className="form-sub">
              {mode === "login" ? "Entre para continuar economizando seu tempo." : <><strong>14 dias com tudo liberado.</strong> Sem cartão de crédito. Sem pegadinha.</>}
            </p>

            {popupBlocked && (
              <div className="toast show">
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <strong>O pop-up do Google foi bloqueado.</strong>
                  Permita pop-ups no navegador e tente novamente — ou continue com seu e-mail abaixo.
                </div>
              </div>
            )}

            <button type="button" className="google-btn" onClick={google}>
              <svg className="google-icon" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span>Continuar com Google</span>
            </button>

            <div className="divider"><span>ou continue com seu e-mail</span></div>

            <form onSubmit={submit}>
              {mode === "register" && (
                <div className="field">
                  <label htmlFor="name">Nome</label>
                  <div className="input-wrap">
                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <input className="input" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
                  </div>
                </div>
              )}

              <div className="field">
                <label htmlFor="email">E-mail</label>
                <div className="input-wrap">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 6-10 7L2 6"/></svg>
                  <input className="input" type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                </div>
              </div>

              <div className="field">
                <label htmlFor="password">Senha</label>
                <div className="input-wrap">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input className="input" type={showPwd ? "text" : "password"} id="password" value={password} onChange={(e) => { setPassword(e.target.value); checkStrength(e.target.value); }} placeholder="Mínimo 8 caracteres" minLength={8} required />
                  <button type="button" className="password-toggle" onClick={() => setShowPwd(!showPwd)} aria-label="Mostrar senha">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
                {password && mode === "register" && (
                  <div className="password-strength show">
                    <div className="strength-bar"><div className="strength-fill" style={{ width: strength ? pcts[strength - 1] : 0, background: strength ? colors[strength - 1] : "#EF4444" }} /></div>
                    <div className="strength-label">{strength ? labels[strength - 1] : "Força da senha"}</div>
                  </div>
                )}
              </div>

              <div className="row">
                <div className="checkbox-wrap">
                  <input type="checkbox" id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <label htmlFor="remember">Permanecer conectado</label>
                </div>
                <button type="button" className="forgot-link" onClick={() => { setForgotEmail(email); setForgotOpen(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Esqueci minha senha</button>
              </div>

              <button type="submit" className="cta" disabled={loading}>
                <span>{loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar minha conta grátis"}</span>
                <svg className="cta-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            </form>

            <div className="more-opts">
              <button type="button" onClick={() => setShowMore(!showMore)}>+ Mais opções de login</button>
            </div>
            {showMore && (
              <div className="more-content show">
                <button type="button" className="apple-btn" onClick={apple}> Continuar com Apple</button>
              </div>
            )}

            <div className="trust-row">
              <span className="trust-item"><span className="ic">🔒</span>100% LGPD</span>
              <span className="trust-item"><span className="ic">🛡️</span>Dados criptografados</span>
              <span className="trust-item"><span className="ic">🇧🇷</span>Servidor no Brasil</span>
            </div>

            <p className="legal">
              Ao continuar você concorda com os <a href="/termos">Termos de uso</a> e a <a href="/privacidade">Política de privacidade</a>.
            </p>
          </div>
        </main>
      </div>
      {forgotOpen && (
        <div onClick={() => setForgotOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,22,31,.55)", display: "grid", placeItems: "center", zIndex: 50, padding: 20, fontFamily: "'DM Sans',-apple-system,sans-serif" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 18, padding: 28, border: "2px solid #14161F", boxShadow: "6px 6px 0 #14161F" }}>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, letterSpacing: "-.03em", fontSize: 22, color: "#14161F", margin: 0 }}>Recuperar senha</h3>
            <p style={{ fontSize: 14, color: "#596074", marginTop: 6, marginBottom: 18 }}>Informe seu e-mail e enviaremos um link para você criar uma nova senha.</p>
            <form onSubmit={sendReset} style={{ display: "grid", gap: 10 }}>
              <input type="email" placeholder="seu@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required style={{ padding: "12px 14px", borderRadius: 10, border: "1.5px solid #D6DBE5", fontSize: 15, fontFamily: "inherit", outline: "none" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setForgotOpen(false)} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "2px solid #14161F", background: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#14161F" }}>Cancelar</button>
                <button type="submit" disabled={forgotLoading} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "2px solid #14161F", background: "#0B7A55", boxShadow: "3px 3px 0 #14161F", color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", opacity: forgotLoading ? .7 : 1 }}>{forgotLoading ? "Enviando..." : "Enviar link"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const css = `
:root{--ink:#14161F;--green:#0B7A55;--green-soft:#CDEFE2;--sun:#FFB224;--coral:#F2604B;--ground:#EDF0F5;--line:#D6DBE5;--muted:#596074;}
.split{min-height:100vh;display:grid;grid-template-columns:1.05fr 1fr;font-family:'DM Sans',-apple-system,sans-serif;color:var(--ink);line-height:1.5;-webkit-font-smoothing:antialiased;background:var(--ground);}
.split h2{font-family:'Sora',sans-serif;letter-spacing:-.04em;color:var(--ink);line-height:1.15;}
.left{padding:48px 56px;display:flex;flex-direction:column;position:relative;}
.left-inner{display:flex;flex-direction:column;height:100%;gap:40px;}
.logo{font-family:'Sora',sans-serif;font-weight:800;font-size:28px;color:var(--ink);letter-spacing:-.045em;line-height:1;display:flex;align-items:center;gap:10px;}
.logo b{color:var(--green);font-weight:800;}
.headline-block{display:flex;flex-direction:column;gap:26px;max-width:560px;margin-top:20px;}
.eyebrow{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;background:var(--sun);border:2px solid var(--ink);padding:7px 14px;border-radius:10px;font-size:12px;font-weight:700;color:var(--ink);letter-spacing:.05em;line-height:1.3;text-transform:uppercase;}
.eyebrow .star{font-size:13px;line-height:1;}
.headline{font-family:'Sora',sans-serif;font-weight:800;font-size:clamp(38px,4.4vw,56px);line-height:1.05;color:var(--ink);letter-spacing:-.05em;margin:0;}
.headline .accent{color:var(--green);box-shadow:inset 0 -.28em 0 var(--green-soft);}
.subhead{font-size:18px;line-height:1.55;color:var(--muted);max-width:520px;margin:0;}
.subhead strong{color:var(--ink);font-weight:700;}
.uol-card{background:#fff;border:2px solid var(--ink);box-shadow:4px 4px 0 var(--ink);border-radius:16px;padding:18px 20px;display:flex;align-items:center;gap:16px;align-self:flex-start;max-width:540px;}
.uol-icon{font-size:30px;flex-shrink:0;}
.uol-body{flex:1;min-width:0;}
.uol-line{display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap;}
.uol-logo{font-family:'Sora',sans-serif;font-weight:800;font-size:22px;color:#0B7A55;letter-spacing:-.05em;line-height:1;}
.uol-tag{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;background:var(--green-soft);color:#064E36;padding:3px 8px;border-radius:6px;}
.uol-quote{font-weight:600;color:var(--ink);font-size:15px;line-height:1.4;margin:0;}
.right{padding:48px 56px;display:flex;flex-direction:column;justify-content:center;align-items:center;}
.right-shell{width:100%;max-width:460px;background:#fff;border:2px solid var(--ink);border-radius:22px;box-shadow:6px 6px 0 var(--ink);padding:30px 30px 24px;}
.tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:var(--ground);border:1.5px solid var(--line);border-radius:12px;padding:5px;margin-bottom:26px;}
.tab{padding:11px 8px;border:2px solid transparent;background:transparent;cursor:pointer;font-weight:700;font-size:14px;color:var(--muted);border-radius:9px;font-family:inherit;}
.tab.active{background:var(--ink);color:#fff;}
.form-title{font-family:'Sora',sans-serif;font-weight:800;font-size:30px;margin:0 0 6px;}
.form-sub{font-size:15px;color:var(--muted);margin:0 0 24px;}
.form-sub strong{color:var(--green);font-weight:700;}
.google-btn{width:100%;padding:13px 18px;border-radius:12px;background:#fff;border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);display:flex;align-items:center;justify-content:center;gap:12px;font-weight:700;font-size:15px;color:var(--ink);cursor:pointer;transition:transform .12s,box-shadow .12s;font-family:inherit;}
.google-btn:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--ink);}
.google-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink);}
.google-icon{width:20px;height:20px;flex-shrink:0;}
.divider{display:flex;align-items:center;gap:14px;margin:22px 0;}
.divider::before,.divider::after{content:"";flex:1;height:1.5px;background:var(--line);}
.divider span{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em;}
.field{margin-bottom:16px;}
.field label{display:block;font-family:'Sora',sans-serif;font-size:13.5px;font-weight:700;margin-bottom:7px;}
.input-wrap{position:relative;}
.input{width:100%;padding:13px 16px 13px 44px;border:1.5px solid var(--line);border-radius:12px;font-size:15.5px;font-family:inherit;color:var(--ink);background:#fff;transition:border-color .15s,box-shadow .15s;}
.input::placeholder{color:#9AA1B2;}
.input:focus{outline:none;border-color:var(--ink);box-shadow:0 0 0 3px var(--green-soft);}
.input-icon{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--muted);width:19px;height:19px;pointer-events:none;}
.password-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;display:flex;align-items:center;border-radius:6px;}
.password-toggle:hover{color:var(--ink);}
.password-strength{margin-top:10px;}
.strength-bar{height:6px;background:var(--ground);border-radius:3px;overflow:hidden;margin-bottom:6px;}
.strength-fill{height:100%;transition:width .3s,background .3s;border-radius:3px;}
.strength-label{font-size:12px;font-weight:600;color:var(--muted);}
.row{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:8px;}
.checkbox-wrap{display:flex;align-items:center;gap:9px;cursor:pointer;}
.checkbox-wrap input{width:18px;height:18px;cursor:pointer;accent-color:var(--green);}
.checkbox-wrap label{font-size:14px;color:var(--ink);cursor:pointer;font-weight:500;}
.forgot-link{font-size:13.5px;color:var(--green);font-weight:700;text-decoration:underline;text-underline-offset:3px;}
.cta{width:100%;padding:15px 24px;border:2px solid var(--ink);border-radius:12px;background:var(--green);color:#fff;font-family:'Sora',sans-serif;font-weight:800;font-size:16px;letter-spacing:-.02em;cursor:pointer;box-shadow:4px 4px 0 var(--ink);display:flex;align-items:center;justify-content:center;gap:10px;transition:transform .12s,box-shadow .12s;}
.cta:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--ink);}
.cta:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink);}
.cta:disabled{opacity:.7;cursor:not-allowed;transform:none;}
.more-opts{text-align:center;margin-top:16px;}
.more-opts button{background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;font-family:inherit;font-weight:600;text-decoration:underline;text-underline-offset:3px;}
.more-opts button:hover{color:var(--ink);}
.more-content{margin-top:12px;}
.apple-btn{width:100%;padding:12px 18px;border-radius:12px;background:var(--ink);color:#fff;border:2px solid var(--ink);display:flex;align-items:center;justify-content:center;gap:10px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;}
.trust-row{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:24px;padding-top:18px;border-top:1.5px solid var(--line);flex-wrap:wrap;}
.trust-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);font-weight:600;}
.trust-item .ic{font-size:14px;}
.legal{text-align:center;font-size:11.5px;color:var(--muted);margin:14px 0 0;line-height:1.6;}
.legal a{color:var(--ink);text-decoration:underline;font-weight:600;}
.toast{background:#FDE3DE;border:1.5px solid var(--coral);color:#A3301F;padding:12px 14px;border-radius:12px;font-size:13.5px;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px;}
.toast strong{display:block;margin-bottom:2px;}
@media(max-width:1024px){.split{grid-template-columns:1fr;}.left{padding:28px 24px 8px;}.left-inner{gap:22px;}.headline-block{margin-top:0;gap:18px;}.right{padding:12px 24px 48px;order:0;}.uol-card{display:none;}}
@media(max-width:560px){.left{padding:20px 16px 4px;}.right{padding:10px 16px 40px;}.right-shell{padding:22px 18px 18px;border-radius:18px;box-shadow:4px 4px 0 var(--ink);}.logo{font-size:24px;}.headline{font-size:30px;}.subhead{display:none;}.eyebrow{font-size:11px;}.form-title{font-size:25px;}.trust-row{gap:10px;}}
`;
