export function render({ title, type, countsByAge, prev, next, nav }) {
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

  const navButtons = `${prev ? `<a class="btn" href="/drug_type/${prev}">← Prev</a>` : ""}${next ? `<a class="btn" href="/drug_type/${next}">Next →</a>` : ""} <a class="btn primary" href="/">Home</a>`;

  const types = (nav && nav.types) ? nav.types : [];
  const typesList = `<aside style="width:240px;flex:0 0 240px">
    <div class="card" style="padding:12px;">
      <h3 class="heading">Drugs</h3>
      <p class="muted" style="margin-top:6px;margin-bottom:8px">Click a drug to view usage across ages.</p>
      <ul class="side-list" style="list-style:none;padding:0;margin:0;max-height:520px;overflow:auto">
        ${types.map(t => `<li style=\"margin:6px 0\"><a href=\"/drug_type/${t}\" class=\"type-link ${t===type? 'active' : ''}\">${t}</a></li>`).join('')}
      </ul>
    </div>
  </aside>`;

  const chartCard = `<div class="card" style="flex:1;min-width:260px">
        <h2 class="heading">Type: ${type} • Weighted by Age</h2>
        <canvas id="drugChart"></canvas>
      </div>`;

  const placeholder = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect fill="#1f2024" width="100%" height="100%"/><text x="50%" y="50%" fill="#cdd3e1" font-size="20" font-family="Arial" text-anchor="middle" dy=".3em">No image available</text></svg>');
  const drugImg = (nav && nav.drugImages && nav.drugImages[type]) ? nav.drugImages[type] : placeholder;

  const infoCard = `<div class="card" style="min-width:260px">
        <h3 class="heading">About this view</h3>
        <p class="muted">The pie chart shows the weighted usage of ${type} across ages. Larger slices indicate higher prevalence within that age.</p>
        ${minMaxList}
        </div>
        <div class="card">
          <h3 class="heading">Drug Type Information</h3>
          <div style="text-align: center; padding: 10px;">
            <img src="${drugImg}" 
                 alt="Representative image for ${type}"
                 style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 10px;"
            />
          </div>
        </div>`;

  const inner = `<div class="layout" style="display:flex;gap:14px;align-items:flex-start;">
      ${typesList}
      <div style="display:flex;flex-direction:column;flex:1;gap:12px">
        <div style="display:flex;gap:12px;flex-wrap:wrap">${chartCard}${infoCard}</div>
      </div>
    </div>
    <script>
      (function(){
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
        const style = document.createElement('style');
        style.innerHTML = '.type-link{ color:#61a0ff; text-decoration:none; display:block; padding:6px 8px; border-radius:6px } .type-link.active{ background:#111214; color:#fff; } @media (max-width:700px){ .layout{ flex-direction:column } .type-link{ display:inline-block } }';
        document.head.appendChild(style);
      })();
    </script>`;

  const page = `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet" href="/static/dark.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <style>
      .minmax-list { margin-top: .5rem; padding-left: 1.25rem; }
      .minmax-list li { margin: .15rem 0; color: #cdd3e1; }
        img { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.2s; }
        img:hover { transform: scale(1.02); }
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
    .replace("{{NAV}}", navButtons);
  return page;
}
