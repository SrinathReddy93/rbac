import config from '../src/configs/env.js';
import app from './app.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function shutdown(signal) {
  logger.info(`\nReceived ${signal}. Shutting down...`);

  server.close(() => {
    logger.info('Closed out remaining connections');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000); // 10s timeout
}

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => shutdown(signal));
});
