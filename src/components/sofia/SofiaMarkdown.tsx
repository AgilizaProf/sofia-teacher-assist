import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "@tanstack/react-router";
import { ehLinkInterno, prepararMarkdownChat } from "@/lib/sofia/markdownChat";

type LinkInternoProps = { href: string; children?: React.ReactNode; onNavigate?: () => void };

/** Link interno do app: mesma aba, pelo roteador (não duplica o app nem perde a sessão). */
function LinkInterno({ href, children, onNavigate }: LinkInternoProps) {
  const u = new URL(href, "https://app.local");
  const search = Object.fromEntries(u.searchParams.entries());
  return (
    <Link
      to={u.pathname as never}
      search={(Object.keys(search).length ? search : undefined) as never}
      hash={u.hash ? u.hash.slice(1) : undefined}
      onClick={() => onNavigate?.()}
    >
      {children}
    </Link>
  );
}

/** Componentes de link do Markdown da Sofia. Exportado para testes. */
export function sofiaMdComponents(opts?: {
  onInternalNavigate?: () => void;
  renderInternal?: (p: LinkInternoProps) => React.ReactNode;
}) {
  return {
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      if (ehLinkInterno(href)) {
        const p = { href, children, onNavigate: opts?.onInternalNavigate };
        return opts?.renderInternal ? <>{opts.renderInternal(p)}</> : <LinkInterno {...p} />;
      }
      // Externos em nova aba, para não perder a conversa.
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
  };
}

/**
 * Markdown das respostas da Sofia, igual no chat, na janela rápida e nas
 * notificações: quebras de linha preservadas, URLs clicáveis, tabelas como
 * listas e links internos na mesma aba.
 */
export function SofiaMarkdown({
  children,
  onInternalNavigate,
}: {
  children: string;
  onInternalNavigate?: () => void;
}) {
  const md = useMemo(() => prepararMarkdownChat(children || ""), [children]);
  const components = useMemo(() => sofiaMdComponents({ onInternalNavigate }), [onInternalNavigate]);
  return <ReactMarkdown components={components}>{md}</ReactMarkdown>;
}
