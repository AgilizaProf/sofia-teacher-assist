// Lista de transtornos / deficiências mais frequentes na escola, com CIDs.
// Fonte: CID-10 / CID-11 (uso pedagógico, não diagnóstico).

export type CidOption = {
  value: string;
  label: string;
  cid: string;
};

export const CID_OPTIONS: CidOption[] = [
  { value: "tdah", label: "TDAH — Transtorno do Déficit de Atenção/Hiperatividade", cid: "F90" },
  { value: "tea", label: "TEA — Transtorno do Espectro Autista", cid: "F84.0" },
  { value: "dislexia", label: "Dislexia", cid: "F81.0" },
  { value: "discalculia", label: "Discalculia", cid: "F81.2" },
  { value: "disgrafia", label: "Disgrafia", cid: "F81.1" },
  { value: "tod", label: "TOD — Transtorno Opositor Desafiador", cid: "F91.3" },
  { value: "ansiedade", label: "Transtorno de Ansiedade", cid: "F41" },
  { value: "depressao", label: "Depressão", cid: "F32" },
  { value: "tab", label: "Transtorno Afetivo Bipolar", cid: "F31" },
  { value: "tprocessamento", label: "Transtorno do Processamento Auditivo Central", cid: "H93.25" },
  { value: "di", label: "Deficiência Intelectual", cid: "F70-F79" },
  { value: "sd", label: "Síndrome de Down", cid: "Q90" },
  { value: "altas", label: "Altas Habilidades / Superdotação", cid: "—" },
  { value: "df", label: "Deficiência Física", cid: "—" },
  { value: "dv_baixa", label: "Deficiência Visual — Baixa Visão", cid: "H54.2" },
  { value: "dv_cegueira", label: "Deficiência Visual — Cegueira", cid: "H54.0" },
  { value: "da_parcial", label: "Deficiência Auditiva — Parcial", cid: "H90.5" },
  { value: "da_surdez", label: "Deficiência Auditiva — Surdez", cid: "H91.3" },
  { value: "paralisia", label: "Paralisia Cerebral", cid: "G80" },
  { value: "epilepsia", label: "Epilepsia", cid: "G40" },
  { value: "outro", label: "Outro", cid: "—" },
  { value: "nao_informado", label: "Não informado", cid: "—" },
];

export const cidLabel = (value: string): string => {
  const o = CID_OPTIONS.find((c) => c.value === value);
  if (!o) return value;
  return o.cid && o.cid !== "—" ? `${o.label} (CID ${o.cid})` : o.label;
};