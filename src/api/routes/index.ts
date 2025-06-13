import { Express } from 'express';
import healthRoutes from './health';
import registryRoutes from './registry';
import metricsRoutes from './metrics';
import commandsRoutes from './commands';
import eventsRoutes from './events';
import accessLogMiddleware from '../middlewares/accessLog';

/**
 * Register all API routes
 * @param app Express application instance
 */
export const registerRoutes = (app: Express): void => {
  // Register access logging middleware
  app.use(accessLogMiddleware);

  // Register health routes
  app.use(healthRoutes);

  // Register registry routes
  app.use(registryRoutes);

  // Register metrics routes
  app.use(metricsRoutes);

  // Register commands routes
  app.use(commandsRoutes);

  // Register events routes
  app.use(eventsRoutes);
};

export default registerRoutes;
