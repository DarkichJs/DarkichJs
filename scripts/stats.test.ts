import {test} from 'node:test';
import assert from 'node:assert/strict';
import {computeStats} from './stats.ts';
import type {Day} from '../src/types.ts';

const mk = (counts: number[], start = '2026-01-01'): Day[] =>
  counts.map((count, i) => {
    const d = new Date(Date.parse(`${start}T00:00:00Z`) + i * 86_400_000);
    return {date: d.toISOString().slice(0, 10), count, level: count ? 1 : 0, weekday: d.getUTCDay()};
  });

test('longest and current streaks', () => {
  const s = computeStats(mk([1, 2, 0, 3, 3, 3, 0, 5, 1]));
  assert.equal(s.longestStreak, 3);
  assert.deepEqual(s.longestRange, {start: '2026-01-04', end: '2026-01-06'});
  assert.equal(s.currentStreak, 2);
  assert.deepEqual(s.currentRange, {start: '2026-01-08', end: '2026-01-09'});
});

test('empty today does not break current streak', () => {
  const s = computeStats(mk([0, 1, 1, 1, 0]));
  assert.equal(s.currentStreak, 3);
  assert.deepEqual(s.currentRange, {start: '2026-01-02', end: '2026-01-04'});
});

test('two empty trailing days reset current streak', () => {
  assert.equal(computeStats(mk([1, 1, 0, 0])).currentStreak, 0);
});

test('totals, best day, average, weekly buckets', () => {
  const s = computeStats(mk([1, 0, 4, 0, 0, 0, 0, 2, 2]));
  assert.equal(s.total, 9);
  assert.equal(s.activeDays, 4);
  assert.equal(s.totalDays, 9);
  assert.deepEqual(s.bestDay, {date: '2026-01-03', count: 4});
  assert.equal(s.avgPerActiveDay, 2.3);
  assert.deepEqual(s.weekly, [5, 4]);
});

test('no contributions', () => {
  const s = computeStats(mk([0, 0, 0]));
  assert.equal(s.bestDay, null);
  assert.equal(s.avgPerActiveDay, 0);
  assert.equal(s.longestRange, null);
});
