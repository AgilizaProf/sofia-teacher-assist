import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { useInstalarApp } from "@/lib/pwa/useInstalarApp";

// Janela "Baixar o app": instala o AgilizaProf no celular direto pelo
// navegador, sem loja. Mostra o botão de instalar quando o navegador
// permite, os passos do iPhone e do Android, e um QR code no computador.

const APP_URL = "https://agilizaprof.app.br";

const css = `
.ia-bg{position:fixed;inset:0;z-index:80;background:rgba(20,22,31,.45);display:flex;align-items:center;justify-content:center;padding:16px;
  font-family:'DM Sans','Segoe UI',system-ui,sans-serif;color:#14161F;}
.ia{width:100%;max-width:460px;max-height:min(88vh,720px);overflow:auto;background:#EDF0F5;border:2px solid #14161F;border-radius:20px;box-shadow:5px 5px 0 #14161F;padding:20px;}
.ia *{box-sizing:border-box;}
.ia-hd{display:flex;align-items:flex-start;gap:12px;}
.ia-hd img{width:52px;height:52px;border-radius:14px;border:2px solid #14161F;flex:none;background:#fff;}
.ia-hd h2{margin:0;font-family:'Sora',sans-serif;font-size:24px;letter-spacing:-.04em;line-height:1.15;}
.ia-hd p{margin:4px 0 0;font-size:13.5px;color:#596074;line-height:1.45;}
.ia-x{margin-left:auto;width:36px;height:36px;flex:none;border-radius:10px;border:2px solid #14161F;background:#fff;cursor:pointer;font-size:18px;font-weight:700;line-height:1;color:#14161F;}
.ia-card{margin-top:16px;background:#fff;border:1.5px solid #D6DBE5;border-radius:14px;padding:14px;}
.ia-card h3{margin:0 0 10px;font-family:'Sora',sans-serif;font-size:15.5px;letter-spacing:-.02em;}
.ia-steps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;counter-reset:p;}
.ia-steps li{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.45;}
.ia-steps li::before{counter-increment:p;content:counter(p);flex:none;width:24px;height:24px;border-radius:8px;background:#0B7A55;color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;}
.ia-btn{width:100%;height:50px;margin-top:16px;border-radius:12px;border:2px solid #14161F;box-shadow:3px 3px 0 #14161F;background:#0B7A55;color:#fff;
  font-family:inherit;font-weight:800;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;}
.ia-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #14161F;}
.ia-qr{display:flex;gap:14px;align-items:center;}
.ia-qr img{width:132px;height:132px;flex:none;border:1.5px solid #D6DBE5;border-radius:10px;}
.ia-qr p{margin:0;font-size:13.5px;line-height:1.5;color:#3A3F4E;}
.ia-ok{margin-top:16px;padding:12px 14px;border-radius:12px;background:#CDEFE2;border:1.5px solid #0B7A55;font-weight:700;font-size:14px;}
.ia-nota{margin:14px 0 0;font-size:12.5px;color:#596074;line-height:1.5;}
.ia kbd{font-family:inherit;font-weight:700;background:#EDF0F5;border:1px solid #D6DBE5;border-radius:6px;padding:1px 6px;}
@media (max-width:640px){
  .ia-bg{align-items:flex-end;padding:0;}
  .ia{max-width:none;max-height:90vh;border-radius:20px 20px 0 0;border-bottom:0;box-shadow:none;padding:18px 16px calc(20px + env(safe-area-inset-bottom,0px));}
  .ia-qr{flex-direction:column;align-items:flex-start;}
}
`;

function PassosIos() {
  return (
    <div className="ia-card">
      <h3>No iPhone (Safari)</h3>
      <ol className="ia-steps">
        <li>
          <span>
            Toque em <kbd>Compartilhar</kbd> (o quadrado com a seta para cima), na barra de baixo.
          </span>
        </li>
        <li>
          <span>
            Escolha <kbd>Adicionar à Tela de Início</kbd>.
          </span>
        </li>
        <li>
          <span>
            Toque em <kbd>Adicionar</kbd>. O ícone do AgilizaProf aparece junto dos seus apps.
          </span>
        </li>
      </ol>
    </div>
  );
}

function PassosAndroid() {
  return (
    <div className="ia-card">
      <h3>No Android (Chrome)</h3>
      <ol className="ia-steps">
        <li>
          <span>
            Toque nos <kbd>⋮</kbd> três pontinhos, no canto de cima.
          </span>
        </li>
        <li>
          <span>
            Escolha <kbd>Instalar app</kbd> ou <kbd>Adicionar à tela inicial</kbd>.
          </span>
        </li>
        <li>
          <span>
            Confirme em <kbd>Instalar</kbd>. Pronto, ele abre como um app.
          </span>
        </li>
      </ol>
    </div>
  );
}

export function InstalarApp({ onClose }: { onClose: () => void }) {
  const { plataforma, instalado, podeInstalarDireto, instalar } = useInstalarApp();
  const [qr, setQr] = useState("");
  const [feito, setFeito] = useState(false);

  useEffect(() => {
    if (plataforma !== "computador") return;
    QRCode.toDataURL(APP_URL, { width: 264, margin: 1 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [plataforma]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="ia-bg" onClick={onClose}>
      <style>{css}</style>
      <div
        className="ia"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ia-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ia-hd">
          <img src="/apple-touch-icon.png" alt="" />
          <div>
            <h2 id="ia-titulo">Baixe o AgilizaProf no celular</h2>
            <p>
              Instala direto pelo navegador, sem Google Play e sem App Store. Fica com ícone na tela
              e abre como um app.
            </p>
          </div>
          <button type="button" className="ia-x" aria-label="Fechar" onClick={onClose}>
            ×
          </button>
        </div>

        {instalado || feito ? (
          <div className="ia-ok">✓ O AgilizaProf já está instalado neste aparelho.</div>
        ) : (
          <>
            {podeInstalarDireto && (
              <button
                type="button"
                className="ia-btn"
                onClick={async () => {
                  if (await instalar()) setFeito(true);
                }}
              >
                Instalar agora
              </button>
            )}
            {plataforma === "computador" && (
              <div className="ia-card">
                <h3>Aponte a câmera do celular</h3>
                <div className="ia-qr">
                  {qr && <img src={qr} alt="QR code para abrir o AgilizaProf no celular" />}
                  <p>
                    O QR code abre o <b>agilizaprof.app.br</b> no celular. Lá, toque em{" "}
                    <b>Baixar o app</b> no menu
                    <b> Mais</b> e siga os passos.
                  </p>
                </div>
              </div>
            )}
            {plataforma === "ios" && <PassosIos />}
            {plataforma === "android" && !podeInstalarDireto && <PassosAndroid />}
            {plataforma === "computador" && (
              <>
                <PassosAndroid />
                <PassosIos />
              </>
            )}
          </>
        )}
        <p className="ia-nota">
          É o mesmo AgilizaProf, com a mesma conta. As atualizações chegam sozinhas, sem precisar
          baixar de novo.
        </p>
      </div>
    </div>,
    document.body,
  );
}
