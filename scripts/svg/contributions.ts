import type {Day} from '../../src/types.ts';
import {C, countUp, esc, n, svgDoc} from './common.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CELL = 13;
const GAP = 3;
const PITCH = CELL + GAP;
const LEFT = 36;
const TOP = 26;

// Wave timing (seconds): columns sweep left → right, rows trail slightly.
const COL_STEP = 0.05;
const ROW_STEP = 0.07;
const POP = 0.7;

/** Animated contribution heatmap: cells pop in as a wave with a bright flash. */
export function contributionsSvg(weeks: Day[][], total: number, fontCss: string): string {
  const cols = weeks.length;
  const W = LEFT + cols * PITCH + 8;
  const H = TOP + 7 * PITCH + 34;
  const waveEnd = (cols - 1) * COL_STEP + 6 * ROW_STEP + POP;

  const parts: string[] = [];

  // Month labels at the first column whose first day starts a new month.
  let prev: {col: number; m: number} | null = null;
  weeks.forEach((w, col) => {
    const first = w[0];
    if (!first) return;
    const m = Number(first.date.slice(5, 7)) - 1;
    if (prev && (prev.m === m || col - prev.col < 3)) return;
    prev = {col, m};
    const delay = col * COL_STEP;
    parts.push(
      `<text class="lbl fade" x="${LEFT + col * PITCH}" y="${TOP - 9}" style="animation-delay:${n(delay)}s">${MONTHS[m]}</text>`,
    );
  });
  for (const [name, row] of [['Mon', 1], ['Wed', 3], ['Fri', 5]] as const) {
    parts.push(`<text class="lbl" x="0" y="${TOP + row * PITCH + CELL - 3}">${name}</text>`);
  }

  weeks.forEach((w, col) => {
    for (const d of w) {
      const x = LEFT + col * PITCH;
      const y = TOP + d.weekday * PITCH;
      const delay = col * COL_STEP + d.weekday * ROW_STEP;
      const cls = d.level > 0 ? 'c g' : 'c';
      parts.push(
        `<rect class="${cls}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${C.levels[d.level]}" ` +
          `style="animation-delay:${n(delay)}s"><title>${d.count} on ${d.date}</title></rect>`,
      );
    }
  });

  // Footer: total counts up in sync with the wave; legend on the right.
  const fy = H - 8;
  parts.push(
    countUp({
      value: total,
      begin: 0.1,
      dur: waveEnd,
      frames: 30,
      attrs: `x="${LEFT}" y="${fy}"`,
      className: 'total',
      render: (v) => `${Math.round(v).toLocaleString('en-US')}<tspan class="lbl"> contributions in the last year</tspan>`,
    }),
  );
  const legendX = W - 8 - 5 * 13 - 34;
  parts.push(`<text class="lbl" x="${legendX - 6}" y="${fy}" text-anchor="end">Less</text>`);
  C.levels.forEach((c, i) =>
    parts.push(`<rect x="${legendX + i * 13}" y="${fy - 10}" width="10" height="10" rx="2" fill="${c}"/>`),
  );
  parts.push(`<text class="lbl" x="${legendX + 5 * 13 + 2}" y="${fy}">More</text>`);

  const css =
    fontCss +
    `.lbl{fill:${C.muted};font-size:11px}` +
    `.total{fill:${C.text};font-size:13px;font-weight:800}` +
    `.fade{opacity:0;animation:fade .5s ease-out both}` +
    `@keyframes fade{to{opacity:1}}` +
    `.c{transform-box:fill-box;transform-origin:center;opacity:0;animation:pop ${POP}s cubic-bezier(.34,1.56,.64,1) both}` +
    `.g{animation:pop ${POP}s cubic-bezier(.34,1.56,.64,1) both,flash 1.1s ease-out both}` +
    `@keyframes pop{0%{opacity:0;transform:scale(.3)}40%{opacity:1}100%{opacity:1;transform:scale(1)}}` +
    `@keyframes flash{0%,25%{filter:brightness(2.3) drop-shadow(0 0 3px ${C.green})}100%{filter:none}}`;

  return svgDoc(W, H, css, parts.join(''), esc(`${total} contributions in the last year`));
}
