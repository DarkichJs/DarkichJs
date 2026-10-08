import type {Ascii, Stats} from '../../src/types.ts';
import {C, countUp, esc, n, svgDoc, windowFrame} from './common.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`;
const fmt = (v: number) => Math.round(v).toLocaleString('en-US');

export const WHOAMI_W = 900;
export const WHOAMI_H = 480;
const WIN_W = 442;
const BAR = 28;
const STATUS = 26;

// Reveal timing (seconds).
const SCAN_BEGIN = 0.5;
const SCAN_DUR = 3.2;

/** Snap colours to a coarse grid so neighbouring glyphs share one <tspan>. */
const quantize = (hex: string) => {
  const q = (i: number) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) / 20) * 20);
  return `#${[1, 3, 5].map((i) => q(i).toString(16).padStart(2, '0')).join('')}`;
};

function portrait(ascii: Ascii, opts: {accent: string; prompt: string; host: string; name: string}): string {
  const x0 = 12;
  const areaW = WIN_W - 24;
  const areaH = WHOAMI_H - BAR - STATUS - 18;
  const charW = Math.min(areaW / ascii.cols, areaH / ascii.rows / 2);
  const lineH = charW * 2;
  const artW = charW * ascii.cols;
  const artH = lineH * ascii.rows;
  const ax = x0 + (areaW - artW) / 2;
  const ay = BAR + 9 + (areaH - artH) / 2;
  const fontSize = charW / 0.6;

  const rows: string[] = [];
  ascii.cells.forEach((row, r) => {
    let html = '';
    let runColor = '';
    let run = '';
    const flush = () => {
      if (!run) return;
      html += runColor ? `<tspan fill="${runColor}">${esc(run)}</tspan>` : esc(run);
      run = '';
    };
    for (const cell of row) {
      if (cell.ch === ' ') {
        run += ' '; // spaces join whatever run is open
        continue;
      }
      const color = quantize(cell.color);
      if (color !== runColor) {
        flush();
        runColor = color;
      }
      run += cell.ch;
    }
    flush();
    if (!html.trim()) return;
    rows.push(
      `<text xml:space="preserve" x="${n(ax)}" y="${n(ay + r * lineH + lineH * 0.78)}" ` +
        `textLength="${n(artW)}" lengthAdjust="spacing">${html}</text>`,
    );
  });

  const spline = 'calcMode="spline" keyTimes="0;1" keySplines=".45 0 .25 1"';
  const statusY = WHOAMI_H - STATUS / 2 + 4;
  const statusText = `${opts.prompt}@${opts.host}:~$ whoami `;
  const cursorX = x0 + (statusText.length + opts.name.length) * 11 * 0.6 + 2;

  return [
    `<defs>`,
    `<clipPath id="reveal"><rect x="0" y="${n(ay)}" width="${WIN_W}" height="0">`,
    `<animate attributeName="height" from="0" to="${n(artH + 4)}" begin="${SCAN_BEGIN}s" dur="${SCAN_DUR}s" fill="freeze" ${spline}/>`,
    `</rect></clipPath>`,
    `<linearGradient id="scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${opts.accent}" stop-opacity="0"/>` +
      `<stop offset=".85" stop-color="${opts.accent}" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>`,
    `<filter id="glow" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.4" result="b"/>` +
      `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    `</defs>`,
    `<g clip-path="url(#reveal)" filter="url(#glow)" font-size="${n(fontSize)}" font-weight="700">${rows.join('')}</g>`,
    // Scanline: a glowing band riding the reveal edge, fading out at the end.
    `<rect x="${x0}" width="${areaW}" height="22" y="${n(ay - 22)}" fill="url(#scan)" opacity="0">`,
    `<animate attributeName="y" from="${n(ay - 20)}" to="${n(ay + artH - 18)}" begin="${SCAN_BEGIN}s" dur="${SCAN_DUR}s" fill="freeze" ${spline}/>`,
    `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.06;.9;1" begin="${SCAN_BEGIN}s" dur="${SCAN_DUR + 0.3}s" fill="freeze"/>`,
    `</rect>`,
    `<line x1="0" y1="${WHOAMI_H - STATUS}" x2="${WIN_W}" y2="${WHOAMI_H - STATUS}" stroke="${C.border}"/>`,
    `<text x="${x0}" y="${statusY}" font-size="11" fill="${C.muted}">${esc(statusText)}<tspan fill="${C.text}">${esc(opts.name)}</tspan></text>`,
    `<rect x="${n(cursorX)}" y="${statusY - 10}" width="7" height="13" fill="${C.text}">` +
      `<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.5;.51;1" dur="1.1s" repeatCount="indefinite"/></rect>`,
  ].join('');
}

type Tile = {label: string; value: number; decimals?: number; unit?: string; sub: string; accent?: boolean};

function tiles(s: Stats): Tile[] {
  const range = (r: Stats['currentRange']) => (r ? `${short(r.start)} – ${short(r.end)}` : 'no streak yet');
  return [
    {label: 'current streak', value: s.currentStreak, unit: ' days', sub: range(s.currentRange), accent: true},
    {label: 'longest streak', value: s.longestStreak, unit: ' days', sub: range(s.longestRange)},
    {label: 'contributions', value: s.total, sub: 'in the last year'},
    {
      label: 'active days',
      value: s.activeDays,
      unit: ` / ${s.totalDays}`,
      sub: `${Math.round((s.activeDays / Math.max(1, s.totalDays)) * 100)}% of the year`,
    },
    {label: 'best day', value: s.bestDay?.count ?? 0, sub: s.bestDay ? short(s.bestDay.date) : '—'},
    {label: 'avg / active day', value: s.avgPerActiveDay, decimals: 1, sub: 'contributions'},
  ];
}

function stats(s: Stats): string {
  const pad = 12;
  const gap = 10;
  const tw = (WIN_W - pad * 2 - gap) / 2;
  const th = 84;
  const top = BAR + pad;
  const out: string[] = [];

  tiles(s).forEach((t, i) => {
    const x = pad + (i % 2) * (tw + gap);
    const y = top + Math.floor(i / 2) * (th + gap);
    const delay = 0.4 + i * 0.15;
    const fill = t.accent ? C.green : C.text;
    out.push(`<g class="tile" style="animation-delay:${n(delay)}s">`);
    out.push(`<rect x="${n(x + 0.5)}" y="${y + 0.5}" width="${n(tw - 1)}" height="${th - 1}" rx="8" fill="${C.tile}" stroke="${C.border}"/>`);
    out.push(`<text x="${n(x + 13)}" y="${y + 22}" font-size="10.5" fill="${C.muted}">$ ${esc(t.label)}</text>`);
    out.push(
      countUp({
        value: t.value,
        begin: delay + 0.2,
        dur: 1.9,
        attrs: `x="${n(x + 13)}" y="${y + 56}" font-size="28" font-weight="800" fill="${fill}"${t.accent ? ' filter="url(#numglow)"' : ''}`,
        render: (v) =>
          (t.decimals ? v.toFixed(t.decimals) : fmt(v)) +
          (t.unit ? `<tspan font-size="11" font-weight="400" fill="${C.muted}">${esc(t.unit)}</tspan>` : ''),
      }),
    );
    out.push(`<text x="${n(x + 13)}" y="${y + 74}" font-size="9.5" fill="${C.faint}">${esc(t.sub)}</text>`);
    out.push(`</g>`);
  });

  // Weekly activity bars.
  const chartTop = top + 3 * th + 2 * gap + 22;
  const base = WHOAMI_H - pad - 2;
  const plotH = base - chartTop - 14;
  const weekly = s.weekly;
  const max = Math.max(1, ...weekly);
  const slot = (WIN_W - pad * 2) / weekly.length;
  const bw = Math.max(2, slot * 0.72);
  const barsBegin = 0.4 + 6 * 0.15 + 0.3;
  out.push(`<text class="tile" style="animation-delay:${n(barsBegin - 0.2)}s" x="${pad}" y="${chartTop}" font-size="10.5" fill="${C.muted}">$ weekly activity</text>`);
  const peak = weekly.indexOf(max);
  weekly.forEach((w, i) => {
    const ratio = w / max;
    const h = Math.max(2, ratio * plotH);
    const lvl = w === 0 ? 0 : ratio > 0.75 ? 4 : ratio > 0.45 ? 3 : ratio > 0.2 ? 2 : 1;
    const bx = pad + i * slot + (slot - bw) / 2;
    out.push(
      `<rect class="bar" x="${n(bx)}" y="${n(base - h)}" width="${n(bw)}" height="${n(h)}" rx="1.5" ` +
        `fill="${C.levels[lvl]}" style="animation-delay:${n(barsBegin + i * 0.03)}s"/>`,
    );
  });
  if (max > 0) {
    const px = pad + peak * slot + slot / 2;
    out.push(
      `<text class="tile" style="animation-delay:${n(barsBegin + peak * 0.03 + 0.5)}s" x="${n(px)}" y="${n(base - plotH - 4)}" ` +
        `font-size="9.5" fill="${C.text}" text-anchor="${peak > weekly.length - 4 ? 'end' : 'middle'}">${fmt(max)}</text>`,
    );
  }

  return (
    `<defs><filter id="numglow" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/>` +
    `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
    out.join('')
  );
}

export function whoamiSvg(
  ascii: Ascii,
  s: Stats,
  opts: {accent: string; prompt: string; host: string; login: string; name: string},
  fontCss: string,
): string {
  const login = opts.login.toLowerCase();
  const body =
    `<g class="win">${windowFrame(0, 0, WIN_W, WHOAMI_H, `${login} — portrait.txt`, 'w1')}${portrait(ascii, opts)}</g>` +
    `<g class="win" style="animation-delay:.12s" transform="translate(${WHOAMI_W - WIN_W} 0)">` +
    `<g>${windowFrame(0, 0, WIN_W, WHOAMI_H, `${login} — stats`, 'w2')}${stats(s)}</g></g>`;

  const css =
    fontCss +
    `.win{animation:win .8s cubic-bezier(.16,1,.3,1) both}` +
    `@keyframes win{from{opacity:0;translate:0 14px}to{opacity:1;translate:0 0}}` +
    `.tile{opacity:0;animation:tile .7s cubic-bezier(.16,1,.3,1) both}` +
    `@keyframes tile{from{opacity:0;translate:0 10px}to{opacity:1;translate:0 0}}` +
    `.bar{transform-box:fill-box;transform-origin:bottom;transform:scaleY(0);animation:grow .8s cubic-bezier(.34,1.3,.64,1) both}` +
    `@keyframes grow{to{transform:scaleY(1)}}`;

  return svgDoc(WHOAMI_W, WHOAMI_H, css, body, `${opts.login}: ${s.currentStreak}-day streak, ${s.total} contributions`);
}
