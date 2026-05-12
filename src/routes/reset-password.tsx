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
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Aceitar APENAS sessões originadas do fluxo de recuperação.
    // Se o usuário cair aqui sem token de recuperação válido, bloqueia.
    let recovered = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recovered = true;
        setReady(true);
      }
    });
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const hasRecoveryHash = /type=recovery/.test(hash) || /access_token=/.test(hash);
    const timer = setTimeout(() => {
      if (!recovered) {
        // Sem evento de recuperação dentro do prazo: link inválido/expirado.
        if (!hasRecoveryHash) setInvalidLink(true);
      }
    }, 1500);
    return () => {
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
    // Garantir que ainda há sessão de recuperação ativa.
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      toast.error("Sessão de recuperação expirada. Solicite um novo link.");
      setInvalidLink(true);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso! Faça login com a nova senha.");
      await supabase.auth.signOut();
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
