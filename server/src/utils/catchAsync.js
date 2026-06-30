/**
 * Wraps an async route handler to catch errors and forward them to Express error middleware.
 * Without this, you'd wrap every route in try/catch manually.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default catchAsync;