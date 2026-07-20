#!/usr/bin/env node
// Build the Glean-Mastery static site from the curriculum content.
// Reads content/weeks/NN/day-NN.mdx (frontmatter + body), data/sources.json, and
// data/quizzes/week-NN.json, and renders a self-contained site/ folder for GitHub Pages.
// Dependency-light: only gray-matter (already a repo dep) + a built-in Markdown renderer,
// a tiny syntax highlighter, localStorage progress, an interactive quiz, sitemap + JSON-LD.
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
const slugOf = (d) => `w${pad2(d.week)}-d${pad2(d.day)}`;
const dayHref = (d) => `day-${slugOf(d)}.html`;
const levelClass = (l) => (l === "300" ? "l300" : l === "400" ? "l400" : l === "500" ? "l500" : "l200");

// ---------- tiny dependency-free syntax highlighter (comments / strings / numbers / keywords) ----------
function highlight(code, lang) {
  const kind = { python: "py", py: "py", typescript: "ts", javascript: "ts", js: "ts", ts: "ts", json: "json" }[(lang || "").toLowerCase()];
  if (!kind) return esc(code);
  const parts = [];
  if (kind === "py") parts.push({ cls: "c", re: "#[^\\n]*" });
  if (kind === "ts") parts.push({ cls: "c", re: "//[^\\n]*" });
  parts.push({ cls: "s", re: "\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`" });
  parts.push({ cls: "n", re: "\\b\\d[\\d_]*(?:\\.\\d+)?\\b" });
  const KW = {
    py: "def|class|return|import|from|as|if|elif|else|for|while|in|not|and|or|is|None|True|False|with|try|except|finally|raise|lambda|yield|async|await|pass|break|continue|self|print",
    ts: "const|let|var|function|return|if|else|for|while|import|from|export|default|as|new|await|async|class|extends|implements|interface|type|enum|public|private|readonly|void|null|undefined|true|false|this|typeof|of|in|try|catch|finally|throw",
    json: "true|false|null",
  };
  parts.push({ cls: "k", re: "\\b(?:" + KW[kind] + ")\\b" });
  const master = new RegExp(parts.map((p) => "(" + p.re + ")").join("|"), "g");
  let out = "", last = 0, m;
  while ((m = master.exec(code))) {
    if (m[0].length === 0) { master.lastIndex++; continue; }
    out += esc(code.slice(last, m.index));
    let cls = "k";
    for (let i = 0; i < parts.length; i++) { if (m[i + 1] !== undefined) { cls = parts[i].cls; break; } }
    out += `<span class="t-${cls}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  out += esc(code.slice(last));
  return out;
}

// ---------- compact Markdown -> HTML ----------
function inline(t) {
  return esc(t)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`)
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, (_, txt, url) => `<a href="${url}" target="_blank" rel="noopener" aria-label="${txt} (opens in a new tab)">${txt}<span class="ext" aria-hidden="true">↗</span></a>`);
}
function md(src) {
  const lines = String(src || "").replace(/\r\n/g, "\n").split("\n");
  const out = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w+)?/);
    if (fence) {
      const lang = fence[1] || ""; const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; out.push(`<pre data-lang="${esc(lang)}"><code>${highlight(buf.join("\n"), lang)}</code></pre>`); continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const lvl = Math.min(6, h[1].length + 2); out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); i++; continue; }
    if (/^\s*(?:[-*•]\s+|\d+[.)]\s+)/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line); const items = [];
      while (i < lines.length && /^\s*(?:[-*•]\s+|\d+[.)]\s+)/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, ""))}</li>`); i++;
      }
      out.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`); continue;
    }
    if (line.trim() === "") { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^```/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) && !/^\s*(?:[-*•]\s+|\d+[.)]\s+)/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

// ---------- load curriculum ----------
const days = walk(WEEKS).map((file) => { const { data, content } = matter(fs.readFileSync(file, "utf8")); return { ...data, body: content, file }; })
  .filter((d) => d.status === "published" || d.status === "verified")
  .sort((a, b) => a.week - b.week || a.day - b.day);
days.forEach((d, i) => { d._n = i + 1; });
const weeks = [...new Set(days.map((d) => d.week))].sort((a, b) => a - b);
const TOTAL_TARGET = 56;
const published = days.length;

// ---------- shared chrome ----------
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,300..800;1,300..800&family=DM+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&display=swap" rel="stylesheet">`;
const CSS = `
  /* aigovops-july-2026 garden-warm skin. Tokens SOURCE:
     aigovops-foundation/aigovops-foundation-site-redesign-June2026-ken-and-bob
       /design/aigovops-july-2026/tokens.css */
  :root{
    --garden-cream:#FAF7F0;--garden-deep-cream:#F1EAD8;--garden-deeper:#E9DFC6;
    --garden-charcoal:#2B2B28;--garden-ink-soft:#4C4A42;
    --garden-green:#2E7D4F;--garden-green-ink:#1F5E3A;--garden-green-deep:#0F4A2C;
    --garden-orange:#E07A2A;--garden-orange-ink:#9C4E12;--garden-gold:#E8B54A;
    --garden-line:rgba(43,43,40,.14);--garden-card-line:rgba(43,43,40,.08);
    --garden-shadow:0 18px 40px -18px rgba(78,60,32,.35);--garden-shadow-sm:0 10px 26px -14px rgba(78,60,32,.3);
    --garden-r-2xl:1.4rem;
    --garden-on-dark:#EDE8DA;--garden-on-dark-dim:#B9B3A2;
    /* legacy names re-pointed to garden values (inline styles consume these) */
    --head:var(--garden-charcoal);--teal:var(--garden-green);--green:var(--garden-green);--green2:var(--garden-green-ink);
    --ink:var(--garden-charcoal);--ink2:var(--garden-ink-soft);--gold:var(--garden-orange-ink);
    --line:var(--garden-line);--card:#ffffff;--codebg:var(--garden-charcoal)}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Source Sans 3','Segoe UI',system-ui,sans-serif;color:var(--garden-ink-soft);background:var(--garden-cream);min-height:100vh;line-height:1.6}
  body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:30;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.17 0 0 0 0 0.16 0 0 0 0 0.13 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E")}
  a{color:inherit}
  .wrap{max-width:1000px;margin:0 auto;padding:34px 22px 80px}
  .skip{position:absolute;left:-999px}.skip:focus{left:8px;top:8px;background:var(--garden-green);color:#fff;padding:8px 12px;border-radius:999px;z-index:40}
  a:focus-visible,button:focus-visible,summary:focus-visible,.card:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--garden-orange);outline-offset:2px;border-radius:6px}
  .eyebrow{font-family:'DM Mono',monospace;letter-spacing:.26em;font-size:11px;color:var(--garden-green-ink);text-transform:uppercase}
  .eyebrow a{color:var(--garden-green-ink);text-decoration:none;border-bottom:1px solid var(--garden-line)}
  h1{font-family:'Fraunces',serif;font-weight:600;font-size:clamp(30px,6vw,52px);line-height:1.05;margin:12px 0 10px;color:var(--garden-charcoal)}
  h1 .y{color:var(--garden-green)}
  .lede{font-size:clamp(16px,2.2vw,20px);color:var(--garden-ink-soft);max-width:660px}
  .creed{font-family:'Fraunces',serif;font-style:italic;color:var(--garden-charcoal);border-left:3px solid var(--garden-green);padding-left:15px;margin:20px 0 0;font-size:17px}
  .meta{font-family:'DM Mono',monospace;font-size:12px;color:var(--garden-ink-soft);letter-spacing:.04em}
  .badge{font-family:'DM Mono',monospace;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px;border:1px solid var(--garden-line);color:var(--garden-green-ink);display:inline-block;background:#fff}
  .badge.l300{color:#1f6fb0}.badge.l400{color:var(--garden-orange-ink)}.badge.l500{color:#a3358f}
  h2{font-family:'Fraunces',serif;font-weight:600;font-size:25px;color:var(--garden-charcoal);margin:40px 0 14px}
  section{margin-top:30px}
  /* start-here + CTA */
  .howto{border:1px solid var(--garden-card-line);border-radius:var(--garden-r-2xl);background:#fff;box-shadow:var(--garden-shadow-sm);padding:20px 22px;margin-top:26px}
  .howto h2{margin:0 0 6px;font-size:19px}
  .howto p{color:var(--garden-ink-soft);font-size:14.5px;max-width:720px}
  .howto .steps{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px;font-family:'DM Mono',monospace;font-size:11px;color:var(--garden-green-ink);letter-spacing:.05em;text-transform:uppercase}
  .howto .steps span{border:1px solid var(--garden-line);border-radius:999px;padding:5px 11px;background:var(--garden-deep-cream)}
  .cta{display:inline-block;background:var(--garden-green);color:#fff;font-weight:700;padding:12px 22px;border-radius:999px;text-decoration:none;margin-top:14px;font-size:15px}
  .cta:hover{background:var(--garden-green-deep)}
  .cta-count{font-family:'DM Mono',monospace;font-size:11.5px;color:var(--garden-ink-soft);margin-left:12px}
  .progress{height:8px;border-radius:99px;background:var(--garden-deeper);overflow:hidden;margin:18px 0 6px;max-width:520px}
  .progress > i{display:block;height:100%;background:linear-gradient(90deg,var(--garden-green),var(--garden-green-deep))}
  .weeks{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
  .wk{border:1px solid var(--garden-card-line);border-radius:var(--garden-r-2xl);background:#fff;box-shadow:var(--garden-shadow-sm);padding:18px 20px}
  .wk h3{font-family:'Fraunces',serif;font-size:19px;color:var(--garden-charcoal);margin-bottom:2px}
  .wk .lvl{font-family:'DM Mono',monospace;font-size:10.5px;letter-spacing:.08em;color:var(--garden-ink-soft);text-transform:uppercase;display:flex;align-items:center;gap:7px}
  .wk .lvl .dot{width:8px;height:8px;border-radius:50%;background:var(--garden-green);flex:none}
  .wk .lvl.l300 .dot{background:#1f6fb0}.wk .lvl.l400 .dot{background:var(--garden-orange)}.wk .lvl.l500 .dot{background:#a3358f}
  .day{display:flex;gap:10px;align-items:center;min-height:44px;padding:6px 0;border-top:1px dashed var(--garden-line);text-decoration:none}
  .wk .day:first-of-type{border-top:1px solid var(--garden-line);margin-top:12px}
  .day .n{font-family:'DM Mono',monospace;font-size:11px;color:var(--garden-green-ink);min-width:48px}
  .day .t{font-size:14.5px;color:var(--garden-charcoal)}
  .day.soon{opacity:.6} .day.soon .t{color:var(--garden-ink-soft)}
  a.day:hover .t{color:var(--garden-green-deep)}
  .day.done .n::after{content:" ✓";color:var(--garden-green-ink)}
  .day.done .t{color:var(--garden-ink-soft)}
  /* lesson */
  .obj li,.refs li{margin:6px 0;font-size:15px;color:var(--garden-ink-soft)}
  .panel{border:1px solid var(--garden-card-line);border-radius:14px;background:#fff;box-shadow:var(--garden-shadow-sm);padding:18px 20px;margin-top:14px}
  .panel h2{margin-top:0;font-size:18px}
  .body h3{font-family:'Fraunces',serif;color:var(--garden-charcoal);font-size:20px;margin:22px 0 8px}
  .body h4{font-family:'Fraunces',serif;color:var(--garden-charcoal);font-size:16px;margin:16px 0 6px}
  .body p{margin:10px 0;color:var(--garden-ink-soft)} .body ul,.body ol{margin:10px 0 10px 22px} .body li{margin:5px 0;color:var(--garden-ink-soft)}
  .body code{font-family:'DM Mono',monospace;font-size:.92em;background:var(--garden-deep-cream);padding:1px 5px;border-radius:5px;color:var(--garden-green-ink)}
  .body pre{position:relative;background:var(--garden-charcoal);border:1px solid var(--garden-card-line);border-radius:11px;padding:14px 16px;overflow:auto;margin:12px 0}
  .body pre[data-lang]:not([data-lang=""])::before{content:attr(data-lang);position:absolute;top:6px;right:10px;font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--garden-on-dark-dim)}
  .body pre code{background:none;padding:0;color:var(--garden-on-dark);font-size:12.5px;line-height:1.7}
  .t-c{color:var(--garden-on-dark-dim);font-style:italic}.t-s{color:#E8B54A}.t-n{color:#E98A40}.t-k{color:#5DCAA5}
  .refs a{color:var(--garden-green-ink);text-decoration:none;border-bottom:1px solid var(--garden-line)}
  .refs a:hover{color:var(--garden-green-deep)}
  .ext{font-size:.8em;margin-left:2px;opacity:.8}
  .tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center}
  /* interactive quiz */
  .q{border-top:1px dashed var(--garden-line);padding:14px 0}
  .q:first-of-type{border-top:0;padding-top:4px}
  .q-prompt{font-weight:600;color:var(--garden-charcoal);margin-bottom:8px}
  .q-opt{display:block;width:100%;text-align:left;margin:6px 0;padding:11px 13px;min-height:44px;border:1px solid var(--garden-line);border-radius:9px;background:var(--garden-cream);color:var(--garden-charcoal);font:inherit;font-size:14px;cursor:pointer;transition:border-color .12s,background .12s}
  .q-opt:hover:not(:disabled){border-color:var(--garden-green)}
  .q-opt:disabled{cursor:default}
  .q-opt.right{border-color:var(--garden-green);background:rgba(46,125,79,.12);color:var(--garden-green-ink);font-weight:600}
  .q-opt.wrong{border-color:#A8352F;background:rgba(168,53,47,.08)}
  .q-exp{margin-top:8px;font-size:13.5px;color:var(--garden-ink-soft);font-style:italic}
  .mark{margin-top:24px;padding:11px 18px;min-height:44px;border:1px solid var(--garden-green);border-radius:999px;background:transparent;color:var(--garden-green-ink);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
  .mark:hover{background:rgba(46,125,79,.08)}.mark.on{background:rgba(46,125,79,.14)}
  .nextcta{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:18px;border:1px solid var(--garden-card-line);border-radius:14px;background:#fff;box-shadow:var(--garden-shadow-sm);padding:14px 18px;text-decoration:none}
  .nextcta:hover{box-shadow:var(--garden-shadow);border-color:var(--garden-green)}
  .nextcta .lab{font-family:'DM Mono',monospace;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--garden-ink-soft)}
  .nextcta .ttl{font-family:'Fraunces',serif;font-size:17px;color:var(--garden-charcoal)}
  .nextcta .arw{color:var(--garden-green-ink);font-size:20px}
  .nav{display:flex;justify-content:space-between;gap:12px;margin-top:18px;font-family:'DM Mono',monospace;font-size:13px}
  .nav a{color:var(--garden-green-ink);text-decoration:none;display:inline-block;padding:8px 4px}
  .nav a:hover{color:var(--garden-green-deep)}
  /* footer — charcoal band, estate creed first (aigovops-july-2026 M5 native mode) */
  footer{margin-top:64px;background:var(--garden-charcoal);text-align:center;color:var(--garden-on-dark-dim)}
  footer .fwrap{max-width:1000px;margin:0 auto;padding:44px 22px 40px}
  .creed-estate{font-family:'Fraunces',serif;font-style:italic;font-size:1.18rem;line-height:1.5;color:#F5EFDF;max-width:56ch;margin:0 auto 14px}
  footer .creed{color:var(--garden-on-dark);border:none;font-size:15px}
  footer .estate a{color:var(--garden-on-dark);text-decoration:none;border-bottom:1px solid rgba(237,232,218,.25)}
  footer .estate a:hover{color:var(--garden-gold);border-bottom-color:var(--garden-gold)}
  .fcreed{font-family:'DM Mono',monospace;letter-spacing:.18em;font-size:10.5px;color:var(--garden-on-dark-dim);margin-top:8px}
  @media (prefers-reduced-motion: reduce){*{transition:none !important;animation:none !important;scroll-behavior:auto !important}}`;

const SITEJS = `<script>
(function(){
  var KEY='glean_done';
  function get(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
  function set(a){try{localStorage.setItem(KEY,JSON.stringify(a))}catch(e){}}
  var links=[].slice.call(document.querySelectorAll('a.day[data-slug]'));
  if(links.length){
    var done=get();
    links.forEach(function(a){ if(done.indexOf(a.getAttribute('data-slug'))>-1) a.classList.add('done'); });
    var next=links.filter(function(a){return done.indexOf(a.getAttribute('data-slug'))<0;})[0];
    var cta=document.getElementById('cta');
    if(cta){
      var target=next||links[0];
      cta.setAttribute('href', target.getAttribute('href'));
      var t=target.querySelector('.t'); var name=t?t.textContent:'Day 1';
      cta.firstChild ? (cta.childNodes[0].nodeValue=(next?(done.length?'Resume — ':'Start — '):'Review — ')+name+' ') : 0;
      cta.textContent=(next?(done.length?'Resume — ':'Start — '):'Review — ')+name+' →';
      var c=document.getElementById('ctacount'); if(c) c.textContent=done.length+' of '+links.length+' completed';
    }
  }
  var mc=document.getElementById('markdone');
  if(mc){
    var slug=mc.getAttribute('data-slug');
    function render(){ var on=get().indexOf(slug)>-1; mc.textContent=on?'✓ Completed — tap to undo':'Mark this day complete'; mc.classList.toggle('on',on); }
    render();
    mc.addEventListener('click',function(){ var a=get(); var i=a.indexOf(slug); if(i>-1)a.splice(i,1); else a.push(slug); set(a); render(); });
  }
  [].forEach.call(document.querySelectorAll('.q'),function(q){
    var correct=parseInt(q.getAttribute('data-correct'),10); var exp=q.querySelector('.q-exp'); var done=false;
    [].forEach.call(q.querySelectorAll('.q-opt'),function(b){
      b.addEventListener('click',function(){
        if(done)return; done=true;
        var i=parseInt(b.getAttribute('data-i'),10);
        if(i===correct){ b.classList.add('right'); } else { b.classList.add('wrong'); var rb=q.querySelector('.q-opt[data-i="'+correct+'"]'); if(rb)rb.classList.add('right'); }
        if(exp){ exp.hidden=false; }
        [].forEach.call(q.querySelectorAll('.q-opt'),function(x){x.disabled=true;});
      });
    });
  });
})();
</script>`;

const OG_IMAGE = "https://www.aigovops-foundation.com/images/founders.jpg";
const FAVICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text x='0' y='14' font-size='15'>📘</text></svg>";

function page(title, desc, bodyHtml, jsonld, url = SITE_URL) {
  const ld = jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}"><link rel="icon" href="${FAVICON}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${OG_IMAGE}">
${FONTS}<style>${CSS}</style>${ld}</head>
<body><a class="skip" href="#main">Skip to content</a><main class="wrap" id="main">${bodyHtml}</main>
<footer><div class="fwrap"><p class="creed-estate">Ship safe AI — never unsafe AI: get to yes, stay at yes, recover to yes, and keep the garden of humanity growing.</p>
<div class="creed" style="border:none;padding:0;display:inline-block">"Agents do the bureaucracy; humans hold the meaning — and humans hold the keys."</div>
<nav class="estate" aria-label="The AiGovOps family" style="margin:16px 0 4px;font-size:13px"><a href="https://www.aigovops-foundation.com">Foundation</a> · <a href="https://community.aigovops-foundation.com">Community</a> · <a href="https://community.aigovops-foundation.com/library/">Library</a> · <a href="https://github.com/bobrapp/Glean-Mastery">Source</a></nav>
<div class="fcreed">PART OF THE AIGOVOPS FAMILY · 30 MINUTES A DAY</div></div></footer>${SITEJS}</body></html>`;
}

// ---------- index ----------
const weekCards = Array.from({ length: 8 }, (_, k) => k + 1).map((w) => {
  const wd = days.filter((d) => d.week === w);
  const lvl = wd[0]?.level;
  const rows = wd.length
    ? wd.map((d) => `<a class="day" data-slug="${slugOf(d)}" href="${dayHref(d)}"><span class="n">D${pad2(d.day)}</span><span class="t">${esc(d.title)}</span></a>`).join("")
    : `<div class="day soon"><span class="n">—</span><span class="t">In progress — lessons land in waves</span></div>`;
  return `<div class="wk"><div class="lvl ${lvl ? levelClass(lvl) : ""}"><span class="dot"></span>Week ${w}${lvl ? ` · Level ${esc(lvl)} — ${esc(LEVELS[lvl] || "")}` : ""}</div><h3>${wd.length ? esc(wd[0].theme || `Week ${w}`) : `Week ${w}`}</h3>${rows}</div>`;
}).join("");
const first = days[0];
const courseLd = {
  "@context": "https://schema.org", "@type": "Course", name: "Glean Mastery — 30 minutes a day",
  description: "A governed, source-cited Glean curriculum from foundations to building agents, in daily 30-minute lessons.",
  url: SITE_URL, inLanguage: "en", provider: { "@type": "Organization", name: "AiGovOps Foundation" },
  numberOfCredits: published, educationalLevel: "Beginner to Advanced (200–500)",
};
const indexBody = `
  <div class="eyebrow"><a href="https://community.aigovops-foundation.com/library/">← AiGovOps Library</a> · Glean-ia-acs</div>
  <h1>30 minutes a day to <span class="y">Glean</span> mastery.</h1>
  <p class="lede">A governed, source-cited curriculum — from foundations to building agents — in daily 30-minute lessons. Every lesson carries a real working example, resolving sources, and a quiz before it's allowed to publish.</p>
  <div class="creed">"Agents do the bureaucracy; humans hold the meaning — and humans hold the keys."</div>
  <div class="howto">
    <h2>How it works</h2>
    <p>One focused lesson a day, about 30 minutes each. Every lesson follows the same shape, and your progress is saved on this device — pick up where you left off.</p>
    <div class="steps"><span>1 · Concept</span><span>2 · Lab</span><span>3 · Working example</span><span>4 · Quiz</span></div>
    <div><a class="cta" id="cta" href="${first ? dayHref(first) : "#"}">Start — Day 1 →</a><span class="cta-count" id="ctacount"></span></div>
  </div>
  <section>
    <div class="meta">${published} of ${TOTAL_TARGET} daily lessons published · levels 200 → 500 · built in waves</div>
    <div class="progress"><i style="width:${Math.round((published / TOTAL_TARGET) * 100)}%"></i></div>
    <div class="meta">Front-loaded: weeks 1–3 foundations (200) · 4–6 power user (300) · 7 builder (400) · 8 pro / agents &amp; governance (500)</div>
  </section>
  <section><h2>The eight weeks</h2><div class="weeks">${weekCards}</div></section>`;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), page("Glean Mastery — 30 minutes a day", "A governed, source-cited Glean curriculum from foundations to agents, in daily 30-minute lessons.", indexBody, courseLd));
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

// ---------- lesson pages ----------
days.forEach((d, idx) => {
  const refs = (d.references || []).map((r) => { const s = sources[r.source_id]; return s ? `<li><a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.title)} (opens in a new tab)">${esc(s.title)}<span class="ext" aria-hidden="true">↗</span></a>${r.minutes ? ` <span class="meta">· ${r.minutes} min</span>` : ""}</li>` : `<li>${esc(r.source_id)}</li>`; }).join("");
  const objectives = (d.objectives || []).map((o) => `<li>${esc(o)}</li>`).join("");
  const tags = (d.nist_rmf || []).map((t) => `<span class="badge">NIST ${esc(t)}</span>`).join("");
  const quiz = readJson(`data/quizzes/week-${pad2(d.week)}.json`, null);
  let quizHtml = "";
  if (quiz && Array.isArray(quiz.questions)) {
    quizHtml = `<section class="panel"><h2>Check yourself</h2><p class="meta" style="margin-bottom:10px">Pick an answer — you'll see if it's right and why.</p>${quiz.questions.map((q, qi) => {
      const opts = (q.options || []).map((o, oi) => `<button type="button" class="q-opt" data-i="${oi}">${esc(o)}</button>`).join("");
      return `<div class="q" data-correct="${q.answer_index}"><p class="q-prompt">${qi + 1}. ${esc(q.prompt)}</p>${opts}${q.explanation ? `<div class="q-exp" role="status" hidden>${esc(q.explanation)}</div>` : ""}</div>`;
    }).join("")}<div class="meta" style="margin-top:10px">Pass threshold ${Math.round((quiz.pass_threshold || .8) * 100)}% · week ${d.week} quiz</div></section>`;
  }
  const prev = days[idx - 1], next = days[idx + 1];
  const lessonLd = {
    "@context": "https://schema.org", "@type": "LearningResource", name: d.title, description: d.theme || d.title,
    url: SITE_URL + dayHref(d), inLanguage: "en", learningResourceType: "Lesson", educationalLevel: "Level " + d.level,
    timeRequired: "PT" + (d.duration_min || 30) + "M", isPartOf: { "@type": "Course", name: "Glean Mastery — 30 minutes a day", url: SITE_URL },
  };
  const nextCta = next
    ? `<a class="nextcta" href="${dayHref(next)}"><span><span class="lab">Next · Week ${next.week} Day ${next.day}</span><br><span class="ttl">${esc(next.title)}</span></span><span class="arw" aria-hidden="true">→</span></a>`
    : `<a class="nextcta" href="index.html"><span><span class="lab">You've reached the end of the published lessons</span><br><span class="ttl">Back to all lessons</span></span><span class="arw" aria-hidden="true">↺</span></a>`;
  const body = `
    <div class="eyebrow"><a href="index.html">← Glean-ia-acs</a> · Day ${d._n} of ${TOTAL_TARGET}</div>
    <div class="tags"><span class="badge ${levelClass(d.level)}">Level ${esc(d.level)} — ${esc(LEVELS[d.level] || "")}</span>${d.duration_min ? `<span class="badge">${esc(d.duration_min)} min</span>` : ""}${tags}</div>
    <h1>${esc(d.title)}</h1>
    <p class="lede">${esc(d.theme || "")}</p>
    ${objectives ? `<section class="panel"><h2>You'll be able to</h2><ul class="obj">${objectives}</ul></section>` : ""}
    ${refs ? `<section class="panel"><h2>Read first</h2><ul class="refs">${refs}</ul></section>` : ""}
    <section class="body">${md(d.body)}</section>
    ${d.check_for_understanding ? `<section class="panel"><h2>Check for understanding</h2><p>${esc(d.check_for_understanding)}</p></section>` : ""}
    ${quizHtml}
    ${d.video_summary ? `<section class="panel"><h2>In 10 seconds</h2><p style="font-style:italic;color:var(--ink2)">“${esc(d.video_summary)}”</p></section>` : ""}
    <div><button type="button" class="mark" id="markdone" data-slug="${slugOf(d)}">Mark this day complete</button></div>
    ${nextCta}
    <div class="nav"><span>${prev ? `<a href="${dayHref(prev)}">← W${pad2(prev.week)}D${pad2(prev.day)}</a>` : ""}</span><span><a href="index.html">all lessons</a></span><span>${next ? `<a href="${dayHref(next)}">W${pad2(next.week)}D${pad2(next.day)} →</a>` : ""}</span></div>`;
  fs.writeFileSync(path.join(OUT, dayHref(d)), page(`${d.title} · Glean Mastery`, d.theme || d.title, body, lessonLd, SITE_URL + dayHref(d)));
});

// ---------- sitemap ----------
const urls = [SITE_URL, ...days.map((d) => SITE_URL + dayHref(d))];
fs.writeFileSync(path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);

console.log(`✅ built site/ — ${published} lessons + index + sitemap (${weeks.length} weeks present), target ${TOTAL_TARGET}`);
