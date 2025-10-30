export function render({ title, freq, countsByType, prev, next }) {
  const labels = Object.keys(countsByType || {});
  const data = Object.values(countsByType || {});
  const minVal = data.length ? Math.min(...data) : 0;
  const maxVal = data.length ? Math.max(...data) : 0;
  const minIdx = data.length ? data.indexOf(minVal) : -1;
  const maxIdx = data.length ? data.indexOf(maxVal) : -1;
  const keysArr = Object.keys(countsByType || {});
  const minLabel = keysArr[minIdx] ?? "";
  const maxLabel = keysArr[maxIdx] ?? "";
  const minMaxList = `<ul class="minmax-list">
    <li><strong>Minimum:</strong> ${minVal}${typeof minVal === "number" ? "%" : ""} ${minLabel ? `(${minLabel})` : ""}</li>
    <li><strong>Maximum:</strong> ${maxVal}${typeof maxVal === "number" ? "%" : ""} ${maxLabel ? `(${maxLabel})` : ""}</li>
  </ul>`;

  const nav = `${prev ? `<a class="btn red" href="/drug_frequency/${prev}">← Prev</a>` : ""}${next ? `<a class="btn red" href="/drug_frequency/${next}">Next →</a>` : ""} <a class="btn primary" href="/">Home</a>`;

  const inner = `<section class="card">
      <h2 class="heading">Frequency for ${freq} by Age</h2>
      <canvas id="freqChart"></canvas>
    </section>
    <script>
      const ctx = document.getElementById('freqChart');
      const darkTicks = '#cdd3e1';
      const gridColor = 'rgba(255,255,255,0.1)';
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ${JSON.stringify(labels)},
          datasets: [{
            label: 'Frequency',
            data: ${JSON.stringify(data)},
            backgroundColor: '#7aa2f7',
            borderColor: '#a6e3a1'
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: { ticks: { color: darkTicks }, grid: { color: gridColor } },
            y: { beginAtZero: true, ticks: { color: darkTicks }, grid: { color: gridColor } }
          },
          plugins: { legend: { labels: { color: darkTicks } } }
        }
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
