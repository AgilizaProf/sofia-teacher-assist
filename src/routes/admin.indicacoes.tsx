import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { getIndicacoesAdmin, type IndicacoesAdminDTO } from "@/lib/admin/indicacoes.functions";

export const Route = createFileRoute("/admin/indicacoes")({
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
  component: IndicacoesAdmin,
});

const data = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });

function IndicacoesAdmin() {
  const buscar = useServerFn(getIndicacoesAdmin);
  const [d, setD] = useState<IndicacoesAdminDTO | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    buscar()
      .then((r) => {
        if (r && Array.isArray(r.linhas)) setD(r);
        else setErro("Não foi possível carregar as indicações agora.");
      })
      .catch((e: unknown) =>
        setErro(e instanceof Error ? e.message : "Não foi possível carregar."),
      );
  }, [buscar]);

  const total = d?.linhas.length ?? 0;
  const creditadas = d?.linhas.filter((l) => l.creditada).length ?? 0;
  const dias =
    d?.linhas
      .filter((l) => l.creditada)
      .reduce((s, l) => s + l.diasQuemIndicou + l.diasIndicado, 0) ?? 0;

  return (
    <AdminLayout
      title="Indicações"
      subtitle="Quem indicou quem, o que já foi creditado e quem mais indica"
    >
      {erro && (
        <div className="ad-card" style={{ marginBottom: 18, color: "#991B1B" }}>
          {erro}
        </div>
      )}
      <div className="ad-stat-grid" style={{ marginBottom: 18 }}>
        <div className="ad-stat">
          <div className="ad-stat-label">Indicações que viraram assinatura</div>
          <div className="ad-stat-val">{d ? total : erro ? "—" : "…"}</div>
          <div className="ad-stat-hint">{creditadas} já creditadas</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Aguardando os 7 dias</div>
          <div className="ad-stat-val">{d ? total - creditadas : erro ? "—" : "…"}</div>
          <div className="ad-stat-hint">o bônus entra depois da carência</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Dias grátis dados</div>
          <div className="ad-stat-val ad-stat-accent">{d ? dias : erro ? "—" : "…"}</div>
          <div className="ad-stat-hint">somando quem indicou e quem foi indicado</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Links compartilhados</div>
          <div className="ad-stat-val">{d ? d.eventos.compartilhou : erro ? "—" : "…"}</div>
          <div className="ad-stat-hint">
            {d ? `${d.eventos.cadastrosViaLink} cadastros vieram por link` : ""}
          </div>
        </div>
      </div>

      {d && d.eventos.falhas > 0 && (
        <div
          className="ad-card"
          style={{ marginBottom: 18, background: "#FEF3C7", borderColor: "#F59E0B" }}
        >
          <b>{d.eventos.falhas} cadastros por link não conseguiram registrar a indicação.</b> Vale
          olhar em Sistema → Erros.
        </div>
      )}

      <div className="ad-card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E9F2" }}>
          <h3 style={{ margin: 0 }}>Quem mais indica</h3>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Indicações</th>
                <th>Creditadas</th>
                <th>Dias ganhos</th>
              </tr>
            </thead>
            <tbody>
              {(d?.ranking ?? []).map((r) => (
                <tr key={r.nome}>
                  <td style={{ fontWeight: 600 }}>{r.nome}</td>
                  <td>{r.total}</td>
                  <td>{r.creditadas}</td>
                  <td>{r.dias}</td>
                </tr>
              ))}
              {d && d.ranking.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>
                    Ainda não há indicações.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ad-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E9F2" }}>
          <h3 style={{ margin: 0 }}>Todas as indicações</h3>
        </div>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Quem indicou</th>
                <th>Indicada</th>
                <th>Plano</th>
                <th>Bônus</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {!d && !erro && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>
                    Carregando…
                  </td>
                </tr>
              )}
              {(d?.linhas ?? []).map((l) => (
                <tr key={l.id}>
                  <td>{data(l.quando)}</td>
                  <td style={{ fontWeight: 600 }}>{l.quemIndicou}</td>
                  <td>{l.indicado}</td>
                  <td style={{ textTransform: "capitalize" }}>{l.plano}</td>
                  <td>
                    {l.diasQuemIndicou} + {l.diasIndicado} dias
                  </td>
                  <td>
                    {l.creditada ? (
                      <span className="ad-badge ok">Creditada</span>
                    ) : (
                      <span className="ad-badge warn">Credita em {data(l.creditaEm)}</span>
                    )}
                  </td>
                </tr>
              ))}
              {d && d.linhas.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>
                    Ainda não há indicações.
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
