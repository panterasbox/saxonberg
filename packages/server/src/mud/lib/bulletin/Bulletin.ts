/**
 * Bulletin — one entry in the staff→player broadcast feed (the news
 * ticker).
 *
 * NOT a Stuff and NOT a template. A bulletin is **authored reference data**
 * with no lifecycle or behavior beyond answering questions about its own
 * fields. So it follows the `Recipe` / `Emote` precedent: a {@link Document}
 * in the `bulletins` collection, loaded by the {@link BulletinBoard}
 * singleton (the `RecipeCatalogue`↔`Recipe` relationship), minted/edited via
 * `BulletinApi.publish / edit / retract`.
 *
 * Storage shape:
 *   - `bulletinId` — canonical lookup key (the Recipe `recipeId` precedent).
 *     Unique-indexed; `edit` / `retract` address by it.
 *   - `realm` — `ooc` (out-of-character / operator) vs `world` (in-fiction).
 *   - `kind` — `changelog` / `decision` / `event` / `notice`.
 *   - `headline` — the short MML one-liner.
 *   - `body` — the optional long-form MML body.
 *   - `author` — the publisher's durable `templatePath` (a stored identity
 *     string, NOT an `AuthoringEvent` — orthogonal to the provenance ledger).
 *   - `publishedAt` / `expiresAt` — **epoch-ms numbers, not `Date`** (the
 *     `RenownEvent.at`/`realAt` precedent). `expiresAt === 0` = no expiry.
 *   - `pinned` — sticks to the top of the window (pin-cap enforced on read).
 *   - `retracted` — **soft delete**: the row is kept in Mongo (archive
 *     truthfulness) but excluded from the live window.
 *
 * Plain getters (the inter-Stuff methods-only rule); no derivation math.
 */

import { Document } from '../persistence/Document';
import type { FieldMeta } from '../mixin';

/** Which broadcast realm a bulletin belongs to. */
export type BulletinRealm = 'ooc' | 'world';

/** The blessed realm vocabulary (validation array). */
export const BULLETIN_REALMS: readonly BulletinRealm[] = ['ooc', 'world'];

/** The editorial classification of a bulletin. */
export type BulletinKind = 'changelog' | 'decision' | 'event' | 'notice';

/** The blessed kind vocabulary (validation array). */
export const BULLETIN_KINDS: readonly BulletinKind[] = [
  'changelog',
  'decision',
  'event',
  'notice',
];

export class Bulletin extends Document {
  static collectionName = 'bulletins';
  static fieldMeta: FieldMeta = {
    bulletinId: { persistent: true },
    realm: { persistent: true },
    kind: { persistent: true },
    headline: { persistent: true },
    body: { persistent: true },
    author: { persistent: true },
    publishedAt: { persistent: true },
    pinned: { persistent: true },
    expiresAt: { persistent: true },
    retracted: { persistent: true },
  };

  /** Canonical id; unique-indexed at the collection level. */
  bulletinId: string = '';

  /** Which broadcast realm this belongs to (default `ooc`). */
  realm: BulletinRealm = 'ooc';

  /** Editorial classification (default `notice`). */
  kind: BulletinKind = 'notice';

  /** The short MML one-liner. */
  headline: string = '';

  /** The optional long-form MML body. */
  body: string = '';

  /** The publisher's durable `templatePath` (a stored identity string). */
  author: string = '';

  /** Publish time, epoch-ms (set at publish). */
  publishedAt: number = 0;

  /** Expiry time, epoch-ms; `0` = never expires. */
  expiresAt: number = 0;

  /** Whether this sticks to the top of the window. */
  pinned: boolean = false;

  /** Soft-delete flag: kept in Mongo, excluded from the live window. */
  retracted: boolean = false;

  getBulletinId(): string {
    return this.bulletinId;
  }
  getRealm(): BulletinRealm {
    return this.realm;
  }
  getKind(): BulletinKind {
    return this.kind;
  }
  getHeadline(): string {
    return this.headline;
  }
  getBody(): string {
    return this.body;
  }
  getAuthor(): string {
    return this.author;
  }
  getPublishedAt(): number {
    return this.publishedAt;
  }
  getExpiresAt(): number {
    return this.expiresAt;
  }
  isPinned(): boolean {
    return this.pinned;
  }
  isRetracted(): boolean {
    return this.retracted;
  }

  /** Whether this bulletin has expired as of `now` (epoch-ms). */
  isExpiredAt(now: number): boolean {
    return this.expiresAt > 0 && this.expiresAt < now;
  }
}
