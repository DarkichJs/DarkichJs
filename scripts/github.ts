import {execFileSync} from 'node:child_process';
import type {Day, Profile} from '../src/types.ts';

const LEVELS: Record<string, Day['level']> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

export function getToken(): string | null {
  const env = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (env) return env;
  try {
    return execFileSync('gh', ['auth', 'token'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim() || null;
  } catch {
    return null;
  }
}

const QUERY = /* GraphQL */ `
  query ($login: String!) {
    user(login: $login) {
      login
      name
      bio
      avatarUrl(size: 400)
      followers { totalCount }
      repositories(ownerAffiliations: OWNER, privacy: PUBLIC) { totalCount }
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays { date contributionCount contributionLevel weekday }
          }
        }
      }
    }
  }
`;

type UserData = {profile: Profile; weeks: Day[][]};

/**
 * GraphQL when a token is available; otherwise (or if it fails) the public,
 * unauthenticated calendar fragment the profile page itself loads.
 */
export async function fetchUser(login: string, token = getToken()): Promise<UserData> {
  if (token) {
    try {
      return await fetchGraphql(login, token);
    } catch (e) {
      console.warn(`GraphQL failed, falling back to public calendar: ${(e as Error).message}`);
    }
  }
  return fetchPublic(login);
}

async function fetchGraphql(login: string, token: string): Promise<UserData> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'readme-motion'},
    body: JSON.stringify({query: QUERY, variables: {login}}),
  });
  const json = (await res.json()) as {data?: {user: any}; errors?: {message: string}[]};
  if (!res.ok || json.errors || !json.data?.user) {
    throw new Error(`GitHub GraphQL failed (${res.status}): ${JSON.stringify(json.errors ?? json)}`);
  }
  const u = json.data.user;
  return {
    profile: {
      login: u.login,
      name: u.name,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      followers: u.followers.totalCount,
      publicRepos: u.repositories.totalCount,
    },
    weeks: u.contributionsCollection.contributionCalendar.weeks.map((w: any) =>
      w.contributionDays.map((d: any) => ({
        date: d.date,
        count: d.contributionCount,
        level: LEVELS[d.contributionLevel] ?? 0,
        weekday: d.weekday,
      })),
    ),
  };
}

/** Groups a date-sorted list of days into GitHub-style week columns (Sunday first). */
export function toWeeks(days: Day[]): Day[][] {
  const weeks: Day[][] = [];
  for (const d of days) {
    if (!weeks.length || d.weekday === 0) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  }
  return weeks;
}

/** Parses github.com/users/<login>/contributions (HTML table + tool-tips). */
export function parseCalendarHtml(html: string): Day[] {
  const tips = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const count = /no contributions/i.test(m[2]) ? 0 : Number(m[2].match(/(\d[\d,]*)/)?.[1].replace(/,/g, '') ?? 0);
    tips.set(m[1], count);
  }
  const days: Day[] = [];
  for (const m of html.matchAll(/<td\b[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g)) {
    const tag = m[0];
    const date = tag.match(/data-date="([^"]+)"/)?.[1];
    if (!date) continue;
    const id = tag.match(/id="([^"]+)"/)?.[1] ?? '';
    const level = Number(tag.match(/data-level="(\d)"/)?.[1] ?? 0) as Day['level'];
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    days.push({date, count: tips.get(id) ?? 0, level, weekday});
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchPublic(login: string): Promise<UserData> {
  const headers = {'User-Agent': 'readme-motion'};
  const html = await (await fetch(`https://github.com/users/${login}/contributions`, {headers})).text();
  const days = parseCalendarHtml(html);
  if (!days.length) throw new Error('Public calendar had no cells — GitHub markup may have changed.');
  const u = (await (await fetch(`https://api.github.com/users/${login}`, {headers})).json()) as any;
  return {
    profile: {
      login: u.login ?? login,
      name: u.name ?? null,
      bio: u.bio ?? null,
      avatarUrl: u.avatar_url ?? `https://github.com/${login}.png`,
      followers: u.followers ?? 0,
      publicRepos: u.public_repos ?? 0,
    },
    weeks: toWeeks(days),
  };
}
