import {test} from 'node:test';
import assert from 'node:assert/strict';
import {upsertBlock} from './readme.ts';

const block = '<!-- readme-motion:start -->\nNEW\n<!-- readme-motion:end -->';

test('inserts block into empty readme', () => {
  assert.equal(upsertBlock('', block), `${block}\n`);
});

test('replaces existing block, keeps surrounding content', () => {
  const old = 'intro\n<!-- readme-motion:start -->\nOLD\n<!-- readme-motion:end -->\noutro';
  assert.equal(upsertBlock(old, block), `intro\n${block}\noutro`);
});

test('prepends block to a readme without markers', () => {
  assert.equal(upsertBlock('# Hello', block), `${block}\n\n# Hello`);
});
