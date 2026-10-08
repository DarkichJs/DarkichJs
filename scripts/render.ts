import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {mkdir, readdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {renderFrames, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {loadConfig} from './fetch-data.ts';
import {embeddedFontCss} from './svg/common.ts';
import {contributionsSvg} from './svg/contributions.ts';
import {whoamiSvg} from './svg/whoami.ts';
import type {Ascii, Config, ContributionsProps, ProfileData, WhoamiProps} from '../src/types.ts';

const CHROME_MODE = 'chrome-for-testing' as const;

/**
 * PNG frames → animated WebP with libwebp's img2webp. WebP keeps full colour
 * (no GIF palette dithering) and 30 fps stays small thanks to frame diffing.
 * Lossy q97 + sharp YUV is visually identical to the master; lower qualities
 * leave blocky "ghosts" on flat dark areas, lossless is ~3x bigger.
 */
async function encodeWebp(framesDir: string, out: string, fps: number, loop: boolean) {
  const frames = (await readdir(framesDir)).filter((f) => f.endsWith('.png')).sort();
  execFileSync(
    'img2webp',
    [
      '-loop', loop ? '0' : '1', // 0 = forever, 1 = play once
      '-sharp_yuv',
      '-d', String(Math.round(1000 / fps)),
      '-m', '4',
      '-lossy',
      '-q', '97',
      ...frames.map((f) => path.join(framesDir, f)),
      '-o', out,
    ],
    {stdio: ['ignore', 'ignore', 'inherit']},
  );
}

/** Animated SVGs: no browser needed, renders in well under a second. */
export async function renderSvg(config: Config, data: ProfileData, ascii: Ascii, outDir = 'assets') {
  await mkdir(outDir, {recursive: true});
  const font = await embeddedFontCss();
  const files: [string, string][] = [
    ['contributions.svg', contributionsSvg(data.weeks, data.stats.total, font)],
    [
      'whoami.svg',
      whoamiSvg(
        ascii,
        data.stats,
        {
          accent: config.accent,
          prompt: config.prompt,
          host: config.host,
          login: data.profile.login,
          name: data.profile.name ?? data.profile.login,
        },
        font,
      ),
    ],
  ];
  for (const [name, svg] of files) {
    await writeFile(path.join(outDir, name), svg);
    console.log(`${outDir}/${name} (${Math.round(Buffer.byteLength(svg) / 1024)} KB)`);
  }
}

export async function renderAll(config: Config, data: ProfileData, ascii: Ascii, outDir = 'assets') {
  if (config.format === 'svg') return renderSvg(config, data, ascii, outDir);
  await mkdir(outDir, {recursive: true});
  await mkdir('out', {recursive: true});
  console.log('Bundling…');
  const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});

  const base = {prompt: config.prompt, host: config.host, accent: config.accent};
  const jobs: {id: string; file: string; props: ContributionsProps | WhoamiProps}[] = [
    {id: 'Contributions', file: 'contributions', props: {...base, weeks: data.weeks, total: data.stats.total}},
    {id: 'Whoami', file: 'whoami', props: {...base, login: data.profile.login, ascii, stats: data.stats}},
  ];

  // 2x so text stays crisp on retina screens. GIF is capped lower to keep size sane.
  const webp = config.format !== 'gif';
  const scale = (config.width / 900) * (webp ? 2 : 1.5);

  for (const job of jobs) {
    const composition = await selectComposition({serveUrl, id: job.id, inputProps: job.props, chromeMode: CHROME_MODE});
    const target = path.join(outDir, `${job.file}.${webp ? 'webp' : 'gif'}`);
    let lastPct = -1;
    const onProgress = (progress: number) => {
      const pct = Math.round(progress * 100);
      if (pct % 25 === 0 && pct !== lastPct) console.log(`${job.id}: ${(lastPct = pct)}%`);
    };
    if (webp) {
      const framesDir = path.join('out', `${job.file}-frames`);
      await rm(framesDir, {recursive: true, force: true});
      await renderFrames({
        serveUrl,
        composition,
        inputProps: job.props,
        outputDir: framesDir,
        imageFormat: 'png',
        scale,
        chromeMode: CHROME_MODE,
        onStart: () => undefined,
        onFrameUpdate: (done) => onProgress(done / composition.durationInFrames),
      });
      await encodeWebp(framesDir, target, composition.fps, config.loop);
      await rm(framesDir, {recursive: true, force: true});
    } else {
      await renderMedia({
        serveUrl,
        composition,
        inputProps: job.props,
        scale,
        chromeMode: CHROME_MODE,
        codec: 'gif',
        everyNthFrame: 2,
        numberOfGifLoops: config.loop ? null : 0,
        outputLocation: target,
        onProgress: ({progress}) => onProgress(progress),
      });
    }
    // Static last frame — handy for previews and social cards.
    await renderStill({
      serveUrl,
      composition,
      inputProps: job.props,
      frame: composition.durationInFrames - 1,
      output: path.join(outDir, `${job.file}.png`),
      scale,
      chromeMode: CHROME_MODE,
    });
    const kb = Math.round((await stat(target)).size / 1024);
    console.log(`${job.id}: ${target} (${kb} KB)`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = await loadConfig();
  const data: ProfileData = JSON.parse(await readFile('data/profile.json', 'utf8'));
  const ascii: Ascii = JSON.parse(await readFile('data/ascii.json', 'utf8'));
  await renderAll(config, data, ascii);
}
