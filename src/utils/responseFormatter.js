/**
 * Standard success response envelope.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {*} [options.data]
 * @param {string} options.message
 * @param {number} [options.statusCode=200]
 */
export function sendSuccess(res, { data, message, statusCode = 200 }) {
  const payload = {
    success: true,
    message,
  };

  if (data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
}

/**
 * Standard error response envelope.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {string} options.message
 * @param {number} [options.statusCode=500]
 * @param {*} [options.errors]
 */
export function sendError(res, { message, statusCode = 500, errors }) {
  const payload = {
    success: false,
    message,
  };

  if (errors !== undefined) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
}
