/**
 * WikiPage — one article's **current state**. The row IS the page.
 *
 * A `Document` (the `ParcelRecord` / `MediaAsset` precedent), not a
 * `Stuff`: an article is persisted state that is read and dropped, with
 * no lifecycle, no containment and no place in the world. It is also
 * never named by a template's `class:`, so the lib/obj taxonomy leaves
 * it here in `lib/`.
 *
 * ⚠ **Behaviour does not live here.** `@CallSecurity` is inert on a
 * Document — one is constructed with `new` and never passes through
 * `ProxyApi.wrap`, and instance-method gating is enforced by that
 * proxy. So every mutation lives on the gated `WikiRegistry` singleton
 * and every render on `WikiRenderer`; this class holds fields, their
 * per-field invariants, and pure queries.
 *
 * ## Identity is the id; the slug is a label
 *
 * `_id` is what links and course citations resolve to. `slug` is
 * renameable, and a rename appends the old slug to {@link aliases}, so
 * the set of names a page answers to only ever grows. The college
 * slate's rule is that a course **cites and never restates**, which
 * makes a broken citation a broken lesson — so a name is released only
 * by deleting the page that holds it.
 *
 * ## One page model
 *
 * A subject-bound page and a free-standing one differ in exactly one
 * field, {@link subject} (criterion 4). There is no second kind, no
 * subclass, and no marker mixin: documentability is a property of a
 * template path, not something a game class opts into.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
import type { FieldMeta } from '../mixin';
import type { SpoilerLevel } from './render';

/**
 * What kind of thing a page documents. **Open by construction** — a
 * new kind adds a resolver, it does not reinterpret a string.
 *
 * Typed rather than a bare `domain` path because not everything is
 * Stuff. A Template describes Stuff; the things that are *not* Stuff
 * are other Documents and **compilation units** — YAML files,
 * TypeScript modules, and interfaces, which is what a mixin is. The
 * case this design started from (a player understanding a thing's
 * architecture as a consumer and as labour) is a MIXIN, which has no
 * `domain` row at all.
 */
export type SubjectKind = 'template' | 'mixin' | 'command';

/**
 * A page's subject — a kind plus a reference. `null` for lore, a
 * guide, or any page that documents nothing in particular.
 *
 * Each kind answers a genuinely different question:
 *
 * | kind | the panel answers |
 * |---|---|
 * | `template` | *what is this thing made of* |
 * | `mixin` | *what does this capability provide, and **what has it*** |
 * | `command` | *what can I type, and what gates it* |
 */
export interface WikiSubject {
  kind: SubjectKind;
  ref: string;
}

/**
 * Who may edit within a scope. Resolved by the shipped
 * `Zone.lookupField` inheritance walk on the namespace zone, with a
 * per-page value taking the **stricter** of the two — a page can be
 * tightened but never loosened below its namespace.
 *
 *  - `anyone` — any signed-in player. The open floor; community
 *    maintenance is the point, and the revision log plus fast
 *    rollback is the net rather than a submission queue.
 *  - `editors` — members of the namespace's owning group.
 *  - `moderators` — that group's `'owner'`-role members.
 */
export type Protection = 'anyone' | 'editors' | 'moderators';

/** The ladder, strictest last. Index order IS the comparison. */
export const PROTECTION_LADDER: readonly Protection[] = [
  'anyone',
  'editors',
  'moderators',
];

export class WikiPage extends Document {
  static collectionName = Collections.Wiki;
  static fieldMeta: FieldMeta = {
    slug: { persistent: true },
    namespace: { persistent: true },
    title: { persistent: true },
    body: { persistent: true },
    aliases: { persistent: true },
    tags: { persistent: true },
    related: { persistent: true },
    spoilerLevel: { persistent: true },
    subject: { persistent: true },
    protection: { persistent: true },
    rev: { persistent: true },
    createdBy: { persistent: true },
    updatedBy: { persistent: true },
    deletedAt: { persistent: true },
    deletedBy: { persistent: true },
  };

  /** The renameable name within {@link namespace}. Unique with aliases. */
  slug = '';

  /** The access + organisation axis. Anchors to a `WikiNamespaceZone`. */
  namespace = '';

  /** Display title. The slug is the NAME; this is what a reader sees. */
  title = '';

  /** The authored MML source. Never the rendered form — a render is
   *  per-reader and ephemeral; everything durable is over source. */
  body = '';

  /** Names this page also answers to. Grows on rename, never shrinks. */
  aliases: string[] = [];

  /** Cross-cutting, free-form, and carrying **no permission meaning**. */
  tags: string[] = [];

  /** Sibling pages, for navigation. Slugs, resolved at render. */
  related: string[] = [];

  /** The page-default reveal level. Inline tags MAX over it, never under. */
  spoilerLevel: SpoilerLevel = 0;

  /** What this page documents, or null. The ONLY field that differs
   *  between a subject-bound page and a free-standing one. */
  subject: WikiSubject | null = null;

  /** Per-page override. `null` inherits the namespace's. */
  protection: Protection | null = null;

  /**
   * Monotonically increasing edit counter — the **compare-and-swap
   * token**, and a data-model concern rather than a client one.
   *
   * An edit submits the `rev` it was based on and the server rejects a
   * mismatch. Without it, last-write-wins silently destroys work, and
   * revision history does not save you: it faithfully records that B
   * overwrote A, and A's edit is still gone. A history that documents
   * the loss is not a safety net.
   */
  rev = 0;

  /**
   * Durable identity of the creator / last editor (context-derived).
   *
   * `createdAt` / `updatedAt` are NOT declared here — `Document` owns
   * them (as `Date`s, stamped on save), so re-declaring would shadow
   * the base's stamping with a field nothing maintains.
   */
  createdBy = '';
  updatedBy = '';

  /**
   * Soft deletion. The page stops resolving for readers, stays visible
   * to moderators, and undelete is clearing a field.
   *
   * A wiki whose delete is destructive has a revision log that lies:
   * the log exists so no edit is unrecoverable, and hard-deleting the
   * page around it is the one edit that is. The genuine exception is
   * `purge` — moderator-only, irreversible, still recorded as an event
   * even though its subject is gone.
   */
  deletedAt: number | null = null;
  deletedBy: string | null = null;

  getSlug(): string {
    return this.slug;
  }

  getNamespace(): string {
    return this.namespace;
  }

  getTitle(): string {
    return this.title || this.slug;
  }

  getBody(): string {
    return this.body;
  }

  getAliases(): readonly string[] {
    return this.aliases;
  }

  getTags(): readonly string[] {
    return this.tags;
  }

  getRelated(): readonly string[] {
    return this.related;
  }

  getSpoilerLevel(): SpoilerLevel {
    return this.spoilerLevel;
  }

  getSubject(): WikiSubject | null {
    return this.subject;
  }

  getProtection(): Protection | null {
    return this.protection;
  }

  getRev(): number {
    return this.rev;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getCreatedBy(): string {
    return this.createdBy;
  }

  getUpdatedBy(): string {
    return this.updatedBy;
  }

  getDeletedAt(): number | null {
    return this.deletedAt;
  }

  getDeletedBy(): string | null {
    return this.deletedBy;
  }

  /** Whether this page is soft-deleted. */
  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  /** Every name this page answers to — its slug plus its aliases. */
  getNames(): readonly string[] {
    return [this.slug, ...this.aliases];
  }

  /** The `namespace:slug` handle, and the zone path's leaf pair. */
  getHandle(): string {
    return `${this.namespace}:${this.slug}`;
  }

  /** The namespace zone this page's access resolves against. */
  getZonePath(): string {
    return WikiPage.zonePathFor(this.namespace);
  }

  /**
   * Normalise a name for the uniqueness index. Slugs and aliases share
   * ONE name space within a namespace (a name resolves to at most one
   * page), so the comparison has to be the same in both directions:
   * case-folded, whitespace collapsed to hyphens.
   */
  static normalizeName(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9:.-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Split a `namespace:name` reference. A bare name gets the default
   * namespace, so `[[Oak]]` works without authors typing `main:oak`.
   */
  static parseRef(
    raw: string,
    defaultNamespace: string,
  ): { namespace: string; name: string } {
    const trimmed = raw.trim();
    const colon = trimmed.indexOf(':');
    if (colon <= 0) {
      return {
        namespace: defaultNamespace,
        name: WikiPage.normalizeName(trimmed),
      };
    }
    return {
      namespace: WikiPage.normalizeName(trimmed.slice(0, colon)),
      name: WikiPage.normalizeName(trimmed.slice(colon + 1)),
    };
  }

  /** The `FolderZone` template path a namespace's access anchors to. */
  static zonePathFor(namespace: string): string {
    return `/wiki/${namespace}`;
  }

  /**
   * Every `[[Page]]` reference in a body, normalised, deduplicated.
   *
   * The input to all four maintenance reports — backlinks, wanted
   * pages, orphans — which are the reports that keep a wiki from
   * rotting. **Wanted pages in particular are the best authoring
   * to-do list a wiki has**: a redlink is a reader who noticed a gap,
   * and ranking them by how many pages want them is the community
   * telling you what to write next.
   *
   * `<code>`/`<pre>` spans are excluded for the same reason the render
   * stage skips them: an author writing *about* wiki syntax would
   * otherwise create phantom demand for a page called `Page`.
   */
  static linkRefs(body: string, defaultNamespace: string): string[] {
    const withoutCode = body.replace(
      /<(code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi,
      '',
    );
    const refs = new Set<string>();
    const RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = RE.exec(withoutCode)) !== null) {
      const { namespace, name } = WikiPage.parseRef(m[1]!, defaultNamespace);
      if (name) refs.add(`${namespace}:${name}`);
    }
    return [...refs];
  }

  /** The stricter of two protections — a page may tighten, never loosen. */
  static strictest(a: Protection, b: Protection): Protection {
    return PROTECTION_LADDER.indexOf(a) >= PROTECTION_LADDER.indexOf(b) ? a : b;
  }

  /** Whether `s` names a protection level. */
  static isProtection(s: string): s is Protection {
    return (PROTECTION_LADDER as readonly string[]).includes(s);
  }
}
