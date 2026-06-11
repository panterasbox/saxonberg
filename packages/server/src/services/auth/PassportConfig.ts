/**
 * PassportConfig - Passport.js configuration
 *
 * Configures Passport with Google OAuth2 strategy.
 *
 * Responsibilities:
 * - Configure Google OAuth2 strategy
 * - Session serialization/deserialization
 * - Delegate authentication to Backend
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { Backend } from '../../backend/Backend';
import type { PassportGoogleProfile } from '@saxonberg/types';

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
   * Configure Passport with Google OAuth2 strategy and serialization.
   */
  public configure(): void {
    // Serialize user: store { id: userId } in session
    passport.serializeUser((user, done) => {
      done(null, { id: (user as { id: string }).id });
    });

    // Deserialize user: retrieve { id: userId } from session
    passport.deserializeUser((obj, done) => {
      done(null, obj as Express.User);
    });

    // Google OAuth2 Strategy. Registered whenever the GOOGLE_* env is
    // present — independent of AUTH_MODE. CI / e2e run without those
    // vars, so the strategy is skipped there (the test-auth seam handles
    // login); the early skip below is what keeps boot from throwing on a
    // credential-less environment. Local dev with both GOOGLE_* set AND
    // AUTH_MODE=test gets the real Google flow *and* the test seam — they
    // coexist, so the dev-login button never disables OAuth.
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

    passport.use(
      new GoogleStrategy(
        {
          clientID,
          clientSecret,
          callbackURL,
        },
        async (
          accessToken: string,
          refreshToken: string,
          profile: PassportGoogleProfile,
          done: (error: unknown, user?: { id: string }) => void
        ) => {
          // Delegate to Backend for user/player creation
          await this.backend.handleAuthenticationSuccess(profile, done);
        }
      )
    );

    console.info('PassportConfig: Configured Google OAuth2 strategy');
  }
}
