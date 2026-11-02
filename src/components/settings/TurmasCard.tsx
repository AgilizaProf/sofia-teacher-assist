import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { useTurmas } from "@/hooks/useTurmas";

// Escolas e turmas da professora. Antes ficava na "Minha sala"; agora mora
// em Configurações, no visual Painel.

const css = `
.tc{background:#fff;border:1.5px solid #D6DBE5;border-radius:16px;padding:22px;margin-bottom:18px;scroll-margin-top:80px;}
.tc h2{margin:0;font-family:'Sora',sans-serif;font-weight:700;font-size:20px;letter-spacing:-.03em;}
.tc .tc-sub{margin:4px 0 16px;color:#596074;font-size:13.5px;}
.tc-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr));gap:10px;margin-bottom:16px;}
.tc-item{display:flex;align-items:flex-start;gap:10px;border:1.5px solid #D6DBE5;border-radius:14px;padding:12px;min-width:0;}
.tc-item .ic{flex:none;width:38px;height:38px;border-radius:10px;border:1.5px solid #14161F;background:#D7E6FF;display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-weight:800;font-size:13px;}
.tc-item b{display:block;font-family:'Sora',sans-serif;font-size:15px;letter-spacing:-.02em;}
.tc-item small{display:block;color:#596074;font-size:12.5px;line-height:1.35;overflow-wrap:anywhere;}
.tc-item .tx{flex:1;min-width:0;}
.tc-del{flex:none;border:1.5px solid #D6DBE5;background:#fff;border-radius:9px;height:32px;padding:0 10px;font-size:12.5px;font-weight:700;color:#A3301F;cursor:pointer;}
.tc-del:hover{border-color:#A3301F;}
.tc-empty{border:1.5px dashed #D6DBE5;border-radius:14px;padding:16px;color:#596074;font-size:13.5px;margin-bottom:16px;}
.tc-form{display:grid;grid-template-columns:2fr 2fr 1.2fr 1.2fr 1fr auto;gap:10px;align-items:end;}
.tc-form label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:700;min-width:0;}
.tc-form input,.tc-form select{height:44px;border:1.5px solid #D6DBE5;border-radius:10px;padding:0 12px;font-size:15px;font-family:inherit;background:#fff;color:#14161F;min-width:0;width:100%;}
.tc-form input:focus,.tc-form select:focus{outline:none;border-color:#14161F;box-shadow:0 0 0 3px #CDEFE2;}
.tc-add{height:44px;padding:0 16px;border:2px solid #14161F;border-radius:10px;background:#0B7A55;color:#fff;font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:3px 3px 0 #14161F;white-space:nowrap;}
.tc-add:disabled{opacity:.6;cursor:default;}
@media(max-width:900px){.tc-form{grid-template-columns:1fr 1fr;}.tc-form .tc-add{grid-column:1/-1;}}
@media(max-width:560px){.tc{padding:16px;}.tc-form{grid-template-columns:1fr;}}
`;

export function TurmasCard() {
  const { turmas, loading, create, remove } = useTurmas();
  const [nome, setNome] = useState("");
  const [escola, setEscola] = useState("");
  const [ano, setAno] = useState("");
  const [turno, setTurno] = useState("");
  const [alunos, setAlunos] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Dê um nome para a turma, como 4º B.");
      return;
    }
    setSaving(true);
    try {
      await create({
        name: nome.trim(),
        school: escola.trim(),
        grade: ano.trim(),
        shift: turno,
        students: alunos.trim(),
        curriculo_id: null,
      });
      toast.success("Turma cadastrada.");
      setNome("");
      setAno("");
      setAlunos("");
    } catch {
      toast.error("Não foi possível cadastrar a turma agora.");
    } finally {
      setSaving(false);
    }
  }

  async function apagar(id: string, n: string) {
    if (!window.confirm(`Apagar a turma ${n}?`)) return;
    try {
      await remove(id);
      toast.success("Turma apagada.");
    } catch {
      toast.error("Não foi possível apagar a turma.");
    }
  }

  return (
    <section id="turmas" className="tc" aria-labelledby="tc-title">
      <style>{css}</style>
      <h2 id="tc-title">Escolas e turmas</h2>
      <p className="tc-sub">
        As turmas aparecem no Planejamento, nos Pareceres, na Inclusão e na Sofia.
      </p>
      {loading ? (
        <div className="tc-empty">Carregando turmas…</div>
      ) : turmas.length === 0 ? (
        <div className="tc-empty">
          Você ainda não cadastrou turmas. Comece pela primeira abaixo.
        </div>
      ) : (
        <div className="tc-list">
          {turmas.map((t) => (
            <div key={t.id} className="tc-item">
              <span className="ic" aria-hidden>
                {t.name.slice(0, 3)}
              </span>
              <span className="tx">
                <b>{t.name}</b>
                <small>
                  {[t.school, t.grade, t.shift, t.students ? `${t.students} alunos` : ""]
                    .filter(Boolean)
                    .join(" · ") || "Sem detalhes"}
                </small>
              </span>
              <button type="button" className="tc-del" onClick={() => apagar(t.id, t.name)}>
                Apagar
              </button>
            </div>
          ))}
        </div>
      )}
      <form className="tc-form" onSubmit={onSubmit}>
        <label>
          Turma
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: 4º B" />
        </label>
        <label>
          Escola
          <input
            value={escola}
            onChange={(e) => setEscola(e.target.value)}
            placeholder="Nome da escola"
          />
        </label>
        <label>
          Ano
          <input value={ano} onChange={(e) => setAno(e.target.value)} placeholder="Ex.: 4º ano" />
        </label>
        <label>
          Turno
          <select value={turno} onChange={(e) => setTurno(e.target.value)}>
            <option value="">Escolha</option>
            <option>Manhã</option>
            <option>Tarde</option>
            <option>Noite</option>
            <option>Integral</option>
          </select>
        </label>
        <label>
          Alunos
          <input
            value={alunos}
            onChange={(e) => setAlunos(e.target.value.replace(/\D/g, "").slice(0, 3))}
            inputMode="numeric"
            placeholder="25"
          />
        </label>
        <button type="submit" className="tc-add" disabled={saving}>
          {saving ? "Salvando…" : "+ Adicionar turma"}
        </button>
      </form>
    </section>
  );
}
