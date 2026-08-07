import { Router } from 'express';
import { API_PREFIX } from '../constants/index.js';
import cacheRoutes from './cacheRoutes.js';
import healthRoutes from './healthRoutes.js';
import rateRoutes from './rateRoutes.js';

const router = Router();

router.use(`${API_PREFIX}/health`, healthRoutes);
router.use(`${API_PREFIX}/rates`, rateRoutes);
router.use(`${API_PREFIX}/cache`, cacheRoutes);

export default router;
