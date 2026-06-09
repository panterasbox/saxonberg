/**
 * Channel — persistent chat channel record. Lives in
 * `Collections.Channels`.
 *
 * Two persistent kinds in v1:
 *
 *   - `'player-created'` — owner-managed; membership lives directly
 *     on this document (`memberIds` / `memberRoles`, index-aligned).
 *   - `'open-join-standalone'` — open to every player; allowed =
 *     everyone minus the (future) banlist. Membership lists are
 *     empty by convention.
 *
 * The third kind, `'ad-hoc'`, lives in `AdHocChannel` (runtime-only,
 * lives in the ChannelCatalogue's in-memory registry), not as a
 * Document. The Channel Document's `kind` field constrains itself to
 * the persistent set.
 *
 * Membership belongs HERE, not on a separate Group document. The
 * GroupApi facade still consults chat audience uniformly — via the
 * `ChannelGroupProvider` (source `'channel'`) — but the channel IS
 * the source of truth for its own members. Earlier drafts created
 * a sibling `Group` doc per channel to share the managed-provider
 * code; that produced phantom `channel:<name>` rows in `group list`
 * for what is conceptually the channel's own state, and bought
 * nothing the new provider doesn't.
 */

import { Document } from '../persistence/Document';

export type ChannelKind = 'player-created' | 'open-join-standalone';

/**
 * Member role on a `player-created` channel. Mirrors the same
 * vocabulary that `Group` uses; the v1 chat verbs only mint `owner`
 * but the role field stays in place for forthcoming `chat invite` /
 * `chat role` verbs.
 */
export type ChannelRole = 'owner' | 'admin' | 'member';

export class Channel extends Document {
  static collectionName = 'channels';
  static persistentFields = [
    'name',
    'kind',
    'owner',
    'memberIds',
    'memberRoles',
  ];

  /** Human-readable name. Unique-indexed at the collection level. */
  name: string = '';

  /** Channel kind — `'player-created' | 'open-join-standalone'`. */
  kind: ChannelKind = 'player-created';

  /** Player reference of the creator. Empty for engine-seeded standalones. */
  owner: string = '';

  /**
   * Index-aligned with `memberRoles`. Each entry is a player
   * reference (playerId for an Avatar). Player-created channels
   * mint this with the creator alone; promoted ad-hocs inherit the
   * ad-hoc cohort. Open standalones leave it empty (audience is
   * computed from per-player subscriptions, not membership).
   */
  memberIds: string[] = [];

  /** Index-aligned with `memberIds`. One of `ChannelRole`. */
  memberRoles: ChannelRole[] = [];
}
