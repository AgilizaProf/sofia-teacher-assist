import { Button } from "@/components/ui/button";

export function ReferralCard() {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/60 p-6 shadow-sm"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.94 0.06 20) 0%, oklch(0.94 0.08 60) 100%)",
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="text-3xl" aria-hidden>🎁</div>
        <div className="flex-1">
          <h3 className="text-base font-semibold leading-snug text-foreground">
            Convide outra professora e ganhe 1 mês grátis · ela também ganha 30 dias
          </h3>
          <p className="mt-1 text-sm text-foreground/70">
            Compartilhe seu link único com colegas que também sofrem com pareceres no fim do bimestre.
          </p>
        </div>
        <Button className="rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0">
          Compartilhar link
        </Button>
      </div>
    </section>
  );
}