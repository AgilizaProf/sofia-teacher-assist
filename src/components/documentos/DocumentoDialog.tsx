import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, FileText, Loader2, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTurmas } from "@/hooks/useTurmas";
import { useAgenda } from "@/hooks/useAgenda";
import { useInclusaoStudents } from "@/hooks/useInclusaoStudents";
import { supabase } from "@/integrations/supabase/client";
import { buildDocumento, type FonteAtividade } from "@/lib/documentos/builders";
import { imprimirDocumento } from "@/lib/documentos/print";
import { exportarDocx } from "@/lib/documentos/docx";
import { saveDocumento, listDocumentos, deleteDocumento, type DocumentoSalvo } from "@/lib/db/documentos";
import type { DocumentoModo, DocumentoPlanejamento, DocumentoTipo } from "@/lib/documentos/types";
import { DocumentoPreview } from "./DocumentoPreview";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: DocumentoTipo;
  /** Pré-seleção opcional. */
  defaultTurmaId?: string | null;
};

const TITULOS: Record<DocumentoTipo, string> = {
  atividades: "Planejamento de Atividades",
  pcd: "Planejamento de Atividades PCD",
  trilhas: "Planejamento — Trilha Semestral",
  sofia: "Planejamento — Sugestões da Sofia",
};

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export function DocumentoDialog({ open, onOpenChange, tipo, defaultTurmaId }: Props) {
  const { turmas } = useTurmas();
  const { events } = useAgenda();
  const { students } = useInclusaoStudents();

  const [escola, setEscola] = useState("");
  const [professor, setProfessor] = useState("");
  const [turmaId, setTurmaId] = useState<string>(defaultTurmaId ?? "");
  const [dataInicio, setDataInicio] = useState(todayISO());
  const [dataFim, setDataFim] = useState(addDaysISO(todayISO(), 7));
  const [modo, setModo] = useState<DocumentoModo>("completo");
  const [doc, setDoc] = useState<DocumentoPlanejamento | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"form" | "preview" | "historico">("form");
  const [historico, setHistorico] = useState<DocumentoSalvo[]>([]);

  // Preenche escola/professor a partir do perfil quando abre.
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, escola")
        .eq("user_id", uid)
        .maybeSingle();
      if (p?.escola && !escola) setEscola(p.escola);
      if (p?.display_name && !professor) setProfessor(p.display_name);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && tab === "historico") {
      void listDocumentos({ tipo, turmaId: turmaId || undefined })
        .then(setHistorico)
        .catch(() => setHistorico([]));
    }
  }, [open, tab, tipo, turmaId]);

  const turma = useMemo(() => turmas.find((t) => t.id === turmaId) ?? null, [turmas, turmaId]);

  const podeGerar = !!(escola.trim() && professor.trim() && turmaId && dataInicio && dataFim && dataFim >= dataInicio);

  const fontesParaTurma = useMemo<FonteAtividade[]>(() => {
    if (!turma) return [];
    // Filtra eventos da agenda pelo período e turma (turma aparece no título/notas).
    const turmaNome = turma.name.toLowerCase();
    return events
      .filter((e) => e.date >= dataInicio && e.date <= dataFim)
      .filter((e) =>
        (e.title || "").toLowerCase().includes(turmaNome) ||
        (e.notes || "").toLowerCase().includes(turmaNome),
      )
      .map((e) => ({
        data: e.date,
        titulo: e.title,
        notas: e.notes,
      }));
  }, [events, turma, dataInicio, dataFim]);

  const cidsAlunos = useMemo(() => {
    if (tipo !== "pcd" || !turma) return [];
    return students
      .filter((s) => (s.turma || "").toLowerCase() === turma.name.toLowerCase())
      .flatMap((s) => s.cids ?? (s.cid ? [s.cid] : []));
  }, [tipo, turma, students]);

  async function gerar() {
    if (!podeGerar || !turma) return;
    setBusy(true);
    try {
      const built = buildDocumento({
        tipo,
        escola,
        turmaId,
        turmaNome: turma.name,
        nivelTexto: turma.grade,
        professor,
        dataInicio,
        dataFim,
        modo,
        fontes: fontesParaTurma,
        cidsAlunos,
      });
      const saved = await saveDocumento(built);
      setDoc(saved.conteudo);
      setTab("preview");
      toast.success("Documento gerado e salvo.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o documento.");
    } finally {
      setBusy(false);
    }
  }

  async function salvar(next: DocumentoPlanejamento) {
    setDoc(next);
    try {
      await saveDocumento(next);
    } catch (e) {
      console.error(e);
    }
  }

  function abrirHistorico(item: DocumentoSalvo) {
    setDoc(item.conteudo);
    setEscola(item.conteudo.escola);
    setProfessor(item.conteudo.professor);
    setTurmaId(item.conteudo.turmaId ?? "");
    setDataInicio(item.dataInicio);
    setDataFim(item.dataFim);
    setModo(item.modo);
    setTab("preview");
  }

  async function removerHistorico(id: string) {
    if (!confirm("Excluir este documento?")) return;
    try {
      await deleteDocumento(id);
      setHistorico((prev) => prev.filter((d) => d.id !== id));
      toast.success("Documento excluído.");
    } catch {
      toast.error("Falha ao excluir.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>📄 {TITULOS[tipo]}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6">
            <TabsTrigger value="form">Dados</TabsTrigger>
            <TabsTrigger value="preview" disabled={!doc}>Pré-visualização</TabsTrigger>
            <TabsTrigger value="historico"><History className="w-4 h-4 mr-1" />Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="flex-1 overflow-auto px-6 pb-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome da Escola</Label>
                <Input value={escola} onChange={(e) => setEscola(e.target.value)} placeholder="EMEF João da Silva" />
              </div>
              <div className="space-y-1.5">
                <Label>Nome do(a) Professor(a)</Label>
                <Input value={professor} onChange={(e) => setProfessor(e.target.value)} placeholder="Maria Souza" />
              </div>
              <div className="space-y-1.5">
                <Label>Turma</Label>
                <Select value={turmaId} onValueChange={setTurmaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                  <SelectContent>
                    {turmas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} {t.grade ? `· ${t.grade}` : ""}</SelectItem>
                    ))}
                    {turmas.length === 0 ? (
                      <SelectItem value="__none" disabled>Nenhuma turma cadastrada</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modo de exibição</Label>
                <RadioGroup value={modo} onValueChange={(v) => setModo(v as DocumentoModo)} className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="completo" /> Completo
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="simplificado" /> Simplificado
                  </label>
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label>Data de início</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data de fim</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={gerar} disabled={!podeGerar || busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Gerar pré-visualização
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-auto px-2 pb-4">
            {doc ? (
              <>
                <div className="flex flex-wrap justify-end gap-2 px-4 pt-2">
                  <Button variant="outline" size="sm" onClick={imprimirDocumento}>
                    <Printer className="w-4 h-4 mr-2" /> Imprimir / Salvar PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportarDocx(doc)}>
                    <FileText className="w-4 h-4 mr-2" /> Exportar Word
                  </Button>
                </div>
                <DocumentoPreview doc={doc} editable onChange={salvar} />
              </>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Gere o documento na aba "Dados".</p>
            )}
          </TabsContent>

          <TabsContent value="historico" className="flex-1 overflow-auto px-6 pb-6">
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento salvo ainda para este tipo.</p>
            ) : (
              <ul className="divide-y border rounded-md">
                {historico.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-3 py-2">
                    <button className="text-left flex-1 hover:underline" onClick={() => abrirHistorico(item)}>
                      <div className="font-medium text-sm">{item.conteudo.turmaNome} — {item.dataInicio} a {item.dataFim}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.modo === "completo" ? "Completo" : "Simplificado"} · salvo {new Date(item.updatedAt).toLocaleString("pt-BR")}
                      </div>
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => removerHistorico(item.id)} aria-label="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/** Botão pronto para abrir o DocumentoDialog. */
export function GerarDocumentoButton({
  tipo, defaultTurmaId, label = "Gerar Documento", className,
}: {
  tipo: DocumentoTipo;
  defaultTurmaId?: string | null;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
        <FileText className="w-4 h-4 mr-2" /> 📄 {label}
      </Button>
      <DocumentoDialog open={open} onOpenChange={setOpen} tipo={tipo} defaultTurmaId={defaultTurmaId} />
    </>
  );
}