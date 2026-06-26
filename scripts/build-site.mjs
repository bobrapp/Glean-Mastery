#!/usr/bin/env node
// Build the Glean-Mastery static site from the curriculum content.
// Reads content/weeks/NN/day-NN.mdx (frontmatter + body), data/sources.json, and
// data/quizzes/week-NN.json, and renders a self-contained site/ folder for GitHub Pages.
// Dependency-light: only gray-matter (already a repo dep) + a compact built-in Markdown renderer.
//   node scripts/build-site.mjs            -> writes ./site
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const WEEKS = path.join(ROOT, "content/weeks");
const OUT = path.join(ROOT, "site");
const SITE_URL = "https://bobrapp.github.io/Glean-Mastery/";
const sources = readJson("data/sources.json", {});
const LEVELS = { "200": "Foundations", "300": "Power user", "400": "Builder · APIs", "500": "Pro · agents & governance" };

// ---------- helpers ----------
function readJson(rel, fb) { const p = path.join(ROOT, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fb; }
function walk(dir) { return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => { const p = path.join(dir, e.name); return e.isDirectory() ? walk(p) : p.endsWith(".mdx") ? [p] : []; }) : []; }
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad2 = (n) => String(n).padStart(2, "0");
const dayHref = (d) => `day-w${pad2(d.week)}-d${pad2(d.day)}.html`;

// ---------- compact Markdown -> HTML (headings, lists, fenced code, bold, inline code, links, paragraphs) ----------
function inline(t) {
  return esc(t)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`)
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, (_, txt, url) => `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`);
}
function md(src) {
  const lines = String(src || "").replace(/\r\n/g, "\n").split("\n");
  const out = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {                                   // fenced code
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(esc(lines[i])); i++; }
      i++; out.push(`<pre><code>${buf.join("\n")}</code></pre>`); continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);                 // headings -> h3..h6 (page owns h1/h2)
    if (h) { const lvl = Math.min(6, h[1].length + 2); out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); i++; continue; }
    if (/^\s*(?:[-*•]\s+|\d+[.)]\s+)/.test(line)) {            // list (one level)
      const ordered = /^\s*\d+[.)]\s+/.test(line); const items = [];
      while (i < lines.length && /^\s*(?:[-*•]\s+|\d+[.)]\s+)/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, ""))}</li>`); i++;
      }
      out.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`); continue;
    }
    if (line.trim() === "") { i++; continue; }
    const para = [];                                           // paragraph
    while (i < lines.length && lines[i].trim() !== "" && !/^```/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) && !/^\s*(?:[-*•]\s+|\d+[.)]\s+)/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

// ---------- load curriculum ----------
const days = walk(WEEKS).map((file) => { const { data, content } = matter(fs.readFileSync(file, "utf8")); return { ...data, body: content, file }; })
  .filter((d) => d.status === "published" || d.status === "verified")
  .sort((a, b) => a.week - b.week || a.day - b.day);
const weeks = [...new Set(days.map((d) => d.week))].sort((a, b) => a - b);
const TOTAL_TARGET = 56;

// ---------- shared chrome ----------
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&display=swap" rel="stylesheet">`;
const CSS = `
  :root{--teal:#01696f;--green:#2ecc71;--green2:#6fe6a3;--ink:#e7f3f1;--ink2:#9fc0bd;--gold:#e8c25a;--line:rgba(120,200,190,.18);--card:rgba(255,255,255,.04)}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',system-ui,sans-serif;color:var(--ink);background:radial-gradient(120% 90% at 80% -10%,#0a3034,#04181a 55%,#03100f);min-height:100vh;line-height:1.6}
  a{color:inherit}
  .wrap{max-width:1000px;margin:0 auto;padding:34px 22px 80px}
  .skip{position:absolute;left:-999px}.skip:focus{left:8px;top:8px;background:var(--green);color:#06241a;padding:8px 12px;border-radius:8px;z-index:10}
  .eyebrow{font-family:'DM Mono',monospace;letter-spacing:.26em;font-size:11px;color:var(--green2);text-transform:uppercase}
  .eyebrow a{color:var(--green2);text-decoration:none;border-bottom:1px solid var(--line)}
  h1{font-family:'Fraunces',serif;font-weight:600;font-size:clamp(30px,6vw,52px);line-height:1.05;margin:12px 0 10px;color:#fff}
  h1 .y{color:var(--green)}
  .lede{font-size:clamp(16px,2.2vw,20px);color:var(--ink2);max-width:660px}
  .creed{font-family:'Fraunces',serif;font-style:italic;color:var(--green2);border-left:2px solid var(--green);padding-left:15px;margin:20px 0 0;font-size:17px}
  .meta{font-family:'DM Mono',monospace;font-size:12px;color:var(--ink2);letter-spacing:.04em}
  .badge{font-family:'DM Mono',monospace;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:999px;border:1px solid var(--line);color:var(--green2)}
  .badge.l300{color:#6fb6e6}.badge.l400{color:var(--gold)}.badge.l500{color:#e89ad0}
  h2{font-family:'Fraunces',serif;font-weight:600;font-size:25px;color:#fff;margin:40px 0 14px}
  section{margin-top:30px}
  .progress{height:8px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden;margin:18px 0 6px;max-width:520px}
  .progress > i{display:block;height:100%;background:linear-gradient(90deg,var(--teal),var(--green))}
  .weeks{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
  .wk{border:1px solid var(--line);border-radius:16px;background:var(--card);padding:18px 20px}
  .wk h3{font-family:'Fraunces',serif;font-size:19px;color:#fff;margin-bottom:2px}
  .wk .lvl{font-family:'DM Mono',monospace;font-size:10.5px;letter-spacing:.08em;color:var(--ink2);text-transform:uppercase}
  .day{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-top:1px dashed var(--line);text-decoration:none}
  .wk .day:first-of-type{border-top:1px solid var(--line);margin-top:12px}
  .day .n{font-family:'DM Mono',monospace;font-size:11px;color:var(--green2);min-width:42px}
  .day .t{font-size:14.5px;color:var(--ink)}
  .day.soon{opacity:.45} .day.soon .t{color:var(--ink2)}
  a.day:hover .t{color:var(--green2)}
  /* lesson page */
  .obj li,.refs li{margin:6px 0;font-size:15px;color:var(--ink2)}
  .panel{border:1px solid var(--line);border-radius:14px;background:var(--card);padding:18px 20px;margin-top:14px}
  .panel h2{margin-top:0;font-size:18px}
  .body h3{font-family:'Fraunces',serif;color:#fff;font-size:20px;margin:22px 0 8px}
  .body h4{font-family:'Fraunces',serif;color:#fff;font-size:16px;margin:16px 0 6px}
  .body p{margin:10px 0;color:var(--ink)} .body ul,.body ol{margin:10px 0 10px 22px} .body li{margin:5px 0}
  .body code{font-family:'DM Mono',monospace;font-size:.92em;background:rgba(255,255,255,.07);padding:1px 5px;border-radius:5px;color:var(--green2)}
  .body pre{background:rgba(0,0,0,.34);border:1px solid var(--line);border-radius:11px;padding:14px 16px;overflow:auto;margin:12px 0}
  .body pre code{background:none;padding:0;color:#cfeee2;font-size:12.5px;line-height:1.7}
  .refs a{color:var(--green2);text-decoration:none;border-bottom:1px solid var(--line)}
  .tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  details{border:1px solid var(--line);border-radius:11px;padding:10px 14px;margin:8px 0;background:rgba(255,255,255,.02)}
  details summary{cursor:pointer;font-weight:600;color:#fff}
  details .opt{font-size:14px;color:var(--ink2);margin:6px 0 0 6px} details .opt.correct{color:var(--green2);font-weight:600}
  details .why{font-size:13.5px;color:var(--ink2);margin-top:8px;font-style:italic}
  .vid{font-style:italic;color:var(--ink2)}
  .nav{display:flex;justify-content:space-between;gap:12px;margin-top:34px;font-family:'DM Mono',monospace;font-size:13px}
  .nav a{color:var(--green2);text-decoration:none}
  footer{margin-top:54px;text-align:center;color:var(--ink2)}
  .fcreed{font-family:'DM Mono',monospace;letter-spacing:.18em;font-size:10.5px;color:var(--green2);margin-top:8px}`;
function page(title, desc, bodyHtml) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE_URL}">
${FONTS}<style>${CSS}</style></head>
<body><a class="skip" href="#main">Skip to content</a><main class="wrap" id="main">${bodyHtml}
<footer><div class="creed" style="border:none;padding:0;display:inline-block">"Agents do the bureaucracy; humans hold the meaning."</div>
<div class="fcreed">PART OF THE AIGOVOPS FAMILY · 30 MINUTES A DAY</div></footer></main></body></html>`;
}

// ---------- index ----------
const published = days.length;
function levelClass(l) { return l === "300" ? "l300" : l === "400" ? "l400" : l === "500" ? "l500" : ""; }
const weekCards = Array.from({ length: 8 }, (_, k) => k + 1).map((w) => {
  const wd = days.filter((d) => d.week === w);
  const lvl = wd[0]?.level;
  const rows = wd.length
    ? wd.map((d) => `<a class="day" href="${dayHref(d)}"><span class="n">D${pad2(d.day)}</span><span class="t">${esc(d.title)}</span></a>`).join("")
    : `<div class="day soon"><span class="n">—</span><span class="t">In progress — lessons land in waves</span></div>`;
  return `<div class="wk"><div class="lvl">Week ${w}${lvl ? ` · Level ${esc(lvl)} — ${esc(LEVELS[lvl] || "")}` : ""}</div><h3>${wd.length ? esc(wd[0].theme || `Week ${w}`) : `Week ${w}`}</h3>${rows}</div>`;
}).join("");
const indexBody = `
  <div class="eyebrow"><a href="https://aigovops-foundation.github.io/aigovops-library-june-ken-bob/">← AiGovOps Library</a> · Glean-ia-acs</div>
  <h1>30 minutes a day to <span class="y">Glean</span> mastery.</h1>
  <p class="lede">A governed, source-cited curriculum — from foundations to building agents — in daily 30-minute lessons. Every lesson carries a real working example, resolving sources, and a quiz before it's allowed to publish.</p>
  <div class="creed">"Agents do the bureaucracy; humans hold the meaning."</div>
  <section>
    <div class="meta">${published} of ${TOTAL_TARGET} daily lessons published · levels 200 → 500 · built in waves</div>
    <div class="progress"><i style="width:${Math.round((published / TOTAL_TARGET) * 100)}%"></i></div>
    <div class="meta">Front-loaded: weeks 1–3 foundations (200) · 4–6 power user (300) · 7 builder (400) · 8 pro / agents & governance (500)</div>
  </section>
  <section><h2>The eight weeks</h2><div class="weeks">${weekCards}</div></section>`;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), page("Glean Mastery — 30 minutes a day", "A governed, source-cited Glean curriculum from foundations to agents, in daily 30-minute lessons.", indexBody));
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

// ---------- lesson pages ----------
days.forEach((d, idx) => {
  const refs = (d.references || []).map((r) => { const s = sources[r.source_id]; return s ? `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>${r.minutes ? ` <span class="meta">· ${r.minutes} min</span>` : ""}</li>` : `<li>${esc(r.source_id)}</li>`; }).join("");
  const objectives = (d.objectives || []).map((o) => `<li>${esc(o)}</li>`).join("");
  const tags = (d.nist_rmf || []).map((t) => `<span class="badge">NIST ${esc(t)}</span>`).join("");
  const quiz = readJson(`data/quizzes/week-${pad2(d.week)}.json`, null);
  let quizHtml = "";
  if (quiz && Array.isArray(quiz.questions)) {
    quizHtml = `<section class="panel"><h2>Check yourself</h2>${quiz.questions.map((q) => {
      const opts = (q.options || []).map((o, oi) => `<div class="opt${oi === q.answer_index ? " correct" : ""}">${oi === q.answer_index ? "✓ " : "· "}${esc(o)}</div>`).join("");
      return `<details><summary>${esc(q.prompt)}</summary>${opts}${q.explanation ? `<div class="why">${esc(q.explanation)}</div>` : ""}</details>`;
    }).join("")}<div class="meta" style="margin-top:8px">Pass threshold ${Math.round((quiz.pass_threshold || .8) * 100)}% · week ${d.week} quiz</div></section>`;
  }
  const prev = days[idx - 1], next = days[idx + 1];
  const body = `
    <div class="eyebrow"><a href="index.html">← Glean-ia-acs</a> · Week ${d.week} · Day ${d.day}</div>
    <div class="tags"><span class="badge ${levelClass(d.level)}">Level ${esc(d.level)} — ${esc(LEVELS[d.level] || "")}</span>${d.duration_min ? `<span class="badge">${esc(d.duration_min)} min</span>` : ""}${tags}</div>
    <h1>${esc(d.title)}</h1>
    <p class="lede">${esc(d.theme || "")}</p>
    ${objectives ? `<section class="panel"><h2>You'll be able to</h2><ul class="obj">${objectives}</ul></section>` : ""}
    ${refs ? `<section class="panel"><h2>Read first</h2><ul class="refs">${refs}</ul></section>` : ""}
    <section class="body">${md(d.body)}</section>
    ${d.check_for_understanding ? `<section class="panel"><h2>Check for understanding</h2><p>${esc(d.check_for_understanding)}</p></section>` : ""}
    ${quizHtml}
    ${d.video_summary ? `<section class="panel"><h2>In 10 seconds</h2><p class="vid">“${esc(d.video_summary)}”</p></section>` : ""}
    <div class="nav"><span>${prev ? `<a href="${dayHref(prev)}">← W${pad2(prev.week)}D${pad2(prev.day)}</a>` : ""}</span><span><a href="index.html">all lessons</a></span><span>${next ? `<a href="${dayHref(next)}">W${pad2(next.week)}D${pad2(next.day)} →</a>` : ""}</span></div>`;
  fs.writeFileSync(path.join(OUT, dayHref(d)), page(`${d.title} · Glean Mastery`, d.theme || d.title, body));
});

console.log(`✅ built site/ — ${published} lessons + index (${weeks.length} weeks present), target ${TOTAL_TARGET}`);
