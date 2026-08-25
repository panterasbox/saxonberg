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

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WikiRegistry from '../WikiRegistry';
import WikiNamespaceZone from '../WikiNamespaceZone';
import { PackApi } from '../../api/pack';
import { TemplatePaths } from '../../lib/paths';
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
import { makeStuff, makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
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
  // At the singleton path: the content installer resolves the resident
  // registry by templatePath and submits the wiki-starter pack through it.
  registry = makeStuffAtPath(() => new WikiRegistry(), TemplatePaths.wikiRegistry);
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

  it('⚠ ignores refs inside MARKDOWN code — the stored body’s own form', () => {
    // The guide page documents `[[Oak]]` in backticks. Bodies are
    // markdown, so this is the first thing the extractor meets, and
    // getting it wrong puts a phantom `guide:oak` at the top of
    // `wiki wanted` where it can never be satisfied.
    expect(WikiPage.linkRefs('write `[[Page]]` to link', 'main')).toEqual([]);
    expect(WikiPage.linkRefs('``a `[[Page]]` b``', 'main')).toEqual([]);
    expect(
      WikiPage.linkRefs('```\n[[Page]]\n```\n', 'main'),
    ).toEqual([]);
  });

  it('still extracts a real link next to a documented one', () => {
    expect(WikiPage.linkRefs('`[[Page]]` links to [[oak]]', 'main')).toEqual([
      'main:oak',
    ]);
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

describe('the wiki-starter pack (29)', () => {
  const WIKI_STARTER = fileURLToPath(
    new URL('../../../../../content/wiki-starter/', import.meta.url),
  );
  /** Install the real pack through the installer (the wiki kind: CAS submit as the pack). */
  async function install(): Promise<{ inserted: string[]; updated: string[]; conflicts: string[] }> {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const [r] = await PackApi.install([WIKI_STARTER]);
    expect(r!.failure).toBeNull();
    return r!;
  }

  it('installs the starter pages', async () => {
    const r = await install();
    expect(r.inserted.length).toBeGreaterThanOrEqual(6);
    const slugs = db.all(Collections.Wiki).map((r) => r.slug);
    expect(slugs).toContain('saxonberg');
    expect(slugs).toContain('how-to-write-here');
    expect(slugs).toContain('oak');
  });

  it('⭐ ships a SUBJECT-BOUND page carrying a live panel (29)', async () => {
    // Whether the ref is REAL is `__tests__/wiki-seed-subjects.test.ts`,
    // which checks it against the template tree on disk.
    await install();
    const oak = db.all(Collections.Wiki).find((r) => r.slug === 'oak')!;
    expect(oak.subject).toEqual({
      kind: 'template',
      ref: '/obj/material/wood/oak',
    });
    expect(String(oak.body)).toContain('<composition');
  });

  it('ships a snippet, which is an ordinary page (57)', async () => {
    await install();
    const stub = db
      .all(Collections.Wiki)
      .find((r) => r.namespace === 'snippet' && r.slug === 'stub')!;
    expect(stub).toBeDefined();
    expect(String(stub.body)).toContain('{{{why|');
  });

  it('gives every page a first revision, authored by the PACK', async () => {
    await install();
    const pages = db.all(Collections.Wiki).length;
    expect(db.all(Collections.WikiRevisions)).toHaveLength(pages);
    expect(db.all(Collections.WikiRevisions)[0]!.author).toBe('pack:wiki-starter');
    expect(db.all(Collections.Wiki)[0]!.createdBy).toBe('pack:wiki-starter');
  });

  it('mints anchors, so shipped sections are citable immediately', async () => {
    await install();
    const guide = db
      .all(Collections.Wiki)
      .find((r) => r.slug === 'how-to-write-here')!;
    expect(String(guide.body)).toContain('{#citing}');
  });

  it('⭐ never reverts a page somebody edited — the second boot submits nothing', async () => {
    await install();
    const row = db.all(Collections.Wiki).find((r) => r.slug === 'saxonberg')!;
    row.body = 'A PLAYER REWROTE THIS';
    row.rev = 2;
    const second = await install();
    expect([...second.inserted, ...second.updated, ...second.conflicts]).toEqual([]);
    expect(
      db.all(Collections.Wiki).find((r) => r.slug === 'saxonberg')!.body,
    ).toBe('A PLAYER REWROTE THIS');
  });

  it('does not re-create a page somebody RENAMED (resolves by alias)', async () => {
    await install();
    const row = db.all(Collections.Wiki).find((r) => r.slug === 'oak')!;
    row.slug = 'oak-wood';
    row.aliases = ['oak'];
    const second = await install();
    expect(second.inserted).toEqual([]);
    expect(db.all(Collections.Wiki).filter((r) => r.aliases && (r.aliases as string[]).includes('oak'))).toHaveLength(1);
  });

  it('the shipped pages link to each other — no orphan front door', async () => {
    await install();
    const linkers = await registry.backlinks('guide:how-to-write-here');
    expect(linkers.length).toBeGreaterThan(0);
  });

  it('⚠ every shipped link either resolves or is a DELIBERATE redlink', async () => {
    await install();
    const wanted = await registry.wanted();
    expect(wanted.map((w) => w.ref)).toEqual(['lore:the-ordinance']);
  });
});
