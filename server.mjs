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

// Serve static files
app.use("/static", express.static(path.join(__dirname, "static")));
app.use("/static/img", express.static(path.join(__dirname, "img")));

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
  // keep the original age keys from the CSV (these include ranges like "22-23")
  const ages = Array.from(new Set(rows.map(r => String(r.age))));
  const first = rows[0] || {};
  const types = Object.keys(first).filter(k => k.endsWith("_use")).map(k => k.replace(/_use$/,""));
  DATA.agesSorted = ages;
  DATA.typesSorted = types;
  DATA.agesSorted = ages;

  // Build image maps for ages and drug types so templates can reference exact URLs
  function pickFirstImageIn(dirPath){
    try{
      const files = fs.readdirSync(dirPath);
      const img = files.find(f => /\.(jpe?g|png|webp)$/i.test(f));
      return img ? path.join(dirPath, img) : null;
    }catch(e){ return null; }
  }

  const ageImageMap = {};
  const agePhotosRoot = path.join(__dirname, 'img', 'AgePhotos');
  // many age images live under AgePhotos/AgePhotos or directly
  const agePhotosDirs = [path.join(agePhotosRoot, 'AgePhotos'), agePhotosRoot];
  for (const a of DATA.agesSorted){
    // prefer exact file Age{age}.ext under AgePhotos/AgePhotos
    let found = null;
    for (const dir of agePhotosDirs){
      if (!dir) continue;
      try{
        const files = fs.readdirSync(dir);
        // try exact name like Age22-23.jpg or Age19.jpg
        const exact = files.find(f => f.toLowerCase().startsWith(('age' + a).toLowerCase()) && /\.(jpe?g|png|webp)$/i.test(f));
        if (exact) { found = path.join('/static/img', path.relative(path.join(__dirname, 'img'), path.join(dir, exact)).replace(/\\/g,'/')); break; }
        // try directory named Age19 etc
        const dirName = files.find(fn => fn.toLowerCase() === ('age' + a).toLowerCase());
        if (dirName){
          const candidate = pickFirstImageIn(path.join(dir, dirName));
          if (candidate) { found = path.join('/static/img', path.relative(path.join(__dirname, 'img'), candidate).replace(/\\/g,'/')); break; }
        }
      }catch(e){ /* ignore */ }
    }
    // fallback: map to group ranges
    if (!found){
      const n = Number(a);
      let group = null;
      if (Number.isFinite(n)){
        if (n <= 19) group = 'Age19';
        else if (n >= 26 && n <= 29) group = 'Age26-29';
        else if (n >= 50 && n <= 64) group = 'Age50-64';
        else if (n >= 65) group = 'Age65+';
        else group = 'Age26-29';
      }
      if (group){
        const candidate = pickFirstImageIn(path.join(agePhotosRoot, 'AgePhotos', group)) || pickFirstImageIn(path.join(agePhotosRoot, group));
        if (candidate) found = path.join('/static/img', path.relative(path.join(__dirname, 'img'), candidate).replace(/\\/g,'/'));
      }
    }
    ageImageMap[a] = found || null;
  }

  const drugImageMap = {};
  const drugPhotosRoot = path.join(__dirname, 'img', 'DrugPhotos');
  const drugPhotosDirs = [path.join(drugPhotosRoot, 'DrugPhotos'), drugPhotosRoot];
  for (const t of DATA.typesSorted){
    let found = null;
    for (const dir of drugPhotosDirs){
      try{
        const files = fs.readdirSync(dir);
        // try to find a file that contains the drug type name
        const match = files.find(f => f.toLowerCase().includes(t.toLowerCase()) && /\.(jpe?g|png|webp)$/i.test(f));
        if (match){
          found = path.join('/static/img', path.relative(path.join(__dirname, 'img'), path.join(dir, match)).replace(/\\/g,'/'));
          break;
        }
      }catch(e){ /* ignore */ }
    }
    drugImageMap[t] = found || null;
  }

  DATA.ageImageMap = ageImageMap;
  DATA.drugImageMap = drugImageMap;

}

/* ---- Helpers ---- */
function navLinks(){
  return { ages: DATA.agesSorted, types: DATA.typesSorted, freqs: DATA.typesSorted, ageImages: DATA.ageImageMap, drugImages: DATA.drugImageMap };
}

function sequentialNeighborsForAge(ageStr){
  const idx = DATA.agesSorted.indexOf(String(ageStr));
  if (idx === -1) return { prev: null, next: null };
  return { prev: idx>0?DATA.agesSorted[idx-1]:null, next: idx<DATA.agesSorted.length-1?DATA.agesSorted[idx+1]:null };
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

app.get("/age/:age", async (req, res) => {
  const raw = String(req.params.age);
  const nav = navLinks();

  // first try exact match (this catches ranges like "22-23" and single ages stored in CSV)
  let row = DATA.rows.find(r => String(r.age) === raw);
  let usedKey = raw;

  // if not exact, and raw is numeric, find a range row that contains it
  if (!row) {
    const n = Number(raw);
    if (Number.isFinite(n)){
      for (const r of DATA.rows){
        const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(String(r.age));
        if (m){
          const low = Number(m[1]); const high = Number(m[2]);
          if (n >= low && n <= high){ row = r; usedKey = String(r.age); break; }
        } else if (Number(String(r.age)) === n){ row = r; usedKey = String(r.age); break; }
      }
    }
  }

  // if still not found, return 404 with helpful message
  if (!row){
    const html = await renderTemplate("error", { title: `Age ${raw}`, message: `Error: no data for age ${raw}`, prev: null, next: null, route: "age", key: raw, nav });
    return res.status(404).send(html);
  }

  // compute prev/next based on ordering in DATA.agesSorted
  const { prev, next } = sequentialNeighborsForAge(usedKey);

  const weights = {};
  for (const t of DATA.typesSorted){
    const v = Number(row[`${t}_use`]);
    if (Number.isFinite(v) && v > 0) weights[t] = v;
  }

  const html = await renderTemplate("age", { title: `Age ${usedKey}`, age: usedKey, rows: [row], countsByDrug: weights, prev, next, nav });
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