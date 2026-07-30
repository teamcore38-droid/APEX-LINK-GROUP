import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/pages/ProductPage.jsx', import.meta.url), 'utf8');

test('Product Details keeps narrow-screen layout constrained and shrinkable', () => {
  assert.match(source, /min-h-screen min-w-0 max-w-full overflow-x-clip/);
  assert.match(source, /mt-6 grid min-w-0 gap-5 lg:grid-cols-2/);
  assert.match(source, /min-w-0 max-w-full font-serif text-xl[^`]*\[overflow-wrap:anywhere\]/);
  assert.match(source, /await navigator\.share\(\{ url: shareUrl \}\)/);
  assert.doesNotMatch(source, /navigator\.share\(shareData\)/);
  assert.doesNotMatch(source, />Share Product<\/button>/);
  assert.match(source, /shareToNetwork\('facebook'\)/);
  assert.match(source, /shareToNetwork\('whatsapp'\)/);
  assert.match(source, /shareToNetwork\('instagram'\)/);
  assert.match(source, /lg:text-2xl/);
  assert.match(source, /flex min-w-0 w-full items-center justify-between gap-2/);
  assert.match(source, /flex min-w-0 flex-1 items-center gap-3/);
  assert.match(source, /flex min-w-0 max-w-full touch-pan-x snap-x snap-mandatory/);
  assert.match(source, /inline-flex h-12 min-w-0 flex-1 items-center/);
});
