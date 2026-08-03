/**
 * The four maintenance reports, and the seeder.
 *
 * Gates acceptance criteria **29** (seed pages exist and render,
 * including a subject-bound one with a live panel), **50** (backlinks,
 * wanted pages and orphans are derivable), **51** (an article whose
 * subject template no longer exists is reported), **65** (that article
 * still renders) and **70** (the wiki stores no per-user read-state and
 * grows no inbox).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WikiRegistry from '../WikiRegistry';
import WikiNamespaceZone from '../WikiNamespaceZone';
import { WikiSeeder } from '../../../backend/WikiSeeder';
import { Idea } from '../../lib/stuff/Idea';
import { AccessApi } from '../../api/access';
import { PlayerApi } from '../../api/player';
import { StuffApi } from '../../api/stuff';
import { ExecutionContextApi } from '../../api/execution-context';
import { ProxyApi } from '../../api/proxy';
import { Template } from '../../lib/stuff/Template';
import { WikiPage } from '../../lib/wiki/WikiPage';
import { Collections } from '../../lib/persistence/Collections';
import { installWikiTestDb, type WikiTestDb } from '../../lib/wiki/__tests__/wiki-test-db';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import { fileURLToPath } from 'url';
import type { Stuff } from '../../lib/stuff/Stuff';

class Principal extends Idea {}

let db: WikiTestDb;
let registry: WikiRegistry;
let actor: Stuff;
let zone: WikiNamespaceZone;

function raw(): WikiRegistry {
  return ProxyApi.unwrap(registry as unknown as Stuff) as unknown as WikiRegistry;
}

async function asActor<T>(fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'wiki.test', async () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  });
}

async function create(
  slug: string,
  body: string,
  extra: Record<string, unknown> = {},
): Promise<WikiPage> {
  return asActor(() => raw().createPage({ slug, body, ...extra } as never));
}

beforeEach(() => {
  vi.restoreAllMocks();
  db = installWikiTestDb();
  db.reset();
  registry = makeStuff(() => new WikiRegistry());
  actor = makeStuff(() => new Principal()) as unknown as Stuff;
  zone = makeStuff(() => new WikiNamespaceZone());
  vi.spyOn(StuffApi, 'singleton').mockResolvedValue(zone as never);
  vi.spyOn(zone, 'lookupField').mockResolvedValue(null);
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(true);
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
  vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the link graph (50)', () => {
  it('extracts [[refs]] from a body, namespaced and deduplicated', () => {
    expect(
      WikiPage.linkRefs('see [[oak]] and [[lore:ordinance]] and [[oak]]', 'main'),
    ).toEqual(['main:oak', 'lore:ordinance']);
  });

  it('honours an explicit label without counting it as a name', () => {
    expect(WikiPage.linkRefs('[[oak|oak wood]]', 'main')).toEqual(['main:oak']);
  });

  it('⚠ ignores refs inside `<code>` — no phantom demand', () => {
    // An author writing ABOUT the syntax would otherwise create demand
    // for a page called `Page`, and it would sit at the top of
    // `wiki wanted` forever.
    expect(
      WikiPage.linkRefs('write <code>[[Page]]</code> to link', 'main'),
    ).toEqual([]);
    expect(WikiPage.linkRefs('<pre>[[Page]]</pre>', 'main')).toEqual([]);
  });

  it('a body with no links yields none', () => {
    expect(WikiPage.linkRefs('plain prose', 'main')).toEqual([]);
  });
});

describe('backlinks — what links here (50)', () => {
  it('finds the pages linking to one', async () => {
    await create('oak', '');
    await create('furniture', 'made of [[oak]]');
    await create('flooring', 'often [[oak]]');
    await create('unrelated', 'nothing here');
    const linkers = await registry.backlinks('main:oak');
    expect(linkers.map((p) => p.getSlug()).sort()).toEqual([
      'flooring',
      'furniture',
    ]);
  });

  it('⭐ follows ALIASES, so a rename orphans nothing', async () => {
    const oak = await create('oak', '');
    await create('furniture', 'made of [[oak]]');
    await asActor(() => raw().movePage(oak, 'oak-wood'));
    // The linking page still says `[[oak]]`, which is now an alias.
    const linkers = await registry.backlinks('main:oak-wood');
    expect(linkers.map((p) => p.getSlug())).toEqual(['furniture']);
  });

  it('reports none rather than failing for an unlinked page', async () => {
    await create('lonely', '');
    expect(await registry.backlinks('main:lonely')).toEqual([]);
  });
});

describe('⭐ wanted pages — the to-do list its readers write (50)', () => {
  it('ranks redlinks by how many pages want them', async () => {
    await create('a', 'see [[mimic]] and [[golem]]');
    await create('b', 'see [[mimic]]');
    await create('c', 'see [[mimic]]');
    const wanted = await registry.wanted();
    expect(wanted[0]).toEqual({ ref: 'main:mimic', demand: 3 });
    expect(wanted[1]).toEqual({ ref: 'main:golem', demand: 1 });
  });

  it('a page that EXISTS is not wanted', async () => {
    await create('oak', '');
    await create('furniture', 'made of [[oak]]');
    expect(await registry.wanted()).toEqual([]);
  });

  it('an ALIAS satisfies the want — the page is reachable by that name', async () => {
    const oak = await create('oak', '');
    await asActor(() => raw().movePage(oak, 'oak-wood'));
    await create('furniture', 'made of [[oak]]');
    expect(await registry.wanted()).toEqual([]);
  });

  it('counts a ref once per page, however many times it appears', async () => {
    await create('a', '[[mimic]] [[mimic]] [[mimic]]');
    expect(await registry.wanted()).toEqual([
      { ref: 'main:mimic', demand: 1 },
    ]);
  });
});

describe('orphans — pages nothing links to (50)', () => {
  it('finds them', async () => {
    await create('hub', 'see [[linked]]');
    await create('linked', '');
    await create('orphan', '');
    const orphans = await registry.orphans();
    expect(orphans.map((p) => p.getSlug()).sort()).toEqual(['hub', 'orphan']);
  });

  it('an alias counts as being linked', async () => {
    const oak = await create('oak', '');
    await asActor(() => raw().movePage(oak, 'oak-wood'));
    await create('hub', 'see [[oak]]');
    const orphans = await registry.orphans();
    expect(orphans.map((p) => p.getSlug())).not.toContain('oak-wood');
  });
});

describe('⚠ dangling subjects (51, 65)', () => {
  it('reports an article whose template is gone', async () => {
    vi.spyOn(Template, 'findByPath').mockResolvedValue(null);
    await create('oak', '', {
      subject: { kind: 'template', ref: '/obj/material/oak' },
    });
    const dangling = await registry.dangling();
    expect(dangling).toHaveLength(1);
    expect(dangling[0]!.ref).toBe('/obj/material/oak');
  });

  it('does NOT report one whose template is there', async () => {
    vi.spyOn(Template, 'findByPath').mockResolvedValue(
      { path: '/obj/material/oak' } as never,
    );
    await create('oak', '', {
      subject: { kind: 'template', ref: '/obj/material/oak' },
    });
    expect(await registry.dangling()).toEqual([]);
  });

  it('ignores a page with no subject', async () => {
    await create('lore-page', '');
    expect(await registry.dangling()).toEqual([]);
  });

  it('⚠ checks only `template` kinds — a mixin has no domain row', async () => {
    // A mixin or command reference is a compilation unit, not a row.
    // Resolving those means loading modules, which is the panel's job
    // at read time and too expensive for a sweep.
    const spy = vi.spyOn(Template, 'findByPath').mockResolvedValue(null);
    await create('combustible', '', {
      subject: { kind: 'mixin', ref: 'CombustibleMixin' },
    });
    expect(await registry.dangling()).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('checks each distinct template only once', async () => {
    const spy = vi.spyOn(Template, 'findByPath').mockResolvedValue(null);
    await create('a', '', { subject: { kind: 'template', ref: '/obj/x' } });
    await create('b', '', { subject: { kind: 'template', ref: '/obj/x' } });
    await registry.dangling();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('the article STILL RENDERS — the prose is the article (65)', async () => {
    vi.spyOn(Template, 'findByPath').mockResolvedValue(null);
    const page = await create('oak', 'Oak is a hardwood.', {
      subject: { kind: 'template', ref: '/obj/material/gone' },
    });
    // Dangling is a report, not a failure state on the page.
    expect(page.getBody()).toContain('hardwood');
    expect((await registry.resolve('oak'))?.page.getSlug()).toBe('oak');
  });
});

describe('⭐ the wiki grows no inbox (70)', () => {
  it('stores no per-user read-state anywhere in its model', async () => {
    // Watching pages is a real requirement and NOT a wiki feature:
    // delivery, batching, digesting and read-state belong to a durable
    // notification substrate that does not exist yet. The wiki emits;
    // it must not accumulate.
    await create('oak', 'body');
    const page = db.all(Collections.Wiki)[0]!;
    const rev = db.all(Collections.WikiRevisions)[0]!;
    for (const key of [...Object.keys(page), ...Object.keys(rev)]) {
      expect(key).not.toMatch(/read|seen|unread|watch|subscrib|inbox|notif/i);
    }
  });

  it('writes to exactly two collections and no third', async () => {
    const page = await create('oak', 'body');
    await asActor(() => raw().editPage(page, 'x'));
    const touched = [...db.rows.keys()].filter((c) => db.all(c).length > 0);
    expect(touched.sort()).toEqual(
      [Collections.Wiki, Collections.WikiRevisions].sort(),
    );
  });
});

describe('the seeder (29)', () => {
  const SEED = fileURLToPath(
    new URL('../../config/wiki-pages.yaml', import.meta.url),
  );

  it('installs the starter pages', async () => {
    const n = await WikiSeeder.run({ seedPath: SEED });
    expect(n).toBeGreaterThanOrEqual(6);
    const slugs = db.all(Collections.Wiki).map((r) => r.slug);
    expect(slugs).toContain('saxonberg');
    expect(slugs).toContain('how-to-write-here');
    expect(slugs).toContain('oak');
  });

  it('⭐ seeds a SUBJECT-BOUND page carrying a live panel (29)', async () => {
    await WikiSeeder.run({ seedPath: SEED });
    const oak = db.all(Collections.Wiki).find((r) => r.slug === 'oak')!;
    expect(oak.subject).toEqual({
      kind: 'template',
      ref: '/obj/material/oak',
    });
    expect(String(oak.body)).toContain('<composition');
  });

  it('seeds a snippet, which is an ordinary page (57)', async () => {
    await WikiSeeder.run({ seedPath: SEED });
    const stub = db
      .all(Collections.Wiki)
      .find((r) => r.namespace === 'snippet' && r.slug === 'stub')!;
    expect(stub).toBeDefined();
    // Parameters with defaults, so an un-parameterised use still reads.
    expect(String(stub.body)).toContain('{{{why|');
  });

  it('gives every seeded page a first revision', async () => {
    // Otherwise a seeded page would be the one page whose first state
    // was unrecoverable.
    await WikiSeeder.run({ seedPath: SEED });
    const pages = db.all(Collections.Wiki).length;
    expect(db.all(Collections.WikiRevisions)).toHaveLength(pages);
    expect(db.all(Collections.WikiRevisions)[0]!.author).toBe('system');
  });

  it('mints anchors, so seeded sections are citable immediately', async () => {
    await WikiSeeder.run({ seedPath: SEED });
    const guide = db
      .all(Collections.Wiki)
      .find((r) => r.slug === 'how-to-write-here')!;
    expect(String(guide.body)).toContain('anchor="citing"');
  });

  it('⭐ is INSERT-ONLY — a seeded page somebody edited is never reverted', async () => {
    // A seeder that re-asserted its version each boot would silently
    // revert every edit to a seeded page, on a schedule, with no
    // record of having done it.
    await WikiSeeder.run({ seedPath: SEED });
    const row = db.all(Collections.Wiki).find((r) => r.slug === 'saxonberg')!;
    row.body = 'A PLAYER REWROTE THIS';
    const second = await WikiSeeder.run({ seedPath: SEED });
    expect(second).toBe(0);
    expect(
      db.all(Collections.Wiki).find((r) => r.slug === 'saxonberg')!.body,
    ).toBe('A PLAYER REWROTE THIS');
  });

  it('does not re-create a seeded page somebody RENAMED', async () => {
    await WikiSeeder.run({ seedPath: SEED });
    const row = db.all(Collections.Wiki).find((r) => r.slug === 'oak')!;
    row.slug = 'oak-wood';
    row.aliases = ['oak'];
    const second = await WikiSeeder.run({ seedPath: SEED });
    expect(second).toBe(0);
  });

  it('skips silently when the seed file is absent', async () => {
    expect(await WikiSeeder.run({ seedPath: '/nope/missing.yaml' })).toBe(0);
  });

  it('the seeded pages link to each other — no orphan front door', async () => {
    await WikiSeeder.run({ seedPath: SEED });
    const linkers = await registry.backlinks('guide:how-to-write-here');
    expect(linkers.length).toBeGreaterThan(0);
  });

  it('⚠ every seeded link either resolves or is a DELIBERATE redlink', async () => {
    await WikiSeeder.run({ seedPath: SEED });
    const wanted = await registry.wanted();
    // The one deliberate redlink: the front door invites somebody to
    // write it. A redlink is a better empty page than a stub — it says
    // "somebody wanted this" and turns up in `wiki wanted`, whereas a
    // stub says "this is done" and does not.
    expect(wanted.map((w) => w.ref)).toEqual(['lore:the-ordinance']);
  });
});
