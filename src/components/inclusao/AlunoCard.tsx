import { memo, useCallback } from "react";
import type { StudentUI } from "@/lib/db/inclusao";

interface AlunoCardProps {
  student: StudentUI;
  onSelect: (id: string) => void;
}

function AlunoCardImpl({ student: s, onSelect }: AlunoCardProps) {
  const handleClick = useCallback(() => onSelect(s.id), [onSelect, s.id]);
  return (
    <button key={s.id} className="student-card" onClick={handleClick}>
      <div className="sc-head">
        <div className={"sc-avatar" + (s.featured ? " featured" : "")}>{s.initials}</div>
        <div className="sc-info">
          <b>{s.name}</b>
          <span>{s.age} · {s.turma}</span>
        </div>
      </div>
      <div className="sc-tags">
        <span className="sc-tag">{s.diag}</span>
        <span className="sc-tag muted">{s.cid}</span>
        <span className="sc-tag muted">{s.aee}</span>
      </div>
      <div className="sc-stats">
        <div><b>{s.anamnese}</b>Anamnese</div>
        <div><b>{s.registros}</b>Registros</div>
        <div
          style={{
            color:
              s.trendTone === "ok"
                ? "var(--success)"
                : s.trendTone === "warn"
                ? "var(--warn)"
                : "var(--muted)",
          }}
        >
          <b>{s.trend}</b>Objetivos
        </div>
      </div>
    </button>
  );
}

export const AlunoCard = memo(AlunoCardImpl);
