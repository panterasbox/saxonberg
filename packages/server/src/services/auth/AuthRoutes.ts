/**
 * AuthRoutes - Authentication route handlers
 *
 * Provides Express routes for OAuth authentication:
 * - /auth/google - Initiate Google OAuth
 * - /auth/google/callback - OAuth callback handler
 * - /auth/status - Check auth status
 * - /auth/logout - Logout user
 */

import type { Express, Request, Response } from 'express';
import passport from 'passport';
import type { AuthStatusResponse } from '@saxonberg/types';

/**
 * AuthRoutes - Handles authentication routes.
 */
export class AuthRoutes {
  /**
   * Setup authentication routes on Express app.
   *
   * @param app - Express application
   */
  public static setup(app: Express): void {
    // Initiate Google OAuth flow
    app.get(
      '/auth/google',
      passport.authenticate('google', {
        scope: ['profile', 'email'],
      })
    );

    // Google OAuth callback
    app.get(
      '/auth/google/callback',
      passport.authenticate('google', {
        failureRedirect: `${process.env.CLIENT_URL}/?auth=failure`,
      }),
      (req: Request, res: Response) => {
        // Successful authentication
        console.info('AuthRoutes: Google OAuth callback success');

        // Redirect to client with success flag
        res.redirect(`${process.env.CLIENT_URL}/?auth=success`);
      }
    );

    // Check authentication status
    app.get('/auth/status', (req: Request, res: Response) => {
      const response: AuthStatusResponse = {
        isAuthenticated: req.isAuthenticated(),
      };

      if (req.isAuthenticated() && req.user) {
        const user = req.user as { id: string };
        response.user = {
          id: user.id,
          email: '',
          displayName: '',
        };
      }

      res.json(response);
    });

    // Logout
    app.post('/auth/logout', (req: Request, res: Response) => {
      req.logout((err) => {
        if (err) {
          console.error('AuthRoutes: Error during logout:', err);
          res.status(500).json({ error: 'Logout failed' });
          return;
        }

        // Destroy session
        req.session.destroy((err) => {
          if (err) {
            console.error('AuthRoutes: Error destroying session:', err);
          }

          res.json({ success: true });
        });
      });
    });

    console.info('AuthRoutes: Routes configured');
  }
}
