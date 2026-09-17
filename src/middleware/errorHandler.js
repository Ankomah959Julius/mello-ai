export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message || err);
  if (err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal Server Error' : err.message,
  });
};

export default errorHandler;
