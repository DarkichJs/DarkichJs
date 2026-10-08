import sharp from 'sharp';
import type {Ascii, AsciiCell} from '../src/types.ts';

// Light → dense. Index 0 is "no ink".
const RAMP = " .'`:,;-~=+*cxoaeszun0OQ#%&8B@";

type Options = {
  cols?: number;
  /** Character cell height / width. Must match the renderer. */
  charAspect?: number;
  color?: 'source' | 'mono' | 'accent';
  accent?: string;
};

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;

/**
 * Brightens dark colours so they glow on a near-black terminal: normalize the
 * brightest channel to 255, then mix in a little white for luminance.
 */
const lift = (r: number, g: number, b: number) => {
  const k = 255 / Math.max(r, g, b, 1);
  const w = 0.4;
  return hex(r * k * (1 - w) + 255 * w, g * k * (1 - w) + 255 * w, b * k * (1 - w) + 255 * w);
};

const luma = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/**
 * Converts an image into a grid of coloured characters.
 * - Transparent images: the alpha channel defines the shape.
 * - Opaque images: "ink" is the distance from the border (background) colour.
 * Inside the shape, glyph density follows brightness so gradients and
 * features (eyes, highlights) survive as texture instead of a flat block.
 */
export async function imageToAscii(input: Buffer, opts: Options = {}): Promise<Ascii> {
  const cols = opts.cols ?? 120;
  const charAspect = opts.charAspect ?? 2;

  // Crop to the subject, then add a small margin back.
  const trimmed = await sharp(input).ensureAlpha().trim({threshold: 10}).png().toBuffer().catch(() => input);
  const tm = await sharp(trimmed).metadata();
  const pad = Math.round(Math.max(tm.width ?? 0, tm.height ?? 0) * 0.04);
  const padded = await sharp(trimmed)
    .ensureAlpha()
    .extend({top: pad, bottom: pad, left: pad, right: pad, background: {r: 0, g: 0, b: 0, alpha: 0}})
    .png()
    .toBuffer();
  const meta = await sharp(padded).metadata();
  const rows = Math.round((cols * (meta.height ?? 1)) / (meta.width ?? 1) / charAspect);

  // Area-average downsampling keeps edges smooth (no jaggies from point sampling).
  const {data, info} = await sharp(padded)
    .resize(cols, rows, {fit: 'fill', kernel: 'mitchell'})
    .ensureAlpha()
    .raw()
    .toBuffer({resolveWithObject: true});

  const px = (x: number, y: number) => {
    const i = (y * info.width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3] / 255] as const;
  };

  let transparent = false;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transparent = true;

  // Opaque fallback: background = median border colour.
  const bg = [0, 0, 0];
  if (!transparent) {
    const border: (readonly number[])[] = [];
    for (let x = 0; x < cols; x++) border.push(px(x, 0), px(x, rows - 1));
    for (let y = 0; y < rows; y++) border.push(px(0, y), px(cols - 1, y));
    for (const c of [0, 1, 2]) {
      const v = border.map((p) => p[c]).sort((a, b) => a - b);
      bg[c] = v[v.length >> 1];
    }
  }

  const coverage = (p: readonly number[]) =>
    transparent ? p[3] : Math.min(1, Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]) / 120);

  // Brightness range inside the shape, used to stretch density contrast.
  let lo = 1;
  let hi = 0;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const p = px(x, y);
      if (coverage(p) > 0.5) {
        const l = luma(p[0], p[1], p[2]);
        lo = Math.min(lo, l);
        hi = Math.max(hi, l);
      }
    }
  const span = Math.max(0.05, hi - lo);

  const cells: AsciiCell[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: AsciiCell[] = [];
    for (let x = 0; x < cols; x++) {
      const p = px(x, y);
      const cov = coverage(p);
      // Darker areas of the subject get denser glyphs; edges fade via coverage.
      const tone = 1 - (luma(p[0], p[1], p[2]) - lo) / span;
      const ink = cov < 0.12 ? 0 : cov * (0.55 + 0.45 * tone);
      const level = ink === 0 ? 0 : Math.max(1, Math.round(ink * (RAMP.length - 1)));
      const color =
        opts.color === 'mono'
          ? '#c9d1d9'
          : opts.color === 'accent'
            ? (opts.accent ?? '#a855f7')
            : lift(p[0], p[1], p[2]);
      row.push({ch: RAMP[level], color, ink});
    }
    cells.push(row);
  }

  return {cols, rows, cells};
}
