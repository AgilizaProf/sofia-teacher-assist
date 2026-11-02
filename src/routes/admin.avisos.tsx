import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

// Aviso para todos: um recado curto que aparece no topo do app para todas
// as professoras, por quantos dias você escolher. Usa a mesma tabela das
// janelas de manutenção, só que sem bloquear o acesso.

export const Route = createFileRoute("/admin/avisos")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: AvisosPage,
});

type Aviso = {
  id: string;
  title: string;
  message: string | null;
  starts_at: string;
  ends_at: string;
};

const DURACOES = [
  { dias: 1, label: "1 dia" },
  { dias: 3, label: "3 dias" },
  { dias: 7, label: "1 semana" },
  { dias: 30, label: "1 mês" },
];

function AvisosPage() {
  const [lista, setLista] = useState<Aviso[]>([]);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [dias, setDias] = useState(3);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const { data } = await supabase
      .from("maintenance_windows")
      .select("id,title,message,starts_at,ends_at")
      .eq("block_access", false)
      .order("starts_at", { ascending: false });
    setLista((data ?? []) as Aviso[]);
  };
  useEffect(() => {
    void carregar();
  }, []);

  const publicar = async () => {
    if (!titulo.trim()) {
      toast.error("Escreva o título do aviso");
      return;
    }
    setSalvando(true);
    const inicio = new Date();
    const fim = new Date(inicio.getTime() + dias * 86_400_000);
    const { error } = await supabase.from("maintenance_windows").insert({
      title: titulo.trim(),
      message: texto.trim() || null,
      starts_at: inicio.toISOString(),
      ends_at: fim.toISOString(),
      block_access: false,
    });
    setSalvando(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Aviso publicado. Já aparece para todas.");
      setTitulo("");
      setTexto("");
      void carregar();
    }
  };

  const encerrar = async (id: string) => {
    const { error } = await supabase
      .from("maintenance_windows")
      .update({ ends_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Aviso encerrado");
      void carregar();
    }
  };

  const agora = Date.now();
  return (
    <AdminLayout
      title="Aviso para todos"
      subtitle="Um recado curto que aparece no topo do app para todas as professoras"
    >
      <div className="ad-card" style={{ marginBottom: 18 }}>
        <h3>Novo aviso</h3>
        <div className="ad-field" style={{ marginBottom: 10 }}>
          <label>Título</label>
          <input
            className="ad-input"
            value={titulo}
            maxLength={80}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Novidade nos Jogos e atividades interativas"
          />
        </div>
        <div className="ad-field" style={{ marginBottom: 10 }}>
          <label>Texto (opcional)</label>
          <textarea
            className="ad-input"
            rows={2}
            maxLength={200}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: Agora dá para criar jogos a partir do planejamento da semana."
            style={{ resize: "vertical" }}
          />
        </div>
        <div className="ad-row">
          <div className="ad-field">
            <label>Mostrar por</label>
            <select
              className="ad-select"
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
            >
              {DURACOES.map((d) => (
                <option key={d.dias} value={d.dias}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <button className="ad-btn" onClick={publicar} disabled={salvando}>
            {salvando ? "Publicando…" : "Publicar aviso"}
          </button>
        </div>
        {titulo.trim() && (
          <div style={{ marginTop: 14 }}>
            <div className="ad-field" style={{ marginBottom: 6 }}>
              <label>Como vai aparecer</label>
            </div>
            <div
              style={{
                background: "#FFE2A8",
                border: "1.5px solid #14161F",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              📣 {titulo.trim()}
              {texto.trim() ? ` · ${texto.trim()}` : ""}
            </div>
          </div>
        )}
      </div>

      <div className="ad-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E9F2" }}>
          <h3 style={{ margin: 0 }}>Avisos</h3>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Aviso</th>
                <th>Até</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => {
                const ativo =
                  new Date(a.starts_at).getTime() <= agora && new Date(a.ends_at).getTime() > agora;
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>
                      {a.title}
                      {a.message && (
                        <div style={{ fontWeight: 400, color: "#6B7280", fontSize: 12 }}>
                          {a.message}
                        </div>
                      )}
                    </td>
                    <td>
                      {new Date(a.ends_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td>
                      <span className={"ad-badge " + (ativo ? "ok" : "free")}>
                        {ativo ? "No ar" : "Encerrado"}
                      </span>
                    </td>
                    <td>
                      {ativo && (
                        <button className="ad-btn ghost" onClick={() => encerrar(a.id)}>
                          Encerrar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>
                    Nenhum aviso ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
