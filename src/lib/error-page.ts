export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Algo deu errado — AgilizaProf</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f8fafc;color:#0f172a;padding:24px}
  .card{max-width:480px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(15,23,42,.06)}
  h1{margin:0 0 8px;font-size:22px}
  p{margin:0 0 24px;color:#475569;line-height:1.5}
  .row{display:flex;gap:12px;flex-wrap:wrap}
  button,a.btn{appearance:none;border:1px solid #cbd5e1;background:#fff;color:#0f172a;padding:10px 16px;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;display:inline-block}
  button.primary{background:#0f172a;color:#fff;border-color:#0f172a}
</style>
</head>
<body>
  <div class="card">
    <h1>Algo deu errado</h1>
    <p>Tivemos um problema ao carregar esta página. Tente novamente em instantes.</p>
    <div class="row">
      <button class="primary" onclick="location.reload()">Tentar novamente</button>
      <a class="btn" href="/">Voltar ao início</a>
    </div>
  </div>
</body>
</html>`;
}