#!/usr/bin/env node
import { writeFileSync } from 'node:fs';

const RSS_URL = 'https://blog.kronglog.dev/rss.xml';
const OUTPUT_PATH = './recent-posts.svg';
const MAX_POSTS = 3;
const DESC_MAX = 60;

function xmlEscape(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

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
        title: extractTag('title', item),
        description: extractTag('description', item),
        pubDate: extractTag('pubDate', item),
      };
    });
}

function buildSvg(posts) {
  const W = 480, PAD = 20, HEADER_H = 52, POST_H = 68, FOOTER_PAD = 16;
  const H = HEADER_H + posts.length * POST_H + FOOTER_PAD;
  const rows = posts.map((post, i) => {
    const y = HEADER_H + i * POST_H;
    const title = xmlEscape(truncate(post.title, 55));
    const desc = post.description ? xmlEscape(truncate(post.description, DESC_MAX)) : '';
    const date = xmlEscape(formatDate(post.pubDate));
    return `
  <text class="t" x="${PAD}" y="${y+18}">› ${title}</text>
  ${desc ? `<text class="d" x="${PAD}" y="${y+36}">${desc}</text>` : ''}
  <text class="dt" x="${PAD}" y="${y+52}">${date}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>
    .bg { fill: #ffffff }
    .dv { stroke: #e5e7eb; stroke-width: 1 }
    .h  { fill: #374151; font: 600 14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif }
    .t  { fill: #111827; font: 700 13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif }
    .d  { fill: #6b7280; font: 400 12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif }
    .dt { fill: #9ca3af; font: 400 11px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif }
    @media (prefers-color-scheme: dark) {
      .bg { fill: #0d1117 }
      .dv { stroke: #30363d }
      .h  { fill: #c9d1d9 }
      .t  { fill: #f0f6fc }
      .d  { fill: #8b949e }
      .dt { fill: #6e7681 }
    }
  </style>
  <rect class="bg" width="${W}" height="${H}" rx="8"/>
  <text class="h" x="${PAD}" y="30">📝 최근 블로그 글</text>
  <line class="dv" x1="${PAD}" y1="42" x2="${W-PAD}" y2="42"/>
  ${rows}
</svg>`;
}

async function main() {
  const xml = await fetchRss();
  const posts = parseItems(xml);
  const svg = buildSvg(posts);
  writeFileSync(OUTPUT_PATH, svg, 'utf-8');
  console.log(`Generated ${OUTPUT_PATH} with ${posts.length} posts`);
}

main();
