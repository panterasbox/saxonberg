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
import { Collections } from '../persistence/Collections';

export type ChannelKind = 'player-created' | 'open-join-standalone';

/**
 * Chat procedure — the two `chat` surfaces a Subject can light up.
 * Cycle 1 is `'free'`-only; `'ordered'` (recognized-speaker
 * discipline) is the deferred surface (the flag ships, behavior doesn't).
 */
export type ChannelProcedure = 'open' | 'ordered';

/**
 * ⭐⭐ **Whether this channel lets somebody speak without being named.**
 *
 * A real values question about a community, and the one thing in the
 * presentation build a player can actually see change — so it ships with
 * the default that reproduces today exactly.
 *
 * ⚠ It is NOT a disguise. A disguise is a **visual fact** defeated by
 * perception; anonymity is a **declared stance about a message**,
 * independent of what anyone can see. They were one mechanism, which is
 * why *"is a hooded man anonymous on a channel?"* had no answer rather
 * than a wrong one. The answer is **no**: a channel is not looking at
 * you, so a hooded man on a named channel is himself.
 */
export type ChannelAnonymity = 'permitted' | 'forbidden';

export class Channel extends Document {
  static collectionName = Collections.Channels;
  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    kind: { persistent: true },
    subject: { persistent: true },
    procedure: { persistent: true },
    anonymity: { persistent: true },
    archived: { persistent: true },
  };

  /** Human-readable name. Unique-indexed at the collection level. */
  name: string = '';

  /** Channel kind — `'player-created' | 'open-join-standalone'`. */
  kind: ChannelKind = 'player-created';

  /**
   * Whether a poster may withhold their name. See
   * {@link ChannelAnonymity}.
   *
   * ⚠ The default is `permitted` because it is what every channel does
   * today: a plain post on a permitted channel renders the ordinary
   * concise identity, byte-identically. A row minted before this field
   * existed hydrates the default and behaves exactly as it did — no
   * migration.
   */
  anonymity: ChannelAnonymity = 'permitted';

  /** Whether this channel lets a poster withhold their name. */
  permitsAnonymity(): boolean {
    return this.anonymity !== 'forbidden';
  }

  /**
   * The `_id` of the {@link Subject} this channel manifests. Identity +
   * audience (`owner` + `groupRef`) live on the Subject now; this channel
   * is one of its lit chat surfaces. Empty only for legacy / unbound rows.
   */
  subject: string = '';

  /** Which chat surface — `'open'` (cycle 1) or `'ordered'` (deferred). */
  procedure: ChannelProcedure = 'open';

  /**
   * Archived by the content installer (its pack file vanished, or the
   * subject's `channel:` switched off): invisible to the catalogue, never
   * reaped — the history and subscriptions stay (archive-never-reap).
   */
  archived: boolean = false;

  isArchived(): boolean {
    return this.archived;
  }
}
