import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { markOnboardingDone, shouldShowOnboarding } from "@/lib/onboarding";
import { trackEvent } from "@/lib/tracking";
import { PencilLogo } from "@/components/painel/PainelNav";
import { createTurma, listTurmas } from "@/lib/db/turmas";
import { refreshEiMode } from "@/lib/ei/useEiMode";

// Primeiro acesso: nome, WhatsApp, etapa e ano (com toques), e então a
// primeira semana de aula já sugerida, pronta para montar com a Sofia.
// A rota continua sendo "/onboarding" porque o guard de autenticação
// (useAuthGuard) e o pós-login (Auth.tsx) redirecionam pra cá enquanto o
// perfil não tem telefone válido.
export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Bem-vindo(a) · AgilizaProf" },
      { name: "description", content: "Complete seu cadastro para começar a usar o AgilizaProf." },
    ],
  }),
  component: PrimeiroAcessoPage,
});

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const css = `
.pa-root{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:24px 16px;font-family:'DM Sans',-apple-system,sans-serif;color:#14161F;background:#EDF0F5;}
.pa-brand{display:inline-flex;align-items:center;gap:8px;font-family:'Sora',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.04em;}
.pa-brand b{color:#0B7A55;font-weight:800;}
.pa-card{width:100%;max-width:440px;background:#fff;border:2px solid #14161F;border-radius:20px;box-shadow:6px 6px 0 #14161F;padding:28px 26px;}
.pa-card h1{margin:0 0 6px;font-family:'Sora',sans-serif;font-weight:800;font-size:28px;letter-spacing:-.045em;line-height:1.12;}
.pa-card p.sub{margin:0 0 22px;color:#596074;font-size:15px;line-height:1.5;}
.pa-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
.pa-field label{font-family:'Sora',sans-serif;font-size:14px;font-weight:700;letter-spacing:-.01em;}
.pa-field input{height:50px;border:1.5px solid #D6DBE5;border-radius:12px;padding:0 14px;font-size:16px;font-family:inherit;color:#14161F;background:#fff;transition:border-color .15s,box-shadow .15s;}
.pa-field input:focus{outline:none;border-color:#14161F;box-shadow:0 0 0 3px #CDEFE2;}
.pa-hint{font-size:12.5px;color:#596074;}
.pa-error{font-size:13.5px;font-weight:600;color:#A3301F;background:#FDE3DE;border:1.5px solid #F2604B;border-radius:12px;padding:10px 12px;margin-bottom:14px;}
.pa-btn{width:100%;height:52px;border:2px solid #14161F;border-radius:12px;font-family:'Sora',sans-serif;font-size:16px;font-weight:800;letter-spacing:-.02em;color:#fff;cursor:pointer;background:#0B7A55;box-shadow:4px 4px 0 #14161F;transition:transform .12s,box-shadow .12s;}
.pa-btn:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 #14161F;}
.pa-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #14161F;}
.pa-btn:disabled{opacity:.6;cursor:default;transform:none;}
.pa-chips{display:flex;flex-wrap:wrap;gap:8px;}
.pa-chip{min-height:40px;padding:0 14px;border:1.5px solid #D6DBE5;border-radius:999px;background:#fff;font-family:inherit;font-size:14.5px;font-weight:600;color:#14161F;cursor:pointer;}
.pa-chip.on{border-color:#14161F;background:#CDEFE2;font-weight:800;}
.pa-opt{font-weight:500;color:#596074;font-size:12.5px;}
.pa-week{border:1.5px solid #D6DBE5;border-radius:14px;padding:16px;margin:0 0 18px;background:#F6FBF8;}
.pa-week b{display:block;font-family:'Sora',sans-serif;font-size:17px;letter-spacing:-.02em;margin-bottom:6px;}
.pa-week span{color:#596074;font-size:14px;line-height:1.45;}
.pa-link{display:block;width:100%;margin-top:12px;background:none;border:0;color:#596074;font-size:14px;font-weight:600;text-decoration:underline;cursor:pointer;font-family:inherit;}
`;

const ETAPAS: Array<{ k: string; label: string; anos: string[] }> = [
  { k: "ed_infantil", label: "Educação Infantil", anos: ["Creche", "Pré I", "Pré II"] },
  { k: "anos_iniciais", label: "1º ao 5º ano", anos: ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano"] },
  { k: "anos_finais", label: "6º ao 9º ano", anos: ["6º ano", "7º ano", "8º ano", "9º ano"] },
  { k: "ensino_medio", label: "Ensino Médio", anos: ["1ª série", "2ª série", "3ª série"] },
  { k: "eja", label: "EJA", anos: ["EJA I", "EJA II", "EJA III"] },
];

/** Sugestão da primeira semana, conforme a etapa. */
function primeiraSemana(etapa: string, ano: string): { titulo: string; tema: string; texto: string } {
  if (etapa === "ed_infantil") {
    return {
      titulo: `Semana de adaptação do ${ano}`,
      tema: "Semana de adaptação: acolhimento, rotina e vínculo com as crianças",
      texto: "Brincadeiras de acolhimento, combinados da rotina e momentos para conhecer cada criança, com os campos de experiência da BNCC.",
    };
  }
  return {
    titulo: `Sua primeira semana de aula: acolhimento e sondagem do ${ano}`,
    tema: "Primeira semana de aula: acolhimento da turma e sondagem diagnóstica",
    texto: "Dinâmicas para a turma se conhecer e uma sondagem curta para você saber de onde cada aluno parte, com as habilidades da BNCC do ano.",
  };
}

function PrimeiroAcessoPage() {
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [etapa, setEtapa] = useState("");
  const [ano, setAno] = useState("");
  const [turmaNome, setTurmaNome] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passo, setPasso] = useState<1 | 2>(1);
  const [turmaSalva, setTurmaSalva] = useState("");

  useEffect(() => {
    trackEvent("onboarding_iniciado", { location: "onboarding" });
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (user) {
          const show = await shouldShowOnboarding(user.id);
          if (!show) {
            window.location.replace("/");
            return;
          }
          const { data: prof } = await supabase
            .from("profiles")
            .select("display_name, telefone, etapa_ensino")
            .eq("user_id", user.id)
            .maybeSingle();
          const meta = user.user_metadata as Record<string, unknown> | undefined;
          const metaName =
            typeof meta?.full_name === "string"
              ? meta.full_name
              : typeof meta?.name === "string"
                ? meta.name
                : "";
          if (!cancelled) {
            setName((prof?.display_name || metaName || "").trim());
            if (prof?.telefone) setPhone(formatPhone(prof.telefone));
            if (prof?.etapa_ensino && ETAPAS.some((e) => e.k === prof.etapa_ensino)) setEtapa(prof.etapa_ensino);
          }
        }
      } catch {
        /* ignore — o formulário funciona mesmo sem pré-preenchimento */
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const anosDaEtapa = ETAPAS.find((e) => e.k === etapa)?.anos ?? [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const nome = name.trim();
    const digits = phone.replace(/\D/g, "");
    if (nome.length < 2) {
      setError("Diga como podemos te chamar.");
      return;
    }
    if (digits.length < 10 || digits.length > 11) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }
    setSaving(true);
    const ok = await markOnboardingDone({ name: nome, phone: digits, etapa: etapa || undefined });
    if (!ok) {
      setSaving(false);
      setError("Não foi possível salvar agora. Tente novamente.");
      return;
    }
    trackEvent("onboarding_concluido", { location: "onboarding", etapa: etapa || null, ano: ano || null });
    if (etapa) refreshEiMode();
    if (!ano) {
      window.location.assign("/");
      return;
    }
    // Cria a primeira turma em "Escolas e turmas", sem duplicar.
    const nomeTurma = turmaNome.trim() || ano;
    try {
      const existentes = await listTurmas().catch(() => []);
      if (!existentes.some((t) => t.name.trim().toLowerCase() === nomeTurma.toLowerCase())) {
        await createTurma({ name: nomeTurma, school: "", grade: ano, shift: "", students: "", curriculo_id: null });
      }
    } catch {
      /* a turma pode ser cadastrada depois em Configurações */
    }
    setTurmaSalva(nomeTurma);
    setSaving(false);
    setPasso(2);
  }

  if (!ready) return null;

  if (passo === 2) {
    const sug = primeiraSemana(etapa, ano);
    const destino = `/planejamento/atividade?turma=${encodeURIComponent(turmaSalva)}&tema=${encodeURIComponent(sug.tema)}`;
    return (
      <div className="pa-root">
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="pa-brand">
          <PencilLogo size={40} />
          <span>
            Agiliza<b>Prof</b>
          </span>
        </div>
        <div className="pa-card">
          <h1>Tudo pronto, {name.trim().split(" ")[0]}!</h1>
          <p className="sub">A turma {turmaSalva} já está salva. Que tal começar pela primeira semana?</p>
          <div className="pa-week">
            <b>{sug.titulo}</b>
            <span>{sug.texto}</span>
          </div>
          <button
            className="pa-btn"
            type="button"
            onClick={() => {
              trackEvent("onboarding_primeira_semana", { location: "onboarding", etapa, ano });
              window.location.assign(destino);
            }}
          >
            Montar agora com a Sofia
          </button>
          <button className="pa-link" type="button" onClick={() => window.location.assign("/")}>
            Agora não, ir para o início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pa-root">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="pa-brand">
        <PencilLogo size={40} />
        <span>
          Agiliza<b>Prof</b>
        </span>
      </div>
      <form className="pa-card" onSubmit={onSubmit} noValidate>
        <h1>Que bom ter você aqui!</h1>
        <p className="sub">
          Só um minuto para a Sofia já começar no ponto certo para você.
        </p>

        <div className="pa-field">
          <label htmlFor="pa-nome">Como podemos te chamar?</label>
          <input
            id="pa-nome"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Prof. Ana"
            autoFocus
          />
        </div>

        <div className="pa-field">
          <label htmlFor="pa-tel">Número do celular (WhatsApp)</label>
          <input
            id="pa-tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(11) 91234-5678"
          />
          <span className="pa-hint">Usamos só para avisos importantes da sua conta.</span>
        </div>

        <div className="pa-field">
          <label>Você dá aula para quem?</label>
          <div className="pa-chips" role="group" aria-label="Etapa de ensino">
            {ETAPAS.map((op) => (
              <button
                key={op.k}
                type="button"
                className={"pa-chip" + (etapa === op.k ? " on" : "")}
                aria-pressed={etapa === op.k}
                onClick={() => { setEtapa(op.k); setAno(""); }}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>

        {anosDaEtapa.length > 0 && (
          <div className="pa-field">
            <label>Qual a sua turma principal?</label>
            <div className="pa-chips" role="group" aria-label="Ano da turma">
              {anosDaEtapa.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={"pa-chip" + (ano === a ? " on" : "")}
                  aria-pressed={ano === a}
                  onClick={() => setAno(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {ano && (
          <div className="pa-field">
            <label htmlFor="pa-turma">Nome da turma <span className="pa-opt">(se quiser)</span></label>
            <input
              id="pa-turma"
              value={turmaNome}
              onChange={(e) => setTurmaNome(e.target.value)}
              placeholder={`Ex.: ${ano} A`}
            />
          </div>
        )}

        {error && (
          <div className="pa-error" role="alert">
            {error}
          </div>
        )}

        <button className="pa-btn" type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Começar"}
        </button>
      </form>
    </div>
  );
}
