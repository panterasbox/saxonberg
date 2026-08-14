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
  PassportKickProfileWithTokens,
} from '@saxonberg/types';
import { Backend } from '../../backend/Backend';
import { CmsSession } from '../../backend/CmsSession';
import { AccessApi } from '../../mud/api/access';
import { ConnectionApi } from '../../mud/api/connection';
import { AppApi } from '../../mud/api/app';
import { AppSettingKeys } from '../../mud/lib/config/AppSettings';
import { ExecutionContextApi } from '../../mud/api/execution-context';
import type { Stuff } from '../../mud/lib/stuff/Stuff';
import { AuthMiddleware } from './AuthMiddleware';
import {
  PassportConfig,
  TWITCH_IDENTITY_SCOPE,
  KICK_IDENTITY_SCOPE,
} from './PassportConfig';
import { User } from '../../mud/lib/identity/User';
import { TwitchProfile } from '../../mud/lib/identity/TwitchProfile';
import {
  TWITCH_SCOPE_READ_CHAT,
  TWITCH_SCOPE_WRITE_CHAT,
} from '@saxonberg/types';

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
      AuthRoutes.requireConfigured('google', 'auth'),
      passport.authenticate('google', {
        scope: ['profile', 'email'],
      })
    );

    // Google OAuth callback
    app.get(
      '/auth/google/callback',
      AuthRoutes.requireConfigured('google', 'auth'),
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
      AuthRoutes.requireConfigured('twitch', 'auth'),
      passport.authenticate('twitch', {
        scope: TWITCH_IDENTITY_SCOPE,
      })
    );

    // Twitch OAuth callback
    app.get(
      '/auth/twitch/callback',
      AuthRoutes.requireConfigured('twitch', 'auth'),
      passport.authenticate('twitch', {
        failureRedirect: `${process.env.CLIENT_URL}/?auth=failure`,
      }),
      (req: Request, res: Response) => {
        console.info('AuthRoutes: Twitch OAuth callback success');
        res.redirect(`${process.env.CLIENT_URL}/?auth=success`);
      }
    );

    // Initiate Kick OAuth flow (minimal identity scope; PKCE via the
    // strategy). Skip-if-absent tolerance rides the strategy: when
    // KICK_* env is unset the strategy isn't registered and this route
    // 500s only if actually hit.
    app.get(
      '/auth/kick',
      AuthRoutes.requireConfigured('kick', 'auth'),
      passport.authenticate('kick', {
        scope: KICK_IDENTITY_SCOPE,
      })
    );

    // Kick OAuth callback
    app.get(
      '/auth/kick/callback',
      AuthRoutes.requireConfigured('kick', 'auth'),
      passport.authenticate('kick', {
        failureRedirect: `${process.env.CLIENT_URL}/?auth=failure`,
      }),
      (req: Request, res: Response) => {
        console.info('AuthRoutes: Kick OAuth callback success');
        res.redirect(`${process.env.CLIENT_URL}/?auth=success`);
      }
    );

    // ---- Linking (authenticated OAuth round-trips) ------------------

    AuthRoutes.setupLinkRoutes(app, 'google', 'google-link');
    AuthRoutes.setupLinkRoutes(app, 'twitch', 'twitch-link');
    AuthRoutes.setupLinkRoutes(app, 'kick', 'kick-link');

    // ---- Re-auth (authenticated; broaden Twitch chat scopes) --------

    AuthRoutes.setupTwitchReauthRoutes(app);

    // ---- Unlinking (authenticated POST, no OAuth) -------------------

    AuthRoutes.setupUnlinkRoute(app, 'google');
    AuthRoutes.setupUnlinkRoute(app, 'twitch');
    AuthRoutes.setupUnlinkRoute(app, 'kick');

    // Check authentication status
    app.get('/auth/status', async (req: Request, res: Response) => {
      const response: AuthStatusResponse = {
        isAuthenticated: req.isAuthenticated(),
        // Which providers this server registered (env-gated) — drives
        // start-screen button enablement; routes guard independently.
        providers: PassportConfig.configuredProviders(),
      };

      // ⭐ Two facts the front door renders instead of static copy.
      // Both are best-effort: this endpoint is the unauthenticated
      // front door, and it must paint even if the world is still
      // booting or a setting cannot be read.
      try {
        response.online = ConnectionApi.getConnectionCount();
      } catch {
        /* world not up — omit rather than claim zero */
      }
      try {
        const policy = AppApi.setting(AppSettingKeys.worldResetPolicy);
        // ⚠ Absent ⇒ omitted ⇒ the client says nothing about resets.
        // Never default this to a reassuring string.
        if (policy) response.resetPolicy = policy;
      } catch {
        /* same */
      }

      if (req.isAuthenticated() && req.user) {
        const user = req.user as { id: string };
        response.user = {
          id: user.id,
          email: '',
          displayName: '',
        };

        // Non-authoritative wizard-tier hint so the client can hide
        // the CMS launcher. Resolves the session's loaded Avatar through
        // the same bridge the REST CMS routes use; null avatar → false.
        // Gates remain server-side (this flag is UX only).
        try {
          response.isWizard = await CmsSession.runAsSessionPlayer(
            req,
            'auth.status.isWizard',
            // Derive the avatar from context (the bridge stamps it) — the
            // same context-only channel the CMS gates use; no passed actor.
            () =>
              AccessApi.isWizard(
                ExecutionContextApi.getActingAuthor() as Stuff | null
              )
          );
        } catch (err) {
          console.error('AuthRoutes: isWizard resolution failed:', err);
          response.isWizard = false;
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
   * Guard an OAuth route against an UNCONFIGURED provider: when the env
   * gate skipped strategy registration, redirect back to the client with
   * a result code instead of letting passport throw "Unknown
   * authentication strategy" (a 500). UX-level — configured-provider
   * authorization is untouched.
   */
  private static requireConfigured(
    provider: AuthProvider,
    resultParam: 'auth' | 'link'
  ) {
    return (req: Request, res: Response, next: () => void): void => {
      if (PassportConfig.configuredProviders().includes(provider)) {
        next();
        return;
      }
      console.warn(
        `AuthRoutes: /${resultParam} hit for unconfigured provider ` +
          `'${provider}' — redirecting (strategy not registered)`
      );
      res.redirect(
        `${process.env.CLIENT_URL}/?${resultParam}=unavailable`
      );
    };
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
    const scopeFor: Record<AuthProvider, string[]> = {
      google: ['profile', 'email'],
      twitch: TWITCH_IDENTITY_SCOPE,
      kick: KICK_IDENTITY_SCOPE,
    };
    const initiate = passport.authenticate(strategyName, {
      scope: scopeFor[provider],
      session: false,
    });

    app.get(
      `/auth/${provider}/link`,
      AuthRoutes.requireConfigured(provider, 'link'),
      AuthMiddleware.requireAuth,
      initiate
    );

    app.get(
      `/auth/${provider}/link/callback`,
      AuthRoutes.requireConfigured(provider, 'link'),
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
          | PassportKickProfileWithTokens
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
   * Wire the Twitch chat-scope re-consent flow:
   * `GET /auth/twitch/reauth?scope=<allowed>` and its callback. Both
   * authenticated. The initiate handler builds an **incremental** scope
   * set (identity + already-granted + the requested chat scope) so Twitch
   * doesn't drop existing grants, and forces a fresh consent screen (via
   * the strategy's `force_verify`). The callback writes the broadened
   * token back to the user's existing `TwitchProfile` through the same
   * `handleProviderLink` upsert the link flow uses — for a same-user
   * re-consent the result is `already-linked`, which is success here.
   */
  private static setupTwitchReauthRoutes(app: Express): void {
    const allowed = new Set<string>([
      TWITCH_SCOPE_READ_CHAT,
      TWITCH_SCOPE_WRITE_CHAT,
    ]);

    app.get(
      '/auth/twitch/reauth',
      AuthMiddleware.requireAuth,
      (req: Request, res: Response, next: (err?: unknown) => void) => {
        const requested = String(req.query.scope ?? '');
        if (!allowed.has(requested)) {
          res.redirect(`${process.env.CLIENT_URL}/?reauth=invalid`);
          return;
        }
        const userId = (req.user as { id: string }).id;
        // Load the already-granted scopes so the re-consent is additive,
        // not a replace (Twitch grants exactly the requested set).
        void (async () => {
          let granted: string[] = [];
          try {
            const user = await User.findById<User>(userId);
            if (user?.twitchProfileId) {
              const profile = await TwitchProfile.findById<TwitchProfile>(
                user.twitchProfileId
              );
              granted = profile?.scopes ?? [];
            }
          } catch (err) {
            console.error('AuthRoutes: reauth scope preload failed:', err);
          }
          const scope = Array.from(
            new Set([...TWITCH_IDENTITY_SCOPE, ...granted, requested])
          );
          passport.authenticate('twitch-reauth', {
            scope,
            session: false,
          })(req, res, next);
        })();
      }
    );

    app.get(
      '/auth/twitch/reauth/callback',
      AuthMiddleware.requireAuth,
      passport.authenticate('twitch-reauth', {
        session: false,
        failureRedirect: `${process.env.CLIENT_URL}/?reauth=failure`,
      }),
      (req: Request, res: Response) => {
        const session = req.session as unknown as {
          passport?: { user?: { id?: string } };
        };
        const userId = session.passport?.user?.id;
        const profile = req.user as PassportTwitchProfileWithTokens | undefined;
        if (!userId || !profile) {
          res.redirect(`${process.env.CLIENT_URL}/?reauth=failure`);
          return;
        }
        Backend.get().handleProviderLink(
          'twitch',
          userId,
          profile,
          (error, result) => {
            if (error || !result) {
              console.error('AuthRoutes: reauth error:', error);
              res.redirect(`${process.env.CLIENT_URL}/?reauth=failure`);
              return;
            }
            // linked / already-linked both mean the broadened token was
            // written back; only a cross-user collision is a real failure.
            const code = result.status === 'collision' ? 'collision' : 'success';
            res.redirect(`${process.env.CLIENT_URL}/?reauth=${code}`);
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
