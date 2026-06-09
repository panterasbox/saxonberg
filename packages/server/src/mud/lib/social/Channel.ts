/**
 * Channel — persistent chat channel record. Lives in
 * `Collections.Channels`.
 *
 * Two persistent kinds in v1:
 *
 *   - `'player-created'` — backed by a managed Group whose members
 *     are the channel's audience. Owner = creator.
 *   - `'open-join-standalone'` — open to every player; allowed =
 *     everyone minus the (future) banlist. No backing Group.
 *
 * The third kind, `'ad-hoc'`, lives in `AdHocChannel` (runtime-only,
 * lives in the ChannelCatalogue's in-memory registry), not as a
 * Document. The Channel Document's `kind` field constrains itself to
 * the persistent set.
 */

import { Document } from '../persistence/Document';

export type ChannelKind = 'player-created' | 'open-join-standalone';

export class Channel extends Document {
  static collectionName = 'channels';
  static persistentFields = [
    'name',
    'kind',
    'backingGroupRef',
    'owner',
  ];

  /** Human-readable name. Unique-indexed at the collection level. */
  name: string = '';

  /** Channel kind — `'player-created' | 'open-join-standalone'`. */
  kind: ChannelKind = 'player-created';

  /**
   * GroupRef string of the backing Group, when applicable. Empty for
   * `open-join-standalone` channels (open to everyone). For
   * `player-created` this is `managed:<groupId>` of the channel's
   * audience Group.
   */
  backingGroupRef: string = '';

  /** Player reference of the creator. Empty for engine-seeded standalones. */
  owner: string = '';
}
