/**
 * Channel — persistent chat channel record. Lives in
 * `Collections.Channels`.
 *
 * Two persistent kinds in v1:
 *
 *   - `'player-created'` — owner-managed; membership lives on a
 *     backing managed Group, addressed via `groupRef`. Chat is a
 *     CONSUMER of `GroupApi` here, not a provider: the channel doc
 *     points at its membership source, and audience reads route
 *     through `GroupApi.membersOf(groupRef)`. The same indirection
 *     means a channel can later be backed by an MQL group, a
 *     contacts list, or any future `GroupProvider` source — without
 *     the chat substrate caring.
 *   - `'open-join-standalone'` — open to every player; audience is
 *     computed from per-player subscriptions (PropertiedMixin keys),
 *     not membership. `groupRef` is empty.
 *
 * The third kind, `'ad-hoc'`, lives in `AdHocChannel` (runtime-only,
 * lives in the ChannelCatalogue's in-memory registry), not as a
 * Document. The Channel Document's `kind` field constrains itself to
 * the persistent set.
 *
 * The backing Group is marked with `Group.backingChannel = <channel._id>`
 * so the user-facing `group list` view can filter it out. Disbanding
 * the channel cascade-deletes the backing Group.
 */

import { Document } from '../persistence/Document';
import type { GroupRef } from './GroupProvider';

export type ChannelKind = 'player-created' | 'open-join-standalone';

export class Channel extends Document {
  static collectionName = 'channels';
  static persistentFields = [
    'name',
    'kind',
    'owner',
    'groupRef',
  ];

  /** Human-readable name. Unique-indexed at the collection level. */
  name: string = '';

  /** Channel kind — `'player-created' | 'open-join-standalone'`. */
  kind: ChannelKind = 'player-created';

  /** Player reference of the creator. Empty for engine-seeded standalones. */
  owner: string = '';

  /**
   * Membership source. For `'player-created'`, points at a managed
   * Group (`'managed:<groupId>'`) created alongside this channel. For
   * `'open-join-standalone'`, empty — audience is computed from
   * subscriptions, not membership. Future kinds (guild-backed,
   * zone-scoped) can point at any other `GroupProvider` source via
   * the same field.
   */
  groupRef: GroupRef = '';
}
