import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/cupons")({ component: CuponsPage });

type Cupom = {
  id: string;
  code: string;
  label: string | null;
  url_mensal: string | null;
  url_anual: string | null;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
};

const inp: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function CuponsPage() {
  const [rows, setRows] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    label: "",
    url_mensal: "",
    url_anual: "",
    max_uses: "",
    expires_at: "",
  });

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Cupom[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function criar() {
    setMsg(null);
    const code = form.code.trim();
    if (!code) {
      setMsg("Preencha o código.");
      return;
    }
    if (!form.url_mensal.trim() && !form.url_anual.trim()) {
      setMsg("Informe pelo menos um link (mensal ou anual).");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      code,
      label: form.label.trim() || null,
      url_mensal: form.url_mensal.trim() || null,
      url_anual: form.url_anual.trim() || null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at + "T23:59:59").toISOString() : null,
      active: true,
    };
    const { error } = await (supabase as any).from("promo_codes").insert(payload);
    setSaving(false);
    if (error) {
      setMsg("Erro ao criar: " + (error.message || "tente de novo"));
      return;
    }
    setForm({ code: "", label: "", url_mensal: "", url_anual: "", max_uses: "", expires_at: "" });
    void load();
  }

  async function toggle(c: Cupom) {
    await (supabase as any).from("promo_codes").update({ active: !c.active }).eq("id", c.id);
    void load();
  }

  async function remover(c: Cupom) {
    if (!window.confirm(`Remover o código ${c.code}?`)) return;
    await (supabase as any).from("promo_codes").delete().eq("id", c.id);
    void load();
  }

  return (
    <AdminLayout title="Cupons" subtitle="Códigos que abrem um link de pagamento mais barato (mensal/anual)">
      <div className="ad-card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Novo código</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
          <input style={inp} placeholder="Código (ex: PROFESSOR50)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input style={inp} placeholder="Descrição (opcional)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <input style={inp} placeholder="Link MENSAL com desconto (Mercado Pago)" value={form.url_mensal} onChange={(e) => setForm({ ...form, url_mensal: e.target.value })} />
          <input style={inp} placeholder="Link ANUAL com desconto (Mercado Pago)" value={form.url_anual} onChange={(e) => setForm({ ...form, url_anual: e.target.value })} />
          <input style={inp} type="number" min="1" placeholder="Limite de usos (opcional)" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
          <input style={inp} type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
        </div>
        <p style={{ marginTop: 8, fontSize: 12, color: "#6B7691" }}>
          Informe pelo menos um dos links. Quem usar o código verá só as opções preenchidas.
        </p>
        {msg && <div style={{ marginTop: 4, fontSize: 12.5, color: "#DC2626" }}>{msg}</div>}
        <button
          onClick={() => void criar()}
          disabled={saving}
          style={{ marginTop: 10, padding: "9px 16px", borderRadius: 8, border: "none", background: "#FF7A45", color: "#fff", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Salvando..." : "Criar código"}
        </button>
      </div>

      <div className="ad-card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Códigos ({rows.length})</div>
        {loading ? (
          <div style={{ fontSize: 13, color: "#6B7691" }}>Carregando...</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 13, color: "#6B7691" }}>Nenhum código ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((c) => (
              <div
                key={c.id}
                style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: 10, border: "1px solid #E4E8F0", borderRadius: 10, opacity: c.active ? 1 : 0.55 }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {c.code}{" "}
                    <span style={{ fontSize: 11, fontWeight: 500, color: "#6B7691" }}>
                      · {[c.url_mensal ? "mensal" : null, c.url_anual ? "anual" : null].filter(Boolean).join(" + ") || "sem link"}
                    </span>
                  </div>
                  {c.label && <div style={{ fontSize: 12, color: "#6B7691" }}>{c.label}</div>}
                  <div style={{ fontSize: 11, color: "#6B7691", marginTop: 2 }}>
                    Usos: {c.used_count}
                    {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                    {c.expires_at ? ` · expira ${new Date(c.expires_at).toLocaleDateString("pt-BR")}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => void toggle(c)}
                  style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", fontSize: 12.5, cursor: "pointer" }}
                >
                  {c.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => void remover(c)}
                  style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 8, border: "1px solid #FCA5A5", background: "#fff", color: "#DC2626", fontSize: 12.5, cursor: "pointer" }}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
