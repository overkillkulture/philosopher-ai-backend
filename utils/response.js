/**
 * Response Helper Utilities
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Standardized API response formatting
 */

const { HTTP, ERRORS } = require('../config/constants');

/**
 * Send success response
 * @param {import('express').Response} res
 * @param {*} data
 * @param {number} statusCode
 */
function success(res, data, statusCode = HTTP.OK) {
  return res.status(statusCode).json({
    success: true,
    ...data
  });
}

/**
 * Send created response
 * @param {import('express').Response} res
 * @param {*} data
 */
function created(res, data) {
  return success(res, data, HTTP.CREATED);
}

/**
 * Send error response
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} statusCode
 */
function error(res, message, statusCode = HTTP.BAD_REQUEST) {
  return res.status(statusCode).json({
    success: false,
    error: message
  });
}

/**
 * Send 400 Bad Request
 * @param {import('express').Response} res
 * @param {string} message
 */
function badRequest(res, message = ERRORS.VALIDATION) {
  return error(res, message, HTTP.BAD_REQUEST);
}

/**
 * Send 401 Unauthorized
 * @param {import('express').Response} res
 * @param {string} message
 */
function unauthorized(res, message = ERRORS.UNAUTHORIZED) {
  return error(res, message, HTTP.UNAUTHORIZED);
}

/**
 * Send 403 Forbidden
 * @param {import('express').Response} res
 * @param {string} message
 */
function forbidden(res, message = ERRORS.FORBIDDEN) {
  return error(res, message, HTTP.FORBIDDEN);
}

/**
 * Send 404 Not Found
 * @param {import('express').Response} res
 * @param {string} message
 */
function notFound(res, message = ERRORS.NOT_FOUND) {
  return error(res, message, HTTP.NOT_FOUND);
}

/**
 * Send 423 Locked
 * @param {import('express').Response} res
 * @param {string} message
 */
function locked(res, message = ERRORS.LOCKED) {
  return error(res, message, HTTP.LOCKED);
}

/**
 * Send 429 Too Many Requests
 * @param {import('express').Response} res
 * @param {string} message
 */
function tooManyRequests(res, message = ERRORS.RATE_LIMIT) {
  return error(res, message, HTTP.TOO_MANY_REQUESTS);
}

/**
 * Send 500 Internal Server Error
 * @param {import('express').Response} res
 * @param {string} message
 */
function serverError(res, message = ERRORS.INTERNAL) {
  return error(res, message, HTTP.INTERNAL_ERROR);
}

module.exports = {
  success,
  created,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  locked,
  tooManyRequests,
  serverError
};
