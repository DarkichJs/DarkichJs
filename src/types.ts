export type Day = {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  weekday: number; // 0 = Sunday
};

export type Range = {start: string; end: string} | null;

export type Stats = {
  total: number;
  currentStreak: number;
  currentRange: Range;
  longestStreak: number;
  longestRange: Range;
  activeDays: number;
  totalDays: number;
  bestDay: {date: string; count: number} | null;
  avgPerActiveDay: number;
  weekly: number[]; // contributions per week, oldest → newest
};

export type AsciiCell = {ch: string; color: string; ink: number};

export type Ascii = {
  cols: number;
  rows: number;
  cells: AsciiCell[][];
};

export type Config = {
  user: string;
  host: string;
  prompt: string;
  tagline: string;
  /** Print the name + tagline header (off when the README already has its own). */
  header?: boolean;
  accent: string;
  asciiColor: 'source' | 'mono' | 'accent';
  loop: boolean;
  /**
   * svg: vector, crisp at any DPI, tiny files, browser-native animation (default).
   * webp / gif: raster video rendered with Remotion.
   */
  format: 'svg' | 'webp' | 'gif';
  width: number;
  links: {label: string; url: string; color: string; logo?: string}[];
};

export type Profile = {
  login: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  followers: number;
  publicRepos: number;
};

export type ProfileData = {
  generatedAt: string;
  profile: Profile;
  weeks: Day[][]; // GitHub calendar layout: columns of up to 7 days
  stats: Stats;
};

export type ContributionsProps = {
  prompt: string;
  host: string;
  accent: string;
  weeks: Day[][];
  total: number;
};

export type WhoamiProps = {
  prompt: string;
  host: string;
  accent: string;
  login: string;
  ascii: Ascii;
  stats: Stats;
};
