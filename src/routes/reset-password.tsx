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

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase coloca o token de recuperação no hash da URL.
    // O client processa automaticamente e dispara onAuthStateChange("PASSWORD_RECOVERY").
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("A senha deve ter no mínimo 8 caracteres.");
    if (password !== confirm) return toast.error("As senhas não coincidem.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso!");
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#1B2A4E,#0F1B36)", padding: 24, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 30px 60px -20px rgba(0,0,0,.35)" }}>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 28, color: "#1B2A4E", margin: 0 }}>Redefinir senha</h1>
        <p style={{ color: "#5B6B82", fontSize: 14, marginTop: 6, marginBottom: 22 }}>
          {ready ? "Escolha uma nova senha para sua conta." : "Validando link de recuperação..."}
        </p>
        {ready && (
          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <input type="password" placeholder="Nova senha (mín. 8 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required style={inp} />
            <input type="password" placeholder="Confirme a nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required style={inp} />
            <button type="submit" disabled={loading} style={{ marginTop: 6, padding: "12px 16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#FF7A45,#FF9466)", color: "#fff", fontWeight: 800, cursor: "pointer", opacity: loading ? .7 : 1 }}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { padding: "12px 14px", borderRadius: 10, border: "2px solid #DDE3EE", fontSize: 15, fontFamily: "inherit", outline: "none" };
