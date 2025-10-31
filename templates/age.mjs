export function render({ title, age, countsByDrug, prev, next, nav }) {
  const labels = Object.keys(countsByDrug || {});
  const data = Object.values(countsByDrug || {});
  const minVal = data.length ? Math.min(...data) : 0;
  const maxVal = data.length ? Math.max(...data) : 0;
  const minIdx = data.length ? data.indexOf(minVal) : -1;
  const maxIdx = data.length ? data.indexOf(maxVal) : -1;
  const keysArr = Object.keys(countsByDrug || {});
  const minLabel = keysArr[minIdx] ?? "";
  const maxLabel = keysArr[maxIdx] ?? "";
  const minMaxList = `<ul class="minmax-list">
    <li><strong>Minimum:</strong> ${minVal}${typeof minVal === "number" ? "%" : ""} ${minLabel ? `(${minLabel})` : ""}</li>
    <li><strong>Maximum:</strong> ${maxVal}${typeof maxVal === "number" ? "%" : ""} ${maxLabel ? `(${maxLabel})` : ""}</li>
  </ul>`;

  const nav = `${prev ? `<a class="btn green" href="/age/${prev}">← Prev</a>` : ""}${next ? `<a class="btn green" href="/age/${next}">Next →</a>` : ""} <a class="btn primary" href="/">Home</a>`;

  // build a side list of ages for quick navigation (keeps styling consistent with dark theme)
  const ages = (nav && nav.ages) ? nav.ages : [];
  const agesList = `<aside style="width:220px;flex:0 0 220px">
    <div class="card" style="padding:12px;">
      <h3 class="heading">Ages</h3>
      <p class="muted" style="margin-top:6px;margin-bottom:8px">Click an age to jump to its data.</p>
      <ul class="side-list" style="list-style:none;padding:0;margin:0;max-height:420px;overflow:auto">
        ${ages.map(a => `<li style=\"margin:6px 0\"><a href=\"/age/${a}\" class=\"age-link ${a===age? 'active' : ''}\">${a}</a></li>`).join('')}
      </ul>
    </div>
  </aside>`;

  const chartCard = `<div class="card" style="flex:1;min-width:260px">
        <h2 class="heading">Age ${age} • Weighted Use</h2>
        <canvas id="ageChart"></canvas>
      </div>`;

  const infoCard = `<div class="card" style="min-width:260px">
        <h3 class="heading">About this view</h3>
        <p class="muted">The pie chart shows weighted drug-use percentages for age ${age}. Slice size corresponds to prevalence.</p>
        ${minMaxList}
      </div>`;

  const inner = `<div class="layout" style="display:flex;gap:14px;align-items:flex-start;">
      ${agesList}
      <div style="display:flex;flex-direction:column;flex:1;gap:12px">
        <div style="display:flex;gap:12px;flex-wrap:wrap">${chartCard}${infoCard}</div>
        <div class="nav">${nav ? '' : ''}</div>
      </div>
    </div>
    <script>
      (function(){
        const ctx = document.getElementById('ageChart');
        const darkTicks = '#cdd3e1';
        new Chart(ctx, {
          type: 'pie',
          data: {
            labels: ${JSON.stringify(labels)},
            datasets: [{
              label: 'Drug Usage (%)',
              data: ${JSON.stringify(data)},
              backgroundColor: ${JSON.stringify([
                '#7aa2f7','#8bd5ca','#ffd166','#f38ba8','#cba6f7',
                '#94e2d5','#fab387','#f2cdcd','#b4befe','#89b4fa'
              ].slice(0, labels.length))},
              borderColor: '#0f1115',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: darkTicks } } }
          }
        });
        // small client-side enhancement: mark active link class styling
        const style = document.createElement('style');
        style.innerHTML = `
          .age-link{ color:#61a0ff; text-decoration:none; display:block; padding:6px 8px; border-radius:6px }
          .age-link.active{ background:#111214; color:#fff; }
          @media (max-width:700px){ .layout{ flex-direction:column } .age-link{ display:inline-block } }
        `;
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
