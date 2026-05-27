import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { captureReferralFromUrl, getPendingReferral } from "@/lib/referral";
import { shouldShowOnboarding } from "@/lib/onboarding";
import logoImg from "@/assets/agilizaprof-logo.webp";

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
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
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
        navigate({ to: await postLoginRoute() });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

 const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      toast.error("Não foi possível entrar com o Google. Tente novamente.");
      console.error("OAuth error:", error);
    }
  };
  const apple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error("Não foi possível entrar com a Apple.");
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
            <div className="logo"><img src={logoImg} alt="AgilizaProf" className="logo-img" />Agiliza<span>Prof</span></div>
            <div className="headline-block">
              <span className="eyebrow"><span className="star">★</span>Feito de professores para professores</span>
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
              <button type="button" className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Cadastrar grátis</button>
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
        <div onClick={() => setForgotOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,27,54,.55)", display: "grid", placeItems: "center", zIndex: 50, padding: 20, fontFamily: "'Inter',-apple-system,sans-serif" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 18, padding: 28, boxShadow: "0 30px 60px -20px rgba(0,0,0,.35)" }}>
            <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 22, color: "#1B2A4E", margin: 0 }}>Recuperar senha</h3>
            <p style={{ fontSize: 14, color: "#5B6B82", marginTop: 6, marginBottom: 18 }}>Informe seu e-mail e enviaremos um link para você criar uma nova senha.</p>
            <form onSubmit={sendReset} style={{ display: "grid", gap: 10 }}>
              <input type="email" placeholder="seu@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required style={{ padding: "12px 14px", borderRadius: 10, border: "2px solid #DDE3EE", fontSize: 15, fontFamily: "inherit", outline: "none" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setForgotOpen(false)} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "2px solid #DDE3EE", background: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#1B2A4E" }}>Cancelar</button>
                <button type="submit" disabled={forgotLoading} style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#FF7A45,#FF9466)", color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", opacity: forgotLoading ? .7 : 1 }}>{forgotLoading ? "Enviando..." : "Enviar link"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const css = `
:root{--primary:#1B2A4E;--primary-dark:#0F1B36;--primary-soft:#EEF1F8;--accent:#FF7A45;--accent-warm:#FF9466;--uol-orange:#FF6600;--bg:#FFFFFF;--bg-soft:#F7F8FB;--text:#1B2A4E;--text-soft:#5B6B82;--border:#DDE3EE;}
.split{min-height:100vh;display:grid;grid-template-columns:1.05fr 1fr;font-family:'Inter',-apple-system,sans-serif;color:var(--text);line-height:1.5;-webkit-font-smoothing:antialiased;}
.split h2{font-family:'Fraunces',Georgia,serif;letter-spacing:-0.02em;color:var(--primary);line-height:1.15;}
.left{background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);color:#fff;padding:56px 64px;display:flex;flex-direction:column;position:relative;overflow:hidden;}
.left::before{content:"";position:absolute;top:-150px;right:-150px;width:500px;height:500px;background:radial-gradient(circle,rgba(255,122,69,.20) 0%,transparent 65%);border-radius:50%;pointer-events:none;}
.left::after{content:"";position:absolute;bottom:-200px;left:-200px;width:600px;height:600px;background:radial-gradient(circle,rgba(255,148,102,.10) 0%,transparent 65%);border-radius:50%;pointer-events:none;}
.left-inner{position:relative;z-index:1;display:flex;flex-direction:column;height:100%;gap:40px;}
.logo{font-family:'Fraunces',serif;font-weight:900;font-size:30px;color:#fff;letter-spacing:-0.04em;line-height:1;display:flex;align-items:center;gap:12px;}
.logo-img{width:44px;height:44px;border-radius:10px;object-fit:cover;box-shadow:0 8px 24px rgba(255,122,69,.35);}
.logo span{color:var(--accent);}
.headline-block{display:flex;flex-direction:column;justify-content:flex-start;gap:30px;max-width:560px;margin-top:24px;}
.eyebrow{display:inline-flex;align-items:center;gap:10px;align-self:flex-start;background:rgba(255,255,255,.10);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.20);padding:9px 18px;border-radius:100px;font-size:12px;font-weight:700;color:#fff;letter-spacing:.06em;line-height:1.3;text-transform:uppercase;}
.eyebrow .star{color:var(--accent);font-size:14px;line-height:1;}
.headline{font-family:'Fraunces',serif;font-weight:800;font-size:clamp(40px,4.6vw,58px);line-height:1.05;color:#fff;letter-spacing:-0.025em;}
.headline .accent{color:var(--accent);position:relative;display:inline-block;}
.headline .accent::after{content:"";position:absolute;left:0;right:0;bottom:6px;height:12px;background:rgba(255,122,69,.20);z-index:-1;border-radius:4px;}
.subhead{font-size:19px;line-height:1.55;color:rgba(255,255,255,.85);font-weight:400;max-width:520px;}
.subhead strong{color:#fff;font-weight:700;}
.uol-card{background:rgba(255,255,255,.08);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:22px 24px;display:flex;align-items:center;gap:18px;position:relative;overflow:hidden;align-self:flex-start;max-width:560px;}
.uol-card::before{content:"";position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);animation:shine 4s ease-in-out infinite;}
@keyframes shine{0%,70%{left:-100%;}100%{left:200%;}}
.uol-icon{font-size:32px;flex-shrink:0;filter:drop-shadow(0 2px 8px rgba(0,0,0,.2));}
.uol-body{flex:1;min-width:0;position:relative;}
.uol-line{display:flex;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap;}
.uol-logo{font-family:'Fraunces',serif;font-weight:900;font-size:24px;color:var(--uol-orange);letter-spacing:-0.05em;line-height:1;}
.uol-tag{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.10em;background:rgba(255,255,255,.15);color:#fff;padding:4px 10px;border-radius:100px;}
.uol-quote{font-family:'Fraunces',serif;font-style:italic;font-weight:600;color:#fff;font-size:15px;line-height:1.4;}
.right{background:var(--bg);padding:56px 64px;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;}
.right-shell{width:100%;max-width:440px;}
.tabs{display:grid;grid-template-columns:1fr 1fr;background:var(--bg-soft);border:1px solid var(--border);border-radius:14px;padding:5px;margin-bottom:32px;}
.tab{padding:12px 8px;border:none;background:transparent;cursor:pointer;font-weight:700;font-size:14px;color:var(--text-soft);border-radius:10px;transition:all .25s;font-family:inherit;}
.tab.active{background:#fff;color:var(--primary);box-shadow:0 2px 10px rgba(27,42,78,.10);}
.form-title{font-family:'Fraunces',serif;font-weight:800;font-size:34px;color:var(--primary);margin-bottom:8px;line-height:1.15;}
.form-sub{font-size:15px;color:var(--text-soft);margin-bottom:32px;}
.form-sub strong{color:var(--accent);font-weight:700;}
.google-btn{width:100%;padding:14px 18px;border-radius:12px;background:#fff;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;gap:12px;font-weight:700;font-size:15px;color:var(--text);cursor:pointer;transition:all .25s;font-family:inherit;}
.google-btn:hover{border-color:var(--primary);box-shadow:0 8px 22px rgba(27,42,78,.10);transform:translateY(-1px);}
.google-icon{width:20px;height:20px;flex-shrink:0;}
.divider{display:flex;align-items:center;gap:14px;margin:24px 0;}
.divider::before,.divider::after{content:"";flex:1;height:1px;background:var(--border);}
.divider span{font-size:12px;color:var(--text-soft);font-weight:600;text-transform:uppercase;letter-spacing:.08em;}
.field{margin-bottom:18px;}
.field label{display:block;font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px;}
.input-wrap{position:relative;}
.input{width:100%;padding:14px 16px 14px 46px;border:2px solid var(--border);border-radius:12px;font-size:15px;font-family:inherit;color:var(--text);background:#fff;transition:all .2s;}
.input::placeholder{color:#A8B3C7;}
.input:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 4px rgba(27,42,78,.08);}
.input-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--text-soft);width:20px;height:20px;pointer-events:none;}
.password-toggle{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-soft);padding:4px;display:flex;align-items:center;border-radius:6px;}
.password-toggle:hover{color:var(--primary);}
.password-strength{margin-top:10px;}
.strength-bar{height:5px;background:var(--bg-soft);border-radius:3px;overflow:hidden;margin-bottom:6px;}
.strength-fill{height:100%;transition:width .3s,background .3s;border-radius:3px;}
.strength-label{font-size:12px;font-weight:600;color:var(--text-soft);}
.row{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:8px;}
.checkbox-wrap{display:flex;align-items:center;gap:10px;cursor:pointer;}
.checkbox-wrap input{width:18px;height:18px;cursor:pointer;accent-color:var(--accent);}
.checkbox-wrap label{font-size:14px;color:var(--text);cursor:pointer;font-weight:500;}
.forgot-link{font-size:13px;color:var(--primary);text-decoration:none;font-weight:700;}
.forgot-link:hover{color:var(--accent);}
.cta{width:100%;padding:16px 24px;border:none;border-radius:12px;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-warm) 100%);color:#fff;font-weight:800;font-size:16px;cursor:pointer;font-family:inherit;transition:all .25s;box-shadow:0 10px 28px rgba(255,122,69,.35);display:flex;align-items:center;justify-content:center;gap:10px;}
.cta:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(255,122,69,.45);}
.cta:disabled{opacity:.7;cursor:not-allowed;}
.cta-arrow{transition:transform .2s;}
.cta:hover .cta-arrow{transform:translateX(4px);}
.more-opts{text-align:center;margin-top:16px;}
.more-opts button{background:none;border:none;color:var(--text-soft);font-size:13px;cursor:pointer;font-family:inherit;font-weight:600;text-decoration:underline;text-underline-offset:3px;}
.more-opts button:hover{color:var(--primary);}
.more-content{margin-top:14px;}
.apple-btn{width:100%;padding:13px 18px;border-radius:12px;background:#000;color:#fff;border:none;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;}
.apple-btn:hover{opacity:.85;}
.trust-row{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:32px;padding-top:24px;border-top:1px solid var(--border);flex-wrap:wrap;}
.trust-item{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-soft);font-weight:600;}
.trust-item .ic{font-size:14px;}
.legal{text-align:center;font-size:11.5px;color:var(--text-soft);margin-top:16px;line-height:1.6;}
.legal a{color:var(--primary);text-decoration:underline;font-weight:600;}
.toast{background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;padding:12px 16px;border-radius:12px;font-size:13.5px;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px;}
.toast strong{display:block;margin-bottom:2px;}
@media(max-width:1024px){.split{grid-template-columns:1fr;}.left{padding:40px 32px 60px;}.left-inner{gap:28px;}.headline-block{margin-top:8px;}.right{padding:48px 32px 56px;}}
@media(max-width:560px){.left{padding:32px 24px 48px;}.right{padding:36px 24px 48px;}.headline{font-size:34px;}.subhead{font-size:16px;}.form-title{font-size:28px;}.uol-card{padding:18px;flex-direction:column;align-items:flex-start;}.trust-row{gap:12px;}}
`;
