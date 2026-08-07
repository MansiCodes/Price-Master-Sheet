import { Router } from 'express';
import { healthController } from '../controllers/healthController.js';
import { validate } from '../middlewares/validate.js';
import { emptyQuerySchema } from '../validators/rateValidators.js';

const router = Router();

router.get(
  '/',
  validate({ query: emptyQuerySchema }),
  healthController.getHealth,
);

export default router;
