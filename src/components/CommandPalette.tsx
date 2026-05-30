import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Home, Sparkles, BookOpen, FileText, Heart, Calendar, Settings, LogOut, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearLocalAppData } from "@/lib/persist/clearLocalData";

type Action = {
  id: string;
  label: string;
  hint?: string;
  group: "Ir para" | "Ações" | "Conta";
  icon: React.ComponentType<{ size?: number }>;
  shortcut?: string;
  run: () => void | Promise<void>;
  keywords?: string;
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const go = (to: string) => () => {
    navigate({ to });
    onClose();
  };

  const actions: Action[] = useMemo(
    () => [
      { id: "home", label: "Página inicial", group: "Ir para", icon: Home, shortcut: "G H", run: go("/"), keywords: "dashboard início home" },
      { id: "assistente", label: "Assistente IA (Sofia)", group: "Ir para", icon: Sparkles, shortcut: "G S", run: go("/assistente"), keywords: "sofia chat ia ai" },
      { id: "planejamento", label: "Planejamento", group: "Ir para", icon: BookOpen, shortcut: "G P", run: go("/planejamento"), keywords: "aulas plano" },
      { id: "relatorios", label: "Relatórios e pareceres", group: "Ir para", icon: FileText, shortcut: "G R", run: go("/relatorios"), keywords: "parecer relatorio bimestral" },
      { id: "inclusao", label: "Inclusão", group: "Ir para", icon: Heart, shortcut: "G I", run: go("/inclusao"), keywords: "pcd anamnese pei" },
      { id: "agenda", label: "Agenda escolar", group: "Ir para", icon: Calendar, shortcut: "G A", run: go("/agenda"), keywords: "calendario eventos" },
      { id: "configuracoes", label: "Configurações", group: "Conta", icon: Settings, run: go("/configuracoes"), keywords: "perfil ajustes acessibilidade indicação convide" },
      { id: "novo-plano", label: "Novo plano de aula", group: "Ações", icon: BookOpen, run: go("/planejamento/atividade"), keywords: "criar gerar atividade" },
      { id: "novo-parecer", label: "Gerar parecer descritivo", group: "Ações", icon: FileText, run: go("/relatorios"), keywords: "bimestral bncc" },
      { id: "indique", label: "Convidar educador(a) (ganhe dias grátis)", group: "Ações", icon: Sparkles, run: go("/configuracoes"), keywords: "indicação referral convide" },
      {
        id: "logout",
        label: "Sair da conta",
        group: "Conta",
        icon: LogOut,
       run: async () => {
          clearLocalAppData();
          try { await supabase.auth.signOut(); } catch { /* ignore */ }
          navigate({ to: "/auth" });
          onClose();
        },
        keywords: "logout sign out",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return actions;
    return actions.filter((a) =>
      (a.label + " " + (a.keywords || "") + " " + a.group).toLowerCase().includes(t),
    );
  }, [q, actions]);

  const grouped = useMemo(() => {
    const map = new Map<string, Action[]>();
    filtered.forEach((a) => {
      const arr = map.get(a.group) || [];
      arr.push(a);
      map.set(a.group, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[active];
        if (item) item.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  if (!open) return null;

  let runningIdx = -1;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar ou navegar"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,27,54,.55)",
        backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start",
        justifyContent: "center", paddingTop: 110, zIndex: 1100,
      }}
    >
      <div style={{ width: "100%", maxWidth: 580, background: "#fff", borderRadius: 14, boxShadow: "0 25px 60px rgba(15,27,54,.4)", overflow: "hidden", border: "1px solid #E4E8F0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid #E4E8F0" }}>
          <Search size={16} color="#6B7691" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar páginas, ações, atalhos…"
            autoComplete="off"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 15, fontFamily: "inherit", color: "#1B2A4E", background: "transparent" }}
          />
          <kbd style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 4, padding: "2px 6px", color: "#6B7691" }}>ESC</kbd>
        </div>
        <div style={{ padding: 8, maxHeight: 420, overflowY: "auto" }}>
          {grouped.length === 0 && (
            <div style={{ padding: "22px 14px", textAlign: "center", color: "#6B7691", fontSize: 13 }}>
              Nada encontrado para "{q}".
            </div>
          )}
          {grouped.map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#6B7691", textTransform: "uppercase", letterSpacing: ".10em", padding: "10px 12px 4px" }}>
                {group}
              </div>
              {items.map((a) => {
                runningIdx++;
                const isActive = runningIdx === active;
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onMouseEnter={() => setActive(filtered.indexOf(a))}
                    onClick={() => a.run()}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 8, border: "none",
                      background: isActive ? "#FFF1E8" : "transparent",
                      color: "#1B2A4E", fontSize: 13.5, cursor: "pointer", textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <Icon size={15} />
                    <span style={{ flex: 1 }}>{a.label}</span>
                    {a.shortcut && (
                      <kbd style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#6B7691" }}>{a.shortcut}</kbd>
                    )}
                    {isActive && <ArrowRight size={13} color="#FF7A45" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 14px", borderTop: "1px solid #E4E8F0", display: "flex", gap: 14, fontSize: 11, color: "#6B7691" }}>
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>esc fechar</span>
          <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace" }}>⌘K</span>
        </div>
      </div>
    </div>
  );
}
