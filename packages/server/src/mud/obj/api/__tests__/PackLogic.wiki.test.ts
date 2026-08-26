/**
 * The `wiki` kind (content-packs wave 2, D9): submitted through the
 * registry AS the pack. Absent → create at rev 1 (baseline rev 1);
 * unchanged file → nothing; changed file over an unchanged page → an
 * edit with the baseline rev as the CAS token; changed file over a
 * player-edited page → `WikiConflict` → a `wiki-cas` conflict recorded,
 * page untouched, one diagnostic; `pack diff` returns all three bodies;
 * `resolve --take-pack` edits over the CURRENT rev and clears;
 * `--export` writes frontmatter + body; a vanished file keeps the page;
 * a seeder-shaped existing page adopts with `rev` in the baseline; a
 * renamed slug resolves by alias (no duplicate create).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { PackApi } from '../../../api/pack';
import { StuffApi } from '../../../api/stuff';
import { DiagnosticApi } from '../../../api/diagnostics';
import { TemplatePaths } from '../../../lib/paths';
import { WikiConflict } from '../../WikiRegistry';
import {
  stubPersist,
  stubClassResolution,
  quietConsole,
  recordOf,
  writePack,
  cleanupPacks,
} from './pack-harness';

/** An in-memory page with the registry's rev semantics. */
interface FakePage {
  namespace: string;
  slug: string;
  aliases: string[];
  title: string;
  body: string;
  subject: unknown;
  tags: string[];
  related: string[];
  spoilerLevel: number;
  rev: number;
  createdBy: string;
  updatedBy: string;
  getRev(): number;
  getBody(): string;
  getTitle(): string;
  getTags(): string[];
  getRelated(): string[];
  getSubject(): unknown;
  getSpoilerLevel(): number;
}

let pages: FakePage[];
let diag: ReturnType<typeof vi.fn>;

function fakePage(p: Omit<FakePage, 'getRev' | 'getBody' | 'getTitle' | 'getTags' | 'getRelated' | 'getSubject' | 'getSpoilerLevel'>): FakePage {
  return {
    ...p,
    getRev() { return this.rev; },
    getBody() { return this.body; },
    getTitle() { return this.title; },
    getTags() { return this.tags; },
    getRelated() { return this.related; },
    getSubject() { return this.subject; },
    getSpoilerLevel() { return this.spoilerLevel; },
  };
}

const fakeRegistry = {
  async resolve(ref: string) {
    const [namespace, name] = ref.split(':') as [string, string];
    const bySlug = pages.find((p) => p.namespace === namespace && p.slug === name);
    if (bySlug) return { page: bySlug, viaAlias: false };
    const byAlias = pages.find((p) => p.namespace === namespace && p.aliases.includes(name));
    return byAlias ? { page: byAlias, viaAlias: true } : null;
  },
  async createPage(input: Record<string, unknown>) {
    const author = `pack:${String(input.asInstaller)}`;
    const page = fakePage({
      namespace: String(input.namespace ?? 'main'),
      slug: String(input.slug),
      aliases: [],
      title: String(input.title ?? input.slug),
      body: String(input.body ?? ''),
      subject: input.subject ?? null,
      tags: (input.tags as string[]) ?? [],
      related: (input.related as string[]) ?? [],
      spoilerLevel: Number(input.spoilerLevel ?? 0),
      rev: 1,
      createdBy: author,
      updatedBy: author,
    });
    pages.push(page);
    return page;
  },
  async editPage(page: FakePage, body: string, opts: { baseRev?: number; asInstaller?: string; fields?: Record<string, unknown> }) {
    if (opts.baseRev !== undefined && opts.baseRev !== page.rev) throw new WikiConflict(opts.baseRev, page.rev);
    if (opts.fields) {
      if (opts.fields.title !== undefined) page.title = String(opts.fields.title);
      if (opts.fields.tags !== undefined) page.tags = opts.fields.tags as string[];
      if (opts.fields.related !== undefined) page.related = opts.fields.related as string[];
      if (opts.fields.subject !== undefined) page.subject = opts.fields.subject;
      if (opts.fields.spoilerLevel !== undefined) page.spoilerLevel = Number(opts.fields.spoilerLevel);
    }
    page.body = body;
    page.rev += 1;
    page.updatedBy = `pack:${String(opts.asInstaller)}`;
    return page;
  },
};

function writeWikiFile(root: string, ns: string, slug: string, front: Record<string, unknown>, body: string): void {
  const file = join(root, 'content', 'wiki', ns, `${slug}.md`);
  mkdirSync(dirname(file), { recursive: true });
  const fm = Object.entries(front).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
  writeFileSync(file, `---\n${fm}\n---\n${body}`);
}

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
  stubClassResolution();
  quietConsole();
  pages = [];
  diag = vi.spyOn(DiagnosticApi, 'record').mockResolvedValue(undefined) as never;
  vi.spyOn(StuffApi, 'findByTemplatePath').mockImplementation(((path: string) =>
    path === TemplatePaths.wikiRegistry ? (fakeRegistry as never) : undefined) as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

const KEY = '/wiki/main/oak';
const page = () => pages.find((p) => p.slug === 'oak' || p.aliases.includes('oak'))!;

async function installOak(body = 'Oak is a wood.\n'): Promise<string> {
  const root = writePack('w', [], { root: '/wiki' });
  writeWikiFile(root, 'main', 'oak', { title: 'Oak', tags: ['material'] }, body);
  await PackApi.install([root]);
  return root;
}

describe('the wiki kind — CAS submit as the pack', () => {
  it('absent → create at rev 1 by pack:<id>; baseline carries rev 1', async () => {
    const root = writePack('w', [], { root: '/wiki' });
    writeWikiFile(root, 'main', 'oak', { title: 'Oak', tags: ['material'] }, 'Oak is a wood.\n');
    const [r] = await PackApi.install([root]);
    expect(r!.failure).toBeNull();
    expect(r!.inserted).toEqual([KEY]);
    expect(page()).toMatchObject({ rev: 1, createdBy: 'pack:w', title: 'Oak', tags: ['material'] });
    const baseline = recordOf('w')!.rows[KEY]!;
    expect(baseline.kind).toBe('wiki');
    expect(baseline.rev).toBe(1);
    expect(JSON.parse(baseline.body)).toEqual({ front: { title: 'Oak', tags: ['material'] }, body: 'Oak is a wood.\n' });
  });

  it('unchanged file → nothing (second boot is a no-op)', async () => {
    const root = await installOak();
    const r = await PackApi.sync('w', root);
    expect([...r.inserted, ...r.updated, ...r.conflicts, ...r.kept]).toEqual([]);
    expect(page().rev).toBe(1);
  });

  it('changed file over an unchanged page → an edit with the baseline rev as the CAS token; baseline rev follows', async () => {
    const root = await installOak();
    writeWikiFile(root, 'main', 'oak', { title: 'Oak', tags: ['material', 'wood'] }, 'Oak is a HARD wood.\n');
    const r = await PackApi.sync('w', root);
    expect(r.updated).toEqual([KEY]);
    expect(page()).toMatchObject({ rev: 2, body: 'Oak is a HARD wood.\n', tags: ['material', 'wood'], updatedBy: 'pack:w' });
    expect(recordOf('w')!.rows[KEY]!.rev).toBe(2);
  });

  it('changed file over a player-edited page → wiki-cas conflict, page untouched, one diagnostic; diff has three bodies', async () => {
    const root = await installOak();
    page().body = 'A PLAYER REWROTE THIS';
    page().rev = 2;
    writeWikiFile(root, 'main', 'oak', { title: 'Oak', tags: ['material'] }, 'Pack v2\n');
    const r = await PackApi.sync('w', root);
    expect(r.conflicts).toEqual([KEY]);
    expect(r.updated).toEqual([]);
    expect(page().body).toBe('A PLAYER REWROTE THIS');
    expect(recordOf('w')!.conflicts[0]).toMatchObject({ path: KEY, kind: 'wiki', reason: 'wiki-cas' });
    expect(diag).toHaveBeenCalledTimes(1);
    await PackApi.sync('w', root);
    expect(diag).toHaveBeenCalledTimes(1);

    const d = await PackApi.diff('w', KEY, root);
    expect(d.entries[0]!.baseline!.body).toContain('Oak is a wood');
    expect(d.entries[0]!.yours!.body).toContain('A PLAYER REWROTE THIS');
    expect(d.entries[0]!.theirs!.body).toContain('Pack v2');
  });

  it('resolve --take-pack edits over the CURRENT rev and clears the conflict', async () => {
    const root = await installOak();
    page().body = 'A PLAYER REWROTE THIS';
    page().rev = 2;
    writeWikiFile(root, 'main', 'oak', { title: 'Oak', tags: ['material'] }, 'Pack v2\n');
    await PackApi.sync('w', root);
    const r = await PackApi.resolve('w', KEY, 'take-pack', root);
    expect(r!.updated).toEqual([KEY]);
    expect(page()).toMatchObject({ body: 'Pack v2\n', rev: 3 });
    expect(recordOf('w')!.conflicts).toEqual([]);
    expect(recordOf('w')!.rows[KEY]!.rev).toBe(3);
  });

  it('resolve --export writes frontmatter + the live body to the pack file', async () => {
    const root = await installOak();
    page().body = 'A PLAYER REWROTE THIS';
    page().rev = 2;
    await PackApi.resolve('w', KEY, 'export', root);
    const text = readFileSync(join(root, 'content', 'wiki', 'main', 'oak.md'), 'utf8');
    expect(text.startsWith('---\ntitle: Oak\n')).toBe(true);
    expect(text).toContain('A PLAYER REWROTE THIS');
  });

  it('a vanished file keeps the page and drops the baseline', async () => {
    const root = await installOak();
    rmSync(join(root, 'content', 'wiki', 'main', 'oak.md'));
    const r = await PackApi.sync('w', root);
    expect(r.kept).toEqual([KEY]);
    expect(pages).toHaveLength(1);
    expect(recordOf('w')!.rows[KEY]).toBeUndefined();
  });

  it('a seeder-shaped existing page (no baseline) adopts with the live rev in the baseline — no edit submitted', async () => {
    pages.push(fakePage({ namespace: 'main', slug: 'oak', aliases: [], title: 'Oak', body: 'seeded text', subject: null, tags: [], related: [], spoilerLevel: 0, rev: 3, createdBy: 'system', updatedBy: 'system' }));
    const root = await installOak('pack text\n');
    expect(page().body).toBe('seeded text');
    expect(page().rev).toBe(3);
    const baseline = recordOf('w')!.rows[KEY]!;
    expect(baseline.rev).toBe(3);
    const r = await PackApi.sync('w', root);
    expect([...r.inserted, ...r.updated, ...r.conflicts]).toEqual([]);
  });

  it('a slug renamed to an alias resolves — no duplicate create', async () => {
    const root = await installOak();
    const p = page();
    p.slug = 'oak-wood';
    p.aliases = ['oak'];
    const r = await PackApi.sync('w', root);
    expect(r.inserted).toEqual([]);
    expect(pages).toHaveLength(1);
  });

  it('a page file outside content/wiki/<ns>/<slug>.md, or without a title, fails at read', async () => {
    const root = writePack('w', [], { root: '/wiki' });
    writeWikiFile(root, 'main', 'oak', { tags: ['x'] }, 'no title');
    const [r] = await PackApi.install([root]);
    expect(r!.failure?.step).toBe('read');
    expect(r!.failure?.error).toMatch(/title/);
  });
});
