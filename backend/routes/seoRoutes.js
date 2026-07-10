import express from 'express';
import {
  getCategorySeo,
  getProductSeo,
  getRobots,
  getSitemap,
} from '../controllers/seoController.js';

const router = express.Router();

router.get('/product/:id', getProductSeo);
router.get('/category/:slug', getCategorySeo);
router.get('/sitemap.xml', getSitemap);
router.get('/robots.txt', getRobots);

export default router;
