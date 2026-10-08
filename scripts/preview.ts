// Screenshots the README images the way GitHub shows them (<img> on a dark
// page) at several real-time moments, to eyeball the animation.
//   npm run preview            → out/preview-<ms>.png
import path from 'node:path';
import {readdir, mkdir, writeFile} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

async function findChrome(): Promise<string> {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = path.resolve('node_modules/.remotion/chrome-for-testing');
  const walk = async (dir: string): Promise<string | null> => {
    for (const e of await readdir(dir, {withFileTypes: true})) {
      const p = path.join(dir, e.name);
      if (e.isFile() && /^(Google Chrome for Testing|chrome)$/.test(e.name)) return p;
      if (e.isDirectory()) {
        const r = await walk(p);
        if (r) return r;
      }
    }
    return null;
  };
  const found = await walk(root).catch(() => null);
  if (!found) throw new Error('Chrome not found: run `npx remotion browser ensure --chrome-mode=chrome-for-testing`');
  return found;
}

const times = (process.argv[2] ?? '600,1500,2600,6000').split(',').map(Number);
const ext = process.argv[3] ?? 'svg';
await mkdir('out', {recursive: true});
const browser = await puppeteer.launch({executablePath: await findChrome(), headless: true});
const page = await browser.newPage();
await page.setViewport({width: 960, height: 760, deviceScaleFactor: 2});
// A real file page: about:blank (setContent) may not load file:// images.
const src = (f: string) => `../assets/${f}.${ext}`;
await writeFile(
  'out/preview.html',
  `<body style="margin:0;padding:20px;background:#0d1117">` +
    `<img src="${src('contributions')}" width="920"><br><br><img src="${src('whoami')}" width="920"></body>`,
);
await page.goto(`file://${path.resolve('out/preview.html')}`, {waitUntil: 'load'});
const t0 = Date.now();
for (const t of times) {
  await new Promise((r) => setTimeout(r, Math.max(0, t - (Date.now() - t0))));
  await page.screenshot({path: `out/preview-${t}.png`});
  console.log(`out/preview-${t}.png`);
}
await browser.close();
