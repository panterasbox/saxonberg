/**
 * The wiki page model — identity, revisions, permissions, names,
 * deletion.
 *
 * Gates acceptance criteria **1–8**, **11**, **19–22**, **61–64**, plus
 * the asserted negative for **7** (no wiki field on any game model).
 *
 * The store is a working in-memory `PersistenceManager` rather than
 * call-assertions (see `wiki-test-db.ts`): what most of these criteria
 * claim is behaviour ACROSS several writes — create then edit then roll
 * back, rename and check both names resolve, delete and check a
 * moderator still sees it — and a call-recording mock proves the
 * registry made calls, not that the wiki works.
 *
 * ⚠ The gate is exercised through `ProxyApi.unwrap`. Every mutator is
 * `FromModule(WikiController)`-gated, which is the point (criterion
 * 20) and also means a test cannot call one through the proxy. The
 * gate itself gets its own assertion below rather than being worked
 * around silently everywhere.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WikiRegistry, { WikiDenied, WikiConflict } from '../WikiRegistry';
import WikiNamespaceZone from '../WikiNamespaceZone';
import { Idea } from '../../lib/stuff/Idea';
import { AccessApi } from '../../api/access';
import { GroupApi } from '../../api/group';
import { PlayerApi } from '../../api/player';
import { StuffApi } from '../../api/stuff';
import { ExecutionContextApi } from '../../api/execution-context';
import { SecurityError } from '../../lib/security/errors';
import { ProxyApi } from '../../api/proxy';
import type { Stuff } from '../../lib/stuff/Stuff';
import { WikiPage } from '../../lib/wiki/WikiPage';
import { WikiRevision } from '../../lib/wiki/WikiRevision';
import { Collections } from '../../lib/persistence/Collections';
import { installWikiTestDb, type WikiTestDb } from '../../lib/wiki/__tests__/wiki-test-db';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';

class Principal extends Idea {}

/**
 * A principal that answers the guest question the way a throwaway
 * Avatar does. `PlayerApi.isAvatarStuff` is mocked per-test, so this
 * only has to supply the one method the check asks for.
 */
class GuestPrincipal extends Idea {
  getIsGuest(): boolean {
    return true;
  }
}

let db: WikiTestDb;
let registry: WikiRegistry;
let actor: Stuff;
let guest: Stuff;
let zone: WikiNamespaceZone;

/**
 * The registry's mutators are gated to `WikiController`. Tests drive
 * the raw target — the gate is asserted separately, once, rather than
 * being defeated invisibly here.
 */
function raw(): WikiRegistry {
  return ProxyApi.unwrap(registry as unknown as Stuff) as unknown as WikiRegistry;
}

/** Run with `actor` as the acting principal (the only way authorship
 *  and authorization are learned). */
async function asActor<T>(fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'wiki.test', async () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  });
}

/** Pin the access ladder: what the actor may do. */
function pinAccess(opts: {
  wizard?: boolean;
  avatar?: boolean;
  editor?: boolean;
  moderator?: boolean;
}): void {
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(opts.wizard ?? false);
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(opts.avatar ?? true);
  vi.spyOn(AccessApi, 'can').mockResolvedValue(opts.editor ?? false);
  vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(
    opts.moderator ?? false,
  );
}

beforeEach(async () => {
  vi.restoreAllMocks();
  db = installWikiTestDb();
  db.reset();
  registry = makeStuff(() => new WikiRegistry());
  actor = makeStuff(() => new Principal()) as unknown as Stuff;
  guest = makeStuff(() => new GuestPrincipal()) as unknown as Stuff;
  zone = makeStuff(() => new WikiNamespaceZone());
  // Namespace zones resolve through `StuffApi.singleton`; every
  // namespace in these tests shares one zone, since which zone it is
  // matters only to `AccessApi`, which is pinned.
  vi.spyOn(StuffApi, 'singleton').mockResolvedValue(
    zone as unknown as Stuff & object,
  );
  vi.spyOn(zone, 'lookupField').mockResolvedValue(null); // → the `anyone` floor
  pinAccess({ avatar: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Create a page as the pinned actor. */
async function create(
  slug: string,
  extra: Parameters<WikiRegistry['createPage']>[0] extends infer T
    ? Partial<T>
    : never = {},
): Promise<WikiPage> {
  return asActor(() => raw().createPage({ slug, ...extra }));
}

describe('the page model (1, 4)', () => {
  it('persists every field the criterion names', async () => {
    const page = await create('oak', {
      title: 'Oak',
      body: 'Hardwood.',
      tags: ['material', 'wood'],
      related: ['pine'],
      spoilerLevel: 1,
      subject: { kind: 'template', ref: '/obj/material/oak' },
    });
    const stored = db.all(Collections.Wiki)[0]!;
    expect(stored.slug).toBe('oak');
    expect(stored.namespace).toBe('main');
    expect(stored.title).toBe('Oak');
    expect(stored.body).toBe('Hardwood.');
    expect(stored.aliases).toEqual([]);
    expect(stored.tags).toEqual(['material', 'wood']);
    expect(stored.spoilerLevel).toBe(1);
    expect(stored.subject).toEqual({
      kind: 'template',
      ref: '/obj/material/oak',
    });
    expect(page.getRev()).toBe(1);
  });

  it('a subject-bound and a free-standing page differ ONLY in subject', async () => {
    const bound = await create('oak', {
      subject: { kind: 'template', ref: '/obj/material/oak' },
    });
    const free = await create('the-ordinance');
    const shape = (p: WikiPage) =>
      Object.keys(p as unknown as Record<string, unknown>).sort();
    expect(shape(bound)).toEqual(shape(free));
    expect(bound.getSubject()).not.toBeNull();
    expect(free.getSubject()).toBeNull();
  });

  it('normalises a name into a slug', async () => {
    const page = await create('The Grand Tour');
    expect(page.getSlug()).toBe('the-grand-tour');
  });

  it('refuses a nameless page', async () => {
    await expect(create('   ')).rejects.toBeInstanceOf(WikiDenied);
  });
});

describe('names: id, slug, aliases (2, 3, 63, 64)', () => {
  it('resolves by slug', async () => {
    await create('oak');
    const hit = await registry.resolve('oak');
    expect(hit?.page.getSlug()).toBe('oak');
    expect(hit?.viaAlias).toBe(false);
  });

  it('resolves by durable id — what a citation names', async () => {
    const page = await create('oak');
    const found = await registry.byId(page._id!);
    expect(found?.getSlug()).toBe('oak');
  });

  it('resolves a bare name in the default namespace', async () => {
    await create('oak');
    expect((await registry.resolve('main:oak'))?.page.getSlug()).toBe('oak');
    expect((await registry.resolve('oak'))?.page.getSlug()).toBe('oak');
  });

  it('a rename keeps BOTH names resolving (3, 64)', async () => {
    const page = await create('oak', { title: 'Oak' });
    await asActor(() => raw().movePage(page, 'oak-wood'));
    const byNew = await registry.resolve('oak-wood');
    const byOld = await registry.resolve('oak');
    expect(byNew?.page._id).toBe(page._id);
    expect(byOld?.page._id).toBe(page._id);
    expect(byOld?.viaAlias).toBe(true);
  });

  it('the set of names only grows — two renames, three names', async () => {
    const page = await create('a');
    await asActor(() => raw().movePage(page, 'b'));
    await asActor(() => raw().movePage(page, 'c'));
    expect([...page.getNames()].sort()).toEqual(['a', 'b', 'c']);
  });

  it('refuses a name another page holds, NAMING the holder (63)', async () => {
    await create('oak', { title: 'Oak' });
    await expect(create('oak')).rejects.toThrow(/Oak/);
    await expect(create('oak')).rejects.toThrow(/main:oak/);
  });

  it('refuses a name held as an ALIAS — one name space (63)', async () => {
    const page = await create('oak');
    await asActor(() => raw().movePage(page, 'oak-wood'));
    // `oak` is now an alias. Claiming it is still refused.
    await expect(create('oak')).rejects.toThrow(/alias/);
  });

  it('the same name in a DIFFERENT namespace is free', async () => {
    await create('oak');
    const other = await create('oak', { namespace: 'lore' });
    expect(other.getHandle()).toBe('lore:oak');
  });

  it('a rename to the page’s own slug is a no-op, not a collision', async () => {
    const page = await create('oak');
    await asActor(() => raw().movePage(page, 'oak'));
    expect(page.getSlug()).toBe('oak');
    expect(page.getAliases()).toEqual([]);
  });
});

describe('subject binding (5, 6)', () => {
  it('a subject may be any template path, live instance or not (5)', async () => {
    const page = await create('mimic', {
      subject: { kind: 'template', ref: '/obj/npc/mimic' },
    });
    // Nothing was instanced, and nothing needed to be.
    expect(page.getSubject()).toEqual({
      kind: 'template',
      ref: '/obj/npc/mimic',
    });
  });

  it('a subject may be a MIXIN — which has no domain row at all', async () => {
    const page = await create('combustible', {
      subject: { kind: 'mixin', ref: 'CombustibleMixin' },
    });
    expect(page.getSubject()?.kind).toBe('mixin');
  });

  it('the reverse lookup is TOTAL — an answer for every subject (6)', async () => {
    await create('oak', {
      subject: { kind: 'template', ref: '/obj/material/oak' },
    });
    expect(
      (await registry.articleFor({ kind: 'template', ref: '/obj/material/oak' }))
        ?.getSlug(),
    ).toBe('oak');
    // Undocumented is `null`, not an absence the caller has to handle
    // differently.
    expect(
      await registry.articleFor({ kind: 'template', ref: '/obj/material/pine' }),
    ).toBeNull();
  });

  it('a deleted article does not answer the reverse lookup', async () => {
    pinAccess({ avatar: true, moderator: true });
    const page = await create('oak', {
      subject: { kind: 'template', ref: '/obj/material/oak' },
    });
    await asActor(() => raw().deletePage(page));
    expect(
      await registry.articleFor({ kind: 'template', ref: '/obj/material/oak' }),
    ).toBeNull();
  });
});

describe('⭐ no game model is touched (7)', () => {
  it('adds NO mixin — `DocumentedMixin` was withdrawn in D7', () => {
    // The asserted negative. Documentability is a property of a
    // TEMPLATE PATH, not something a class opts into: hooking articles
    // to a mixin would have required a live Stuff (a torch nobody lit
    // could not be documented), touched hundreds of classes, and
    // decided in advance which KINDS of thing deserve articles.
    const names = Object.values(Mixins) as string[];
    expect(names).not.toContain('DocumentedMixin');
    expect(names.filter((n) => /wiki|document(ed)?/i.test(n))).toEqual([]);
  });

  it('a page names its subject; the subject knows nothing of the page', async () => {
    const page = await create('oak', {
      subject: { kind: 'template', ref: '/obj/material/oak' },
    });
    // The binding is one-directional by construction — the ONLY
    // storage is this field on this row, in the wiki's own collection.
    expect(page.getSubject()?.ref).toBe('/obj/material/oak');
    expect(db.all(Collections.Domain)).toEqual([]);
  });

  it('the whole page model lives in the wiki’s own collections', async () => {
    await create('oak', {
      subject: { kind: 'template', ref: '/obj/material/oak' },
    });
    const touched = [...db.rows.keys()].filter(
      (c) => db.all(c).length > 0,
    );
    expect(touched.sort()).toEqual(
      [Collections.Wiki, Collections.WikiRevisions].sort(),
    );
  });

  it('Mixins gains nothing at all from this build', () => {
    expect(MixinApi.hasMixin).toBeTypeOf('function');
    expect(Object.values(Mixins)).not.toContain('WikiMixin');
  });
});

describe('revisions (8, 10, 11)', () => {
  it('creation appends a revision with the context-derived author (8)', async () => {
    const page = await create('oak', { body: 'first' });
    const revs = await registry.history(page._id!);
    expect(revs).toHaveLength(1);
    expect(revs[0]!.getKind()).toBe('create');
    expect(revs[0]!.getBody()).toBe('first');
    // The author came from the execution context, not a parameter.
    expect(revs[0]!.getAuthor()).toBe(actor.getIdentityPath() ?? actor.stuffId);
  });

  it('every edit appends, and the whole body is on the row', async () => {
    const page = await create('oak', { body: 'v1' });
    await asActor(() => raw().editPage(page, 'v2'));
    await asActor(() => raw().editPage(page, 'v3'));
    const revs = await registry.history(page._id!);
    expect(revs.map((r) => r.getBody())).toEqual(['v3', 'v2', 'v1']);
  });

  it('history is newest-first (9)', async () => {
    const page = await create('oak', { body: 'v1' });
    await asActor(() => raw().editPage(page, 'v2'));
    const revs = await registry.history(page._id!);
    expect(revs.map((r) => r.getRev())).toEqual([2, 1]);
  });

  it('⭐ every state the page has had is recoverable', async () => {
    // The property criterion 8's "full prior body" phrasing is FOR.
    // Revisions store the RESULTING body (so a draft has somewhere to
    // put its proposed text — A5), and the set of stored bodies is
    // still every state the page has ever been in.
    const page = await create('oak', { body: 'v1' });
    await asActor(() => raw().editPage(page, 'v2'));
    await asActor(() => raw().editPage(page, 'v3'));
    const bodies = (await registry.history(page._id!)).map((r) => r.getBody());
    expect(new Set(bodies)).toEqual(new Set(['v1', 'v2', 'v3']));
  });

  it('rollback restores AND appends — the log stays append-only (10)', async () => {
    const page = await create('oak', { body: 'v1' });
    await asActor(() => raw().editPage(page, 'v2'));
    await asActor(() => raw().rollback(page, 1));
    expect(page.getBody()).toBe('v1');
    const revs = await registry.history(page._id!);
    expect(revs).toHaveLength(3);
    expect(revs[0]!.getKind()).toBe('rollback');
    expect(revs[0]!.getRestoredFrom()).toBe(1);
    // Nothing was removed: rev 2 is still there, so the rollback is
    // itself reversible.
    expect(revs.map((r) => r.getRev())).toEqual([3, 2, 1]);
  });

  it('rolling back to a nonexistent revision refuses', async () => {
    const page = await create('oak');
    await expect(asActor(() => raw().rollback(page, 99))).rejects.toBeInstanceOf(
      WikiDenied,
    );
  });

  it('⭐ reading a page does NOT load its history (11)', async () => {
    const page = await create('oak', { body: 'v1' });
    for (let i = 0; i < 5; i++) {
      await asActor(() => raw().editPage(page, `v${i + 2}`));
    }
    const pm = (await import('../../../backend/PersistenceManager'))
      .PersistenceManager.get();
    const findSpy = vi.mocked(pm.find);
    findSpy.mockClear();
    await registry.resolve('oak');
    // Whatever queries a read issues, none of them is against the
    // revision log. That is the whole reason the log is a separate
    // collection rather than an array on the page.
    const collections = findSpy.mock.calls.map((c) => c[0]);
    expect(collections).not.toContain(Collections.WikiRevisions);
  });

  it('the revision counter is the compare-and-swap token', async () => {
    const page = await create('oak');
    expect(page.getRev()).toBe(1);
    await asActor(() => raw().editPage(page, 'x'));
    expect(page.getRev()).toBe(2);
  });

  it('an edit based on a stale rev is REJECTED, not merged', async () => {
    // Without this, last-write-wins silently destroys work — and the
    // revision log does not save you, because it faithfully records
    // that B overwrote A while A's edit is still gone.
    const page = await create('oak', { body: 'v1' });
    await asActor(() => raw().editPage(page, 'from-A', { baseRev: 1 }));
    await expect(
      asActor(() => raw().editPage(page, 'from-B', { baseRev: 1 })),
    ).rejects.toBeInstanceOf(WikiConflict);
    expect(page.getBody()).toBe('from-A');
  });

  it('the conflict carries both revs, so a client can show a three-way', async () => {
    const page = await create('oak', { body: 'v1' });
    await asActor(() => raw().editPage(page, 'v2', { baseRev: 1 }));
    try {
      await asActor(() => raw().editPage(page, 'v3', { baseRev: 1 }));
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(WikiConflict);
      expect((err as WikiConflict).baseRev).toBe(1);
      expect((err as WikiConflict).currentRev).toBe(2);
    }
  });
});

describe('permissions (19, 20, 21)', () => {
  it('⭐ the mutators are unreachable except through the controller (20)', async () => {
    // Not "the controller is the conventional caller" — the gate
    // refuses everything else. This is the assertion the rest of the
    // suite works around via ProxyApi.unwrap.
    await expect(
      asActor(() => registry.createPage({ slug: 'sneaky' })),
    ).rejects.toBeInstanceOf(SecurityError);
    const page = await create('oak');
    await expect(
      asActor(() => registry.editPage(page, 'x')),
    ).rejects.toBeInstanceOf(SecurityError);
    await expect(
      asActor(() => registry.deletePage(page)),
    ).rejects.toBeInstanceOf(SecurityError);
    await expect(
      asActor(() => registry.purgePage(page)),
    ).rejects.toBeInstanceOf(SecurityError);
  });

  it('reads are NOT gated — the renderer resolves links mid-render', async () => {
    await create('oak');
    // Through the proxy, not the unwrapped target.
    await expect(registry.resolve('oak')).resolves.not.toBeNull();
  });

  it('the open floor admits any signed-in player (19)', async () => {
    pinAccess({ avatar: true, editor: false, moderator: false });
    await expect(create('oak')).resolves.toBeInstanceOf(WikiPage);
  });

  it('the open floor refuses a non-player principal', async () => {
    pinAccess({ avatar: false });
    await expect(create('oak')).rejects.toBeInstanceOf(WikiDenied);
  });

  it('an `editors` namespace admits only that group, NAMING the reason (19)', async () => {
    vi.spyOn(zone, 'lookupField').mockResolvedValue(
      'editors' as unknown as never,
    );
    pinAccess({ avatar: true, editor: false });
    await expect(create('infobox', { namespace: 'snippet' })).rejects.toThrow(
      /only editors/,
    );
    pinAccess({ avatar: true, editor: true });
    await expect(
      create('infobox', { namespace: 'snippet' }),
    ).resolves.toBeInstanceOf(WikiPage);
  });

  it('⭐ narrowing a namespace needs NO code change (21)', async () => {
    // The whole of "a namespace with narrower access is editable only
    // by that group": one FIELD on the namespace zone's seed,
    // inherited through the shipped `Zone.lookupField` walk.
    pinAccess({ avatar: true, editor: false, moderator: false });
    vi.spyOn(zone, 'lookupField').mockResolvedValue(null as never);
    await expect(create('a')).resolves.toBeInstanceOf(WikiPage);
    vi.spyOn(zone, 'lookupField').mockResolvedValue(
      'moderators' as unknown as never,
    );
    await expect(create('b')).rejects.toBeInstanceOf(WikiDenied);
  });

  it('a per-page protection tightens but cannot loosen', async () => {
    vi.spyOn(zone, 'lookupField').mockResolvedValue(
      'editors' as unknown as never,
    );
    pinAccess({ avatar: true, editor: true, moderator: true });
    const page = await create('oak');
    // Try to loosen below the namespace's `editors`.
    await asActor(() => raw().protectPage(page, 'anyone'));
    expect(await registry.protectionFor(page)).toBe('editors');
    // Tightening works.
    await asActor(() => raw().protectPage(page, 'moderators'));
    expect(await registry.protectionFor(page)).toBe('moderators');
  });

  it('a wizard clears every rung', async () => {
    vi.spyOn(zone, 'lookupField').mockResolvedValue(
      'moderators' as unknown as never,
    );
    pinAccess({ wizard: true, avatar: false, editor: false, moderator: false });
    await expect(create('oak')).resolves.toBeInstanceOf(WikiPage);
  });

  it('a namespace with no seeded zone fails CLOSED above the floor', async () => {
    vi.spyOn(StuffApi, 'singleton').mockRejectedValue(new Error('no template'));
    pinAccess({ avatar: true, editor: true, moderator: true });
    const page = await create('oak');
    // `mayEdit` / `mayModerate` read the acting principal from the
    // execution context exactly as the mutators do, so they are asked
    // from inside a frame. Outside one there is no principal and
    // everything refuses — which is its own (correct) answer.
    expect(await asActor(() => registry.mayEdit(page))).toBe(true);
    // …but the moderator rung, which needs the zone, refuses.
    expect(await asActor(() => registry.mayModerate('main'))).toBe(false);
  });

  describe('⚠ a guest may read and may not write', () => {
    /**
     * The objection is to the IDENTITY, not the permission. Open
     * editing is safe here because undoing is cheap AND an edit is
     * attributable to somebody still around afterwards; a guest's
     * identity evaporates at disconnect, so admitting one removes the
     * thing that makes the openness safe rather than loosening it.
     */
    async function asGuest<T>(fn: () => Promise<T>): Promise<T> {
      return ExecutionContextApi.runRoot(null, 'wiki.test', async () => {
        ExecutionContextApi.tagActingAuthor(guest);
        return fn();
      });
    }

    it('refuses a create, naming the way out rather than a rung', async () => {
      pinAccess({ avatar: true });
      await expect(
        asGuest(() => raw().createPage({ slug: 'graffiti' })),
      ).rejects.toThrow(/read-only for guests/);
    });

    it('refuses an edit to an existing page', async () => {
      pinAccess({ avatar: true });
      const page = await create('oak');
      await expect(asGuest(() => raw().editPage(page, 'x'))).rejects.toThrow(
        /read-only for guests/,
      );
      expect(page.getRev()).toBe(1);
    });

    it('⭐ refuses BENEATH every rung — a guest wizard is still a guest', async () => {
      // Checked before the ladder, wizard rung included, because no
      // amount of permission makes an unattributable edit attributable.
      pinAccess({ wizard: true, avatar: true, editor: true, moderator: true });
      await expect(
        asGuest(() => raw().createPage({ slug: 'graffiti' })),
      ).rejects.toThrow(/read-only for guests/);
      expect(await asGuest(() => registry.mayModerate('main'))).toBe(false);
    });

    it('answers `mayEdit` false, so no client draws the affordance', async () => {
      pinAccess({ avatar: true });
      const page = await create('oak');
      expect(await asGuest(() => registry.mayEdit(page))).toBe(false);
    });

    it('⭐ READING is untouched', async () => {
      // A wiki nobody can read before signing up cannot recruit its
      // own authors.
      pinAccess({ avatar: true });
      await create('oak', { body: 'A dense hardwood.' });
      const hit = await asGuest(() => registry.resolve('oak'));
      expect(hit?.page.getBody()).toContain('dense hardwood');
      expect(await asGuest(() => registry.allPages())).toHaveLength(1);
    });

    it('a signed-in player is unaffected', async () => {
      pinAccess({ avatar: true });
      await expect(create('oak')).resolves.toBeInstanceOf(WikiPage);
    });
  });

  it('an unresolved principal is refused everything', async () => {
    pinAccess({ wizard: true, avatar: true, editor: true, moderator: true });
    await expect(
      ExecutionContextApi.runRoot(null, 'anon', () =>
        raw().createPage({ slug: 'oak' }),
      ),
    ).rejects.toBeInstanceOf(WikiDenied);
  });
});

describe('deletion (61, 62)', () => {
  beforeEach(() => {
    pinAccess({ avatar: true, moderator: true });
  });

  it('delete is soft: readers lose it, moderators keep it (61)', async () => {
    const page = await create('oak');
    await asActor(() => raw().deletePage(page));
    expect(await registry.resolve('oak')).toBeNull();
    expect(
      (await registry.resolve('oak', { includeDeleted: true }))?.page._id,
    ).toBe(page._id);
  });

  it('undelete is clearing a field (61)', async () => {
    const page = await create('oak');
    await asActor(() => raw().deletePage(page));
    await asActor(() => raw().undeletePage(page));
    expect((await registry.resolve('oak'))?.page._id).toBe(page._id);
    expect(page.getDeletedAt()).toBeNull();
  });

  it('delete leaves revisions untouched (61)', async () => {
    const page = await create('oak', { body: 'v1' });
    await asActor(() => raw().editPage(page, 'v2'));
    await asActor(() => raw().deletePage(page));
    expect(await registry.history(page._id!)).toHaveLength(2);
  });

  it('delete is moderator-only', async () => {
    pinAccess({ avatar: true, moderator: false });
    const page = await create('oak');
    await expect(asActor(() => raw().deletePage(page))).rejects.toBeInstanceOf(
      WikiDenied,
    );
  });

  it('⭐ purge removes page AND revisions, and is recorded (62)', async () => {
    const page = await create('oak', { body: 'v1' });
    await asActor(() => raw().editPage(page, 'v2'));
    const pageId = page._id!;
    const removed = await asActor(() => raw().purgePage(page));
    expect(removed).toBe(2);
    expect(await registry.byId(pageId)).toBeNull();
    // The one place "history is sacred" loses — and the act is still
    // accountable: a tombstone naming who purged what, with no body,
    // because the body is what had to go.
    const tomb = db.all(Collections.WikiRevisions);
    expect(tomb).toHaveLength(1);
    expect(tomb[0]!.body).toBe('');
    expect(String(tomb[0]!.summary)).toContain('purged');
    expect(tomb[0]!.author).toBe(actor.getIdentityPath() ?? actor.stuffId);
  });

  it('purge is moderator-only', async () => {
    pinAccess({ avatar: true, moderator: false });
    const page = await create('oak');
    await expect(asActor(() => raw().purgePage(page))).rejects.toBeInstanceOf(
      WikiDenied,
    );
  });
});

describe('WikiPage pure helpers', () => {
  it('normalizeName folds case, collapses whitespace, strips junk', () => {
    expect(WikiPage.normalizeName('  The Grand   Tour! ')).toBe(
      'the-grand-tour',
    );
    expect(WikiPage.normalizeName('snake_case')).toBe('snake-case');
    expect(WikiPage.normalizeName('--edges--')).toBe('edges');
  });

  it('parseRef splits a namespace, defaulting when absent', () => {
    expect(WikiPage.parseRef('lore:ordinance', 'main')).toEqual({
      namespace: 'lore',
      name: 'ordinance',
    });
    expect(WikiPage.parseRef('oak', 'main')).toEqual({
      namespace: 'main',
      name: 'oak',
    });
  });

  it('strictest picks the tighter protection either way round', () => {
    expect(WikiPage.strictest('anyone', 'moderators')).toBe('moderators');
    expect(WikiPage.strictest('moderators', 'anyone')).toBe('moderators');
    expect(WikiPage.strictest('editors', 'anyone')).toBe('editors');
  });

  it('zonePathFor is the /wiki branch', () => {
    expect(WikiPage.zonePathFor('main')).toBe('/wiki/main');
  });
});

describe('WikiNamespaceZone', () => {
  it('refuses an unknown protection value naming the vocabulary', () => {
    const z = makeStuff(() => new WikiNamespaceZone());
    expect(() => z.setProtection('everyone')).toThrow(/anyone, editors/);
  });

  it('accepts the three levels and null', () => {
    const z = makeStuff(() => new WikiNamespaceZone());
    z.setProtection('moderators');
    expect(z.getProtection()).toBe('moderators');
    z.setProtection(null);
    expect(z.getProtection()).toBeNull();
  });

  it('falls back to the `anyone` floor when nothing declares one', async () => {
    const z = makeStuff(() => new WikiNamespaceZone());
    vi.spyOn(z, 'lookupField').mockResolvedValue(null as never);
    expect(await z.effectiveProtection()).toBe('anyone');
  });
});

describe('bootstrap', () => {
  it('mints exactly ONE group — moderators are its owner role', async () => {
    const minted: string[] = [];
    const provider = {
      findByName: vi.fn().mockResolvedValue(null),
    };
    vi.spyOn(GroupApi, 'registry').mockResolvedValue({
      managed: () => provider,
    } as never);
    const pm = (await import('../../../backend/PersistenceManager'))
      .PersistenceManager.get();
    vi.mocked(pm.save).mockImplementation(async (_c, doc) => {
      if (typeof doc.name === 'string') minted.push(doc.name);
      return 'gid';
    });
    await raw().postRegister();
    expect(minted).toEqual(['wiki-editors']);
  });

  it('is idempotent — an existing group is left alone', async () => {
    const provider = {
      findByName: vi.fn().mockResolvedValue({ _id: 'g1', name: 'wiki-editors' }),
    };
    vi.spyOn(GroupApi, 'registry').mockResolvedValue({
      managed: () => provider,
    } as never);
    const pm = (await import('../../../backend/PersistenceManager'))
      .PersistenceManager.get();
    const saveSpy = vi.mocked(pm.save);
    saveSpy.mockClear();
    await raw().postRegister();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});

describe('revision queries', () => {
  it('latestPublished skips a trailing draft', async () => {
    const page = await create('oak', { body: 'published' });
    await asActor(() => raw().editPage(page, 'draft', { draft: true }));
    const latest = await WikiRevision.latestPublished(page._id!);
    expect(latest?.getBody()).toBe('published');
  });

  it('a draft does not change what the page serves (37)', async () => {
    const page = await create('oak', { body: 'published' });
    await asActor(() => raw().editPage(page, 'draft', { draft: true }));
    expect(page.getBody()).toBe('published');
    expect((await registry.resolve('oak'))?.page.getBody()).toBe('published');
    // …and the proposed text IS on the log, in the same collection.
    const revs = await registry.history(page._id!);
    expect(revs[0]!.getBody()).toBe('draft');
    expect(revs[0]!.isPublished()).toBe(false);
  });

  it('findRev fetches one revision by number', async () => {
    const page = await create('oak', { body: 'v1' });
    await asActor(() => raw().editPage(page, 'v2'));
    expect((await WikiRevision.findRev(page._id!, 1))?.getBody()).toBe('v1');
  });
});
