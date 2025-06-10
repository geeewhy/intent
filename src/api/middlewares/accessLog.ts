import { Request, Response, NextFunction } from 'express';
import { stdLogger } from '../../infra/logger/stdLogger';

/**
 * Access logging middleware
 * Logs information about incoming requests at info level
 */
export const accessLogMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log request details when the response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    // stdLogger.info('API Request', {
    //   operation: 'middlewares/accessLog.ts:accessLogMiddleware',
    //   method: req.method,
    //   path: req.originalUrl || req.url,
    //   statusCode: res.statusCode,
    //   duration: `${duration}ms`,
    //   ip: req.ip || req.socket.remoteAddress,
    //   userAgent: req.get('User-Agent')
    // });
  });

  next();
};

export default accessLogMiddleware;