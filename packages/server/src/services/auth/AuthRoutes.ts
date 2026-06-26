/**
 * AuthRoutes - Authentication route handlers
 *
 * Provides Express routes for OAuth authentication:
 * - /auth/google, /auth/twitch - initiate login OAuth
 * - /auth/{provider}/callback - login callback handlers
 * - /auth/{provider}/link, /link/callback - authenticated linking
 * - /auth/{provider}/unlink - authenticated unlinking (POST)
 * - /auth/status - check auth status
 * - /auth/logout - logout user
 */

import type { Express, Request, Response } from 'express';
import passport from 'passport';
import type {
  AuthProvider,
  AuthStatusResponse,
  PassportGoogleProfile,
  PassportTwitchProfileWithTokens,
} from '@saxonberg/types';
import { Backend } from '../../backend/Backend';
import { CmsSession } from '../../backend/CmsSession';
import { AccessApi } from '../../mud/api/access';
import { ExecutionContextApi } from '../../mud/api/execution-context';
import type { Stuff } from '../../mud/lib/stuff/Stuff';
import { AuthMiddleware } from './AuthMiddleware';
import { TWITCH_IDENTITY_SCOPE } from './PassportConfig';

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
        console.info('AuthRoutes: Google OAuth callback success');
        res.redirect(`${process.env.CLIENT_URL}/?auth=success`);
      }
    );

    // Initiate Twitch OAuth flow (minimal identity scope; no chat scopes)
    app.get(
      '/auth/twitch',
      passport.authenticate('twitch', {
        scope: TWITCH_IDENTITY_SCOPE,
      })
    );

    // Twitch OAuth callback
    app.get(
      '/auth/twitch/callback',
      passport.authenticate('twitch', {
        failureRedirect: `${process.env.CLIENT_URL}/?auth=failure`,
      }),
      (req: Request, res: Response) => {
        console.info('AuthRoutes: Twitch OAuth callback success');
        res.redirect(`${process.env.CLIENT_URL}/?auth=success`);
      }
    );

    // ---- Linking (authenticated OAuth round-trips) ------------------

    AuthRoutes.setupLinkRoutes(app, 'google', 'google-link');
    AuthRoutes.setupLinkRoutes(app, 'twitch', 'twitch-link');

    // ---- Unlinking (authenticated POST, no OAuth) -------------------

    AuthRoutes.setupUnlinkRoute(app, 'google');
    AuthRoutes.setupUnlinkRoute(app, 'twitch');

    // Check authentication status
    app.get('/auth/status', async (req: Request, res: Response) => {
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

        // Non-authoritative developer-tier hint so the client can hide
        // the CMS launcher. Resolves the session's loaded Avatar through
        // the same bridge the REST CMS routes use; null avatar → false.
        // Gates remain server-side (this flag is UX only).
        try {
          response.isDeveloper = await CmsSession.runAsSessionPlayer(
            req,
            'auth.status.isDeveloper',
            // Derive the avatar from context (the bridge stamps it) — the
            // same context-only channel the CMS gates use; no passed actor.
            () =>
              AccessApi.isDeveloper(
                ExecutionContextApi.getActingAuthor() as Stuff | null
              )
          );
        } catch (err) {
          console.error('AuthRoutes: isDeveloper resolution failed:', err);
          response.isDeveloper = false;
        }
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

  /**
   * Wire `/auth/{provider}/link` + `/link/callback` for one provider.
   * Both are authenticated (the session must already be a real user).
   * The link strategy's verify callback authenticates the OAuth profile
   * but does NOT mint a session (`session: false`); the callback handler
   * reads the resolved profile and binds it to the *current* user via
   * `Backend.handleProviderLink`, redirecting with a result-coded query
   * param.
   */
  private static setupLinkRoutes(
    app: Express,
    provider: AuthProvider,
    strategyName: string
  ): void {
    const initiate =
      provider === 'twitch'
        ? passport.authenticate(strategyName, {
            scope: TWITCH_IDENTITY_SCOPE,
            session: false,
          })
        : passport.authenticate(strategyName, {
            scope: ['profile', 'email'],
            session: false,
          });

    app.get(`/auth/${provider}/link`, AuthMiddleware.requireAuth, initiate);

    app.get(
      `/auth/${provider}/link/callback`,
      AuthMiddleware.requireAuth,
      // `session: false` so the link OAuth does not replace the current
      // session principal; the resolved profile lands on `req.user`.
      passport.authenticate(strategyName, {
        session: false,
        failureRedirect: `${process.env.CLIENT_URL}/?link=failure`,
      }),
      (req: Request, res: Response) => {
        const session = req.session as unknown as {
          passport?: { user?: { id?: string } };
        };
        const userId = session.passport?.user?.id;
        const profile = req.user as
          | PassportGoogleProfile
          | PassportTwitchProfileWithTokens
          | undefined;
        if (!userId || !profile) {
          res.redirect(`${process.env.CLIENT_URL}/?link=failure`);
          return;
        }

        Backend.get().handleProviderLink(
          provider,
          userId,
          profile,
          (error, result) => {
            if (error || !result) {
              console.error('AuthRoutes: link error:', error);
              res.redirect(`${process.env.CLIENT_URL}/?link=failure`);
              return;
            }
            const code =
              result.status === 'linked'
                ? 'success'
                : result.status === 'already-linked'
                  ? 'already'
                  : 'collision';
            res.redirect(`${process.env.CLIENT_URL}/?link=${code}`);
          }
        );
      }
    );
  }

  /**
   * Wire `POST /auth/{provider}/unlink` for one provider. Behind
   * `requireAuthApi` (JSON 401 if unauthenticated). Clears the FK and
   * deletes the orphaned profile. `only-provider` returns 409 with the
   * invariant message; the others return 200.
   */
  private static setupUnlinkRoute(app: Express, provider: AuthProvider): void {
    app.post(
      `/auth/${provider}/unlink`,
      AuthMiddleware.requireAuthApi,
      (req: Request, res: Response) => {
        const userId = (req.user as { id: string }).id;
        Backend.get().handleProviderUnlink(
          provider,
          userId,
          (error, result) => {
            if (error || !result) {
              console.error('AuthRoutes: unlink error:', error);
              res.status(500).json({ error: 'Unlink failed' });
              return;
            }
            if (result.status === 'only-provider') {
              res
                .status(409)
                .json({ status: result.status, message: result.message });
              return;
            }
            res.status(200).json({ status: result.status });
          }
        );
      }
    );
  }
}
