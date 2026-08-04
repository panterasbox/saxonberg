/**
 * Release — one item a publisher has put out.
 *
 * **Not a Document and not a collection row.** A release is a
 * {@link StoredDocument} (`kind: 'release'`) at `<feedPath>/<id>` in the
 * path-addressed tree, and this is the value object over its `data`
 * payload — plain data plus `fromDocument` / `serialize`, the `Money` /
 * `Position` precedent.
 *
 * ## Why the tree and not a collection
 *
 * The sort rule (legal-code-slate): *collections cut across jurisdictions
 * and are queried by system; the tree is place / owner / division of
 * labor — **would you query it across all jurisdictions?*** Press releases
 * fail that cleanly. **You read a publisher's feed.** Nobody queries
 * releases globally — even the front page reads a short enumerated list of
 * publishers, each by prefix. They are owner-scoped content with a place:
 * a municipality's press releases are the municipality's.
 *
 * The retired `bulletins` collection predated the rule and was kept by
 * inertia; a `Bulletin` class standing over a store that no longer existed
 * would have been exactly the half-migration that misleads the next
 * reader, which is why the name went with it.
 *
 * Stored shape (`StoredDocument.data`):
 *   - `releaseId` — the canonical id; `edit` / `retract` address by it.
 *   - `realm` — `ooc` (operator) vs `world` (in-fiction).
 *   - `kind` — the editorial classification.
 *   - `headline` / `body` — MML.
 *   - `author` — the acting author's durable `templatePath` (a stored
 *     identity string, NOT an `AuthoringEvent`: orthogonal to the
 *     provenance ledger, which the write transport appends separately).
 *   - `publishedAt` / `expiresAt` — **epoch-ms numbers, not `Date`**.
 *     `expiresAt === 0` = no expiry.
 *   - `pinned` — sticks to the top of the window (pin cap applied on read).
 *   - `retracted` — **soft delete**: the document stays (archive
 *     truthfulness) but drops out of the live window.
 *
 * The document's `owner` is the **publisher organization**, not the acting
 * author — see the write transport.
 */

import type { StoredDocument } from '../document/StoredDocument';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { RELEASE_REALMS, type ReleaseRealm } from './Publisher';

// The realm vocabulary belongs to the publisher (a release DERIVES its
// realm), but every release consumer needs it — re-exported here so a
// caller has one import site for the release's own shape.
export { RELEASE_REALMS, type ReleaseRealm };

/**
 * The `StoredDocument.kind` discriminator for a release. Named rather
 * than spelled inline because the write transport pins it (a release is
 * the only thing that transport can write) and the warm-window rebuild
 * scans by it.
 */
export const RELEASE_DOCUMENT_KIND = 'release';

/** The editorial classification of a release. */
export type ReleaseKind = 'changelog' | 'decision' | 'event' | 'notice';

/** The blessed kind vocabulary (validation array). */
export const RELEASE_KINDS: readonly ReleaseKind[] = [
  'changelog',
  'decision',
  'event',
  'notice',
];

/** The stored `data` payload of a release document. */
export interface ReleaseData {
  releaseId: string;
  realm: ReleaseRealm;
  kind: ReleaseKind;
  headline: string;
  body: string;
  author: string;
  publishedAt: number;
  expiresAt: number;
  pinned: boolean;
  retracted: boolean;
}

/** Coerce a hydrated value into the kind vocabulary (default `notice`). */
function coerceKind(raw: unknown): ReleaseKind {
  return RELEASE_KINDS.includes(raw as ReleaseKind)
    ? (raw as ReleaseKind)
    : 'notice';
}

/** Coerce a hydrated value into the realm vocabulary (default `ooc`). */
function coerceRealm(raw: unknown): ReleaseRealm {
  return RELEASE_REALMS.includes(raw as ReleaseRealm)
    ? (raw as ReleaseRealm)
    : 'ooc';
}

export class Release {
  private constructor(
    /** The document path this release lives at (`<feedPath>/<id>`). */
    public readonly path: string,
    /** The document's owner — the publisher organization's templatePath. */
    public readonly owner: string,
    private readonly data: ReleaseData,
  ) {}

  /** Build a release from its stored document. */
  public static fromDocument(doc: StoredDocument): Release {
    const raw = doc.getData();
    return new Release(doc.getPath(), doc.getOwner(), {
      releaseId: String(raw.releaseId ?? ''),
      realm: coerceRealm(raw.realm),
      kind: coerceKind(raw.kind),
      headline: String(raw.headline ?? ''),
      body: String(raw.body ?? ''),
      author: String(raw.author ?? ''),
      publishedAt: Number(raw.publishedAt ?? 0),
      expiresAt: Number(raw.expiresAt ?? 0),
      pinned: raw.pinned === true,
      retracted: raw.retracted === true,
    });
  }

  /** Build a release from an already-typed payload at a known path. */
  public static of(path: string, owner: string, data: ReleaseData): Release {
    return new Release(path, owner, { ...data });
  }

  getPath(): string {
    return this.path;
  }
  getOwner(): string {
    return this.owner;
  }
  getReleaseId(): string {
    return this.data.releaseId;
  }
  getRealm(): ReleaseRealm {
    return this.data.realm;
  }
  getKind(): ReleaseKind {
    return this.data.kind;
  }
  getHeadline(): string {
    return this.data.headline;
  }
  getBody(): string {
    return this.data.body;
  }
  getAuthor(): string {
    return this.data.author;
  }
  getPublishedAt(): number {
    return this.data.publishedAt;
  }
  getExpiresAt(): number {
    return this.data.expiresAt;
  }
  isPinned(): boolean {
    return this.data.pinned;
  }
  isRetracted(): boolean {
    return this.data.retracted;
  }

  /** Whether this release has expired as of `now` (epoch-ms). */
  isExpiredAt(now: number): boolean {
    return this.data.expiresAt > 0 && this.data.expiresAt < now;
  }

  /**
   * ⚠ **Is this actually a release?** True iff its owner resolves to a
   * live publisher organization AND it sits under that publisher's own
   * declared feed branch.
   *
   * The document tree is a **shared store**, so `kind: 'release'` is a tag
   * anyone who can write a document can apply. Without this check a
   * document written through the ordinary `DocumentApi.save` path — by
   * whoever owns the covering branch — would ride the ticker as a release,
   * and the publishing check would stop being the only way in. Every read
   * of the release set goes through here, so the write transport's
   * guarantee is *verified* rather than trusted.
   *
   * Fails closed: an owner that is not standing is not a publisher we can
   * vouch for.
   */
  public static publishedByOwner(release: Release): boolean {
    const owner = release.getOwner();
    if (owner.length === 0) return false;
    const organization = StuffApi.findByTemplatePath(owner);
    if (!organization || !MixinApi.isPublisher(organization)) return false;
    const feed = organization.getFeedPath();
    return feed.length > 0 && release.getPath().startsWith(`${feed}/`);
  }

  /** A copy with `patch` applied — the value object stays immutable. */
  public withPatch(patch: Partial<ReleaseData>): Release {
    return new Release(this.path, this.owner, { ...this.data, ...patch });
  }

  /** The plain-data round-trip form — the document's `data` payload. */
  public serialize(): ReleaseData {
    return { ...this.data };
  }
}
