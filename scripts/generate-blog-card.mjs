#!/usr/bin/env node
import { writeFileSync } from 'node:fs';

const RSS_URL     = 'https://blog.kronglog.dev/rss.xml';
const OUTPUT_PATH = './recent-posts.svg';
const MAX_POSTS   = 3;
const TITLE_MAX   = 44;
const DESC_MAX    = 58;

/* ── helpers ──────────────────────────────────────────────── */
function xmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractTag(tag, xml) {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i').exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  return plain ? plain[1].trim() : '';
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

/* ── fetch + parse ────────────────────────────────────────── */
async function fetchRss() {
  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  return res.text();
}

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, MAX_POSTS)
    .map((m) => {
      const item = m[1];
      return {
        title:       extractTag('title',       item),
        description: extractTag('description', item),
        pubDate:     extractTag('pubDate',     item),
      };
    });
}

/* ── SVG builder (C · Minimal) ────────────────────────────── */
function buildSvg(posts) {
  const W          = 480;
  const PAD        = 20;
  const HEADER_H   = 42;   // stripe(3) + icon/logo row + divider
  const POST_H     = 60;
  const FOOTER_PAD = 22;
  const H          = HEADER_H + posts.length * POST_H + FOOTER_PAD;

  const rows = posts.map((post, i) => {
    const y         = HEADER_H + i * POST_H;
    const title     = xmlEscape(truncate(post.title,       TITLE_MAX));
    const desc      = post.description
                        ? xmlEscape(truncate(post.description, DESC_MAX))
                        : '';
    const fullDate  = xmlEscape(formatDate(post.pubDate));
    const shortDate = fullDate.slice(5); // "MM.DD"

    return `
  ${i > 0 ? `<line class="dv" x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}"/>` : ''}
  <text class="t"  x="${PAD}"     y="${y + 22}">${title}</text>
  ${desc ? `<text class="d"  x="${PAD}"     y="${y + 40}">${desc}</text>` : ''}
  <text class="dt" x="${W - PAD}" y="${y + 22}" text-anchor="end">${shortDate}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    /* ── light ── */
    .bg { fill: #ffffff }
    .sp { fill: #3B7A57 }
    .ki { fill: #3B7A57 }
    .kt { fill: #ffffff; font: 700 8px system-ui,sans-serif }
    .hb { fill: #111827; font: 700 11px system-ui,sans-serif; letter-spacing: -0.3px }
    .hl { fill: #9ca3af; font: 500 9px 'SFMono-Regular',Consolas,monospace; letter-spacing: 1.5px }
    .dv { stroke: #f3f4f6; stroke-width: 1 }
    .t  { fill: #111827; font: 600 13px system-ui,sans-serif }
    .d  { fill: #b0b0b0; font: 400 11px system-ui,sans-serif }
    .dt { fill: #3B7A57; font: 600 10px 'SFMono-Regular',Consolas,monospace }
    /* ── dark ── */
    @media (prefers-color-scheme: dark) {
      .bg { fill: #0d1117 }
      .sp { fill: #F0A8B8 }
      .hb { fill: #8b949e }
      .hl { fill: #6e7681 }
      .dv { stroke: #1c2128 }
      .t  { fill: #f0f6fc }
      .d  { fill: #6e7681 }
      .dt { fill: #F0A8B8 }
    }
  </style>

  <!-- background -->
  <rect class="bg" width="${W}" height="${H}" rx="6"/>

  <!-- accent top stripe (green → pink in dark) -->
  <rect class="sp" width="${W}" height="3" rx="3"/>

  <!-- K favicon icon — always green (brand mark) -->
  <rect class="ki" x="${PAD}"     y="13" width="12" height="12" rx="2.5"/>
  <text class="kt" x="${PAD + 6}" y="22" text-anchor="middle">K</text>

  <!-- "Krong Dev." logo -->
  <text class="hb" x="${PAD + 16}" y="22">Krong Dev.</text>

  <!-- "LATEST POSTS" label -->
  <text class="hl" x="${PAD + 100}" y="22">· LATEST POSTS</text>

  <!-- header divider -->
  <line class="dv" x1="${PAD}" y1="36" x2="${W - PAD}" y2="36"/>

  <!-- posts -->
  ${rows}
</svg>`;
}

/* ── main ─────────────────────────────────────────────────── */
async function main() {
  const xml   = await fetchRss();
  const posts = parseItems(xml);
  const svg   = buildSvg(posts);
  writeFileSync(OUTPUT_PATH, svg, 'utf-8');
  console.log(`Generated ${OUTPUT_PATH} with ${posts.length} posts`);
}

main();
