import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  CADERNOS_BUCKET,
  carregarCatalogo,
  nomeCaderno,
  type Catalogo,
} from "@/lib/cadernos/catalogo";

// Enviar os PDFs dos Cadernos para o Storage (bucket privado "cadernos").
// O admin baixa a pasta "Atividades AgilizaProf > Cadernos" do Drive (vem em
// .zip), descompacta e escolhe a pasta aqui. O app envia só os PDFs que estão
// no índice (catalogo.json), com o mesmo nome do Drive, e pula os que já
// estão lá com o mesmo tamanho. Pode repetir quantas vezes quiser.

export const Route = createFileRoute("/admin/cadernos")({
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
  component: AdminCadernos,
});

type Situacao = "falta" | "enviado" | "enviando" | "erro" | "tamanho_diferente";

function AdminCadernos() {
  const [cat, setCat] = useState<Catalogo | null>(null);
  const [noStorage, setNoStorage] = useState<Map<string, number> | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, Situacao>>({});
  const [fora, setFora] = useState<string[]>([]);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);

  const listar = useCallback(async () => {
    setErroLista(null);
    const { data, error } = await supabase.storage
      .from(CADERNOS_BUCKET)
      .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (error) {
      setErroLista(error.message);
      setNoStorage(new Map());
      return;
    }
    const m = new Map<string, number>();
    for (const o of data ?? []) {
      const tam = Number((o.metadata as { size?: number } | null)?.size ?? 0);
      if (o.name.toLowerCase().endsWith(".pdf")) m.set(o.name, tam);
    }
    setNoStorage(m);
  }, []);

  useEffect(() => {
    void carregarCatalogo().then(setCat);
    void listar();
  }, [listar]);

  const situacao = useCallback(
    (arquivo: string, tamanho: number): Situacao => {
      if (status[arquivo]) return status[arquivo];
      const t = noStorage?.get(arquivo);
      if (t === undefined) return "falta";
      return t && t !== tamanho ? "tamanho_diferente" : "enviado";
    },
    [status, noStorage],
  );

  const resumo = useMemo(() => {
    if (!cat) return null;
    const enviados = cat.cadernos.filter(
      (c) => situacao(c.arquivo, c.tamanho) === "enviado",
    ).length;
    return { enviados, total: cat.cadernos.length };
  }, [cat, situacao]);

  const enviar = async (files: FileList | null) => {
    if (!cat || !files?.length) return;
    const porNome = new Map(cat.cadernos.map((c) => [c.arquivo, c]));
    const escolhidos = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    setFora(escolhidos.filter((f) => !porNome.has(f.name)).map((f) => f.name));
    const fila = escolhidos.filter((f) => {
      if (!porNome.has(f.name)) return false;
      const ja = noStorage?.get(f.name);
      return ja === undefined || ja !== f.size;
    });
    if (fila.length === 0) {
      toast.success("Todos esses PDFs já estão no app.");
      return;
    }
    setProgresso({ feitos: 0, total: fila.length });
    let erros = 0;
    for (let i = 0; i < fila.length; i++) {
      const f = fila[i];
      setStatus((s) => ({ ...s, [f.name]: "enviando" }));
      const { error } = await supabase.storage
        .from(CADERNOS_BUCKET)
        .upload(f.name, f, { upsert: true, contentType: "application/pdf", cacheControl: "86400" });
      if (error) erros++;
      setStatus((s) => ({ ...s, [f.name]: error ? "erro" : "enviado" }));
      setProgresso({ feitos: i + 1, total: fila.length });
    }
    await listar();
    setStatus({});
    setProgresso(null);
    if (erros) toast.error(`${erros} PDF(s) não subiram. Tente de novo só com eles.`);
    else toast.success(`${fila.length} PDF(s) enviados.`);
  };

  const ROTULO: Record<Situacao, [string, string]> = {
    enviado: ["No app", "ok"],
    falta: ["Falta enviar", "free"],
    enviando: ["Enviando…", "free"],
    erro: ["Erro ao enviar", "free"],
    tamanho_diferente: ["Versão diferente", "free"],
  };

  return (
    <AdminLayout
      title="Cadernos em PDF"
      subtitle="Os PDFs da pasta Cadernos do Drive, para a busca de atividades prontas"
    >
      <div className="ad-card" style={{ marginBottom: 18 }}>
        <h3>Enviar PDFs</h3>
        <ol style={{ margin: "0 0 12px", paddingLeft: 20, lineHeight: 1.6, fontSize: 14 }}>
          <li>
            No Google Drive, clique com o botão direito na pasta{" "}
            <b>Atividades AgilizaProf › Cadernos</b> e escolha <b>Fazer download</b>. O Drive
            entrega um ou mais arquivos .zip.
          </li>
          <li>Descompacte os .zip no computador.</li>
          <li>
            Clique em <b>Escolher pasta</b> e selecione a pasta descompactada. O app envia só os
            PDFs que ainda não estão aqui.
          </li>
        </ol>
        <div className="ad-row" style={{ flexWrap: "wrap", gap: 10 }}>
          <label className="ad-btn" style={{ cursor: progresso ? "wait" : "pointer" }}>
            Escolher pasta
            <input
              type="file"
              accept="application/pdf"
              multiple
              hidden
              disabled={!!progresso || !cat}
              // @ts-expect-error atributo de pasta (Chrome, Edge, Safari, Firefox)
              webkitdirectory=""
              onChange={(e) => {
                void enviar(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <label className="ad-btn ghost" style={{ cursor: progresso ? "wait" : "pointer" }}>
            Escolher PDFs soltos
            <input
              type="file"
              accept="application/pdf"
              multiple
              hidden
              disabled={!!progresso || !cat}
              onChange={(e) => {
                void enviar(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          <Link to="/cadernos" className="ad-btn ghost">
            Ver a busca
          </Link>
        </div>
        {progresso && (
          <p style={{ marginTop: 12, fontWeight: 600 }}>
            Enviando {progresso.feitos} de {progresso.total}… Não feche esta aba.
          </p>
        )}
        {fora.length > 0 && (
          <p style={{ marginTop: 12, fontSize: 13, color: "#6B7280" }}>
            {fora.length} PDF(s) não estão no índice e não foram enviados:{" "}
            {fora.slice(0, 6).join(", ")}
            {fora.length > 6 ? "…" : ""}. Um caderno novo precisa entrar no índice antes.
          </p>
        )}
        {erroLista && (
          <p style={{ marginTop: 12, fontSize: 13, color: "#B42318" }}>
            Não consegui ler o armazenamento ({erroLista}). Confira se a migração dos cadernos já
            rodou.
          </p>
        )}
      </div>

      <div className="ad-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E9F2" }}>
          <h3 style={{ margin: 0 }}>
            Cadernos {resumo ? `· ${resumo.enviados} de ${resumo.total} no app` : ""}
          </h3>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Caderno</th>
                <th>Arquivo</th>
                <th>Fichas</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {(cat?.cadernos ?? []).map((c) => {
                const s = situacao(c.arquivo, c.tamanho);
                return (
                  <tr key={c.arquivo}>
                    <td style={{ fontWeight: 600 }}>{nomeCaderno(c)}</td>
                    <td style={{ fontSize: 12, color: "#6B7280" }}>{c.arquivo}</td>
                    <td>{c.fichas.length || "–"}</td>
                    <td>
                      <span className={"ad-badge " + ROTULO[s][1]}>{ROTULO[s][0]}</span>
                    </td>
                  </tr>
                );
              })}
              {!cat && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>
                    Carregando…
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
