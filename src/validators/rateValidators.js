import { z } from 'zod';

/**
 * Validates `:identifier` path param (serial number or cable name).
 */
export const identifierParamSchema = z.object({
  identifier: z
    .string({
      required_error: 'identifier is required',
      invalid_type_error: 'identifier must be a string',
    })
    .trim()
    .min(1, 'identifier cannot be empty')
    .max(200, 'identifier is too long'),
});

export const emptyQuerySchema = z.object({}).strict();

export const emptyBodySchema = z.object({}).strict();
