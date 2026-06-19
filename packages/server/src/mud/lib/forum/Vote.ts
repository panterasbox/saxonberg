/**
 * Vote — one row per `(entry, voter)` in `forum_votes`.
 *
 * A vote is a toggle state per pair ∈ {up, none, down}. Presence of a row
 * = a live up/down; absence (or the row deleted on toggle-to-none) = no
 * vote. A unique compound index on `(entry, voter)` enforces
 * one-account-one-vote per entry.
 *
 * The `Entry` carries a denormalized `up`/`down` aggregate recomputed
 * from these rows on each cast, so the popularity sorts + the live score
 * delta read off the Entry without scanning the vote store.
 *
 * **Discovery-only / flat one-account-one-vote** — never wired to
 * standing / money; trust-weighting deferred.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../../../backend/PersistenceManager';

export type VoteValue = 'up' | 'down';

export default class Vote extends Document {
  static collectionName = Collections.ForumVotes;
  static persistentFields = ['entry', 'voter', 'value'];

  /** The voted-on `Entry` `_id`. */
  entry = '';

  /** Voter player reference. */
  voter = '';

  /** `'up'` or `'down'` (a toggle-to-none deletes the row). */
  value: VoteValue = 'up';
}
