import {loadFont} from '@remotion/google-fonts/JetBrainsMono';

export const {fontFamily: mono} = loadFont('normal', {weights: ['400', '700', '800'], subsets: ['latin']});

// GitHub dark palette.
export const theme = {
  bg: '#0d1117',
  panel: '#010409',
  card: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#7d8590',
  faint: '#484f58',
  green: '#39d353',
  levels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
  dots: ['#ff5f57', '#febc2e', '#28c840'],
};

export const FPS = 30;

/** Deterministic hash → [0, 1). Remotion frames must not use Math.random(). */
export const rand = (...n: number[]) => {
  let h = 2166136261;
  for (const v of n) {
    h ^= v | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return ((h >>> 0) % 100000) / 100000;
};

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};
export const monthOf = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];
