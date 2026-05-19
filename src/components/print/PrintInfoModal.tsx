import { useEffect, useState } from "react";
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
  /** Disparado quando o usuário confirma — tanto preenchido quanto vazio. */
  onConfirm: (info: PrintInfo) => void;
  title?: string;
  description?: string;
};

/**
 * Modal compartilhado pelos botões de impressão de Planejamento
 * (M1, M2, M3 e M7). Pergunta dados opcionais do cabeçalho antes de
 * abrir a janela de impressão; o usuário pode imprimir sem preencher.
 */
export function PrintInfoModal({
  open, onOpenChange, defaults, onConfirm,
  title = "Imprimir planejamento",
  description = "Preencha os campos abaixo para aparecerem no cabeçalho do documento. Você pode deixar em branco e imprimir mesmo assim.",
}: Props) {
  const [info, setInfo] = useState<PrintInfo>(defaults || {});
  useEffect(() => { if (open) setInfo(defaults || {}); }, [open, defaults]);

  const confirmar = (limpar = false) => {
    onConfirm(limpar ? {} : info);
    onOpenChange(false);
  };

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
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => confirmar(true)}>Imprimir sem preencher</Button>
          <Button onClick={() => confirmar(false)}>Imprimir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}