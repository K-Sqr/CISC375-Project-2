/*
  Fixed server.mjs (ESM)
  - Cached templates to prevent import loop
  - Guarded redirects to avoid infinite redirects
  - Await init() before starting server
*/

import express from "express";
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use("/static", express.static(path.join(__dirname, "static")));

/* ---- CSV ---- */
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  const headers = lines.shift().split(",").map(h => h.trim());
  return lines.map(line => {
    const vals = line.split(",").map(v => v.trim());
    const obj = {};
    for (let i=0;i<headers.length;i++) obj[headers[i]] = vals[i] ?? "";
    return obj;
  });
}

/* ---- Data ---- */
const DATA = { rows: [], agesSorted: [], typesSorted: [] };

async function init(){
  const csvPath = path.join(__dirname, "data", "drug-use-by-age.csv");
  const txt = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(txt);
  DATA.rows = rows;
  const ages = Array.from(new Set(rows.map(r => String(r.age))))
    .map(a => Number(a)).filter(n => Number.isFinite(n))
    .sort((a,b)=>a-b).map(n => String(n));
  const first = rows[0] || {};
  const types = Object.keys(first).filter(k => k.endsWith("_use")).map(k => k.replace(/_use$/,""));
  DATA.agesSorted = ages;
  DATA.typesSorted = types;
// Recompute ages to include every individual age, expanding any ranges like "22-23"
(function rebuildAges(){
  const agesSet = new Set();
  for (const r of rows) {
    const a = String(r.age);
    const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(a);
    if (m) {
      const low = Number(m[1]); const high = Number(m[2]);
      for (let n = low; n <= high; n++) agesSet.add(String(n));
    } else {
      const n = Number(a);
      if (Number.isFinite(n)) agesSet.add(String(n));
    }
  }
  DATA.agesSorted = Array.from(agesSet).map(Number).sort((a,b)=>a-b).map(String);
})();

}

/* ---- Helpers ---- */
function navLinks(){
  return { ages: DATA.agesSorted, types: DATA.typesSorted, freqs: DATA.typesSorted };
}

function sequentialNeighborsForAge(ageStr){
  const nums = DATA.agesSorted.map(a=>Number(a));
  const minA = Math.min(...nums);
  const maxA = Math.max(...nums);
  const a = Number(ageStr);
  if (!Number.isFinite(a)) return { prev: null, next: null };
  const prev = a > minA ? String(a-1) : null;
  const next = a < maxA ? String(a+1) : null;
  return { prev, next };
}

function sequentialNeighborsFromArray(arr, key){
  const idx = arr.indexOf(key);
  if (idx === -1) return { prev: null, next: null };
  return { prev: idx>0?arr[idx-1]:null, next: idx<arr.length-1?arr[idx+1]:null };
}

// cache for templates
const templateCache = new Map();
async function renderTemplate(name, data){
  if (!templateCache.has(name)){
    const modPath = path.join(__dirname, "templates", `${name}.mjs`);
    const modUrl = url.pathToFileURL(modPath).href;
    const mod = await import(modUrl);
    templateCache.set(name, mod);
  }
  const mod = templateCache.get(name);
  return mod.render(data);
}

/* ---- Routes ---- */

app.get("/age", (req,res)=>{
  const first = DATA.agesSorted[0];
  if (!first) return res.status(500).send("No age data found");
  res.redirect(`/age/${first}`);
});


// === Dark themed homepage ===
app.get("/", (req,res)=>{
  const firstAge = DATA.agesSorted[0] || "";
  const firstType = DATA.typesSorted[0] || "";
  const html = `<!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Drug Use Dynamic Viewer • Dark</title>
  <link rel="stylesheet" href="/static/dark.css">
  </head><body>
  <header><div class="wrap"><div class="title">Drug Use Dynamic Viewer • Dark</div></div></header>
  <main>
    <section class="grid cols-2">
      <div class="card" style="text-align:center">
        <h2 class="heading">Welcome</h2>
        <p class="muted">Explore national substance use data with dynamic, interactive visualizations.</p>
        <p>
          <a class="btn green" href="/age/${firstAge}">Start: By Age</a>
          <a class="btn primary" href="/drug_type/${firstType}">Start: By Drug Type</a>
          <a class="btn red" href="/drug_frequency/${firstType}">Start: By Frequency</a>
        </p>
      </div>
      <div class="card">
        <h3 class="heading">Navigation</h3>
        <p class="muted">Each page displays both text and graphical data. Use “Prev” and “Next” to move through entries, or return Home anytime.</p>
      </div>
    </section>
    <div class="nav" style="margin-top:16px">
      <a class="btn" href="/age/${firstAge}">Ages</a>
      <a class="btn" href="/drug_type/${firstType}">Types</a>
      <a class="btn" href="/drug_frequency/${firstType}">Frequencies</a>
    </div>
  </main>
  <footer>Drug Use Dynamic Viewer • Dark</footer>
  </body></html>`;
  res.send(html);
});

// === Age route with expanded ranges ===
app.get("/age/:age", async (req, res) => {
  const age = String(req.params.age);
  let rows = DATA.rows.filter(r => String(r.age) === age);
  let rangeFound = null;
  if (!rows.length) {
    for (const r of DATA.rows) {
      const match = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(String(r.age));
      if (match) {
        const low = Number(match[1]);
        const high = Number(match[2]);
        if (age >= low && age <= high) {
          rows = [r];
          rangeFound = `${low}-${high}`;
          break;
        }
      }
    }
  }

  const { prev, next } = sequentialNeighborsForAge(age);
  const nav = navLinks();
  if (!rows.length) {
    const html = await renderTemplate("error", { title: "Error", message: `Error: no data for age ${age}`, prev, next, route: "age", key: age, nav });
    return res.status(404).send(html);
  }

  const row = rows[0];
  const weights = {};
  for (const t of DATA.typesSorted) {
    const v = Number(row[`${t}_use`]);
    if (Number.isFinite(v) && v > 0) weights[t] = v;
  }

  const disclaimer = rangeFound
    ? `This age falls within the ${rangeFound} range; data shown is identical for all ages in this range.`
    : "";

  const html = await renderTemplate("age", {
    title: `Age ${age}`,
    age,
    rows,
    countsByDrug: weights,
    prev,
    next,
    nav,
    disclaimer
  });
  res.send(html);
});

app.get("/drug_type", (req,res)=>{
  const first = DATA.typesSorted[0];
  if (!first) return res.status(500).send("No drug type data found");
  res.redirect(`/drug_type/${first}`);
});

app.get("/drug_frequency", (req,res)=>{
  const first = DATA.typesSorted[0];
  if (!first) return res.status(500).send("No frequency data found");
  res.redirect(`/drug_frequency/${first}`);
});

app.get("/age/:age", async (req,res)=>{
  const age = String(req.params.age);
const ageNum = Number(age);
const minAge = Number(DATA.agesSorted[0] || 12);
const maxAge = Number(DATA.agesSorted[DATA.agesSorted.length - 1] || 80);

// Custom bounds handling
if (!Number.isFinite(ageNum)) {
  const prev = null;
  const next = String(minAge);
  const nav = navLinks();
  const html = await renderTemplate("error", {
    title: `Age ${age}`,
    message: `No data available for age "${age}".`,
    prev, next, route: "age", key: age, nav
  });
  return res.status(404).send(html);
}

    if (ageNum < minAge) {
      const prev = String(Number(ageNum) - 1); // allow backward link to error page
      const next = String(minAge);
      const nav = navLinks();
      const html = await renderTemplate("error", {
        title: `Age ${age}`,
        message: `No data available for ages under ${minAge}.`,
        prev, next, route: "age", key: age, nav
      });
      return res.status(404).send(html);
    }
    

    if (ageNum > maxAge) {
      const prev = String(maxAge);
      const next = String(Number(ageNum) + 1); // allow forward link to error page
      const nav = navLinks();
      const html = await renderTemplate("error", {
        title: `Age ${age}`,
        message: `No data available for ages over the maximum recorded age (${maxAge}).`,
        prev, next, route: "age", key: age, nav
      });
      return res.status(404).send(html);
    }
    
const rows = DATA.rows.filter(r => String(r.age) === age);
  const { prev, next } = sequentialNeighborsForAge(age);
  const nav = navLinks();
  if (!rows.length){
    const html = await renderTemplate("error", { title:"Error", message:`Error: no data for age ${age}`, prev, next, route:"age", key:age, nav });
    return res.status(404).send(html);
  }
  const row = rows[0];
  const weights = {};
  for (const t of DATA.typesSorted){
    const v = Number(row[`${t}_use`]);
    if (Number.isFinite(v) && v > 0) weights[t] = v;
  }
  const html = await renderTemplate("age", { title:`Age ${age}`, age, rows, countsByDrug: weights, prev, next, nav });
  res.send(html);
});

app.get("/drug_type/:type", async (req,res)=>{
  const type = String(req.params.type);
// Custom invalid type handling
if (!DATA.typesSorted.includes(type)) {
  const prev = DATA.typesSorted.length ? DATA.typesSorted[DATA.typesSorted.length - 1] : null;
  const next = DATA.typesSorted.length ? DATA.typesSorted[0] : null;
  const nav = navLinks();
  const html = await renderTemplate("error", {
    title: `Drug Type "${type}"`,
    message: `No data available for this drug type.`,
    prev, next, route: "drug_type", key: type, nav
  });
  return res.status(404).send(html);
}
const { prev, next } = sequentialNeighborsFromArray(DATA.typesSorted, type);
  const nav = navLinks();
  if (!DATA.typesSorted.includes(type)){
    const html = await renderTemplate("error", { title:"Error", message:`Error: no data for drug type \"${type}\"`, prev, next, route:"drug_type", key:type, nav });
    return res.status(404).send(html);
  }
  const countsByAge = {};
  for (const r of DATA.rows){
    const v = Number(r[`${type}_use`]);
    if (Number.isFinite(v) && v > 0) countsByAge[String(r.age)] = v;
  }
  const html = await renderTemplate("drug_type", { title:`Drug Type ${type}`, type, rows: DATA.rows, countsByAge, prev, next, nav });
  res.send(html);
});

app.get("/drug_frequency/:type", async (req,res)=>{
  const type = String(req.params.type);
// Custom invalid frequency handling
if (!DATA.typesSorted.includes(type)) {
  const prev = DATA.typesSorted.length ? DATA.typesSorted[DATA.typesSorted.length - 1] : null;
  const next = DATA.typesSorted.length ? DATA.typesSorted[0] : null;
  const nav = navLinks();
  const html = await renderTemplate("error", {
    title: `Drug Frequency "${type}"`,
    message: `No data available for this drug frequency.`,
    prev, next, route: "drug_frequency", key: type, nav
  });
  return res.status(404).send(html);
}
const { prev, next } = sequentialNeighborsFromArray(DATA.typesSorted, type);
  const nav = navLinks();
  if (!DATA.typesSorted.includes(type)){
    const html = await renderTemplate("error", { title:"Error", message:`Error: no data for frequency \"${type}\"`, prev, next, route:"drug_frequency", key:type, nav });
    return res.status(404).send(html);
  }
  const countsByType = {};
  for (const r of DATA.rows){
    const val = Number(r[`${type}_frequency`]);
    countsByType[String(r.age)] = Number.isFinite(val) ? val : 0;
  }
  const html = await renderTemplate("drug_frequency", { title:`Drug Frequency ${type}`, freq:type, rows: DATA.rows, countsByType, prev, next, nav });
  res.send(html);
});

app.use((req,res)=> res.status(404).send(`<h1>404 Not Found</h1><p>${req.originalUrl}</p><p><a href="/">Home</a></p>`));

await init();
// Initialize data and start server with clearer error handling
try {
  await init();
  console.log("Data loaded. Starting server...");
} catch (err) {
  console.error("Failed to initialize data:", err && err.message ? err.message : err);
  // Provide a hint for common deployment problems
  console.error("Hint: ensure data/drug-use-by-age.csv exists and is included in your deployed files.");
  process.exit(1);
}

const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Another process is listening on this port.`);
    console.error(`If you're running locally, stop the other process or set a different PORT environment variable (e.g. PORT=4000 node server.mjs).`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});