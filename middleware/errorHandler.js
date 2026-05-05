/**
 * Central error handler — always last middleware in server.js
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const isDev = process.env.NODE_ENV !== "production";

  console.error(`[ERROR] ${err.message}`);
  if (isDev) console.error(err.stack);

  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    message:
      status === 500 && !isDev
        ? "Internal server error."
        : err.message || "Something went wrong.",
  });
}

module.exports = errorHandler;
