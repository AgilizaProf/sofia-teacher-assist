import { useEffect, useState } from "react";

// LGPD: o Pixel do Meta começa com o consentimento negado (ver __root.tsx)
// e só passa a medir depois que a pessoa aceita aqui. A escolha fica no
// aparelho, em `aprof:cookies` ("aceito" | "recusado").
export const CHAVE_COOKIES = "aprof:cookies";

function lerEscolha(): string | null {
  try {
    return localStorage.getItem(CHAVE_COOKIES);
  } catch {
    return null;
  }
}

export function AvisoCookies({ comBarraInferior }: { comBarraInferior: boolean }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!lerEscolha()) setAberto(true);
  }, []);

  const escolher = (aceito: boolean) => {
    try {
      localStorage.setItem(CHAVE_COOKIES, aceito ? "aceito" : "recusado");
    } catch {
      /* sem armazenamento: a escolha vale só para esta visita */
    }
    try {
      window.fbq?.("consent", aceito ? "grant" : "revoke");
    } catch {
      /* noop */
    }
    setAberto(false);
  };

  if (!aberto) return null;

  return (
    <div
      className={"ck-aviso" + (comBarraInferior ? " ck-com-barra" : "")}
      role="region"
      aria-label="Aviso de cookies"
    >
      <style>{CSS}</style>
      <p>
        Usamos cookies para medir de onde vêm os cadastros (Meta). Nada sobre seus alunos é enviado.{" "}
        <a href="/privacidade">Saiba mais</a>
      </p>
      <div className="ck-acoes">
        <button type="button" className="ck-btn" onClick={() => escolher(false)}>
          Recusar
        </button>
        <button type="button" className="ck-btn ck-ok" onClick={() => escolher(true)}>
          Aceitar
        </button>
      </div>
    </div>
  );
}

const CSS = `
.ck-aviso{position:fixed;z-index:9000;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));max-width:420px;
  background:#fff;border:1px solid #E4E8F0;border-radius:14px;box-shadow:0 10px 30px rgba(20,22,31,.14);
  padding:14px 16px;font-family:'DM Sans',-apple-system,sans-serif;color:#14161F;}
.ck-aviso p{margin:0 0 12px;font-size:14px;line-height:1.45;}
.ck-aviso a{color:#0B7A55;font-weight:600;text-decoration:underline;}
.ck-acoes{display:flex;gap:10px;justify-content:flex-end;}
.ck-btn{min-height:40px;padding:0 16px;border-radius:10px;border:1px solid #D5DBE6;background:#fff;color:#14161F;
  font:600 14px 'DM Sans',-apple-system,sans-serif;cursor:pointer;}
.ck-btn.ck-ok{background:#0B7A55;border-color:#0B7A55;color:#fff;}
.ck-btn:focus-visible{outline:2px solid #0B7A55;outline-offset:2px;}
@media (max-width:1080px){
  .ck-aviso{left:12px;right:12px;max-width:none;bottom:calc(12px + env(safe-area-inset-bottom,0px));}
  .ck-aviso.ck-com-barra{bottom:calc(88px + env(safe-area-inset-bottom,0px));}
  .ck-btn{flex:1;min-height:44px;}
}
`;
