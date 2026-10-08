import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {imageToAscii} from './ascii.ts';
import {fetchUser} from './github.ts';
import {computeStats} from './stats.ts';
import type {Config, ProfileData} from '../src/types.ts';

export async function loadConfig(): Promise<Config> {
  return JSON.parse(await readFile('readme.config.json', 'utf8'));
}

export async function fetchData(config: Config) {
  const {profile, weeks} = await fetchUser(config.user);
  const stats = computeStats(weeks.flat());
  // Weekly bars follow the calendar's own week columns.
  stats.weekly = weeks.map((w) => w.reduce((s, d) => s + d.count, 0));

  // A local avatar override (e.g. a portrait photo) gives nicer ASCII art.
  const avatar = await readFile('avatar.png').catch(async () => {
    const r = await fetch(profile.avatarUrl);
    if (!r.ok) throw new Error(`Avatar download failed: ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  });
  const ascii = await imageToAscii(avatar, {cols: 120, color: config.asciiColor, accent: config.accent});

  const data: ProfileData = {generatedAt: new Date().toISOString(), profile, weeks, stats};
  await mkdir('data', {recursive: true});
  await writeFile('data/profile.json', JSON.stringify(data, null, 2));
  await writeFile('data/ascii.json', JSON.stringify(ascii));
  return {data, ascii};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const {data, ascii} = await fetchData(await loadConfig());
  const {stats} = data;
  console.log(`@${data.profile.login}: ${stats.total} contributions, streak ${stats.currentStreak}/${stats.longestStreak}`);
  console.log(ascii.cells.map((r) => r.map((c) => c.ch).join('')).join('\n'));
}
