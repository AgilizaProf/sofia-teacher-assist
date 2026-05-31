import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, FileText, Loader2, History, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { useTurmas } from "@/hooks/useTurmas";
import { useInclusaoStudents } from "@/hooks/useInclusaoStudents";
import { supabase } from "@/integrations/supabase/client";
import { buildRelatorioBase, decidirTipoRelatorio } from "@/lib/documentos/relatorioBuilder";
import {
  exportarRelatoriosZip,
} from "@/lib/documentos/relatorioDocx";
import {
  imprimirRelatorioEditorial,
  exportarRelatorioEditorialWord,
} from "@/lib/documentos/relatorioEditorial";
import {
  saveRelatorioDoc,
  listRelatoriosDoc,
  deleteRelatorioDoc,
  type RelatorioSalvo,
} from "@/lib/db/relatoriosDoc";
import type {
  RelatorioDocumento,
  RelatorioModo,
  RelatorioTipo,
} from "@/lib/documentos/relatorioTypes";
import {
  PERIODOS_RELATORIO,
  datasDoPeriodo,
  type RelatorioPeriodoTipo,
} from "@/lib/documentos/relatorioPeriodo";
import { RelatorioPreview } from "./RelatorioPreview";

export type RelatorioDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pré-seleção opcional do(a) aluno(a) (clientId = id do Inclusão / hash). */
  defaultAlunoClientId?: string | null;
  /** Forçar tipo (se omitido, é inferido pelo nível da turma + flag PCD). */
  forcarTipo?: RelatorioTipo;
};

const TITULOS: Record<RelatorioTipo, string> = {
  geral: "Relatório de Desempenho",
  ei: "Parecer Descritivo (EI)",
  pcd: "Relatório de Inclusão (PCD)",
  semestral: "Relatório Semestral",
};

export function RelatorioDialog({
  open,
  onOpenChange,
  defaultAlunoClientId,
  forcarTipo,
}: RelatorioDialogProps) {
  const { turmas } = useTurmas();
  const { students } = useInclusaoStudents();

  const [escola, setEscola] = useState("");
  const [professor, setProfessor] = useState("");
  const [alunoId, setAlunoId] = useState<string>(defaultAlunoClientId ?? "");
  const [periodoTipo, setPeriodoTipo] = useState<RelatorioPeriodoTipo>("1bim");
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [modo, setModo] = useState<RelatorioModo>("completo");
  const [doc, setDoc] = useState<RelatorioDocumento | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"form" | "preview" | "historico">("form");
  const [historico, setHistorico] = useState<RelatorioSalvo[]>([]);

  // Sincroniza período/ano → datas (editáveis depois).
  useEffect(() => {
    const { inicio, fim } = datasDoPeriodo(periodoTipo, ano);
    setDataInicio(inicio);
    setDataFim(fim);
  }, [periodoTipo, ano]);

  // Pré-preenche escola/professor pelo perfil.
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
    if (defaultAlunoClientId && !alunoId) setAlunoId(defaultAlunoClientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAlunoClientId]);

  useEffect(() => {
    if (open && tab === "historico") {
      void listRelatoriosDoc({ alunoClientId: alunoId || undefined })
        .then(setHistorico)
        .catch(() => setHistorico([]));
    }
  }, [open, tab, alunoId]);

  const aluno = useMemo(() => students.find((s) => s.id === alunoId) ?? null, [students, alunoId]);
  const turma = useMemo(() => {
    if (!aluno) return null;
    return turmas.find((t) => (t.name || "").toLowerCase() === (aluno.turma || "").toLowerCase()) ?? null;
  }, [turmas, aluno]);

  const tipo: RelatorioTipo = useMemo(() => {
    if (forcarTipo) return forcarTipo;
    const pcd = !!(aluno && ((aluno.cids && aluno.cids.length > 0) || aluno.cid || aluno.diag));
    return decidirTipoRelatorio({
      nivelTexto: turma?.grade ?? aluno?.anoEscolar ?? null,
      pcd,
      semestral: periodoTipo === "1sem" || periodoTipo === "2sem",
    });
  }, [forcarTipo, aluno, turma, periodoTipo]);

  const podeGerar = !!(escola.trim() && professor.trim() && aluno && dataInicio && dataFim && dataFim >= dataInicio);

  async function gerar() {
    if (!podeGerar || !aluno) return;
    setBusy(true);
    try {
      const periodoLabel =
        PERIODOS_RELATORIO.find((p) => p.value === periodoTipo)?.label ?? periodoTipo;
      const base = buildRelatorioBase({
        tipo,
        modo,
        periodo: periodoLabel,
        dataInicio,
        dataFim,
        escola,
        professor,
        turmaId: turma?.id ?? null,
        turmaNome: aluno.turma || turma?.name || "",
        nivelTexto: turma?.grade ?? aluno.anoEscolar ?? null,
        alunoClientId: aluno.id,
        alunoNome: aluno.name,
        anoReferencia: String(ano),
        diagnostico: aluno.diag || null,
        cids: aluno.cids ?? (aluno.cid ? [aluno.cid] : []),
        curriculoId: turma?.curriculo_id ?? null,
      });
      const saved = await saveRelatorioDoc(base);
      setDoc(saved.conteudo);
      setTab("preview");
      toast.success("Relatório gerado e salvo.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o relatório.");
    } finally {
      setBusy(false);
    }
  }

  async function salvar(next: RelatorioDocumento) {
    setDoc(next);
    try {
      await saveRelatorioDoc(next);
    } catch (e) {
      console.error(e);
    }
  }

  function abrirHistorico(item: RelatorioSalvo) {
    setDoc(item.conteudo);
    setEscola(item.conteudo.escola);
    setProfessor(item.conteudo.professor);
    setAlunoId(item.alunoClientId);
    setDataInicio(item.dataInicio);
    setDataFim(item.dataFim);
    setModo(item.modo);
    setTab("preview");
  }

  async function removerHistorico(id: string) {
    if (!confirm("Excluir este relatório?")) return;
    try {
      await deleteRelatorioDoc(id);
      setHistorico((prev) => prev.filter((d) => d.id !== id));
      toast.success("Relatório excluído.");
    } catch {
      toast.error("Falha ao excluir.");
    }
  }

  async function exportarZipHistorico() {
    const itens = await listRelatoriosDoc({ alunoClientId: alunoId || undefined });
    if (itens.length === 0) {
      toast.error("Nenhum relatório salvo para exportar.");
      return;
    }
    await exportarRelatoriosZip(itens.map((i) => i.conteudo));
    toast.success(`ZIP gerado com ${itens.length} arquivo(s).`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>📝 {TITULOS[tipo]}</DialogTitle>
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
                <Label>Aluno(a)</Label>
                <Select value={alunoId} onValueChange={setAlunoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o(a) aluno(a)" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.turma ? `· ${s.turma}` : ""}
                      </SelectItem>
                    ))}
                    {students.length === 0 ? (
                      <SelectItem value="__none" disabled>Nenhum(a) aluno(a) cadastrado(a)</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modo</Label>
                <RadioGroup value={modo} onValueChange={(v) => setModo(v as RelatorioModo)} className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="completo" /> Completo
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="simplificado" /> Simplificado
                  </label>
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label>Período</Label>
                <Select value={periodoTipo} onValueChange={(v) => setPeriodoTipo(v as RelatorioPeriodoTipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODOS_RELATORIO.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value) || ano)} />
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
                  <Button variant="outline" size="sm" onClick={() => imprimirRelatorioEditorial(doc)}>
                    <Printer className="w-4 h-4 mr-2" /> Imprimir / Salvar PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportarRelatorioEditorialWord(doc)}>
                    <FileText className="w-4 h-4 mr-2" /> Exportar Word
                  </Button>
                </div>
                <RelatorioPreview doc={doc} editable onChange={salvar} />
              </>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Gere o relatório na aba "Dados".</p>
            )}
          </TabsContent>

          <TabsContent value="historico" className="flex-1 overflow-auto px-6 pb-6 space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportarZipHistorico} disabled={historico.length === 0}>
                <Package className="w-4 h-4 mr-2" /> Baixar todos (ZIP)
              </Button>
            </div>
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum relatório salvo ainda.</p>
            ) : (
              <ul className="divide-y border rounded-md">
                {historico.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-3 py-2">
                    <button className="text-left flex-1 hover:underline" onClick={() => abrirHistorico(item)}>
                      <div className="font-medium text-sm">
                        {item.alunoNome} — {item.periodo}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {TITULOS[item.tipo]} · {item.modo === "completo" ? "Completo" : "Simplificado"} · v{item.versao} · {new Date(item.updatedAt).toLocaleString("pt-BR")}
                      </div>
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => exportarRelatorioEditorialWord(item.conteudo)} aria-label="Exportar Word">
                      <FileText className="w-4 h-4" />
                    </Button>
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

/** Botão pronto para abrir o RelatorioDialog. */
export function GerarRelatorioButton({
  defaultAlunoClientId,
  forcarTipo,
  label = "Editor de Relatório",
  className,
}: {
  defaultAlunoClientId?: string | null;
  forcarTipo?: RelatorioTipo;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
        <FileText className="w-4 h-4 mr-2" /> 📝 {label}
      </Button>
      <RelatorioDialog
        open={open}
        onOpenChange={setOpen}
        defaultAlunoClientId={defaultAlunoClientId}
        forcarTipo={forcarTipo}
      />
    </>
  );
}
