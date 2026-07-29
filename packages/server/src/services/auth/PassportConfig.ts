/**
 * PassportConfig - Passport.js configuration
 *
 * Configures the provider-parameterized auth spine:
 *   - Google OAuth2 (login + link), gated on `GOOGLE_*` env.
 *   - Twitch OAuth2 (login + link), gated on `TWITCH_*` env. Hand-rolled
 *     on `passport-oauth2` (first-tier dep) pointed at Twitch's
 *     endpoints, with the Helix `/users` identity fetch done in the
 *     verify callback — mirrors the `GoogleStrategy` shape rather than
 *     taking a lightly-maintained `passport-twitch-*` wrapper.
 *   - Kick OAuth 2.1 (login + link), gated on `KICK_*` env. The Twitch
 *     transcription with `pkce: true` (Kick mandates S256; the installed
 *     `passport-oauth2` supports it natively, session-backed state
 *     store) and the identity fetch against `/public/v1/users` (+ a
 *     best-effort owner-channel fetch for slug/broadcasterUserId).
 *
 * Login strategies mint a session via `Backend.handleProviderAuth`; the
 * `*-link` strategies attach to the *current* user via
 * `Backend.handleProviderLink` and never mint a session. Separate
 * strategy instances (not `passReqToCallback`) keep the two paths
 * cleanly distinct, each with its own callback URL.
 *
 * Session serialization carries `authProvider` beside `id`.
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import type { Backend } from '../../backend/Backend';
import type {
  AuthProvider,
  PassportGoogleProfile,
  PassportTwitchProfile,
  PassportTwitchProfileWithTokens,
  PassportKickProfile,
  PassportKickProfileWithTokens,
} from '@saxonberg/types';

const TWITCH_AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_HELIX_USERS_URL = 'https://api.twitch.tv/helix/users';

const KICK_AUTHORIZE_URL = 'https://id.kick.com/oauth/authorize';
const KICK_TOKEN_URL = 'https://id.kick.com/oauth/token';
const KICK_USERS_URL = 'https://api.kick.com/public/v1/users';
const KICK_CHANNELS_URL = 'https://api.kick.com/public/v1/channels';

/**
 * Minimal identity scope only — `user:read:email` covers the email; the
 * bare token covers `login` / `displayName` via Helix. NO chat scopes
 * (deferred to the relay's incremental re-consent flow per non-goals).
 */
export const TWITCH_IDENTITY_SCOPE = ['user:read:email'];

/**
 * Minimal Kick identity scope — both login and link flows request only
 * `user:read`. The posting scope (`chat:write`) is the deferred phase-2
 * incremental re-consent seam.
 */
export const KICK_IDENTITY_SCOPE = ['user:read'];

/**
 * PassportConfig - Configures Passport authentication.
 */
export class PassportConfig {
  private backend: Backend;

  /**
   * Constructor.
   *
   * @param backend - Backend instance for auth callbacks
   */
  constructor(backend: Backend) {
    this.backend = backend;
  }

  /**
   * The providers whose strategies WILL register on this server — the
   * same env gates `configure*` applies, exposed so `/auth/status` can
   * drive start-screen button enablement and the OAuth routes can
   * guard-and-redirect instead of throwing "Unknown authentication
   * strategy" on an unconfigured provider.
   */
  public static configuredProviders(): AuthProvider[] {
    const out: AuthProvider[] = [];
    if (
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CALLBACK_URL
    ) {
      out.push('google');
    }
    if (
      process.env.TWITCH_CLIENT_ID &&
      process.env.TWITCH_CLIENT_SECRET &&
      process.env.TWITCH_CALLBACK_URL
    ) {
      out.push('twitch');
    }
    if (
      process.env.KICK_CLIENT_ID &&
      process.env.KICK_CLIENT_SECRET &&
      process.env.KICK_CALLBACK_URL
    ) {
      out.push('kick');
    }
    return out;
  }

  /**
   * Configure Passport strategies and session serialization.
   */
  public configure(): void {
    // Serialize user: store { id, authProvider } in session. The
    // authProvider records which provider *this* session logged in
    // through (reserved for downstream name-refraction).
    passport.serializeUser((user, done) => {
      const u = user as { id: string; authProvider?: AuthProvider };
      done(null, { id: u.id, authProvider: u.authProvider });
    });

    // Deserialize user: retrieve { id, authProvider } from session.
    passport.deserializeUser((obj, done) => {
      done(null, obj as Express.User);
    });

    this.configureGoogle();
    this.configureTwitch();
    this.configureKick();
  }

  /**
   * Google OAuth2 (login + link). Registered whenever `GOOGLE_*` is
   * present — independent of AUTH_MODE. CI / e2e run without those vars,
   * so the strategy is skipped there (the test-auth seam handles login).
   */
  private configureGoogle(): void {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL = process.env.GOOGLE_CALLBACK_URL;

    if (!clientID || !clientSecret || !callbackURL) {
      console.warn(
        'PassportConfig: GOOGLE_* not configured — Google OAuth strategy ' +
          'skipped (login via the test-auth seam if AUTH_MODE=test).'
      );
      return;
    }

    // Login strategy → mints a session.
    passport.use(
      'google',
      new GoogleStrategy(
        // state: true → CSRF protection (session-stored nonce) on the
        // OAuth round-trip; guards login + account-linking.
        { clientID, clientSecret, callbackURL, state: true },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: PassportGoogleProfile,
          done: (error: unknown, user?: { id: string }) => void
        ) => {
          await this.backend.handleProviderAuth('google', profile, done);
        }
      )
    );

    // Link strategy → attaches to the current user (different callback
    // URL). The verify callback resolves only the profile; the route
    // supplies the current user id and calls handleProviderLink.
    const linkCallbackURL = callbackURL.replace(
      '/auth/google/callback',
      '/auth/google/link/callback'
    );
    passport.use(
      'google-link',
      new GoogleStrategy(
        { clientID, clientSecret, callbackURL: linkCallbackURL, state: true },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: PassportGoogleProfile,
          done: (error: unknown, profile?: PassportGoogleProfile) => void
        ) => {
          // Link path: hand the resolved profile back; the route owns
          // the current-user binding.
          done(null, profile);
        }
      )
    );

    console.info('PassportConfig: Configured Google OAuth2 strategies');
  }

  /**
   * Twitch OAuth2 (login + link). Hand-rolled on `passport-oauth2`; the
   * Helix `/users` identity fetch happens in the verify callback.
   * Gated on `TWITCH_*` presence (same skip-if-absent tolerance).
   */
  private configureTwitch(): void {
    const clientID = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const callbackURL = process.env.TWITCH_CALLBACK_URL;

    if (!clientID || !clientSecret || !callbackURL) {
      console.warn(
        'PassportConfig: TWITCH_* not configured — Twitch OAuth strategy ' +
          'skipped.'
      );
      return;
    }

    // Login strategy → mints a session.
    passport.use(
      'twitch',
      new OAuth2Strategy(
        {
          authorizationURL: TWITCH_AUTHORIZE_URL,
          tokenURL: TWITCH_TOKEN_URL,
          clientID,
          clientSecret,
          callbackURL,
          state: true,
        },
        async (
          accessToken: string,
          refreshToken: string,
          params: TwitchTokenParams,
          _profile: unknown,
          done: (
            error: unknown,
            user?: { id: string; authProvider: AuthProvider }
          ) => void
        ) => {
          try {
            const withTokens = await this.buildTwitchProfile(
              accessToken,
              refreshToken,
              params,
              clientID
            );
            await this.backend.handleProviderAuth(
              'twitch',
              withTokens,
              done
            );
          } catch (error) {
            done(error);
          }
        }
      )
    );

    // Link strategy → attaches to the current user (different callback
    // URL). The route owns the current-user binding.
    const linkCallbackURL = callbackURL.replace(
      '/auth/twitch/callback',
      '/auth/twitch/link/callback'
    );
    passport.use(
      'twitch-link',
      new OAuth2Strategy(
        {
          authorizationURL: TWITCH_AUTHORIZE_URL,
          tokenURL: TWITCH_TOKEN_URL,
          clientID,
          clientSecret,
          callbackURL: linkCallbackURL,
          state: true,
        },
        async (
          accessToken: string,
          refreshToken: string,
          params: TwitchTokenParams,
          _profile: unknown,
          done: (
            error: unknown,
            profile?: PassportTwitchProfileWithTokens
          ) => void
        ) => {
          try {
            const withTokens = await this.buildTwitchProfile(
              accessToken,
              refreshToken,
              params,
              clientID
            );
            done(null, withTokens);
          } catch (error) {
            done(error);
          }
        }
      )
    );

    // Re-auth strategy → re-consents the *current* user for an EXPANDED
    // scope set (e.g. adding `user:write:chat`), writing the broadened
    // token back to their existing TwitchProfile. Its own callback URL;
    // the route supplies the (incremental) scope per request and binds the
    // result to the current user via handleProviderLink — the same upsert
    // the link flow uses. `force_verify` makes Twitch always show the
    // consent screen, so the user sees the new permission being granted.
    const reauthCallbackURL = callbackURL.replace(
      '/auth/twitch/callback',
      '/auth/twitch/reauth/callback'
    );
    const reauthStrategy = new OAuth2Strategy(
      {
        authorizationURL: TWITCH_AUTHORIZE_URL,
        tokenURL: TWITCH_TOKEN_URL,
        clientID,
        clientSecret,
        callbackURL: reauthCallbackURL,
        state: true,
      },
      async (
        accessToken: string,
        refreshToken: string,
        params: TwitchTokenParams,
        _profile: unknown,
        done: (
          error: unknown,
          profile?: PassportTwitchProfileWithTokens
        ) => void
      ) => {
        try {
          const withTokens = await this.buildTwitchProfile(
            accessToken,
            refreshToken,
            params,
            clientID
          );
          done(null, withTokens);
        } catch (error) {
          done(error);
        }
      }
    );
    // Twitch-specific authorize param: force a fresh consent screen.
    reauthStrategy.authorizationParams = (): Record<string, string> => ({
      force_verify: 'true',
    });
    passport.use('twitch-reauth', reauthStrategy);

    console.info('PassportConfig: Configured Twitch OAuth2 strategies');
  }

  /**
   * Kick OAuth 2.1 (login + link). The Twitch transcription, with the
   * one mechanical delta: `pkce: true` (Kick mandates S256; requires
   * `state: true`, which the session-backed store provides). Gated on
   * `KICK_*` presence (same skip-if-absent tolerance). No `kick-reauth`
   * this cycle — that's the phase-2 posting seam.
   */
  private configureKick(): void {
    const clientID = process.env.KICK_CLIENT_ID;
    const clientSecret = process.env.KICK_CLIENT_SECRET;
    const callbackURL = process.env.KICK_CALLBACK_URL;

    if (!clientID || !clientSecret || !callbackURL) {
      console.warn(
        'PassportConfig: KICK_* not configured — Kick OAuth strategy ' +
          'skipped.'
      );
      return;
    }

    // Login strategy → mints a session.
    passport.use(
      'kick',
      new OAuth2Strategy(
        {
          authorizationURL: KICK_AUTHORIZE_URL,
          tokenURL: KICK_TOKEN_URL,
          clientID,
          clientSecret,
          callbackURL,
          state: true,
          pkce: true,
        },
        async (
          accessToken: string,
          refreshToken: string,
          params: TwitchTokenParams,
          _profile: unknown,
          done: (
            error: unknown,
            user?: { id: string; authProvider: AuthProvider }
          ) => void
        ) => {
          try {
            const withTokens = await this.buildKickProfile(
              accessToken,
              refreshToken,
              params
            );
            await this.backend.handleProviderAuth('kick', withTokens, done);
          } catch (error) {
            done(error);
          }
        }
      )
    );

    // Link strategy → attaches to the current user (different callback
    // URL). The route owns the current-user binding.
    const linkCallbackURL = callbackURL.replace(
      '/auth/kick/callback',
      '/auth/kick/link/callback'
    );
    passport.use(
      'kick-link',
      new OAuth2Strategy(
        {
          authorizationURL: KICK_AUTHORIZE_URL,
          tokenURL: KICK_TOKEN_URL,
          clientID,
          clientSecret,
          callbackURL: linkCallbackURL,
          state: true,
          pkce: true,
        },
        async (
          accessToken: string,
          refreshToken: string,
          params: TwitchTokenParams,
          _profile: unknown,
          done: (
            error: unknown,
            profile?: PassportKickProfileWithTokens
          ) => void
        ) => {
          try {
            const withTokens = await this.buildKickProfile(
              accessToken,
              refreshToken,
              params
            );
            done(null, withTokens);
          } catch (error) {
            done(error);
          }
        }
      )
    );

    console.info('PassportConfig: Configured Kick OAuth2 strategies');
  }

  /**
   * Fetch the Kick identity (`/public/v1/users`, the token owner) and —
   * best-effort — the owner's channel (`/public/v1/channels`, token-owner
   * form) for `slug` + `broadcasterUserId`, then assemble the
   * profile-plus-tokens the spine persists. A user with no channel gets
   * empty slug/broadcasterUserId (links fine; character-form `tune`
   * rejects `unlinked`). Tokens are never logged.
   */
  private async buildKickProfile(
    accessToken: string,
    refreshToken: string,
    params: TwitchTokenParams
  ): Promise<PassportKickProfileWithTokens> {
    const res = await fetch(KICK_USERS_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(
        `PassportConfig: Kick /public/v1/users failed (${res.status})`
      );
    }
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    const user = json.data?.[0];
    const rawId = user?.user_id ?? user?.id;
    if (
      !user ||
      (typeof rawId !== 'string' && typeof rawId !== 'number')
    ) {
      throw new Error(
        'PassportConfig: Kick /public/v1/users returned no user'
      );
    }

    // Best-effort owner-channel fetch — slug + broadcaster id for the
    // character-form tune / reverse speaker-link. Tolerate failure.
    let slug = '';
    let broadcasterUserId = '';
    try {
      const chRes = await fetch(KICK_CHANNELS_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (chRes.ok) {
        const chJson = (await chRes.json()) as {
          data?: Array<Record<string, unknown>>;
        };
        const ch = chJson.data?.[0];
        if (ch) {
          slug = typeof ch.slug === 'string' ? ch.slug.toLowerCase() : '';
          const bId = ch.broadcaster_user_id;
          broadcasterUserId =
            typeof bId === 'string' || typeof bId === 'number'
              ? String(bId)
              : '';
        }
      }
    } catch {
      // Channel-less accounts (or a transient failure) link fine.
    }

    const identity: PassportKickProfile = {
      id: String(rawId),
      slug,
      displayName: typeof user.name === 'string' ? user.name : '',
      email: typeof user.email === 'string' ? user.email : undefined,
      broadcasterUserId,
      _json: user,
    };

    const expiresIn =
      typeof params.expires_in === 'number' ? params.expires_in : 0;
    const scopes = this.normalizeScopes(params.scope);

    return {
      ...identity,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scopes,
    };
  }

  /**
   * Fetch the Twitch identity from Helix and assemble the
   * profile-plus-tokens the spine persists. `expiresAt` is computed from
   * the token grant's `expires_in`; `scopes` from the granted `scope`.
   */
  private async buildTwitchProfile(
    accessToken: string,
    refreshToken: string,
    params: TwitchTokenParams,
    clientID: string
  ): Promise<PassportTwitchProfileWithTokens> {
    const res = await fetch(TWITCH_HELIX_USERS_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': clientID,
      },
    });
    if (!res.ok) {
      throw new Error(
        `PassportConfig: Twitch Helix /users failed (${res.status})`
      );
    }
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
    };
    const user = json.data?.[0];
    if (!user || typeof user.id !== 'string') {
      throw new Error('PassportConfig: Twitch Helix /users returned no user');
    }

    const identity: PassportTwitchProfile = {
      id: user.id,
      login: typeof user.login === 'string' ? user.login : '',
      displayName:
        typeof user.display_name === 'string' ? user.display_name : '',
      email: typeof user.email === 'string' ? user.email : undefined,
      _json: user,
    };

    const expiresIn =
      typeof params.expires_in === 'number' ? params.expires_in : 0;
    const scopes = this.normalizeScopes(params.scope);

    return {
      ...identity,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scopes,
    };
  }

  /**
   * The Twitch token grant returns `scope` as a space-delimited string
   * or, on some flows, an array. Normalize to a string array.
   */
  private normalizeScopes(scope: unknown): string[] {
    if (Array.isArray(scope)) {
      return scope.filter((s): s is string => typeof s === 'string');
    }
    if (typeof scope === 'string') {
      return scope.split(' ').filter(Boolean);
    }
    return [];
  }
}

/**
 * The extra token-grant parameters `passport-oauth2` passes to the
 * verify callback (Twitch and Kick both return `expires_in` + `scope`
 * here).
 */
interface TwitchTokenParams {
  expires_in?: number;
  scope?: string | string[];
}
