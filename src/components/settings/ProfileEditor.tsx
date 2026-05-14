import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Loader2 } from "lucide-react";

type Profile = {
  display_name: string;
  email: string;
  telefone: string;
  cidade: string;
  uf: string;
  etapa_ensino: string;
  sofia_tom: string;
  sofia_lembretes: boolean;
};

const EMPTY: Profile = {
  display_name: "",
  email: "",
  telefone: "",
  cidade: "",
  uf: "",
  etapa_ensino: "",
  sofia_tom: "acolhedor",
  sofia_lembretes: true,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #E4E8F0",
  borderRadius: 8,
  fontSize: 13,
  background: "#fff",
  color: "#1B2A4E",
  fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#6B7691",
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

export function ProfileEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoading(false);
        return;
      }
      if (active) setUserId(user.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name,email,telefone,cidade,uf,etapa_ensino,sofia_tom,sofia_lembretes")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        toast.error("Não consegui carregar seu perfil.");
      } else if (data) {
        const next: Profile = {
          display_name: data.display_name ?? "",
          email: data.email ?? user.email ?? "",
          telefone: data.telefone ?? "",
          cidade: data.cidade ?? "",
          uf: data.uf ?? "",
          etapa_ensino: data.etapa_ensino ?? "",
          sofia_tom: data.sofia_tom ?? "acolhedor",
          sofia_lembretes: data.sofia_lembretes ?? true,
        };
        setProfile(next);
      } else {
        setProfile({ ...EMPTY, email: user.email ?? "" });
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const update = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Faça login para salvar seu perfil.");
      return;
    }
    // basic client-side validation
    if (profile.display_name.trim().length > 120) {
      toast.error("Nome muito longo.");
      return;
    }
    if (profile.uf && profile.uf.length > 2) {
      toast.error("UF deve ter 2 letras.");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      display_name: profile.display_name.trim() || null,
      email: profile.email.trim() || null,
      telefone: profile.telefone.trim() || null,
      cidade: profile.cidade.trim() || null,
      uf: profile.uf.trim().toUpperCase() || null,
      etapa_ensino: profile.etapa_ensino || null,
      sofia_tom: profile.sofia_tom || "acolhedor",
      sofia_lembretes: profile.sofia_lembretes,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Perfil atualizado.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sofia:profile-updated"));
      }
      try {
        const { refreshEiMode } = await import("@/lib/ei/useEiMode");
        refreshEiMode();
      } catch { /* noop */ }
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7691", fontSize: 13 }}>
        <Loader2 size={14} className="spin" /> Carregando perfil…
      </div>
    );
  }
  if (!userId) {
    return (
      <div style={{ color: "#6B7691", fontSize: 13 }}>
        Faça login para editar seu perfil.
      </div>
    );
  }

  return (
    <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="pe-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelStyle}>Nome completo</label>
          <input style={fieldStyle} value={profile.display_name} maxLength={120}
            onChange={(e) => update("display_name", e.target.value)} placeholder="Como você quer ser chamada" />
        </div>
        <div>
          <label style={labelStyle}>E-mail</label>
          <input style={fieldStyle} type="email" value={profile.email} maxLength={255}
            onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Telefone</label>
          <input style={fieldStyle} value={profile.telefone} maxLength={30}
            onChange={(e) => update("telefone", e.target.value)} placeholder="(11) 99999-9999" />
        </div>
        <div className="pe-grid-city" style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 80px", gap: 14 }}>
          <div>
            <label style={labelStyle}>Cidade</label>
            <input style={fieldStyle} value={profile.cidade} maxLength={80}
              onChange={(e) => update("cidade", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>UF</label>
            <input style={fieldStyle} value={profile.uf} maxLength={2}
              onChange={(e) => update("uf", e.target.value.toUpperCase())} placeholder="SP" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Etapa de ensino</label>
          <select style={fieldStyle} value={profile.etapa_ensino}
            onChange={(e) => update("etapa_ensino", e.target.value)}>
            <option value="">Selecione…</option>
            <option value="ed_infantil">Educação Infantil</option>
            <option value="anos_iniciais">Anos Iniciais (1º ao 5º)</option>
            <option value="anos_finais">Anos Finais (6º ao 9º)</option>
            <option value="ensino_medio">Ensino Médio</option>
            <option value="eja">EJA</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tom da Sofia</label>
          <select style={fieldStyle} value={profile.sofia_tom}
            onChange={(e) => update("sofia_tom", e.target.value)}>
            <option value="acolhedor">Acolhedor</option>
            <option value="objetivo">Objetivo</option>
            <option value="formal">Formal</option>
            <option value="proximo">Próximo</option>
          </select>
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#1B2A4E", cursor: "pointer" }}>
        <input type="checkbox" checked={profile.sofia_lembretes}
          onChange={(e) => update("sofia_lembretes", e.target.checked)} />
        Receber lembretes da Sofia
      </label>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="submit" disabled={saving}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#FF7A45", color: "#fff", border: "none",
            padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1,
          }}>
          {saving ? <Loader2 size={14} className="spin" /> : <User size={14} />}
          {saving ? "Salvando…" : "Salvar perfil"}
        </button>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}` }} />
    </form>
  );
}