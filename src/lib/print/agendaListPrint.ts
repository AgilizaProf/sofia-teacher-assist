// Helper compartilhado para imprimir uma lista de compromissos/atividades
// (Agenda Escolar e calendário M4) ordenada por dia e horário.

export type PrintAgendaItem = {
  date: string;        // YYYY-MM-DD
  time?: string;       // HH:MM (opcional)
  title: string;
  type?: string;       // rótulo legível do tipo
  notes?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDateBR(iso: string): string {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  const wd = dt.toLocaleDateString("pt-BR", { weekday: "long" });
  const wdCap = wd.charAt(0).toUpperCase() + wd.slice(1);
  return `${wdCap}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function imprimirListaAgenda(
  items: PrintAgendaItem[],
  opts: { title?: string; subtitle?: string } = {},
) {
  const ordered = [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || "99:99").localeCompare(b.time || "99:99");
  });
  const byDay = new Map<string, PrintAgendaItem[]>();
  for (const it of ordered) {
    const arr = byDay.get(it.date) || [];
    arr.push(it);
    byDay.set(it.date, arr);
  }

  const title = opts.title || "Agenda — Compromissos e atividades";
  const subtitle = opts.subtitle || "";

  const groupsHtml = [...byDay.entries()]
    .map(([date, list]) => {
      const rows = list
        .map((it) => {
          const time = it.time ? esc(it.time) : "—";
          const type = it.type ? esc(it.type) : "";
          const notes = it.notes && it.notes.trim() ? esc(it.notes.trim()) : "";
          return `
            <tr>
              <td class="t">${time}</td>
              <td class="ti">
                <div class="title">${esc(it.title)}</div>
                ${type ? `<div class="type">${type}</div>` : ""}
                ${notes ? `<div class="notes">${notes}</div>` : ""}
              </td>
            </tr>`;
        })
        .join("");
      return `
        <section class="day">
          <h2>${esc(fmtDateBR(date))}</h2>
          <table>
            <thead><tr><th class="t">Horário</th><th class="ti">Evento</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    })
    .join("");

  const w = window.open("", "_blank", "width=1024,height=768");
  if (!w) { window.print(); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:24px;color:#111}
      h1{font-size:20px;margin:0 0 4px}
      .sub{color:#555;font-size:12px;margin-bottom:18px}
      .day{margin:0 0 18px;page-break-inside:avoid}
      .day h2{font-size:14px;margin:0 0 6px;color:#1B2A4E;border-bottom:2px solid #1B2A4E;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid #e5e7eb}
      th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;background:#f9fafb}
      td.t,th.t{width:90px;white-space:nowrap;font-variant-numeric:tabular-nums}
      .title{font-weight:600}
      .type{font-size:11px;color:#FF7A45;margin-top:2px}
      .notes{font-size:11px;color:#374151;margin-top:4px;white-space:pre-wrap}
      .empty{color:#6b7280;font-size:12px;font-style:italic}
      @page{size:A4;margin:14mm}
    </style></head><body>
    <h1>${esc(title)}</h1>
    ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ""}
    ${groupsHtml || `<div class="empty">Nenhum evento selecionado.</div>`}
    <script>window.onload=()=>{setTimeout(()=>{window.print();},200)}<\/script>
    </body></html>`);
  w.document.close();
}