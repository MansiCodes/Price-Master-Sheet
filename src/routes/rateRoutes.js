import { Router } from 'express';
import { rateController } from '../controllers/rateController.js';
import { validate } from '../middlewares/validate.js';
import {
  emptyQuerySchema,
  identifierParamSchema,
} from '../validators/rateValidators.js';

const router = Router();

router.get(
  '/',
  validate({ query: emptyQuerySchema }),
  rateController.getAll,
);

router.get(
  '/:identifier',
  validate({ params: identifierParamSchema, query: emptyQuerySchema }),
  rateController.getByIdentifier,
);

export default router;
