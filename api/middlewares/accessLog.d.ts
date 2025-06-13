import { Request, Response, NextFunction } from 'express';
/**
 * Access logging middleware
 * Logs information about incoming requests at info level
 */
export declare const accessLogMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export default accessLogMiddleware;
