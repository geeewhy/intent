import { Express } from 'express';
import healthRoutes from './health';
import registryRoutes from './registry';

/**
 * Register all API routes
 * @param app Express application instance
 */
export const registerRoutes = (app: Express): void => {
  // Register health routes
  app.use(healthRoutes);
  
  // Register registry routes
  app.use(registryRoutes);
};

export default registerRoutes;