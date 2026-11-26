import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useInclusaoStudents } from "@/hooks/useInclusaoStudents";
import { createInclusaoStudentsEmLote } from "@/lib/db/inclusao";
import { lerListaColada } from "@/lib/alunos/colarLista";

// Cadastro de vários alunos de uma vez: a professora cola a lista do diário de
// classe (ou de uma planilha) e todos entram na turma escolhida. Os alunos
// ficam na mesma lista usada em Inclusão, Pareceres, Alfabetização, Questões e Jogos.

export function ColarAlunos({
  turmas,
  turmaInicial = "",
  aberto: abertoInicial = false,
}: {
  turmas: string[];
  turmaInicial?: string;
  aberto?: boolean;
}) {
  const { students, refresh } = useInclusaoStudents();
  const [aberto, setAberto] = useState(abertoInicial);
  const [texto, setTexto] = useState("");
  const [turma, setTurma] = useState(turmaInicial);
  const [salvando, setSalvando] = useState(false);

  const turmaFinal = turma || turmaInicial || "Sem turma";
  const lista = useMemo(
    () =>
      lerListaColada(
        texto,
        students.filter((s) => (s.turma || "Sem turma") === turmaFinal).map((s) => s.name),
      ),
    [texto, students, turmaFinal],
  );

  async function cadastrar() {
    if (!lista.novos.length) {
      toast.error(lista.repetidos.length ? "Todos esses nomes já estão nesta turma." : "Cole pelo menos um nome.");
      return;
    }
    setSalvando(true);
    try {
      const n = await createInclusaoStudentsEmLote(lista.novos, turmaFinal);
      await refresh();
      setTexto("");
      toast.success(`${n} ${n === 1 ? "aluno entrou" : "alunos entraram"} na turma ${turmaFinal}.`);
    } catch {
      toast.error("Não consegui cadastrar agora. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <button type="button" className="pn-btn" onClick={() => setAberto(true)}>
        Colar a lista da turma
      </button>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
      <label style={{ display: "grid", gap: 4, fontWeight: 700, fontSize: 13 }}>
        Cole os nomes, um por linha
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={7}
          placeholder={"Ana Souza\nBruno Lima\nCarla Mendes"}
          style={{
            width: "100%",
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 400,
            padding: 10,
            borderRadius: 8,
            border: "1.5px solid #D6DBE5",
            resize: "vertical",
          }}
        />
      </label>
      <p style={{ margin: 0, fontSize: 12.5, color: "#5B6272" }}>
        Pode colar direto do diário de classe ou de uma planilha. Números na frente do nome saem sozinhos.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {turmas.length > 0 && (
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, fontWeight: 700 }}>
            Turma
            <select value={turma || turmaInicial} onChange={(e) => setTurma(e.target.value)} style={{ height: 32, borderRadius: 8 }}>
              <option value="">Sem turma</option>
              {turmas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className="pn-btn primary"
          disabled={salvando || lista.novos.length === 0}
          onClick={() => void cadastrar()}
        >
          {salvando
            ? "Cadastrando…"
            : lista.novos.length
              ? `Cadastrar ${lista.novos.length} ${lista.novos.length === 1 ? "aluno" : "alunos"}`
              : "Cadastrar"}
        </button>
        <button type="button" className="pn-btn" onClick={() => setAberto(false)}>
          Fechar
        </button>
      </div>
      {(lista.repetidos.length > 0 || lista.cortados > 0) && (
        <p style={{ margin: 0, fontSize: 12.5, color: "#5B6272" }}>
          {lista.repetidos.length > 0 &&
            `${lista.repetidos.length} ${lista.repetidos.length === 1 ? "nome já estava" : "nomes já estavam"} nesta turma e não ${lista.repetidos.length === 1 ? "vai" : "vão"} repetir. `}
          {lista.cortados > 0 && `Entram até 80 por vez; cole o resto depois.`}
        </p>
      )}
    </div>
  );
}
