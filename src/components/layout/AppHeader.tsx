import type { ReactNode } from "react";
import { PainelNav } from "@/components/painel/PainelNav";

export const appHeaderCss = `
.app-header{display:flex;align-items:center;gap:14px;padding:12px 24px;background:#fff;border-bottom:1px solid #E4E8F0;flex-wrap:wrap;min-height:60px;}
.app-header .ah-left{display:flex;align-items:center;gap:12px;min-width:0;flex:1;}
.app-header .ah-crumbs{display:flex;align-items:center;gap:6px;font-size:12px;color:#6B7691;font-weight:600;flex-wrap:wrap;}
.app-header .ah-crumbs strong{color:#14161F;font-weight:700;}
.app-header .ah-crumbs .sep{opacity:.45;}
.app-header .ah-crumbs .now{color:#14161F;font-weight:700;}
.app-header .ah-streak{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#E8F6EF,#fff);border:1px solid #FFD9BF;border-radius:100px;padding:4px 10px 4px 8px;font-size:11.5px;font-weight:700;color:#064E36;}
.app-header .ah-streak .num{font-family:'Sora',serif;font-weight:800;font-size:13px;}
.app-header .ah-secstatus{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:#6B7691;}
.app-header .ah-secstatus .dot{width:7px;height:7px;border-radius:50%;background:#10B981;box-shadow:0 0 6px #10B981;}
.app-header .ah-right{margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.app-header .ah-icon{width:32px;height:32px;border-radius:8px;background:#fff;border:1px solid #E4E8F0;display:flex;align-items:center;justify-content:center;color:#6B7691;cursor:pointer;transition:.15s;position:relative;}
.app-header .ah-icon:hover{border-color:#0B7A55;color:#0B7A55;}
.app-header .ah-icon svg{width:14px;height:14px;}
.app-header .ah-credits{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E4E8F0;border-radius:10px;padding:5px 11px;font-size:11.5px;color:#14161F;font-weight:700;line-height:1.1;}
.app-header .ah-credits small{display:block;font-size:9.5px;color:#6B7691;font-weight:700;letter-spacing:.06em;margin-top:2px;}
.app-header .ah-user{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid #E4E8F0;border-radius:100px;padding:3px 12px 3px 3px;cursor:pointer;}
.app-header .ah-user:hover{border-color:#0B7A55;}
.app-header .ah-user .av{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#0B7A55,#0B7A55);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:10.5px;}
.app-header .ah-user .nm{font-size:11.5px;font-weight:700;color:#14161F;line-height:1.2;}
.app-header .ah-user .pl{font-size:9px;color:#0B7A55;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-top:1px;}
@media(max-width:820px){
  .app-header{padding:8px 14px;gap:8px;min-height:auto;}
  .app-header .ah-left{min-width:0;flex:1 1 100%;order:1;}
  .app-header .ah-crumbs{font-size:11px;flex-wrap:nowrap;overflow:hidden;max-width:100%;}
  .app-header .ah-crumbs span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .app-header .ah-right{order:2;flex:1 1 100%;justify-content:flex-start;gap:6px;flex-wrap:wrap;margin-left:0;}
  .app-header .ah-credits{display:none;}
  .app-header .ah-user{display:none;}
  .app-header .ah-streak{display:none;}
}
@media(max-width:480px){
  .app-header .ah-right button{font-size:11px;padding:5px 8px;gap:4px;}
  .app-header .ah-right button svg{width:12px;height:12px;}
}
`;

export type AppHeaderProps = {
  breadcrumb?: Array<{ label: string; onClick?: () => void }>;
  actions?: ReactNode;
  secondaryStatus?: string | null;
  hideActiveChip?: boolean;
  /** A página já mostra o menu (PainelNav) acima; aqui só as ações. */
  noNav?: boolean;
};

// As páginas antigas usavam um cabeçalho com trilha ("Sua sala › …").
// Agora todas mostram o menu do visual Painel; ações da página, quando
// existem, aparecem numa faixa logo abaixo do menu.
export function AppHeader({ actions, noNav }: AppHeaderProps) {
  return (
    <>
      {!noNav && <PainelNav />}
      {actions && (
        <div className="pn-page-actions">
          <style>{`.pn-page-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;max-width:1280px;margin:0 auto;padding:12px 24px 0;}@media(max-width:860px){.pn-page-actions{padding:10px 16px 0;justify-content:flex-start;}}`}</style>
          {actions}
        </div>
      )}
    </>
  );
}
