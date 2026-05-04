import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
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
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) toast.error("Não foi possível entrar com o Google.");
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#1B2A4E 0%,#0F1B36 100%)", padding: 24, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 30px 60px -20px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#FF7A45,#FF9466)", display: "grid", placeItems: "center", color: "#fff" }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Fraunces',serif", fontSize: 22, color: "#1B2A4E" }}>Entre com a Sofia</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#6B7691" }}>Sua assistente pedagógica te aguarda.</p>
          </div>
        </div>

        <button onClick={google} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #E4E8F0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 600, cursor: "pointer", marginBottom: 14 }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuar com Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 16px", color: "#9aa3b8", fontSize: 12 }}>
          <span style={{ flex: 1, height: 1, background: "#E4E8F0" }} /> ou <span style={{ flex: 1, height: 1, background: "#E4E8F0" }} />
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          {mode === "signup" && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required style={inp} />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" required style={inp} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" required minLength={6} style={inp} />
          <button type="submit" disabled={loading} style={{ marginTop: 4, padding: "11px 14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#FF7A45,#FF9466)", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: loading ? .7 : 1 }}>
            {loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 12, color: "#6B7691", textAlign: "center" }}>
          {mode === "signup" ? "Já tem conta? " : "Novo por aqui? "}
          <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} style={{ color: "#FF7A45", fontWeight: 700, background: "none", border: 0, cursor: "pointer" }}>
            {mode === "signup" ? "Entrar" : "Criar conta"}
          </button>
        </p>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #E4E8F0", fontSize: 14, fontFamily: "inherit", outline: "none" };