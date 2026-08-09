import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getHomeCategoryImageSrcSet,
  HOME_CATEGORY_IMAGE_SIZES,
  HOME_CATEGORY_IMAGE_WIDTHS,
} from '../src/utils/categoryUi.js';

const carouselSource = await readFile(
  new URL('../src/components/HomeCategoryCarousel.jsx', import.meta.url),
  'utf8'
);
const homePageSource = await readFile(
  new URL('../src/pages/HomePage.jsx', import.meta.url),
  'utf8'
);
const categoriesPageSource = await readFile(
  new URL('../src/pages/CategoriesPage.jsx', import.meta.url),
  'utf8'
);
const productsPageSource = await readFile(
  new URL('../src/pages/ProductsPage.jsx', import.meta.url),
  'utf8'
);
const productCardSource = await readFile(
  new URL('../src/components/Product.jsx', import.meta.url),
  'utf8'
);

test('Home category Cloudinary images expose layout-appropriate responsive candidates', () => {
  const srcSet = getHomeCategoryImageSrcSet({
    image: 'https://res.cloudinary.com/example/image/upload/f_auto,q_auto/v1/categories/example.webp',
  });
  const candidates = srcSet.split(', ');

  assert.deepEqual(HOME_CATEGORY_IMAGE_WIDTHS, [128, 160, 192, 256, 320, 480]);
  assert.equal(candidates.length, HOME_CATEGORY_IMAGE_WIDTHS.length);

  HOME_CATEGORY_IMAGE_WIDTHS.forEach((width, index) => {
    const height = Math.round(width / 0.78);
    assert.match(
      candidates[index],
      new RegExp(`f_auto,q_auto,w_${width},h_${height},c_fill.* ${width}w$`)
    );
  });

  assert.doesNotMatch(srcSet, /dpr_auto/);
});

test('Home category Pexels fallback images expose equivalent width candidates', () => {
  const srcSet = getHomeCategoryImageSrcSet({ slug: 'women' });
  const candidates = srcSet.split(', ');

  assert.equal(candidates.length, HOME_CATEGORY_IMAGE_WIDTHS.length);
  candidates.forEach((candidate, index) => {
    const [url, descriptor] = candidate.split(' ');
    assert.equal(new URL(url).searchParams.get('w'), String(HOME_CATEGORY_IMAGE_WIDTHS[index]));
    assert.equal(descriptor, `${HOME_CATEGORY_IMAGE_WIDTHS[index]}w`);
  });
});

test('Home category images retain their original src when a provider has no safe responsive URL strategy', () => {
  assert.equal(
    getHomeCategoryImageSrcSet({ image: 'https://example.com/category-image.jpg' }),
    ''
  );
});

test('Home category carousel keeps its layout reservation and native lazy responsive image markup', () => {
  assert.match(carouselSource, /const categoryImage = getCategoryImage\(category\);/);
  assert.match(carouselSource, /const categoryImageSrcSet = getHomeCategoryImageSrcSet\(category\);/);
  assert.match(carouselSource, /src=\{categoryImage\}/);
  assert.match(carouselSource, /srcSet=\{categoryImageSrcSet \|\| undefined\}/);
  assert.match(carouselSource, /sizes=\{HOME_CATEGORY_IMAGE_SIZES\}/);
  assert.match(carouselSource, /loading="lazy"/);
  assert.match(carouselSource, /decoding="async"/);
  assert.match(carouselSource, /alt=""/);
  assert.match(carouselSource, /aspect-\[0\.78\]/);
  assert.match(carouselSource, /w-\[104px\].*sm:w-\[122px\].*md:w-\[132px\]/);
  assert.match(carouselSource, /role="region".*aria-roledescription="carousel"/);
  assert.match(carouselSource, /element\.scrollBy\(/);
  assert.equal(
    HOME_CATEGORY_IMAGE_SIZES,
    '(min-width: 768px) 132px, (min-width: 640px) 122px, 104px'
  );
  assert.doesNotMatch(carouselSource, /window\.innerWidth|matchMedia|new Image\(/);
});

test('Home-only category delivery leaves hero, non-Home, Shop, and product-card regressions protected', () => {
  assert.match(homePageSource, /<HomeCategoryCarousel categories=\{homeCategories\} \/>/);
  assert.match(homePageSource, /<picture key=\{`hero-bg-\$\{activeHeroImage\}`\}>/);
  assert.doesNotMatch(categoriesPageSource, /HomeCategoryCarousel/);
  assert.doesNotMatch(productsPageSource, /preloadProductGridImages/);
  assert.match(productCardSource, /const PRODUCT_CARD_IMAGE_WIDTHS = \[240, 360, 520, 720\]/);
  assert.match(productCardSource, /srcSet=\{productImageSrcSet \|\| undefined\}/);
});
