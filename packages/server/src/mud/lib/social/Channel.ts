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
import type { FieldMeta } from '../mixin';

export type ChannelKind = 'player-created' | 'open-join-standalone';

/**
 * Chat procedure — the two `chat` surfaces a Subject can light up.
 * Cycle 1 is `'free'`-only; `'rules-of-order'` (recognized-speaker
 * discipline) is the deferred surface (the flag ships, behavior doesn't).
 */
export type ChannelProcedure = 'free' | 'rules-of-order';

export class Channel extends Document {
  static collectionName = 'channels';
  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    kind: { persistent: true },
    subject: { persistent: true },
    procedure: { persistent: true },
  };

  /** Human-readable name. Unique-indexed at the collection level. */
  name: string = '';

  /** Channel kind — `'player-created' | 'open-join-standalone'`. */
  kind: ChannelKind = 'player-created';

  /**
   * The `_id` of the {@link Subject} this channel manifests. Identity +
   * audience (`owner` + `groupRef`) live on the Subject now; this channel
   * is one of its lit chat surfaces. Empty only for legacy / unbound rows.
   */
  subject: string = '';

  /** Which chat surface — `'free'` (cycle 1) or `'rules-of-order'` (deferred). */
  procedure: ChannelProcedure = 'free';
}
