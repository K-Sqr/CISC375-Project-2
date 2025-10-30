export function render({ title, type, countsByAge, prev, next }) {
  const labels = Object.keys(countsByAge || {});
  const data = Object.values(countsByAge || {});
  const minVal = data.length ? Math.min(...data) : 0;
  const maxVal = data.length ? Math.max(...data) : 0;
  const minIdx = data.length ? data.indexOf(minVal) : -1;
  const maxIdx = data.length ? data.indexOf(maxVal) : -1;
  const keysArr = Object.keys(countsByAge || {});
  const minLabel = keysArr[minIdx] ?? "";
  const maxLabel = keysArr[maxIdx] ?? "";
  const minMaxList = `<ul class="minmax-list">
    <li><strong>Minimum:</strong> ${minVal}${typeof minVal === "number" ? "%" : ""} ${minLabel ? `(${minLabel})` : ""}</li>
    <li><strong>Maximum:</strong> ${maxVal}${typeof maxVal === "number" ? "%" : ""} ${maxLabel ? `(${maxLabel})` : ""}</li>
  </ul>`;

  const nav = `${prev ? `<a class="btn" href="/drug_type/${prev}">← Prev</a>` : ""}${next ? `<a class="btn" href="/drug_type/${next}">Next →</a>` : ""} <a class="btn primary" href="/">Home</a>`;

  const inner = `<section class="grid cols-2">
      <div class="card">
        <h2 class="heading">Type: ${type} • Weighted by Age</h2>
        <canvas id="drugChart"></canvas>
      </div>
      <div class="card">
        <h3 class="heading">About this view</h3>
        <p class="muted">The pie chart shows the weighted usage of ${type} across ages. Larger slices indicate higher prevalence within that age.</p>
        ${minMaxList}
      </div>
    </section>
    <script>
      const ctx = document.getElementById('drugChart');
      const darkTicks = '#cdd3e1';
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ${JSON.stringify(labels)},
          datasets: [{
            label: 'Usage by Age (%)',
            data: ${JSON.stringify(data)},
            backgroundColor: ${JSON.stringify([
              '#89b4fa','#74c7ec','#94e2d5','#a6e3a1','#f9e2af',
              '#fab387','#eba0ac','#cba6f7','#b4befe','#f38ba8'
            ].slice(0, labels.length))},
            borderColor: '#0f1115',
            borderWidth: 2
          }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: darkTicks } } } }
      });
    </script>`;

  const page = `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet" href="/static/dark.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <style>
      .minmax-list { margin-top: .5rem; padding-left: 1.25rem; }
      .minmax-list li { margin: .15rem 0; color: #cdd3e1; }
    </style>

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
