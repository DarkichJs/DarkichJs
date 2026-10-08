import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contributionsSvg} from './svg/contributions.ts';
import {whoamiSvg} from './svg/whoami.ts';
import {parseCalendarHtml, toWeeks} from './github.ts';
import {computeStats} from './stats.ts';
import type {Ascii, Day} from '../src/types.ts';

const days: Day[] = Array.from({length: 21}, (_, i) => {
  const d = new Date(Date.UTC(2026, 0, 4 + i)); // 2026-01-04 is a Sunday
  return {date: d.toISOString().slice(0, 10), count: i % 3, level: (i % 3) as Day['level'], weekday: d.getUTCDay()};
});

// Cheap well-formedness check: no element carries the same attribute twice.
const noDuplicateAttrs = (svg: string) => {
  for (const tag of svg.match(/<[a-zA-Z][^>]*>/g) ?? []) {
    const names = [...tag.matchAll(/\s([a-zA-Z:-]+)=/g)].map((m) => m[1]);
    assert.equal(new Set(names).size, names.length, `duplicate attribute in ${tag.slice(0, 80)}`);
  }
};

test('toWeeks splits on Sunday', () => {
  const w = toWeeks(days);
  assert.equal(w.length, 3);
  assert.ok(w.every((col) => col.length === 7 && col[0].weekday === 0));
});

test('contributions svg has one cell per day and is well-formed', () => {
  const svg = contributionsSvg(toWeeks(days), 21, '');
  assert.equal(svg.match(/<rect class="c/g)?.length, 21);
  assert.match(svg, /^<svg[^>]+viewBox/);
  noDuplicateAttrs(svg);
});

test('whoami svg renders stats and ascii', () => {
  const ascii: Ascii = {cols: 3, rows: 1, cells: [[{ch: '@', color: '#aa66ff', ink: 1}, {ch: ' ', color: '#000000', ink: 0}, {ch: '<', color: '#aa66ff', ink: 1}]]};
  const svg = whoamiSvg(ascii, computeStats(days), {accent: '#a855f7', prompt: 'me', host: 'gh', login: 'Me', name: 'Me'}, '');
  assert.match(svg, /current streak/);
  assert.match(svg, /&lt;/); // ASCII glyphs are escaped
  noDuplicateAttrs(svg);
});

test('parses the public contributions calendar markup', () => {
  const html = `
    <td tabindex="0" data-ix="0" aria-selected="false" data-date="2026-01-04" id="contribution-day-component-0-0" data-level="2" class="ContributionCalendar-day"></td>
    <td data-date="2026-01-05" id="contribution-day-component-1-0" data-level="0" class="ContributionCalendar-day"></td>
    <tool-tip id="t1" for="contribution-day-component-0-0" popover="manual">12 contributions on January 4th.</tool-tip>
    <tool-tip id="t2" for="contribution-day-component-1-0" popover="manual">No contributions on January 5th.</tool-tip>`;
  assert.deepEqual(parseCalendarHtml(html), [
    {date: '2026-01-04', count: 12, level: 2, weekday: 0},
    {date: '2026-01-05', count: 0, level: 0, weekday: 1},
  ]);
});
