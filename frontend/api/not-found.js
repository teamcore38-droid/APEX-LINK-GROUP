import {
  getRequestOrigin,
  injectSeoHead,
  normalizeCanonicalUrl,
} from '../server/seoResponse.js';

export default async function handler(req, res) {
  const origin = getRequestOrigin(req);
  const pathname = String(req.url || '/').split('?')[0];

  try {
    const shellResponse = await fetch(`${origin}/index.html`, {
      headers: { 'User-Agent': 'ApexFashion-SEO-Renderer/1.0' },
    });

    if (!shellResponse.ok) {
      throw new Error(`Unable to load application shell (${shellResponse.status})`);
    }

    const shellHtml = await shellResponse.text();
    const html = injectSeoHead(shellHtml, {
      title: 'Page Not Found | Apex Fashion',
      description: 'This page is unavailable or could not be found.',
      canonicalUrl: normalizeCanonicalUrl(pathname),
      robots: 'noindex, nofollow, noarchive',
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.status(404).send(html);
  } catch (error) {
    console.error('[not-found-render]', error.message);
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.status(404).send('Page not found');
  }
}
