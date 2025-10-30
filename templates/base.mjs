
export function layout({title, navHTML, bodyHTML}){
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Arial;background:#eaf6e6;margin:0}
    header{background:#cfe9cf;padding:10px}
    nav a{margin-right:10px}
    main{max-width:1100px;margin:auto;padding:22px}
    .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    .btn{display:inline-block;background:#2e7d32;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px}
    .muted{opacity:.6}
  </style></head><body>
  <header><nav>${navHTML}</nav></header>
  <main>${bodyHTML}</main>
  </body></html>`;
}
