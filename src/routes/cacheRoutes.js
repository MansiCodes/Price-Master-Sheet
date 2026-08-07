import { Router } from 'express';
import { cacheController } from '../controllers/cacheController.js';
import { validate } from '../middlewares/validate.js';
import { emptyBodySchema, emptyQuerySchema } from '../validators/rateValidators.js';

const router = Router();

router.post(
  '/refresh',
  validate({ query: emptyQuerySchema, body: emptyBodySchema }),
  cacheController.refresh,
);

export default router;
