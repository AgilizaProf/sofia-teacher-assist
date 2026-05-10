import { useEffect, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import type { PlanoInclusao } from "./PlanoInclusaoModal";

type Props = {
  open: boolean;
  plano: PlanoInclusao | null;
  onClose: () => void;
  onSave: (patch: Partial<PlanoInclusao>) => void;
};

export function PlanoInclusaoVisualizarModal({ open, plano, onClose, onSave }: Props) {
  const [form, setForm] = useState<PlanoInclusao | null>(plano);

  useEffect(() => { setForm(plano); }, [plano?.id, open]);

  if (!open || !form) return null;

  const set = <K extends keyof PlanoInclusao>(k: K, v: PlanoInclusao[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "var(--muted)",
    textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4, display: "block",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid var(--border)",
    borderRadius: 8, background: "#fff", fontSize: 13, fontFamily: "inherit",
  };
  const taStyle: React.CSSProperties = { ...inputStyle, minHeight: 70, resize: "vertical" };

  return (
    <div className="inc-modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="inc-modal" style={{ maxWidth: 820 }}>
        <div className="inc-modal-bar" />
        <div className="inc-modal-head">
          <h2>Editar plano · {form.titulo || "sem título"}</h2>
          <span className="meta">{form.disciplina} · {form.duracao}</span>
          <button className="inc-modal-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div className="inc-modal-body plain" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px", gap: 10 }}>
            <div>
              <label style={labelStyle}>Título</label>
              <input style={inputStyle} value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Data da aula</label>
              <input type="date" style={inputStyle} value={form.data} onChange={(e) => set("data", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Duração</label>
              <input style={inputStyle} value={form.duracao} onChange={(e) => set("duracao", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Disciplina / Campo</label>
              <input style={inputStyle} value={form.disciplina} onChange={(e) => set("disciplina", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Tema</label>
              <input style={inputStyle} value={form.tema} onChange={(e) => set("tema", e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Objetivo</label>
            <textarea style={taStyle} value={form.objetivo} onChange={(e) => set("objetivo", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Abertura</label>
            <textarea style={taStyle} value={form.abertura} onChange={(e) => set("abertura", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Desenvolvimento</label>
            <textarea style={{ ...taStyle, minHeight: 110 }} value={form.desenvolvimento} onChange={(e) => set("desenvolvimento", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Fechamento</label>
            <textarea style={taStyle} value={form.fechamento} onChange={(e) => set("fechamento", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Materiais (um por linha)</label>
            <textarea
              style={taStyle}
              value={(form.materiais || []).join("\n")}
              onChange={(e) => set("materiais", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
            />
          </div>
          <div>
            <label style={labelStyle}>Metodologia</label>
            <textarea style={taStyle} value={form.metodologia} onChange={(e) => set("metodologia", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Avaliação</label>
            <textarea style={taStyle} value={form.avaliacao} onChange={(e) => set("avaliacao", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Observações</label>
            <textarea style={taStyle} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
          {form.habilidades?.length > 0 && (
            <div>
              <label style={labelStyle}>Habilidades BNCC</label>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
                {form.habilidades.map((h, i) => (
                  <li key={i}><b>{h.codigo}</b> — {h.descricao}</li>
                ))}
              </ul>
            </div>
          )}
          {form.adaptacoes?.length > 0 && (
            <div>
              <label style={labelStyle}>Adaptações</label>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
                {form.adaptacoes.map((a, i) => (
                  <li key={i}><b>{a.categoria}:</b> {a.texto}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="inc-btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary bg-orange-400 text-orange-400"
            onClick={() => { onSave(form); onClose(); }}
          >
            <CheckCircle2 size={14} /> Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}