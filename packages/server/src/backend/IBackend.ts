/**
 * IBackend - Interface for Backend services
 *
 * This interface allows Application to remain agnostic of Backend implementation.
 * The Backend class implements this interface to provide I/O services.
 *
 * Responsibilities:
 * - WebSocket message sending
 * - User authentication callbacks
 */

import type { PassportGoogleProfile } from '@saxonberg/types';

/**
 * Backend interface for Application callbacks.
 */
export interface IBackend {
  /**
   * Send a message to a specific WebSocket connection.
   *
   * @param socketId - The socket ID to send to
   * @param message - The message object to send
   */
  sendMessageToSocket(socketId: string, message: unknown): void;

  /**
   * Handle successful Google authentication.
   * Called by Passport strategy after Google OAuth succeeds.
   *
   * @param profile - Google profile data from Passport
   * @param done - Passport callback
   */
  handleAuthenticationSuccess(
    profile: PassportGoogleProfile,
    done: (error: any, user?: any) => void
  ): Promise<void>;
}
