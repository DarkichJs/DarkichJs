import {readFile, writeFile} from 'node:fs/promises';
import {loadConfig} from './fetch-data.ts';
import type {Config, ProfileData} from '../src/types.ts';

const START = '<!-- readme-motion:start -->';
const END = '<!-- readme-motion:end -->';

const badge = (l: Config['links'][number]) => {
  const label = encodeURIComponent(l.label.replace(/-/g, '--').replace(/_/g, '__'));
  const logo = l.logo ? `&logo=${encodeURIComponent(l.logo)}&logoColor=white` : '';
  return `<a href="${l.url}"><img src="https://img.shields.io/badge/${label}-${l.color}?style=for-the-badge${logo}" alt="${l.label}"></a>`;
};

const promptLine = (c: Config, cmd: string) => `<code>${c.prompt}@${c.host} ~ $ ${cmd}</code>`;

export function renderBlock(config: Config, data: ProfileData): string {
  const ext = config.format;
  // SVGs carry no prompt line of their own, so the README prints it (crisp, selectable text).
  const heading = (cmd: string) => (ext === 'svg' ? [`<h3>${promptLine(config, cmd)}</h3>`, ''] : []);
  // The query string busts GitHub's image proxy cache whenever data changes.
  const v = data.generatedAt.slice(0, 10).replace(/-/g, '');
  const name = data.profile.name ?? data.profile.login;
  return [
    START,
    '<div align="center">',
    '',
    ...(config.header === false ? [] : [`<h1>${name}</h1>`, `<p><i>${config.tagline}</i></p>`, '']),
    ...heading('./contributions.sh'),
    `<img src="assets/contributions.${ext}?v=${v}" width="100%" alt="${data.stats.total} contributions in the last year">`,
    '',
    '<br>',
    '',
    ...heading('whoami'),
    `<img src="assets/whoami.${ext}?v=${v}" width="100%" alt="${data.profile.login}: ${data.stats.currentStreak}-day streak">`,
    '',
    '<br>',
    '',
    `<h3>${promptLine(config, './links.sh')}</h3>`,
    '',
    config.links.map(badge).join('\n'),
    '',
    `<sub>auto-updated daily · last run ${data.generatedAt.slice(0, 10)}</sub>`,
    '',
    '</div>',
    END,
  ].join('\n');
}

/** Replaces the generated block in README.md, keeping anything outside the markers. */
export function upsertBlock(readme: string, block: string): string {
  const s = readme.indexOf(START);
  const e = readme.indexOf(END);
  if (s !== -1 && e > s) return readme.slice(0, s) + block + readme.slice(e + END.length);
  return readme.trim() ? `${block}\n\n${readme}` : `${block}\n`;
}

export async function writeReadme(config: Config, data: ProfileData, file = 'README.md') {
  const current = await readFile(file, 'utf8').catch(() => '');
  await writeFile(file, upsertBlock(current, renderBlock(config, data)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data: ProfileData = JSON.parse(await readFile('data/profile.json', 'utf8'));
  await writeReadme(await loadConfig(), data);
  console.log('README.md updated');
}
