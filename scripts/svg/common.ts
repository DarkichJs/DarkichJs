// Shared building blocks for the animated SVG output.
//
// GitHub shows README images through <img>, which runs CSS animations and SMIL
// but never JavaScript and never fetches external resources — so everything
// (fonts included) is inlined, and every animation plays once then freezes.

export const C = {
  bg: '#0d1117',
  bg2: '#111722',
  panel: '#010409',
  tile: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#7d8590',
  faint: '#484f58',
  green: '#39d353',
  levels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
  dots: ['#ff5f57', '#febc2e', '#28c840'],
};

export const MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const n = (v: number) => Math.round(v * 100) / 100;

/** Ease-out cubic — decelerates into the final value. */
export const easeOut = (p: number) => 1 - (1 - p) ** 3;

const FONT_TEXT = Array.from({length: 95}, (_, i) => String.fromCharCode(32 + i)).join('') + '–—·…▌█';

/**
 * Fetches JetBrains Mono from Google Fonts, subset to the characters we use,
 * and returns @font-face rules with the woff2 inlined as data URIs. Falls back
 * to the system monospace stack if the network is unavailable.
 */
export async function embeddedFontCss(weights = [400, 700, 800]): Promise<string> {
  try {
    const url =
      `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@${weights.join(';')}` +
      `&text=${encodeURIComponent(FONT_TEXT)}&display=block`;
    // A modern UA makes Google serve woff2.
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
    const css = await (await fetch(url, {headers: {'User-Agent': ua}})).text();
    const faces = [...css.matchAll(/@font-face\s*{[^}]*}/g)].map((m) => m[0]);
    const out: string[] = [];
    for (const face of faces) {
      const src = face.match(/url\((https:[^)]+)\)/)?.[1];
      const weight = face.match(/font-weight:\s*(\d+)/)?.[1];
      if (!src || !weight) continue;
      const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
      out.push(
        `@font-face{font-family:'JetBrains Mono';font-weight:${weight};font-display:block;` +
          `src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2')}`,
      );
    }
    return out.join('');
  } catch (e) {
    console.warn(`Font embedding skipped (${(e as Error).message}); using system monospace.`);
    return '';
  }
}

/** macOS-style terminal window frame; content is drawn by the caller. */
export function windowFrame(x: number, y: number, w: number, h: number, title: string, id: string): string {
  const bar = 28;
  return [
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="10" fill="url(#${id}-bg)" stroke="${C.border}"/>`,
    `<defs><linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg2}"/><stop offset="1" stop-color="${C.panel}"/></linearGradient></defs>`,
    `<path d="M${x + 10.5} ${y + 0.5}h${w - 21}a10 10 0 0 1 10 10v${bar - 10}h-${w - 1}v-${bar - 10}a10 10 0 0 1 10-10z" fill="${C.tile}"/>`,
    `<line x1="${x}" y1="${y + bar}" x2="${x + w}" y2="${y + bar}" stroke="${C.border}"/>`,
    ...C.dots.map((c, i) => `<circle cx="${x + 16 + i * 15}" cy="${y + bar / 2}" r="4.5" fill="${c}"/>`),
    `<text x="${x + w / 2}" y="${y + bar / 2 + 4}" fill="${C.muted}" font-size="11" text-anchor="middle">${esc(title)}</text>`,
  ].join('');
}

/**
 * A number that counts up from 0 to `value` using pre-rendered frames toggled
 * with SMIL <set> (no JS in <img> SVGs). `render` formats each intermediate value.
 */
export function countUp(opts: {
  value: number;
  begin: number;
  dur: number;
  frames?: number;
  render: (v: number) => string;
  attrs: string;
  className?: string;
}): string {
  const cls = opts.className ? ` ${opts.className}` : '';
  const frames = opts.frames ?? 24;
  const out: string[] = [];
  for (let k = 1; k <= frames; k++) {
    const v = opts.value * easeOut(k / frames);
    const on = opts.begin + (opts.dur * (k - 1)) / frames;
    const off = opts.begin + (opts.dur * k) / frames;
    const sets =
      `<set attributeName="opacity" to="1" begin="${n(on)}s"/>` +
      (k < frames ? `<set attributeName="opacity" to="0" begin="${n(off)}s"/>` : '');
    out.push(`<text ${opts.attrs} class="cu${cls}" opacity="0">${opts.render(v)}${sets}</text>`);
  }
  // Reduced-motion / static renderers: show the final value.
  out.push(`<text ${opts.attrs} class="static-only${cls}">${opts.render(opts.value)}</text>`);
  return out.join('');
}

export function svgDoc(w: number, h: number, css: string, body: string, label: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ` +
    `role="img" aria-label="${esc(label)}" font-family="${MONO}">` +
    `<title>${esc(label)}</title>` +
    `<style>${css}` +
    // Final numbers are drawn twice: animated frames + a static copy hidden unless motion is reduced.
    `.static-only{display:none}` +
    `@media (prefers-reduced-motion: reduce){*{animation:none!important}.tile,.c,.fade{opacity:1!important}.bar{transform:none!important}.static-only{display:inline}.cu{display:none}}` +
    `</style>${body}</svg>`
  );
}
