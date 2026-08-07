import { HttpStatus } from '../constants/httpStatus.js';
import { Messages } from '../constants/messages.js';
import { sendError } from '../utils/responseFormatter.js';

/**
 * Creates Express middleware that validates request parts with Zod schemas.
 *
 * @param {object} schemas
 * @param {import('zod').ZodTypeAny} [schemas.params]
 * @param {import('zod').ZodTypeAny} [schemas.query]
 * @param {import('zod').ZodTypeAny} [schemas.body]
 */
export function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body ?? {});
      }
      next();
    } catch (error) {
      if (error?.name === 'ZodError') {
        const errors = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));

        return sendError(res, {
          statusCode: HttpStatus.BAD_REQUEST,
          message: Messages.VALIDATION_FAILED,
          errors,
        });
      }
      next(error);
    }
  };
}
