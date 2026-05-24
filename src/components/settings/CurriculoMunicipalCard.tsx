import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurriculoMunicipal } from "@/hooks/useCurriculoMunicipal";
import { toast } from "sonner";

const MAX_BYTES = 7 * 1024 * 1024; // 7MB

export function CurriculoMunicipalCard() {
  const { curriculo, loading, load, toggleUsarMunicipal, remover, isAtivo, nomeExibicao } = useCurriculoMunicipal();
  const [uploading, setUploading] = useState(false);
  const [municipio, setMunicipio] = useState("");
  const [estado, setEstado] = useState("");
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (file.size > MAX_BYTES) { toast.error("O arquivo deve ter no máximo 7MB."); return; }
    if (file.type !== "application/pdf") { toast.error("Apenas arquivos PDF são aceitos."); return; }
    if (!municipio.trim()) { toast.error("Informe o nome do município."); return; }

    setUploading(true);
    try {
      // eslint-disable-next-line no-useless-catch
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      const path = `curriculo-${user.id}.pdf`;

      // Verificar espaço disponível (limite de 7 MB por usuário, compartilhado entre currículo e calendário)
      const { data: arquivosExistentes } = await supabase.storage
  .from("documentos-professor")
  .list("");

const usoAtual = (arquivosExistentes ?? [])
  .filter((f) => f.name !== `curriculo-${user.id}.pdf`)
  .reduce((total, f) => total + (f.metadata?.size ?? 0), 0);

      if (usoAtual + file.size > MAX_BYTES) {
        const disponivel = MAX_BYTES - usoAtual;
        toast.error(`Sem espaço. Disponível: ${(disponivel / 1024 / 1024).toFixed(1)} MB`);
        return;
      }

      // Upload no Storage
      const { data: uploadData, error: storageErr } = await supabase.storage
        .from("documentos-professor")
        .upload(path, file, { upsert: true });
      console.log("UPLOAD RESULT:", JSON.stringify({ uploadData, storageErr }));
      if (storageErr) throw storageErr;

      // Criar registro no banco
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: row, error: dbErr } = await (supabase as any)
        .from("user_curriculo_municipal")
        .upsert({
          user_id: user.id,
          municipio: municipio.trim(),
          estado: estado.trim(),
          arquivo_path: path,
          arquivo_nome: file.name,
          arquivo_bytes: file.size,
          status: "processando",
          ativo: false,
          usar_municipal: false,
        }, { onConflict: "user_id" })
        .select("id")
        .single();
      if (dbErr) throw dbErr;

      toast.info("Arquivo enviado. Processando habilidades com IA...");
      setShowForm(false);
      setMunicipio("");
      setEstado("");

      // Chamar edge function para processar
      const { error: fnErr } = await supabase.functions.invoke("processar-curriculo", {
        body: { curriculo_id: row.id, arquivo_path: path, municipio: municipio.trim() },
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

  const inp: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 10, border: "1px solid #DDE3EE",
    fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%",
  };

  if (loading) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Estado atual */}
      {curriculo ? (
        <div style={{ background: curriculo.status === "erro" ? "#FEF2F2" : isAtivo ? "#F0FDF4" : "#FFF7ED", border: `1px solid ${curriculo.status === "erro" ? "#FECACA" : isAtivo ? "#BBF7D0" : "#FED7AA"}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{curriculo.status === "erro" ? "❌" : curriculo.status === "processando" ? "⏳" : "✅"}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1B2A4E" }}>{curriculo.municipio}{curriculo.estado ? ` — ${curriculo.estado}` : ""}</div>
              <div style={{ fontSize: 12, color: "#6B7691", marginTop: 2 }}>
                {curriculo.status === "processando" && "Processando habilidades..."}
                {curriculo.status === "ativo" && `${(curriculo.habilidades || []).length} habilidades extraídas · ${curriculo.arquivo_nome}`}
                {curriculo.status === "erro" && (curriculo.erro_msg || "Erro no processamento.")}
              </div>
            </div>
          </div>

          {curriculo.status === "ativo" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
  void import("@/lib/admin/track").then(({ trackEvent }) =>
    trackEvent("curriculo_municipal_toggle", {
      acao: curriculo.usar_municipal ? "desativado" : "ativado",
      municipio: curriculo.municipio,
    })
  );
  void toggleUsarMunicipal(!curriculo.usar_municipal);
}}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  border: curriculo.usar_municipal ? "none" : "1px solid #DDE3EE",
                  background: curriculo.usar_municipal ? "linear-gradient(135deg,#FF7A45,#FF9466)" : "#fff",
                  color: curriculo.usar_municipal ? "#fff" : "#1B2A4E",
                }}
              >
                {curriculo.usar_municipal ? "✓ Currículo Municipal ativo" : "Ativar Currículo Municipal"}
              </button>
              {curriculo.usar_municipal && (
                <span style={{ fontSize: 11.5, color: "#6B7691" }}>
                  A BNCC será ignorada enquanto o currículo municipal estiver ativo.
                </span>
              )}
            </div>
          )}

          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setShowForm(true); }}
              style={{ fontSize: 12, color: "#FF7A45", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
            >
              Substituir arquivo
            </button>
            <span style={{ color: "#DDE3EE" }}>·</span>
            <button
              type="button"
              onClick={async () => { if (confirm("Remover o currículo municipal? As habilidades serão apagadas.")) { await remover(); toast.success("Currículo removido."); } }}
              style={{ fontSize: 12, color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#6B7691", margin: 0 }}>
          Nenhum currículo municipal configurado. A Sofia usa a BNCC como padrão.
        </p>
      )}

      {/* Formulário de upload */}
      {(!curriculo || showForm) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <input style={inp} placeholder="Nome do município (ex: São Paulo)" value={municipio} onChange={(e) => setMunicipio(e.target.value)} maxLength={80} />
            <input style={{ ...inp, width: 80 }} placeholder="UF" value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} maxLength={2} />
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          <button
            type="button"
            disabled={uploading || !municipio.trim()}
            onClick={() => fileRef.current?.click()}
            style={{
              padding: "11px 16px", borderRadius: 10, border: "2px dashed #DDE3EE",
              background: "#FAFBFD", color: uploading ? "#9AA3B8" : "#1B2A4E",
              fontSize: 13, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {uploading ? "⏳ Processando..." : "📄 Selecionar PDF do currículo (máx. 7MB)"}
          </button>
          <p style={{ fontSize: 11.5, color: "#9AA3B8", margin: 0 }}>
            O arquivo fica armazenado com segurança. Apenas você tem acesso. Só PDF, máx. 7MB.
          </p>
        </div>
      )}
    </div>
  );
}
