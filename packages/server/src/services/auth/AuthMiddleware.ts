/**
 * AuthMiddleware - Authentication middleware utilities
 *
 * Provides middleware for checking authentication status.
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * AuthMiddleware - Authentication middleware helpers.
 */
export class AuthMiddleware {
  /**
   * Middleware to require authentication.
   * Redirects to client with error if not authenticated.
   */
  public static requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.redirect(`${process.env.CLIENT_URL}/?auth=required`);
    }
  }

  /**
   * Middleware to check if user is authenticated (JSON response).
   * Returns 401 if not authenticated.
   */
  public static requireAuthApi(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.status(401).json({ error: 'Authentication required' });
    }
  }
}
