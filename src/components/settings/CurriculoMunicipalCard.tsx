import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurriculoMunicipal, type CurriculoMunicipal } from "@/hooks/useCurriculoMunicipal";
import { toast } from "sonner";

const MAX_BYTES = 7 * 1024 * 1024; // 7MB

type Ordem = 1 | 2;

export function CurriculoMunicipalCard() {
  const { curriculos, loading, load, definirPadrao, removerPorId } = useCurriculoMunicipal();
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
  const proximaOrdemLivre: Ordem | null = !slot1 ? 1 : !slot2 ? 2 : null;

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
    if (file.size > MAX_BYTES) { toast.error("O arquivo deve ter no máximo 7MB."); return; }
    if (file.type !== "application/pdf") { toast.error("Apenas arquivos PDF são aceitos."); return; }
    if (!municipio.trim()) { toast.error("Informe o nome do município."); return; }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      const ordem = formOrdem;
      const path = `curriculo-${user.id}-${ordem}.pdf`;

      // Validação de espaço — considera todos os arquivos do usuário exceto o slot que está sendo substituído
      const { data: arquivosExistentes } = await supabase.storage
        .from("documentos-professor")
        .list("");
      const usoAtual = (arquivosExistentes ?? [])
        .filter((f) => f.name !== path)
        .reduce((total, f) => total + (f.metadata?.size ?? 0), 0);
      if (usoAtual + file.size > MAX_BYTES) {
        const disponivel = Math.max(0, MAX_BYTES - usoAtual);
        toast.error(`Sem espaço. Disponível: ${(disponivel / 1024 / 1024).toFixed(1)} MB`);
        setUploading(false);
        return;
      }

      const { error: storageErr } = await supabase.storage
        .from("documentos-professor")
        .upload(path, file, { upsert: true });
      if (storageErr) throw storageErr;

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

      toast.info("Arquivo enviado. Processando habilidades com IA...");
      fecharForm();

      const { error: fnErr } = await supabase.functions.invoke("processar-curriculo", {
        body: { curriculo_id: row.id, arquivo_path: path, municipio: municipio.trim(), ordem },
      });
      if (fnErr) {
        toast.error("Erro ao processar o currículo. Tente novamente.");
      } else {
        toast.success("Currículo municipal processado com sucesso!");
        void import("@/lib/admin/track").then(({ trackEvent }) =>
          trackEvent("curriculo_municipal_upload", {
            municipio: municipio.trim(),
            estado: estado.trim() || null,
            arquivo_bytes: file.size,
            ordem,
          })
        );
      }
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
            {uploading ? "⏳ Enviando..." : "📄 Selecionar PDF do currículo (máx. 7MB)"}
          </button>
          <p style={{ fontSize: 11.5, color: "#9AA3B8", margin: 0 }}>
            O arquivo fica armazenado com segurança. Apenas você tem acesso. Só PDF, máx. 7MB.
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
}: {
  ordem: Ordem;
  curriculo: CurriculoMunicipal | null;
  onAdicionar: () => void;
  onSubstituir: () => void;
  onDefinirPadrao: (id: string) => void | Promise<void>;
  onRemover: (id: string) => void | Promise<void>;
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
