import { Sparkles, ArrowRight, X } from "lucide-react";
import { useSofia } from "./SofiaProvider";

export type SofiaSuggestion = {
  id: string;
  title: string;
  description?: string;
  tag?: string;
  prompt: string;
  context?: string;
  actionLabel?: string;
};

type Variant = "hero" | "inline" | "compact";

const css = `
/* hero */
.ssg-hero{position:relative;display:flex;align-items:center;gap:18px;padding:22px 24px;border-radius:18px;cursor:pointer;color:#fff;
  background:radial-gradient(120% 140% at 0% 0%, rgba(255,255,255,.10), transparent 55%), linear-gradient(135deg,#1B2A4E 0%,#0F1B36 55%,#3A1A0A 100%);
  border:1px solid rgba(249,115,22,.35);box-shadow:0 18px 40px -18px rgba(11,18,32,.6);transition:transform .18s, box-shadow .18s;overflow:hidden;}
.ssg-hero:hover{transform:translateY(-2px);box-shadow:0 28px 50px -20px rgba(11,18,32,.7);}
.ssg-hero::after{content:"";position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(249,115,22,.45),transparent 65%);pointer-events:none;}
.ssg-hero-icon{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#F97316,#FF9466);display:grid;place-items:center;flex-shrink:0;box-shadow:0 10px 24px -8px rgba(249,115,22,.7);}
.ssg-hero-tag{font-family:'Inter',sans-serif;font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#FFB37A;display:inline-flex;align-items:center;gap:6px;}
.ssg-hero-title{font-family:'Fraunces',serif;font-weight:800;font-size:18px;line-height:1.3;margin:4px 0 4px;}
.ssg-hero-desc{font-family:'Inter',sans-serif;font-size:12.5px;color:rgba(255,255,255,.72);line-height:1.5;}
.ssg-hero-cta{margin-left:auto;background:#F97316;color:#fff;border:none;border-radius:10px;padding:10px 14px;font-family:'Inter',sans-serif;font-weight:700;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;flex-shrink:0;z-index:1;}
.ssg-hero-cta:hover{background:#EA580C;}

/* inline */
.ssg-inline{display:flex;align-items:flex-start;gap:14px;padding:14px 16px;background:#fff;border:1px solid #E7E9EF;border-left:4px solid #F97316;border-radius:12px;font-family:'Inter',sans-serif;color:#1B2A4E;}
.ssg-inline-icon{width:34px;height:34px;border-radius:9px;background:#FFF5EE;color:#F97316;display:grid;place-items:center;flex-shrink:0;}
.ssg-inline-tag{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#F97316;}
.ssg-inline-title{font-family:'Fraunces',serif;font-weight:700;font-size:14px;line-height:1.35;margin:2px 0 4px;}
.ssg-inline-desc{font-size:12.5px;color:#5B6B82;line-height:1.5;}
.ssg-inline-cta{margin-left:auto;background:transparent;border:1px solid #F97316;color:#F97316;border-radius:8px;padding:6px 10px;font-weight:700;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;flex-shrink:0;align-self:center;}
.ssg-inline-cta:hover{background:#F97316;color:#fff;}
.ssg-inline-dismiss{background:transparent;border:none;color:#8A98AE;cursor:pointer;padding:2px;border-radius:6px;align-self:flex-start;}
.ssg-inline-dismiss:hover{color:#1B2A4E;}

/* compact */
.ssg-compact{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;font-family:'Inter',sans-serif;color:#1B2A4E;font-size:12.5px;cursor:pointer;background:transparent;border:none;width:100%;text-align:left;}
.ssg-compact:hover{background:#FFF5EE;}
.ssg-compact-icon{width:24px;height:24px;border-radius:6px;background:#FFF5EE;color:#F97316;display:grid;place-items:center;flex-shrink:0;}
.ssg-compact-text{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ssg-compact-arrow{color:#8A98AE;flex-shrink:0;}
`;

let cssInjected = false;
function ensureCss() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  const tag = document.createElement("style");
  tag.setAttribute("data-sofia-suggestion", "");
  tag.textContent = css;
  document.head.appendChild(tag);
}

export function SofiaSuggestionCard({
  suggestion,
  variant,
  onDismiss,
}: {
  suggestion: SofiaSuggestion;
  variant: Variant;
  onDismiss?: () => void;
}) {
  const sofia = useSofia();
  ensureCss();

  const open = () =>
    sofia.openSofia({ prompt: suggestion.prompt, context: suggestion.context });

  if (variant === "hero") {
    return (
      <div className="ssg-hero" role="button" tabIndex={0} onClick={open} onKeyDown={(e) => e.key === "Enter" && open()}>
        <div className="ssg-hero-icon"><Sparkles size={22} color="#fff" /></div>
        <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
          {suggestion.tag && <span className="ssg-hero-tag"><Sparkles size={10} /> {suggestion.tag}</span>}
          <div className="ssg-hero-title">{suggestion.title}</div>
          {suggestion.description && <div className="ssg-hero-desc">{suggestion.description}</div>}
        </div>
        <button className="ssg-hero-cta" onClick={(e) => { e.stopPropagation(); open(); }}>
          {suggestion.actionLabel || "Pedir à Sofia"} <ArrowRight size={13} />
        </button>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="ssg-inline">
        <div className="ssg-inline-icon"><Sparkles size={16} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {suggestion.tag && <div className="ssg-inline-tag">{suggestion.tag}</div>}
          <div className="ssg-inline-title">{suggestion.title}</div>
          {suggestion.description && <div className="ssg-inline-desc">{suggestion.description}</div>}
        </div>
        <button className="ssg-inline-cta" onClick={open}>
          {suggestion.actionLabel || "Abrir"} <ArrowRight size={11} />
        </button>
        {onDismiss && (
          <button className="ssg-inline-dismiss" onClick={onDismiss} aria-label="Dispensar">
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  // compact
  return (
    <button className="ssg-compact" onClick={open} type="button">
      <span className="ssg-compact-icon"><Sparkles size={12} /></span>
      <span className="ssg-compact-text">{suggestion.title}</span>
      <ArrowRight size={12} className="ssg-compact-arrow" />
    </button>
  );
}

export function SofiaSuggestionList({
  suggestions,
  variant,
}: {
  suggestions: SofiaSuggestion[];
  variant: Variant;
}) {
  if (!suggestions.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: variant === "compact" ? 2 : 10 }}>
      {suggestions.map((s) => (
        <SofiaSuggestionCard key={s.id} suggestion={s} variant={variant} />
      ))}
    </div>
  );
}