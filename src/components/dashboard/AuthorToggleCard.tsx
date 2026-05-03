import { Switch } from "@/components/ui/switch";

export function AuthorToggleCard() {
  return (
    <section
      className="flex items-center gap-4 rounded-2xl border p-5 shadow-sm"
      style={{
        background: "oklch(0.98 0.04 90)",
        borderColor: "oklch(0.9 0.08 90)",
      }}
    >
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-foreground">
          📝 Autorizar nome nos documentos gerados
        </h3>
        <p className="mt-1 text-xs text-foreground/70">
          Seu nome será incluído como autor(a) nos relatórios e planejamentos exportados.
        </p>
      </div>
      <Switch defaultChecked aria-label="Autorizar nome nos documentos" />
    </section>
  );
}