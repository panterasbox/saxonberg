/**
 * ForumEvent — one row of the append-only forum event log
 * (`forum_events`). The `ChronicleEntry` precedent: a plain `Document`,
 * the row IS the event; dumb store, smart consumers.
 *
 * **Dual-write, persist-then-fire.** Every forum mutation in
 * `ForumsLogic` appends exactly one of these rows (`save()` — silent) AND
 * fires a transient {@link ForumEventFired} on `EventApi`, as independent
 * siblings (neither causes the other). The log is the durable
 * audit/archive twin; the live feed is the in-process `EventApi` bus; the
 * CRUD docs stay the queryable truth (not event-sourced).
 *
 * **Append-only** — never mutated or deleted in normal operation (the
 * tamper-evident substrate the deferred structure organizer will need).
 *
 * Every row populates all four dependency keys
 * (`subject`/`board`/`thread`/`entry`) so the Wave 3 forum subscription's
 * dependency index routes correctly even for events that nominally touch
 * one level (a `vote-cast` carries its entry's board + thread so a
 * board-list subscription re-resolves).
 */

import { Document } from '../persistence/Document';
import { Collections } from '../../../backend/PersistenceManager';

export type ForumEventKind =
  | 'post-created'
  | 'reply-created'
  | 'vote-cast'
  | 'thread-promoted'
  | 'thread-locked';

/** The dependency keys + provenance an event carries (shared with the DTO). */
export interface ForumEventPayload {
  /** Subject `_id` (the board's subject). */
  subject: string;
  /** Board `_id`. */
  board: string;
  /** Thread-root entry `_id`. */
  thread: string;
  /** The entry this event is about (`_id`). */
  entry: string;
  kind: ForumEventKind;
  /** Actor player/stuff reference. */
  actor: string;
  /** Wall-clock ms at mint time. */
  at: number;
  /** Open per-kind detail bag. */
  data: Record<string, unknown>;
}

export default class ForumEvent extends Document {
  static collectionName = Collections.ForumEvents;
  static persistentFields = [
    'subject',
    'board',
    'thread',
    'entry',
    'kind',
    'actor',
    'at',
    'data',
  ];

  subject = '';
  board = '';
  thread = '';
  entry = '';
  kind: ForumEventKind = 'post-created';
  actor = '';
  at = 0;
  data: Record<string, unknown> = {};
}

/**
 * ForumEventFired — the transient in-process twin of a `ForumEvent` row.
 * A `BusEvent`-shaped DTO (the `FieldChangedEvent` precedent): it carries
 * the same dependency keys the Wave 3 forum subscription indexes on. Fired
 * on `EventApi` immediately after the durable row lands (persist-then-fire);
 * persists nothing itself.
 */
export class ForumEventFired {
  static readonly KIND = 'forum.eventFired';
  readonly kind = ForumEventFired.KIND;
  constructor(public readonly payload: ForumEventPayload) {}
}
