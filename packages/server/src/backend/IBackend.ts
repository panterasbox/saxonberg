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

import type { AuthProvider, Envelope } from '@saxonberg/types';
import type { ProviderProfile } from './Application';

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
   * Send a fully-stamped envelope to a specific WebSocket
   * connection. Parallel to {@link sendMessageToSocket}; carries
   * its `frameId` already (stamped per-Interactive by Application).
   */
  sendEnvelopeToSocket(socketId: string, envelope: Envelope): void;

  /**
   * Handle a successful provider authentication (login). Called by a
   * Passport strategy's verify callback after the provider OAuth
   * succeeds; the find-or-create path is parameterized by `provider`.
   *
   * @param provider - which login provider authenticated
   * @param profile - normalized profile (Google) / profile+tokens (Twitch)
   * @param done - Passport callback (principal carries authProvider)
   */
  handleProviderAuth(
    provider: AuthProvider,
    profile: ProviderProfile,
    done: (
      error: unknown,
      user?: { id: string; authProvider: AuthProvider }
    ) => void
  ): Promise<void>;
}
