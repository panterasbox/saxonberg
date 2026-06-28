/**
 * TwitchChannel — a curated relayed Twitch channel (registry record).
 *
 * A `Document` (plain persisted state, NOT a Stuff), one row per channel
 * the relay mirrors. Admin-curated content seeded from
 * `mud/config/twitch.yaml`; multiple rows = multiple simultaneously
 * relayed channels. Addressed by `broadcasterLogin` (or `label`).
 *
 * Persistence: `twitch_channels` collection. Distinct from the
 * `twitch_profiles` collection (per-user OAuth identity).
 */

import { Document } from '../persistence/Document';

export class TwitchChannel extends Document {
  static collectionName = 'twitch_channels';

  static persistentFields = ['broadcasterId', 'broadcasterLogin', 'label'];

  /** Twitch user id of the channel of record (the EventSub condition). */
  broadcasterId: string = '';

  /** Twitch login (lowercased handle) — for display + addressing. */
  broadcasterLogin: string = '';

  /** Optional admin-assigned display label / alias. */
  label: string = '';

  /** Resolve a relayed channel by its (lowercased) Twitch login. */
  public static async findByLogin(
    login: string
  ): Promise<TwitchChannel | null> {
    const results = await this.find({
      broadcasterLogin: login.toLowerCase(),
    });
    return results.length > 0 && results[0] ? results[0] : null;
  }

  public toString(): string {
    return `[TwitchChannel ${this.broadcasterLogin}${
      this.label ? ` (${this.label})` : ''
    }]`;
  }
}
