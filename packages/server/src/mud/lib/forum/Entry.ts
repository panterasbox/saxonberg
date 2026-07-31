/**
 * Entry — a node in a Board's reply tree: a Thread (root) or a Post
 * (child). A plain `Document` in `Collections.ForumEntries`.
 *
 * **Board → Thread → Post.** A **Thread** is a root `Entry` (`parent:
 * null`) — a submission carrying a `title` + `body`. A **Post** is a
 * child `Entry` (`parent` = another entry's `_id`). The `relation` edge
 * is **organizer-scoped**: a `'popularity'` board uses only `'reply'`
 * (the Reddit comment tree); an `'argument'` board uses only the typed
 * claim-graph edges `'supports'` (pro) / `'objects-to'` (con) /
 * `'responds-to'` (neutral question/clarification). The node's *role* in
 * the argument is derived from its edge — there is no separate node-type
 * field. A root Entry (the popularity thread or the argument **spine**)
 * carries no meaningful edge; it is identified by `parent === null`.
 *
 * **Votes.** Every entry (thread roots + posts) is votable; the
 * `up`/`down` denormalized aggregate (populated in Wave 2 from the
 * `forum_votes` store) drives the popularity sorts and updates live via
 * the forum subscription.
 *
 * A promoted Thread carries its own thread-`subject` (a board-scoped
 * thread-subject with its own chat). Plain threads leave it null.
 *
 * `createdAt` is the `Document` base stamp; `editedAt` is null until an
 * edit lands.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';

export type EntryRelation =
  | 'reply'
  | 'supports'
  | 'objects-to'
  | 'responds-to';
export type EntryState = 'active' | 'locked';

export default class Entry extends Document {
  static collectionName = Collections.ForumEntries;
  static persistentFields = [
    'board',
    'parent',
    'relation',
    'author',
    'title',
    'body',
    'editedAt',
    'subject',
    'state',
    'up',
    'down',
  ];

  /** The `_id` of the owning {@link Board}. */
  board = '';

  /** Parent entry `_id`, or null for a root Thread. */
  parent: string | null = null;

  /**
   * Edge kind, organizer-scoped: `'reply'` on a popularity board; one of
   * `'supports'` / `'objects-to'` / `'responds-to'` on an argument board.
   * Meaningless on a root Entry (`parent === null`).
   */
  relation: EntryRelation = 'reply';

  /**
   * Author player reference — the durable id link (playerId for an
   * Avatar; empty for anonymous guests). The display name is resolved
   * FROM this id at read time (live avatar → durable Avatar template),
   * never frozen here, so a rename reflects and the byline can be made
   * viewer-aware later.
   */
  author = '';

  /** Thread title (root entries); empty for posts. */
  title = '';

  /** Body, stored as MML (`Mml.markdownToMml` on the way in). */
  body = '';

  /** Last-edit timestamp, or null. */
  editedAt: Date | null = null;

  /** Promoted thread's thread-subject `_id`, or null. */
  subject: string | null = null;

  /** `'active'` or `'locked'` (no further replies). */
  state: EntryState = 'active';

  /** Denormalized upvote count (Wave 2). */
  up = 0;

  /** Denormalized downvote count (Wave 2). */
  down = 0;

  getBoard(): string {
    return this.board;
  }

  getParent(): string | null {
    return this.parent;
  }

  /** The typed edge to this entry's parent (organizer-scoped). */
  getRelation(): EntryRelation {
    return this.relation;
  }

  /** Last-edit timestamp, or null if never edited. */
  getEditedAt(): Date | null {
    return this.editedAt;
  }

  /** True for a root Thread (no parent). */
  isRoot(): boolean {
    return this.parent === null;
  }

  getAuthor(): string {
    return this.author;
  }

  getTitle(): string {
    return this.title;
  }

  getBody(): string {
    return this.body;
  }

  getState(): EntryState {
    return this.state;
  }

  getSubject(): string | null {
    return this.subject;
  }

  /** Net popularity score (`up − down`). */
  getScore(): number {
    return this.up - this.down;
  }
}
