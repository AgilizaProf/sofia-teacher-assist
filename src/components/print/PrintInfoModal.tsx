import { useEffect, useMemo, useState } from "react";
import { Printer, FileDown, CalendarDays } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PrintInfo = {
  escola?: string;
  turma?: string;
  professor?: string;
  dataInicio?: string;
  dataFim?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Valores iniciais (ex.: turma já conhecida). */
  defaults?: PrintInfo;
  /** Disparado quando o usuário escolhe imprimir/PDF. */
  onConfirm: (info: PrintInfo) => void;
  /** Opcional: disparado quando o usuário escolhe salvar em Word. */
  onConfirmWord?: (info: PrintInfo) => void;
  title?: string;
  description?: string;
  /**
   * Quando true, o modal substitui o intervalo de datas por um único campo
   * "Dia da atividade". Se `scheduledDate` estiver presente, o campo vem
   * pré-preenchido; caso contrário, o dia é obrigatório antes de imprimir.
   * Use para impressão de uma atividade individual quando ela ainda não foi
   * agendada no calendário.
   */
  askActivityDay?: boolean;
  /** Data já agendada da atividade (YYYY-MM-DD). Pré-preenche o campo. */
  scheduledDate?: string;
};

/**
 * Modal compartilhado pelos botões de impressão de Planejamento
 * (M1, M2, M3 e M7). Pergunta dados opcionais do cabeçalho antes de
 * abrir a janela de impressão; o usuário pode imprimir sem preencher.
 */
export function PrintInfoModal({
  open, onOpenChange, defaults, onConfirm, onConfirmWord,
  title = "Imprimir planejamento",
  description = "Preencha os campos abaixo para aparecerem no cabeçalho do documento. Você pode deixar em branco e imprimir mesmo assim.",
  askActivityDay = false,
  scheduledDate,
}: Props) {
  const [info, setInfo] = useState<PrintInfo>(defaults || {});
  const [dia, setDia] = useState<string>("");
  useEffect(() => {
    if (!open) return;
    setInfo(defaults || {});
    setDia(scheduledDate || defaults?.dataInicio || "");
  }, [open, defaults, scheduledDate]);

  const diaFaltando = askActivityDay && !dia;
  const aplicarDia = (base: PrintInfo): PrintInfo =>
    askActivityDay && dia ? { ...base, dataInicio: dia, dataFim: dia } : base;

  const confirmar = (limpar = false) => {
    if (diaFaltando) return;
    onConfirm(limpar ? aplicarDia({}) : aplicarDia(info));
    onOpenChange(false);
  };
  const confirmarWord = (limpar = false) => {
    if (!onConfirmWord) return;
    if (diaFaltando) return;
    onConfirmWord(limpar ? aplicarDia({}) : aplicarDia(info));
    onOpenChange(false);
  };

  const semPreencherDisabled = useMemo(() => diaFaltando, [diaFaltando]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="pi-escola">Nome da escola</Label>
            <Input id="pi-escola" value={info.escola || ""} onChange={(e) => setInfo({ ...info, escola: e.target.value })} placeholder="Opcional" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pi-turma">Turma</Label>
            <Input id="pi-turma" value={info.turma || ""} onChange={(e) => setInfo({ ...info, turma: e.target.value })} placeholder="Opcional" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pi-prof">Nome do(a) professor(a)</Label>
            <Input id="pi-prof" value={info.professor || ""} onChange={(e) => setInfo({ ...info, professor: e.target.value })} placeholder="Opcional" />
          </div>
          {askActivityDay ? (
            <div className="grid gap-1.5">
              <Label htmlFor="pi-dia" className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Dia da atividade {!scheduledDate && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="pi-dia"
                type="date"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                required
              />
              <p className="text-[11.5px] text-muted-foreground">
                {scheduledDate
                  ? "Dia recuperado do calendário — pode ajustar se necessário."
                  : "Esta atividade ainda não foi agendada no calendário. Informe o dia para sair no documento."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="pi-ini">Data início</Label>
                <Input id="pi-ini" type="date" value={info.dataInicio || ""} onChange={(e) => setInfo({ ...info, dataInicio: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pi-fim">Data fim</Label>
                <Input id="pi-fim" type="date" value={info.dataFim || ""} onChange={(e) => setInfo({ ...info, dataFim: e.target.value })} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => confirmar(true)} disabled={semPreencherDisabled}>Sem preencher</Button>
          {onConfirmWord && (
            <Button variant="outline" onClick={() => confirmarWord(false)} disabled={diaFaltando}>
              <FileDown className="h-4 w-4 mr-1" /> Salvar em Word
            </Button>
          )}
          <Button onClick={() => confirmar(false)} disabled={diaFaltando}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}