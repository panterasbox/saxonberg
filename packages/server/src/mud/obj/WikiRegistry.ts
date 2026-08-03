/**
 * WikiRegistry — the wiki's state and mutations, behind one gate.
 *
 * A singleton `Idea` at `/obj/WikiRegistry`, the shipped
 * `AccessRegistry` shape: state has one home (this Stuff), one calling
 * surface (`WikiController`), and one structurally-enforced path
 * between them. Every mutator carries
 * `@CallSecurity(WikiControllerOnly)`, so code that grabs the instance
 * via `StuffApi.findByTemplatePath` gets a reference and a
 * `SecurityError` on the first call (criterion 20).
 *
 * **Not `obj/api/WikiLogic.ts`** — that category is defined as "a
 * *convertible Api's* logic", and the wiki adds no Api by constraint.
 * `obj/<Name>Registry.ts` is the shipped shape for a gated,
 * state-owning singleton that has no Api face.
 *
 * **Not methods on `WikiPage`** — `@CallSecurity` is inert on a
 * `Document` (never proxied), so the gate would silently do nothing.
 *
 * ## Reads are ungated; writes are not
 *
 * The renderer resolves link targets and snippet bodies during a
 * render, and it is not the controller. Making reads gate-free is the
 * same split as `BlueprintCatalogue` being ungated reference data
 * behind a gated `StudioApi` — the *authorization* question is about
 * mutation and about which fragments reach which reader, and the
 * second of those is `WikiRenderer`'s single gate, not this one's.
 *
 * ## The authorization ladder
 *
 * `protection` on the namespace zone, resolved by the shipped
 * `Zone.lookupField` walk (see `WikiNamespaceZone`), with a per-page
 * value taking the **stricter** of the two so a page can be tightened
 * and never loosened.
 *
 * Bootstrap mints exactly **one** group, `wiki-editors`; moderators are
 * its `'owner'`-role members. A second group would need
 * `GroupApi.isMember` in a controller, which the antipatterns table
 * forbids — and the substrate already distinguishes the two roles, so
 * a second group would be inventing a distinction that exists.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { AccessApi } from '../api/access';
import { GroupApi } from '../api/group';
import { StuffApi } from '../api/stuff';
import { PlayerApi } from '../api/player';
import { ExecutionContextApi } from '../api/execution-context';
import { Group } from '../lib/social/Group';
import { TemplatePaths } from '../lib/paths';
import type { Stuff } from '../lib/stuff/Stuff';
import WikiNamespaceZone from './WikiNamespaceZone';
import {
  WikiPage,
  type Protection,
  type WikiSubject,
} from '../lib/wiki/WikiPage';
import { WikiRevision, type RevisionKind } from '../lib/wiki/WikiRevision';
import { Sections } from '../lib/wiki/Section';

const WikiRegistryBase = PostRegistrationMixin(Idea);

/**
 * The one legitimate caller. String form (matching
 * `AccessApi.setWizardMembership`) because `pnpm lint:gates` validates
 * concrete `FromModule` strings against a real module + export — the
 * class form is invisible to that lint, so it would be an unchecked
 * gate.
 */
const WikiControllerOnly = SecurityPolicies.FromModule(
  '/obj/command/system/WikiController',
);

/** The default namespace a bare `[[Oak]]` or `wiki oak` resolves in. */
export const DEFAULT_NAMESPACE = 'main';

/** The namespace reusable markup fragments live in (S1). */
export const SNIPPET_NAMESPACE = 'snippet';

/** The one managed group; moderators are its `'owner'`-role members. */
const EDITORS_GROUP = 'wiki-editors';

/** What a name lookup resolved to, and how. */
export interface PageLookup {
  page: WikiPage;
  /** True when the name matched an alias rather than the current slug. */
  viaAlias: boolean;
}

/** Thrown by a mutator the acting principal is not authorized for. */
export class WikiDenied extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WikiDenied';
  }
}

/**
 * Thrown when a submitted `rev` does not match the page's (A3).
 *
 * Carries both revs and the section (when the edit was section-scoped)
 * so the controller can build the three-way `wiki-edit-conflict` note
 * without re-deriving anything. **No auto-merge**: a wiki edit is
 * prose, and a machine-merged paragraph is worse than an honest
 * conflict.
 */
export class WikiConflict extends Error {
  public readonly baseRev: number;
  public readonly currentRev: number;
  public readonly section: string | undefined;
  constructor(baseRev: number, currentRev: number, section?: string) {
    super(`edit conflict: based on rev ${baseRev}, page is at ${currentRev}`);
    this.name = 'WikiConflict';
    this.baseRev = baseRev;
    this.currentRev = currentRev;
    this.section = section;
  }
}

export default class WikiRegistry extends WikiRegistryBase {
  /** Cached namespace-zone singletons, keyed by namespace. */
  private zoneCache = new Map<string, WikiNamespaceZone | null>();

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.seedEditorsGroup();
  }

  // ── Reads (ungated: the renderer resolves links + snippets) ──

  /**
   * Resolve a page by `namespace:name`, matching the current slug
   * first and then aliases — so a rename never breaks a link or a
   * course citation (criteria 2, 3, 22, 64).
   *
   * Soft-deleted pages are excluded unless `includeDeleted`, which is
   * the moderator read: a deleted page stops resolving for readers and
   * stays visible to the people who can undelete it (criterion 61).
   */
  public async resolve(
    ref: string,
    opts: { includeDeleted?: boolean } = {},
  ): Promise<PageLookup | null> {
    const { namespace, name } = WikiPage.parseRef(ref, DEFAULT_NAMESPACE);
    if (!name) return null;
    const bySlug = await WikiPage.find<WikiPage>({ namespace, slug: name });
    for (const page of bySlug) {
      if (page.isDeleted() && !opts.includeDeleted) continue;
      return { page, viaAlias: false };
    }
    const byAlias = await WikiPage.find<WikiPage>({ namespace, aliases: name });
    for (const page of byAlias) {
      if (page.isDeleted() && !opts.includeDeleted) continue;
      return { page, viaAlias: true };
    }
    return null;
  }

  /** Resolve by durable id — what a citation actually names (D2). */
  public async byId(id: string): Promise<WikiPage | null> {
    return WikiPage.findById<WikiPage>(id);
  }

  /**
   * The reverse lookup: the canonical article for a subject, or null.
   * **Total** — every template path has an answer (criterion 6). At
   * most one canonical article per subject; a second take is an
   * ordinary page that links.
   */
  public async articleFor(subject: WikiSubject): Promise<WikiPage | null> {
    const rows = await WikiPage.find<WikiPage>({
      'subject.kind': subject.kind,
      'subject.ref': subject.ref,
    } as Record<string, unknown>);
    return rows.find((p) => !p.isDeleted()) ?? null;
  }

  /** Every live page (the maintenance reports' input). */
  public async allPages(includeDeleted = false): Promise<WikiPage[]> {
    const rows = await WikiPage.find<WikiPage>({});
    return includeDeleted ? rows : rows.filter((p) => !p.isDeleted());
  }

  /** A page's revisions, newest first (criterion 9). */
  public async history(pageId: string): Promise<WikiRevision[]> {
    return WikiRevision.findForPage(pageId);
  }

  /** One revision by number, or null — the diff and conflict input. */
  public async revisionAt(
    pageId: string,
    rev: number,
  ): Promise<WikiRevision | null> {
    return WikiRevision.findRev(pageId, rev);
  }

  /**
   * The namespace zone a page's access resolves against, or null when
   * the namespace has no seeded zone.
   *
   * Null is not an error: it means the ladder's zone rungs are
   * unreachable, so the capability ceiling stays 0 for a non-wizard
   * and every rung above `anyone` refuses. That is the fail-closed
   * direction for a namespace somebody forgot to seed.
   */
  public async zoneFor(namespace: string): Promise<WikiNamespaceZone | null> {
    const cached = this.zoneCache.get(namespace);
    if (cached !== undefined) return cached;
    let zone: WikiNamespaceZone | null = null;
    try {
      const resolved = await StuffApi.singleton<Stuff>(
        WikiPage.zonePathFor(namespace),
      );
      if (resolved instanceof WikiNamespaceZone) zone = resolved;
    } catch {
      // Missing template, broken class import — treat as no zone and
      // let the ladder fail closed rather than throwing mid-render.
      zone = null;
    }
    this.zoneCache.set(namespace, zone);
    return zone;
  }

  /**
   * The effective protection for a page: the stricter of its
   * namespace's (inherited via `Zone.lookupField`) and its own.
   */
  public async protectionFor(page: WikiPage): Promise<Protection> {
    const zone = await this.zoneFor(page.getNamespace());
    const namespaceLevel = zone ? await zone.effectiveProtection() : 'anyone';
    const own = page.getProtection();
    return own ? WikiPage.strictest(namespaceLevel, own) : namespaceLevel;
  }

  /**
   * Whether the **current** principal may edit `page`. Read as a
   * predicate by the controller before it attempts a mutation, so the
   * refusal can name a reason rather than surfacing a `SecurityError`.
   *
   * The actor comes from the execution context, never a parameter —
   * the same rule as revision authorship, for the same reason.
   */
  public async mayEdit(page: WikiPage): Promise<boolean> {
    return this.satisfies(await this.protectionFor(page), page.getNamespace());
  }

  /** Whether the current principal holds the moderator rung. */
  public async mayModerate(namespace: string): Promise<boolean> {
    return this.satisfies('moderators', namespace);
  }

  // ── Mutations (controller-only) ──

  /**
   * Create a page and its first revision.
   *
   * Refuses a name another page in the namespace already holds,
   * **naming the holder** (criterion 63) — "taken" tells an author
   * nothing they can act on, whereas the holder's title tells them
   * whether they wanted that page all along.
   */
  @CallSecurity(WikiControllerOnly)
  public async createPage(input: {
    namespace?: string;
    slug: string;
    title?: string;
    body?: string;
    subject?: WikiSubject | null;
    tags?: string[];
    related?: string[];
    spoilerLevel?: 0 | 1 | 2 | 3;
    summary?: string;
  }): Promise<WikiPage> {
    const namespace = WikiPage.normalizeName(
      input.namespace ?? DEFAULT_NAMESPACE,
    );
    const slug = WikiPage.normalizeName(input.slug);
    if (!slug) throw new WikiDenied('a page needs a name');
    await this.assertMayEditNamespace(namespace);
    await this.assertNameFree(namespace, slug);

    const author = this.actorKey();
    const page = new WikiPage();
    page.namespace = namespace;
    page.slug = slug;
    page.title = input.title?.trim() || input.slug.trim();
    // Mint anchors for every heading up front, so the very first
    // citation to a section is already durable.
    page.body = Sections.reconcile('', input.body ?? '');
    page.subject = input.subject ?? null;
    page.tags = input.tags ?? [];
    page.related = input.related ?? [];
    page.spoilerLevel = input.spoilerLevel ?? 0;
    page.rev = 1;
    page.createdBy = author;
    page.updatedBy = author;
    await page.save();
    await this.appendRevision(page, 'create', input.summary ?? '', true, null);
    return page;
  }

  /**
   * Apply an edit, appending a revision.
   *
   * `baseRev` is the **compare-and-swap** token. A mismatch throws
   * {@link WikiConflict} rather than merging: a wiki edit is prose, and
   * a machine-merged paragraph is worse than an honest conflict.
   * Passing `undefined` skips the check — which is the seeding and
   * scripted path, not the player one.
   */
  @CallSecurity(WikiControllerOnly)
  public async editPage(
    page: WikiPage,
    body: string,
    opts: {
      baseRev?: number;
      summary?: string;
      draft?: boolean;
      /** Edit only this section's span, leaving the rest byte-identical. */
      section?: string;
    } = {},
  ): Promise<WikiPage> {
    await this.assertMayEdit(page);
    if (opts.baseRev !== undefined && opts.baseRev !== page.getRev()) {
      throw new WikiConflict(opts.baseRev, page.getRev(), opts.section);
    }

    const prior = page.getBody();
    let next: string;
    if (opts.section) {
      // ⭐ A section edit replaces one byte-range and leaves every
      // other byte alone. Two edits to DIFFERENT sections therefore
      // touch disjoint ranges and commute — which is how section
      // editing removes conflicts rather than resolving them
      // (criterion 35).
      const replaced = Sections.replace(prior, opts.section, body);
      if (replaced === null) {
        throw new WikiDenied(
          `no section '${opts.section}' in '${page.getHandle()}'`,
        );
      }
      next = replaced;
    } else {
      next = body;
    }
    // Sticky anchors: carry the prior body's anchors forward so a
    // rewording does not break a citation (criterion 45), and mint one
    // for every heading that still lacks one.
    next = Sections.reconcile(prior, next);

    const published = opts.draft !== true;
    page.rev += 1;
    page.updatedBy = this.actorKey();
    // ⚠ A draft does NOT touch what the page serves (criterion 37).
    // The revision records the proposed text; `page.body` still holds
    // the last published one.
    if (published) page.body = next;
    await page.save();
    await this.appendRevision(
      page,
      'edit',
      opts.summary ?? '',
      published,
      null,
      published ? undefined : next,
    );
    return page;
  }

  /**
   * Restore a revision's body **and append a new revision** — the log
   * stays append-only (criterion 10). Rolling back is an edit; it is
   * recorded as one, marked `rollback` so history reads honestly.
   */
  @CallSecurity(WikiControllerOnly)
  public async rollback(
    page: WikiPage,
    toRev: number,
    summary?: string,
  ): Promise<WikiPage> {
    await this.assertMayEdit(page);
    const target = await WikiRevision.findRev(page._id ?? '', toRev);
    if (!target) throw new WikiDenied(`no revision ${toRev} of this page`);
    page.body = target.getBody();
    page.rev += 1;
    page.updatedBy = this.actorKey();
    await page.save();
    await this.appendRevision(
      page,
      'rollback',
      summary ?? `restored rev ${toRev}`,
      true,
      toRev,
    );
    return page;
  }

  /**
   * Rename: the new slug becomes current and **the old one becomes an
   * alias**, so both names keep resolving (criterion 64) and every link
   * and citation survives (criterion 3).
   */
  @CallSecurity(WikiControllerOnly)
  public async movePage(page: WikiPage, newSlug: string): Promise<WikiPage> {
    await this.assertMayEdit(page);
    const slug = WikiPage.normalizeName(newSlug);
    if (!slug) throw new WikiDenied('a page needs a name');
    if (slug === page.getSlug()) return page;
    await this.assertNameFree(page.getNamespace(), slug, page._id);
    const old = page.getSlug();
    page.slug = slug;
    if (old && !page.aliases.includes(old)) page.aliases.push(old);
    page.updatedBy = this.actorKey();
    await page.save();
    return page;
  }

  /** Soft delete. Revisions are untouched; undelete clears the field. */
  @CallSecurity(WikiControllerOnly)
  public async deletePage(page: WikiPage): Promise<WikiPage> {
    await this.assertMayModerate(page.getNamespace());
    page.deletedAt = Date.now();
    page.deletedBy = this.actorKey();
    await page.save();
    return page;
  }

  /** Undelete — clearing a field, which is the whole point of soft. */
  @CallSecurity(WikiControllerOnly)
  public async undeletePage(page: WikiPage): Promise<WikiPage> {
    await this.assertMayModerate(page.getNamespace());
    page.deletedAt = null;
    page.deletedBy = null;
    await page.save();
    return page;
  }

  /**
   * ⚠ **Purge — the one hard exception**, and the one place "history is
   * sacred" loses.
   *
   * For content that must not exist at all (illegal material, doxxing,
   * a leaked secret), a moderator removes the page *and its revisions*.
   * Pretending otherwise does not protect the log — it just means the
   * only available remedy is somebody with database access doing it by
   * hand, unlogged.
   *
   * Moderator-only, irreversible, and **recorded as an event even
   * though its subject is gone**: a tombstone revision naming who
   * purged what, which is what keeps the act accountable.
   */
  @CallSecurity(WikiControllerOnly)
  public async purgePage(page: WikiPage): Promise<number> {
    await this.assertMayModerate(page.getNamespace());
    const pageId = page._id ?? '';
    const removed = await WikiRevision.deleteForPage(pageId);
    await page.delete();
    // The tombstone. It carries no body — the body is what had to go —
    // and it is why `purge` is auditable rather than merely possible.
    const tomb = new WikiRevision();
    tomb.pageId = pageId;
    tomb.rev = 0;
    tomb.body = '';
    tomb.author = this.actorKey();
    tomb.at = Date.now();
    tomb.kind = 'edit';
    tomb.published = true;
    tomb.summary =
      `purged '${page.getHandle()}' (${removed} revisions removed)`;
    await tomb.save();
    return removed;
  }

  /** Set a per-page protection override. Moderator-only. */
  @CallSecurity(WikiControllerOnly)
  public async protectPage(
    page: WikiPage,
    level: Protection | null,
  ): Promise<WikiPage> {
    await this.assertMayModerate(page.getNamespace());
    page.protection = level;
    page.updatedBy = this.actorKey();
    await page.save();
    return page;
  }

  /** Update frontmatter (title / tags / related / subject / level). */
  @CallSecurity(WikiControllerOnly)
  public async setFrontmatter(
    page: WikiPage,
    patch: {
      title?: string;
      tags?: string[];
      related?: string[];
      subject?: WikiSubject | null;
      spoilerLevel?: 0 | 1 | 2 | 3;
    },
  ): Promise<WikiPage> {
    await this.assertMayEdit(page);
    if (patch.title !== undefined) page.title = patch.title.trim();
    if (patch.tags !== undefined) page.tags = patch.tags;
    if (patch.related !== undefined) page.related = patch.related;
    if (patch.subject !== undefined) page.subject = patch.subject;
    if (patch.spoilerLevel !== undefined) page.spoilerLevel = patch.spoilerLevel;
    page.updatedBy = this.actorKey();
    await page.save();
    return page;
  }

  // ── Private ──

  /**
   * The acting principal's durable identity, **from the execution
   * context**. Authorship a caller can supply is authorship a caller
   * can forge, so there is no parameter to pass.
   */
  private actorKey(): string {
    const actor = this.actor();
    if (actor === null) return 'system';
    return actor.getIdentityPath() ?? actor.stuffId;
  }

  /** The acting principal, or null. */
  private actor(): Stuff | null {
    const raw = ExecutionContextApi.getActingAuthor();
    if (
      typeof raw === 'object' &&
      raw !== null &&
      typeof (raw as { getIdentityPath?: unknown }).getIdentityPath ===
        'function'
    ) {
      return raw as Stuff;
    }
    return null;
  }

  /** Whether the current principal clears `required` in `namespace`. */
  private async satisfies(
    required: Protection,
    namespace: string,
  ): Promise<boolean> {
    const actor = this.actor();
    if (actor === null) return false;
    // A wizard clears every rung — the code-trust axis subsumes content
    // authority, and a wizard could edit the row directly regardless.
    if (await AccessApi.isWizard(actor)) return true;
    if (required === 'anyone') {
      // The open floor: any signed-in player. Not a group, because
      // there is no "all players" group and a parcel has one owner.
      return PlayerApi.isAvatarStuff(actor);
    }
    const zone = await this.zoneFor(namespace);
    if (zone === null) return false;
    const zoneStuff = zone as unknown as Stuff;
    if (required === 'moderators') {
      return AccessApi.canMutateZone(actor, zoneStuff);
    }
    return AccessApi.can(actor, 'edit', zoneStuff);
  }

  private async assertMayEdit(page: WikiPage): Promise<void> {
    if (await this.mayEdit(page)) return;
    const level = await this.protectionFor(page);
    throw new WikiDenied(
      `'${page.getHandle()}' is protected: only ${level} may edit it`,
    );
  }

  private async assertMayEditNamespace(namespace: string): Promise<void> {
    const zone = await this.zoneFor(namespace);
    const level = zone ? await zone.effectiveProtection() : 'anyone';
    if (await this.satisfies(level, namespace)) return;
    throw new WikiDenied(
      `the '${namespace}' namespace is protected: only ${level} may write there`,
    );
  }

  private async assertMayModerate(namespace: string): Promise<void> {
    if (await this.mayModerate(namespace)) return;
    throw new WikiDenied(
      `only moderators of '${namespace}' may do that`,
    );
  }

  /**
   * Refuse a name another page holds, naming the holder. Slugs and
   * aliases share one name space, so both are checked.
   */
  private async assertNameFree(
    namespace: string,
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const hit = await this.resolve(`${namespace}:${name}`, {
      includeDeleted: true,
    });
    if (!hit) return;
    if (exceptId && hit.page._id === exceptId) return;
    throw new WikiDenied(
      `'${name}' is held by '${hit.page.getTitle()}' (${hit.page.getHandle()})` +
        (hit.viaAlias ? ' as an alias' : ''),
    );
  }

  /**
   * Append one revision. `draftBody` overrides the page's body for an
   * unpublished revision — the proposed text lives on the row while the
   * page keeps serving what it served.
   */
  private async appendRevision(
    page: WikiPage,
    kind: RevisionKind,
    summary: string,
    published: boolean,
    restoredFrom: number | null,
    draftBody?: string,
  ): Promise<WikiRevision> {
    const rev = new WikiRevision();
    rev.pageId = page._id ?? '';
    rev.rev = page.getRev();
    rev.body = draftBody ?? page.getBody();
    rev.author = this.actorKey();
    rev.at = Date.now();
    rev.summary = summary;
    rev.kind = kind;
    rev.published = published;
    rev.restoredFrom = restoredFrom;
    await rev.save();
    return rev;
  }

  /**
   * Mint `wiki-editors` if absent — idempotent, the `AccessRegistry`
   * seeding shape. ONE group: moderators are its `'owner'`-role
   * members, because the substrate already distinguishes the roles.
   */
  private async seedEditorsGroup(): Promise<void> {
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    const existing = await provider.findByName(EDITORS_GROUP);
    if (existing) return;
    const g = new Group();
    g.name = EDITORS_GROUP;
    g.owner = 'system';
    await g.save();
  }

  /** Resolve the singleton. */
  public static async instance(): Promise<WikiRegistry> {
    return StuffApi.singleton<WikiRegistry>(TemplatePaths.wikiRegistry);
  }
}
