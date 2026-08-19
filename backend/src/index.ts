import app from './app';
import { ENV } from './config/env';
import { logger } from './config/logger';

const PORT = parseInt(ENV.PORT, 10);
app.listen(PORT, () => {
  logger.info(`🚀 Internship Management Backend Server listening on http://localhost:${PORT}`);
});
