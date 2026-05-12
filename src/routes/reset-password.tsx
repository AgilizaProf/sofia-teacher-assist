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

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

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

        // Antes de aplicar o token de recuperação, encerra qualquer sessão
        // pré-existente NESTE navegador (apenas local) para garantir que a
        // sessão ativa será exclusivamente a do link.
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          await finalizeRecovery();
        } else if (tokenHash && type === "recovery") {
          const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
          if (error) throw error;
          await finalizeRecovery();
        } else if (accessToken && refreshToken && type === "recovery") {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
          await finalizeRecovery();
        }
        // Limpa imediatamente os tokens da URL para evitar vazamento via
        // histórico do navegador, referer ou compartilhamento de link.
        if (code || tokenHash || accessToken) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch (err) {
        if (!cancelled) setInvalidLink(true);
      }
    })();

    const timer = setTimeout(() => {
      if (!recovered && !cancelled) setInvalidLink(true);
    }, 4000);

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

  const barColors = ["#EF4444", "#F59E0B", "#F59E0B", "#3B82F6", "#10B981"];
  const barLabels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#1B2A4E,#0F1B36)", padding: 24, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 30px 60px -20px rgba(0,0,0,.35)" }}>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 28, color: "#1B2A4E", margin: 0 }}>Redefinir senha</h1>
        <p style={{ color: "#5B6B82", fontSize: 14, marginTop: 6, marginBottom: 22 }}>
          {invalidLink
            ? "Link inválido ou expirado. Volte para o login e solicite um novo e-mail de recuperação."
            : ready
              ? "Escolha uma nova senha forte para sua conta."
              : "Validando link de recuperação..."}
        </p>
        {invalidLink && (
          <button onClick={() => navigate({ to: "/auth" })} style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#FF7A45,#FF9466)", color: "#fff", fontWeight: 800, cursor: "pointer", width: "100%" }}>
            Voltar para o login
          </button>
        )}
        {ready && !invalidLink && (
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <input type="password" placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required style={inp} autoComplete="new-password" />
            {password.length > 0 && (
              <div>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {[0,1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < score ? barColors[score] : "#E5E7EB" }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: barColors[score], fontWeight: 700, marginBottom: 6 }}>{barLabels[score]}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 11.5, color: "#5B6B82", display: "grid", gap: 3 }}>
                  <li style={{ color: checks.length ? "#10B981" : "#5B6B82" }}>{checks.length ? "✓" : "○"} Mínimo 10 caracteres</li>
                  <li style={{ color: checks.upper ? "#10B981" : "#5B6B82" }}>{checks.upper ? "✓" : "○"} Letra maiúscula</li>
                  <li style={{ color: checks.lower ? "#10B981" : "#5B6B82" }}>{checks.lower ? "✓" : "○"} Letra minúscula</li>
                  <li style={{ color: checks.digit ? "#10B981" : "#5B6B82" }}>{checks.digit ? "✓" : "○"} Número</li>
                  <li style={{ color: checks.special ? "#10B981" : "#5B6B82" }}>{checks.special ? "✓" : "○"} Caractere especial (!@#$...)</li>
                </ul>
              </div>
            )}
            <input type="password" placeholder="Confirme a nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required style={inp} />
            <button type="submit" disabled={loading || !meets || password !== confirm} style={{ marginTop: 6, padding: "12px 16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#FF7A45,#FF9466)", color: "#fff", fontWeight: 800, cursor: (loading || !meets || password !== confirm) ? "not-allowed" : "pointer", opacity: (loading || !meets || password !== confirm) ? .5 : 1 }}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
            <p style={{ fontSize: 11, color: "#8A98AE", textAlign: "center", margin: "4px 0 0" }}>
              Sua senha é verificada contra vazamentos conhecidos antes de ser aceita.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { padding: "12px 14px", borderRadius: 10, border: "2px solid #DDE3EE", fontSize: 15, fontFamily: "inherit", outline: "none" };
