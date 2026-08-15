/**
 * Board — a persisted long-lived forum venue holding many Threads.
 *
 * A plain `Document` in `Collections.ForumBoards`. Every Board belongs to
 * a {@link Subject} (`subject` = the Subject's `_id`); identity + audience
 * live on the Subject, the Board is one of its lit surfaces (the
 * `popularity-forum` / `argument-forum` manifestation).
 *
 * **Per-board organizer axis.** `organizer` selects ordering + vote
 * semantics: `'open'` (vote-ranked reply tree) or `'ordered'`
 * (typed claim-graph / argument-map — the neutral structural lens, no
 * ranking). Two organizers over one board primitive, not two subsystems.
 *
 * `override` is a designed-in but inert bag for the per-board moderation
 * override layer (bans/pins/mods-beyond-rank) — not built in v1.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
import type { FieldMeta } from '../mixin';

export type BoardOrganizer = 'open' | 'ordered';

export default class Board extends Document {
  static collectionName = Collections.ForumBoards;
  static fieldMeta: FieldMeta = {
    subject: { persistent: true },
    organizer: { persistent: true },
    name: { persistent: true },
    description: { persistent: true },
    override: { persistent: true },
  };

  /** The `_id` of the {@link Subject} this board manifests. */
  subject = '';

  /** Ordering + vote semantics: `'open'` or `'ordered'`. */
  organizer: BoardOrganizer = 'open';

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
