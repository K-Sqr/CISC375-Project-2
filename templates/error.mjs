export function render({ title, message, prev, next, route, key }) {
  const nav = `${prev ? `<a class="btn" href="/${route}/${prev}">← Prev</a>` : ""}${next ? `<a class="btn" href="/${route}/${next}">Next →</a>` : ""} <a class="btn primary" href="/">Home</a>`;
  const inner = `<section class="card">
      <h2 class="heading">Oops</h2>
      <p class="muted">${message}</p>
    </section>`;
  const page = `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet" href="/static/dark.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head><body>
    <header><div class="wrap">
      <div class="title">${title}</div>
    </div></header>
    <main>
      {{INNER}}
      <div class="nav">{{NAV}}</div>
    </main>
    <footer>Drug Use Dynamic Viewer • Dark</footer>
    </body></html>`
    .replace("${title}", title)
    .replace("{{INNER}}", inner)
    .replace("{{NAV}}", nav);
  return page;
}
