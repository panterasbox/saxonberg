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
import type { Backend } from '../../backend/Backend.js';
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
    passport.serializeUser((user: any, done) => {
      done(null, { id: user.id });
    });

    // Deserialize user: retrieve { id: userId } from session
    passport.deserializeUser((obj: any, done) => {
      done(null, obj);
    });

    // Google OAuth2 Strategy
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL = process.env.GOOGLE_CALLBACK_URL;

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'PassportConfig: Missing required environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL)'
      );
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
          done: (error: any, user?: any) => void
        ) => {
          // Delegate to Backend for user/player creation
          await this.backend.handleAuthenticationSuccess(profile, done);
        }
      )
    );

    console.log('PassportConfig: Configured Google OAuth2 strategy');
  }
}
