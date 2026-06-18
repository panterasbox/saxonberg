/**
 * Board — a persisted long-lived forum venue holding many Threads.
 *
 * A plain `Document` in `Collections.ForumBoards`. Every Board belongs to
 * a {@link Subject} (`subject` = the Subject's `_id`); identity + audience
 * live on the Subject, the Board is one of its lit surfaces (the
 * `popularity-forum` / `argument-forum` manifestation).
 *
 * **Per-board organizer axis.** `organizer` selects ordering + vote
 * semantics: `'popularity'` (vote-ranked reply tree — cycle 1) or
 * `'structure'` (typed claim-graph / argument-map — deferred). The field
 * ships now so the structure organizer is a later *organizer*, not a
 * later *schema migration*.
 *
 * `override` is a designed-in but inert bag for the per-board moderation
 * override layer (bans/pins/mods-beyond-rank) — not built in v1.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../../../backend/PersistenceManager';

export type BoardOrganizer = 'popularity' | 'structure';

export default class Board extends Document {
  static collectionName = Collections.ForumBoards;
  static persistentFields = [
    'subject',
    'organizer',
    'name',
    'description',
    'override',
  ];

  /** The `_id` of the {@link Subject} this board manifests. */
  subject = '';

  /** Ordering + vote semantics. Cycle 1 is always `'popularity'`. */
  organizer: BoardOrganizer = 'popularity';

  /** Display name (mirrors the Subject title). */
  name = '';

  /** Free-text board description. */
  description = '';

  /** Inert moderation-override bag (designed-in, not built in v1). */
  override: Record<string, unknown> = {};

  getSubject(): string {
    return this.subject;
  }

  getOrganizer(): BoardOrganizer {
    return this.organizer;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }
}
