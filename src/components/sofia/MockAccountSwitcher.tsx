import { useEffect, useState } from "react";
import { getMockAccount, setMockAccount, type MockAccount } from "@/lib/sofia/mockAccount";

const css = `
.mock-acc{position:fixed;left:14px;bottom:14px;z-index:100;display:inline-flex;background:#1E1B2E;border:1px solid rgba(249,115,22,.4);border-radius:100px;padding:3px;box-shadow:0 10px 24px rgba(15,13,30,.5);font-family:'JetBrains Mono',monospace;}
.mock-acc button{border:0;background:transparent;color:rgba(255,255,255,.55);font-size:10.5px;font-weight:700;padding:5px 11px;border-radius:100px;cursor:pointer;letter-spacing:.04em;text-transform:uppercase;}
.mock-acc button.on{background:linear-gradient(135deg,#F97316,#EA580C);color:#fff;box-shadow:0 4px 10px rgba(249,115,22,.4);}
`;

export function MockAccountSwitcher() {
  const [acc, setAcc] = useState<MockAccount>("free_vazio");
  useEffect(() => { setAcc(getMockAccount()); }, []);
  const set = (a: MockAccount) => { setMockAccount(a); setAcc(a); };
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="mock-acc" role="group" aria-label="Conta mock para demo">
        <button className={acc === "free_vazio" ? "on" : ""} onClick={() => set("free_vazio")}>Free vazio</button>
        <button className={acc === "pro_cheio" ? "on" : ""} onClick={() => set("pro_cheio")}>Pro · Camila</button>
      </div>
    </>
  );
}
