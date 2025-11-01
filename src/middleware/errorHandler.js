import logger from '../utils/logger.js';

function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.url} - ${err.message}`, {
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
}

export default errorHandler;
