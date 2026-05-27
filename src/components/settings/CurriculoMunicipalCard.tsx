import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurriculoMunicipal, type CurriculoMunicipal } from "@/hooks/useCurriculoMunicipal";
import { toast } from "sonner";
import { consumirCreditos } from "@/lib/creditos/consume";
import { CUSTOS } from "@/lib/creditos/policy";

const MAX_TOTAL_BYTES = 15 * 1024 * 1024; // 15 MB total no bucket (compartilhado entre currículos + calendário)
// Sem limite fixo por arquivo individual — o limite é o total disponível

type Ordem = 1 | 2;

export function CurriculoMunicipalCard() {
  const { curriculos, loading, load, definirPadrao, removerPorId, reprocessar } = useCurriculoMunicipal();
  const [uploading, setUploading] = useState(false);
  const [formOrdem, setFormOrdem] = useState<Ordem | null>(null);
  const [municipio, setMunicipio] = useState("");
  const [estado, setEstado] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const slot1 = curriculos.find((c) => c.ordem === 1) ?? null;
  const slot2 = curriculos.find((c) => c.ordem === 2) ?? null;
  const slots: Array<{ ordem: Ordem; curriculo: CurriculoMunicipal | null }> = [
    { ordem: 1, curriculo: slot1 },
    { ordem: 2, curriculo: slot2 },
  ];
  const totalOcupados = curriculos.length;

  const abrirForm = (ordem: Ordem) => {
    const atual = ordem === 1 ? slot1 : slot2;
    setFormOrdem(ordem);
    setMunicipio(atual?.municipio ?? "");
    setEstado(atual?.estado ?? "");
  };

  const fecharForm = () => {
    setFormOrdem(null);
    setMunicipio("");
    setEstado("");
  };

  const handleUpload = async (file: File) => {
    if (formOrdem == null) return;
    if (file.type !== "application/pdf") { toast.error("Apenas arquivos PDF são aceitos."); return; }
    if (!municipio.trim()) { toast.error("Informe o nome do município."); return; }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      const ordem = formOrdem;
      const path = `curriculo-${user.id}-${ordem}.pdf`;

      // Validação de espaço total — exclui o slot que será substituído
      const { data: arquivosExistentes, error: listErr } = await supabase.storage
        .from("documentos-professor")
        .list("", { limit: 100 });
      if (listErr) console.warn("[upload] list() falhou:", listErr.message);
      const usoAtual = (arquivosExistentes ?? [])
        .filter((f) => f.name !== path)
        .reduce((total, f) => total + (f.metadata?.size ?? 0), 0);
      const disponivelMB = ((MAX_TOTAL_BYTES - usoAtual) / 1024 / 1024).toFixed(1);
      if (usoAtual + file.size > MAX_TOTAL_BYTES) {
        toast.error(`Sem espaço. Disponível: ${disponivelMB} MB dos 15 MB totais.`);
        setUploading(false);
        return;
      }

      const { error: storageErr } = await supabase.storage
        .from("documentos-professor")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (storageErr) {
        const msg = storageErr.message || String(storageErr);
        if (msg.includes("row-level security") || msg.includes("violates")) {
          throw new Error("Permissão negada. Tente sair e entrar novamente.");
        }
        if (msg.includes("too large") || msg.includes("size")) {
          throw new Error(`Arquivo muito grande para o plano atual. Disponível: ${disponivelMB} MB.`);
        }
        throw new Error(`Erro no upload: ${msg}`);
      }

      const ehPrimeiro = totalOcupados === 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: row, error: dbErr } = await (supabase as any)
        .from("user_curriculo_municipal")
        .upsert({
          user_id: user.id,
          ordem,
          municipio: municipio.trim(),
          estado: estado.trim(),
          arquivo_path: path,
          arquivo_nome: file.name,
          arquivo_bytes: file.size,
          status: "processando",
          ativo: false,
          usar_municipal: false,
          eh_padrao: ehPrimeiro,
          habilidades: [],
          erro_msg: null,
        }, { onConflict: "user_id,ordem" })
        .select("id")
        .single();
      if (dbErr) throw dbErr;

      fecharForm();

      await supabase.functions.invoke("processar-curriculo", {
        body: { curriculo_id: row.id, arquivo_path: path, municipio: municipio.trim(), ordem },
      });
      void consumirCreditos(CUSTOS.anexar_rede, `Anexo de Rede — ${municipio.trim()}`);
      toast.info("Arquivo enviado! Processando habilidades em background...");
      void import("@/lib/admin/track").then(({ trackEvent }) =>
        trackEvent("curriculo_municipal_upload", {
          municipio: municipio.trim(),
          estado: estado.trim() || null,
          arquivo_bytes: file.size,
          ordem,
        })
      );
      await load();
    } catch (e) {
      toast.error((e as Error)?.message || "Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return null;

  const inp: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 10, border: "1px solid #DDE3EE",
    fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {slots.map(({ ordem, curriculo }) => (
          <SlotCard
            key={ordem}
            ordem={ordem}
            curriculo={curriculo}
            onAdicionar={() => abrirForm(ordem)}
            onSubstituir={() => abrirForm(ordem)}
            onDefinirPadrao={async (id) => {
              await definirPadrao(id);
              toast.success("Currículo definido como padrão.");
            }}
            onRemover={async (id) => {
              if (!confirm("Remover este currículo? As habilidades serão apagadas.")) return;
              await removerPorId(id);
              toast.success("Currículo removido.");
            }}
            onReprocessar={async (id) => {
              await reprocessar(id);
              toast.info("Reprocessando o currículo com prompt aprimorado...");
            }}
          />
        ))}
      </div>

      {totalOcupados >= 2 && formOrdem == null && (
        <p style={{ fontSize: 12, color: "#6B7691", margin: 0 }}>
          Limite de 2 currículos atingido. Remova um para adicionar outro.
        </p>
      )}

      {formOrdem != null && (
        <div
          style={{
            display: "flex", flexDirection: "column", gap: 10,
            border: "1px solid #DDE3EE", borderRadius: 12, padding: 14, background: "#FAFBFD",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4E" }}>
              {curriculos.find((c) => c.ordem === formOrdem)
                ? `Substituir Currículo ${formOrdem}`
                : `Adicionar Currículo ${formOrdem}`}
            </div>
            <button
              type="button"
              onClick={fecharForm}
              style={{ background: "none", border: "none", color: "#6B7691", cursor: "pointer", fontSize: 12 }}
            >
              Cancelar
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input style={inp} placeholder="Nome do município (ex: São Paulo)" value={municipio} onChange={(e) => setMunicipio(e.target.value)} maxLength={80} />
            <input style={{ ...inp, width: 80 }} placeholder="UF" value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} maxLength={2} />
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }} />
          <button
            type="button"
            disabled={uploading || !municipio.trim()}
            onClick={() => fileRef.current?.click()}
            style={{
              padding: "11px 16px", borderRadius: 10, border: "2px dashed #DDE3EE",
              background: "#fff", color: uploading ? "#9AA3B8" : "#1B2A4E",
              fontSize: 13, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {uploading ? "⏳ Enviando..." : "📄 Selecionar PDF do currículo"}
          </button>
          <p style={{ fontSize: 11.5, color: "#9AA3B8", margin: 0 }}>
            O arquivo fica armazenado com segurança. Apenas você tem acesso. Só PDF · limite total de 15 MB compartilhado entre os 2 currículos e o calendário escolar.
          </p>
        </div>
      )}
    </div>
  );
}

function SlotCard({
  ordem,
  curriculo,
  onAdicionar,
  onSubstituir,
  onDefinirPadrao,
  onRemover,
  onReprocessar,
}: {
  ordem: Ordem;
  curriculo: CurriculoMunicipal | null;
  onAdicionar: () => void;
  onSubstituir: () => void;
  onDefinirPadrao: (id: string) => void | Promise<void>;
  onRemover: (id: string) => void | Promise<void>;
  onReprocessar: (id: string) => void | Promise<void>;
}) {
  if (!curriculo) {
    return (
      <button
        type="button"
        onClick={onAdicionar}
        style={{
          minHeight: 140, borderRadius: 12, border: "2px dashed #DDE3EE",
          background: "#FAFBFD", color: "#6B7691", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 6, padding: 14, fontFamily: "inherit",
        }}
      >
        <div style={{ fontSize: 22, color: "#FF7A45" }}>＋</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1B2A4E" }}>Adicionar currículo {ordem}</div>
        <div style={{ fontSize: 11.5 }}>Slot {ordem} de 2</div>
      </button>
    );
  }

  const isErro = curriculo.status === "erro";
  const isProc = curriculo.status === "processando";
  const isAtivo = curriculo.status === "ativo";
  const bg = isErro ? "#FEF2F2" : curriculo.eh_padrao ? "#FFF7ED" : "#fff";
  const border = isErro ? "#FECACA" : curriculo.eh_padrao ? "#FED7AA" : "#DDE3EE";
  const statusBadge = isErro
    ? { txt: "Erro", bg: "#FEE2E2", color: "#B91C1C" }
    : isProc
      ? { txt: "Processando", bg: "#FEF3C7", color: "#92400E" }
      : { txt: "Ativo", bg: "#DCFCE7", color: "#166534" };

  return (
    <div style={{ position: "relative", background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {curriculo.eh_padrao && (
        <span
          style={{
            position: "absolute", top: 10, right: 10,
            background: "#FF7A45", color: "#fff", fontSize: 10.5, fontWeight: 700,
            padding: "3px 8px", borderRadius: 999,
          }}
        >
          ★ Padrão
        </span>
      )}

      <div style={{ fontSize: 11, color: "#6B7691", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
        Currículo {ordem}
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1B2A4E" }}>
          {curriculo.municipio}{curriculo.estado ? ` — ${curriculo.estado}` : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ background: statusBadge.bg, color: statusBadge.color, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
            {statusBadge.txt}
          </span>
          {isAtivo && (
            <span style={{ fontSize: 11.5, color: "#6B7691" }}>
              {(curriculo.habilidades || []).length} habilidades
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#9AA3B8", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {isErro && curriculo.erro_msg ? curriculo.erro_msg : curriculo.arquivo_nome}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
        {isAtivo && (
          curriculo.eh_padrao ? (
            <span style={{ fontSize: 11.5, color: "#FF7A45", fontWeight: 700, padding: "6px 0" }}>✓ Padrão</span>
          ) : (
            <button
              type="button"
              onClick={() => void onDefinirPadrao(curriculo.id)}
              style={{ fontSize: 11.5, color: "#FF7A45", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: "6px 0" }}
            >
              Definir como padrão
            </button>
          )
        )}
        <button
          type="button"
          onClick={onSubstituir}
          style={{ fontSize: 11.5, color: "#1B2A4E", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "6px 0" }}
        >
          Substituir arquivo
        </button>
        {(isAtivo || isErro) && (
          <button
            type="button"
            onClick={() => void onReprocessar(curriculo.id)}
            style={{ fontSize: 11.5, color: "#1B2A4E", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "6px 0" }}
            title="Reprocessar o arquivo já enviado (sem novo upload)"
          >
            Reprocessar
          </button>
        )}
        <button
          type="button"
          onClick={() => void onRemover(curriculo.id)}
          style={{ fontSize: 11.5, color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "6px 0", marginLeft: "auto" }}
        >
          Remover
        </button>
      </div>
    </div>
  );
}
