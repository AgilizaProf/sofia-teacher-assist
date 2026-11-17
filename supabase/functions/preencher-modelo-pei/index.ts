// Preenche o modelo de PEI da rede da professora.
//
// O app lê o .docx do modelo e manda só a lista de espaços em branco
// (id, rótulo, seção, tipo e opções) junto com o PEI do aluno em texto.
// Aqui a Sofia decide o que vai em cada espaço. O arquivo nunca sai do
// navegador; quem escreve no Word é o app.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  callAI,
  aiErrorResponse,
  corsHeaders as cors,
  parseAiJson,
  jsonTruncado,
  erroSimples,
} from "../_shared/sofia-router.ts";
import { userIdFromAuthHeader } from "../_shared/ai-budget.ts";

type Lacuna = { id: string; tipo: string; rotulo: string; secao?: string; opcoes?: string[] };

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const userId = await userIdFromAuthHeader(req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const aluno = String(body?.aluno || "").slice(0, 120);
    const contexto = String(body?.contexto || "").slice(0, 45000);
    const lacunas = (Array.isArray(body?.lacunas) ? body.lacunas : [])
      .slice(0, 300)
      .filter((l: Lacuna) => l && typeof l.id === "string" && typeof l.rotulo === "string")
      .map((l: Lacuna) => ({
        id: l.id.slice(0, 10),
        tipo: String(l.tipo || "").slice(0, 20),
        rotulo: l.rotulo.slice(0, 200),
        secao: String(l.secao || "").slice(0, 120),
        ...(Array.isArray(l.opcoes)
          ? { opcoes: l.opcoes.slice(0, 20).map((o) => String(o).slice(0, 80)) }
          : {}),
      })) as Lacuna[];

    if (!aluno || !lacunas.length) {
      return json({ ok: false, error: "Não encontrei espaços para preencher no modelo." }, 400);
    }

    const sys = `Você é a Sofia, assistente pedagógica do AgilizaProf. A professora usa o modelo oficial de PEI (Plano Educacional Individualizado) da rede de ensino dela. Sua tarefa é preencher os espaços em branco desse modelo com o que a professora já registrou sobre o aluno no app: o PEI e, quando vierem, a anamnese, os registros de sala, o relatório de inclusão, o diário de bordo e as mensagens do WhatsApp que ela confirmou.

Regras:
- Use APENAS as informações enviadas abaixo. Nunca invente nomes, datas, diagnósticos, CID, telefones, laudos ou profissionais.
- O PEI vale mais: use os outros registros para completar o que o PEI não traz. Se um registro contradiz o PEI, fique com o PEI.
- Registros de sala, diário e mensagens do WhatsApp são observações do dia a dia: use-os para descrever o aluno (o que já faz, do que precisa, o que funciona), sem copiar a mensagem inteira e sem citar a data ou o WhatsApp.
- Se não houver informação para um espaço, devolva "" (vazio) para ele. Espaço vazio é melhor que informação inventada.
- Títulos de seção que não pedem resposta: devolva "".
- Escreva em português do Brasil, linguagem técnica pedagógica, frases completas e objetivas.
- Ajuste o tamanho ao espaço: dados de identificação e células curtas recebem só o dado (ex.: "15/03/2016", "3º ano A"); campos descritivos recebem um parágrafo curto ou itens separados por quebra de linha (\\n).
- Quando o espaço pedir objetivos, metas, habilidades ou conteúdos, alinhe à BNCC do ano de referência do aluno. Só cite códigos da BNCC (ex.: EF01LP02, EI03EO04) que estejam no material enviado; não crie códigos.
- Espaços do tipo "opcoes": devolva os números (começando em 1) das opções que devem ser marcadas, separados por vírgula (ex.: "1,3"). Marque só o que o material confirma; se nada confirmar, "".
- Não repita o rótulo na resposta (para "Nome:" devolva só o nome).
- Não diga de onde veio a informação ("segundo o registro", "conforme a anamnese"): escreva diretamente.
Responda APENAS com JSON válido: {"valores": {"<id>": "<texto>", ...}} com todos os ids.`;

    const user = `ALUNO: ${aluno}

O QUE A PROFESSORA JÁ REGISTROU (fonte única de informação):
${contexto || "(ainda sem conteúdo)"}

ESPAÇOS DO MODELO DA REDE (na ordem do documento):
${JSON.stringify(lacunas)}`;

    const r = await callAI({
      userId,
      tipo: "pei",
      system: sys,
      user,
      json: true,
      maxTokens: 8000,
      custoCreditos: 10,
    });
    if (!r.ok) return aiErrorResponse(r);

    const parsed = parseAiJson<{ valores?: Record<string, unknown> }>(r.text || "{}");
    if (r.truncated || jsonTruncado(parsed)) {
      console.warn("[preencher-modelo-pei] resposta cortada", {
        finish: r.finishReason,
        lacunas: lacunas.length,
      });
      return json({
        ok: false,
        truncated: true,
        error: "A resposta veio incompleta. Tente de novo.",
      });
    }
    const valores: Record<string, string> = {};
    const ids = new Set(lacunas.map((l) => l.id));
    for (const [k, v] of Object.entries(parsed?.valores || {})) {
      if (!ids.has(k)) continue;
      const t = Array.isArray(v) ? v.map(String).join("\n") : v == null ? "" : String(v);
      valores[k] = t.slice(0, 4000);
    }
    return json({ valores, model: r.model });
  } catch (e) {
    console.error("[preencher-modelo-pei] erro interno", e);
    return erroSimples(
      "A Sofia não conseguiu preencher o modelo agora. Tente de novo em instantes.",
      e,
    );
  }
});
