import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loadJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

const getNoIndexHeaderRules = (config) =>
  (config.headers || []).filter((rule) =>
    (rule.headers || []).some(
      (header) =>
        String(header.key || '').toLowerCase() === 'x-robots-tag' &&
        String(header.value || '').toLowerCase().includes('noindex')
    )
  );

const getConfigs = async () =>
  Promise.all([
    loadJson('../vercel.json'),
    loadJson('../../vercel.json'),
  ]);

const sourceAppliesToPath = (source = '', path = '/') => {
  if (source === path) return true;
  if (source.endsWith('/(.*)')) {
    const prefixSource = source.replace('/(.*)', '');
    const groupMatch = prefixSource.match(/^\/\(([^)]+)\)$/);

    if (groupMatch) {
      return groupMatch[1].split('|').some((entry) => path.startsWith(`/${entry}/`));
    }

    return path.startsWith(`${prefixSource}/`);
  }

  const exactGroupMatch = source.match(/^\/\(([^)]+)\)$/);
  if (exactGroupMatch) {
    return exactGroupMatch[1].split('|').some((entry) => path === `/${entry}`);
  }

  return false;
};

test('Vercel noindex headers do not apply to server-rendered catalog API rewrites', async () => {
  const configs = await getConfigs();
  const noIndexRules = configs.flatMap(getNoIndexHeaderRules);

  assert.equal(
    noIndexRules.some((rule) => String(rule.source || '').startsWith('/api')),
    false
  );
});

test('Vercel noindex headers only target private or transactional routes', async () => {
  const configs = await getConfigs();
  const noIndexRules = configs.flatMap(getNoIndexHeaderRules);
  const publicPaths = [
    '/',
    '/products',
    '/product/example-123456789012345678901234',
    '/categories',
    '/category/women',
    '/about',
    '/contact',
    '/faq',
    '/shipping',
    '/returns',
    '/payment-policy',
    '/privacy',
    '/cookies',
    '/terms',
    '/rfq',
  ];

  publicPaths.forEach((path) => {
    assert.equal(
      noIndexRules.some((rule) => sourceAppliesToPath(String(rule.source || ''), path)),
      false,
      `${path} must not receive a noindex response header`
    );
  });
});
