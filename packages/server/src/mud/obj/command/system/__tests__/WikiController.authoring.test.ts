/**
 * The authoring loop — `--section`, `--rev`, `--draft`, `--summary`,
 * and `preview`.
 *
 * Gates acceptance criteria **34** (an edit submits the `rev` it was
 * based on; a mismatch is REJECTED and the response carries base /
 * current / submitted), **35** (two edits to different sections both
 * succeed), **36** (preview renders through the SAME pipeline as a
 * saved page, asserted by rendering identical text both ways and
 * comparing), **37** (a draft does not change what the page serves)
 * and **38** (an edit summary appears in history).
 *
 * Criterion 36's assertion is the one worth reading: it is the whole
 * payoff of the pipeline keying on a body rather than a page id.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WikiController from '../WikiController';
import WikiRegistry from '../../../WikiRegistry';
import WikiRenderer from '../../../WikiRenderer';
import WikiNamespaceZone from '../../../WikiNamespaceZone';
import { Idea } from '../../../../lib/stuff/Idea';
import { CommandApi, type CommandModel } from '../../../../api/command';
import type { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { MessageApi } from '../../../../api/message';
import { AccessApi } from '../../../../api/access';
import { AppApi } from '../../../../api/app';
import { PlayerApi } from '../../../../api/player';
import { ShellApi } from '../../../../api/shell';
import { StuffApi } from '../../../../api/stuff';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { TemplatePaths } from '../../../../lib/paths';
import { Collections } from '../../../../lib/persistence/Collections';
import { Sections } from '../../../../lib/wiki/Section';
import { PromptApi } from '../../../../api/prompt';
import { installWikiTestDb, type WikiTestDb } from '../../../../lib/wiki/__tests__/wiki-test-db';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { Note, WikiEditConflictNote } from '@saxonberg/types';
import type { Stuff } from '../../../../lib/stuff/Stuff';

class Principal extends Idea {}

let db: WikiTestDb;
let registry: WikiRegistry;
let renderer: WikiRenderer;
let zone: WikiNamespaceZone;
let giver: Stuff;
let sent: string[];

async function run(
  model: Partial<CommandModel>,
  interactive?: unknown,
): Promise<{ body: string; notes: readonly Note[] }> {
  sent = [];
  const ctrl = makeStuff(() => new WikiController());
  const ctx = CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: null,
    commandText: 'wiki',
    executionId: 'e',
    commandId: 'c',
    verb: 'wiki',
    command: { verbs: ['wiki'] } as unknown as CommandDefinition,
    ...(interactive !== undefined ? { interactive: interactive as never } : {}),
  });
  await ExecutionContextApi.runRoot(null, 'wiki.cmd', async () => {
    ExecutionContextApi.tagActingAuthor(giver);
    await ctrl.execute(model as never, ctx);
  });
  return { body: sent.join(''), notes: ctx.getNotes() };
}

function reasons(notes: readonly Note[]): string[] {
  return notes
    .filter((n): n is Extract<Note, { kind: 'controller-rejected' }> =>
      n.kind === 'controller-rejected',
    )
    .map((n) => n.reason);
}

function conflictOf(notes: readonly Note[]): WikiEditConflictNote | undefined {
  return notes.find(
    (n): n is WikiEditConflictNote => n.kind === 'wiki-edit-conflict',
  );
}

/** The single stored page row. */
function row(): Record<string, unknown> {
  return db.all(Collections.Wiki)[0]!;
}

beforeEach(() => {
  vi.restoreAllMocks();
  db = installWikiTestDb();
  db.reset();
  sent = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: unknown) => {
      sent.push(String(body));
      return b;
    };
    b.send = () => {};
    return b as never;
  });
  registry = makeStuff(() => new WikiRegistry());
  renderer = makeStuff(() => new WikiRenderer());
  zone = makeStuff(() => new WikiNamespaceZone());
  giver = makeStuff(() => new Principal()) as unknown as Stuff;
  vi.spyOn(StuffApi, 'singleton').mockImplementation(
    async (path: string) =>
      (path === TemplatePaths.wikiRegistry
        ? registry
        : path === TemplatePaths.wikiRenderer
          ? renderer
          : zone) as never,
  );
  vi.spyOn(zone, 'lookupField').mockResolvedValue(null);
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
  vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(3 as unknown as never);
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(true);
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

/** Create a page whose body carries two anchored sections. */
async function seedArticle(): Promise<void> {
  await run({
    subcommand: 'create',
    page: 'oak',
    title: 'Oak',
    body:
      '<h2 anchor="uses">Uses</h2>furniture' +
      '<h2 anchor="working">Working</h2>labour',
  });
}

describe('⭐ compare-and-swap on rev (34)', () => {
  it('an edit based on the current rev succeeds', async () => {
    await seedArticle();
    const { notes } = await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'v2',
      rev: '1',
    });
    expect(reasons(notes)).toEqual([]);
    expect(row().body).toBe('v2');
  });

  it('an edit based on a STALE rev is rejected, and nothing is overwritten', async () => {
    await seedArticle();
    await run({ subcommand: 'edit', page: 'oak', body: 'from-A', rev: '1' });
    const { body, notes } = await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'from-B',
      rev: '1',
    });
    // A's work is still there — which is the entire point. Without the
    // check, last-write-wins would destroy it and history would
    // faithfully record that it had.
    expect(row().body).toBe('from-A');
    expect(body).toContain('Nothing was overwritten');
    expect(conflictOf(notes)).toBeDefined();
  });

  it('⭐ the response carries base / current / submitted', async () => {
    await seedArticle();
    await run({ subcommand: 'edit', page: 'oak', body: 'THEIRS', rev: '1' });
    const { notes } = await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'MINE',
      rev: '1',
    });
    const conflict = conflictOf(notes)!;
    expect(conflict.baseRev).toBe(1);
    expect(conflict.currentRev).toBe(2);
    expect(conflict.page).toBe('main:oak');
    expect(conflict.base).toContain('Uses');
    expect(conflict.current).toBe('THEIRS');
    expect(conflict.submitted).toBe('MINE');
  });

  it('⚠ NO auto-merge — the three bodies are handed over untouched', async () => {
    // A wiki edit is prose, and a machine-merged paragraph reads as
    // somebody's writing and is nobody's.
    await seedArticle();
    await run({ subcommand: 'edit', page: 'oak', body: 'THEIRS', rev: '1' });
    const { notes } = await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'MINE',
      rev: '1',
    });
    const c = conflictOf(notes)!;
    expect(c.current).not.toContain('MINE');
    expect(c.submitted).not.toContain('THEIRS');
  });

  it('the conflict escalates the dispatch status to declined', async () => {
    await seedArticle();
    await run({ subcommand: 'edit', page: 'oak', body: 'x', rev: '1' });
    const ctrl = makeStuff(() => new WikiController());
    const ctx = CommandApi.createCommandContext({
      commandGiver: giver as never,
      location: null,
      commandText: 'wiki',
      executionId: 'e',
      commandId: 'c',
      verb: 'wiki',
      command: { verbs: ['wiki'] } as unknown as CommandDefinition,
    });
    await ExecutionContextApi.runRoot(null, 'x', async () => {
      ExecutionContextApi.tagActingAuthor(giver);
      await ctrl.execute(
        { subcommand: 'edit', page: 'oak', body: 'y', rev: '1' } as never,
        ctx,
      );
    });
    // Declined, not error: the page is fine, the edit simply did not
    // go through, and the author is expected to reapply it.
    expect(ctx.getStatus()).toBe('declined');
  });

  it('omitting --rev skips the check (the scripted path)', async () => {
    await seedArticle();
    await run({ subcommand: 'edit', page: 'oak', body: 'v2' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v3' });
    expect(row().body).toBe('v3');
  });

  it('a non-numeric --rev is refused rather than silently skipped', async () => {
    // Silently skipping would turn the lost-update guard off exactly
    // when somebody was trying to use it.
    await seedArticle();
    const { notes } = await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'x',
      rev: 'latest',
    });
    expect(reasons(notes)).toContain('bad-rev');
  });

  it('⚠ the conflict bodies pass through redactSource (67)', async () => {
    // A conflict response is a revision-facing surface. Without the
    // gate, a reader could read past their ceiling by provoking one.
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'open <spoiler level="3">SECRET</spoiler>',
      rev: '1',
    });
    const { notes } = await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'mine',
      rev: '1',
    });
    const c = conflictOf(notes)!;
    expect(c.current).not.toContain('SECRET');
    expect(c.current).toContain('open');
  });
});

describe('⭐ section editing (35)', () => {
  it('edits one section and leaves the rest untouched', async () => {
    await seedArticle();
    await run({
      subcommand: 'edit',
      page: 'oak',
      section: 'working',
      body: '<h2 anchor="working">Working</h2>REWRITTEN',
    });
    expect(String(row().body)).toContain('REWRITTEN');
    expect(String(row().body)).toContain('furniture');
  });

  it('⭐ two edits to DIFFERENT sections BOTH succeed', async () => {
    await seedArticle();
    await run({
      subcommand: 'edit',
      page: 'oak',
      section: 'uses',
      body: '<h2 anchor="uses">Uses</h2>A-EDIT',
    });
    await run({
      subcommand: 'edit',
      page: 'oak',
      section: 'working',
      body: '<h2 anchor="working">Working</h2>B-EDIT',
    });
    const body = String(row().body);
    expect(body).toContain('A-EDIT');
    expect(body).toContain('B-EDIT');
  });

  it('refuses an unknown section, LISTING the ones that exist', async () => {
    await seedArticle();
    const { body, notes } = await run({
      subcommand: 'edit',
      page: 'oak',
      section: 'nope',
      body: 'x',
    });
    expect(reasons(notes)).toContain('no-such-section');
    // Naming the sections is the difference between a refusal an
    // author can act on and one they have to go read the page for.
    expect(body).toContain('uses');
    expect(body).toContain('working');
  });

  it('a section-scoped conflict names the section', async () => {
    await seedArticle();
    await run({
      subcommand: 'edit',
      page: 'oak',
      section: 'uses',
      body: '<h2 anchor="uses">Uses</h2>theirs',
      rev: '1',
    });
    const { notes } = await run({
      subcommand: 'edit',
      page: 'oak',
      section: 'uses',
      body: '<h2 anchor="uses">Uses</h2>mine',
      rev: '1',
    });
    expect(conflictOf(notes)?.section).toBe('uses');
  });
});

describe('sticky anchors survive an edit (45)', () => {
  it('a rewording keeps the anchor', async () => {
    await seedArticle();
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: '<h2>Uses</h2>furniture<h2>What It Costs</h2>labour',
    });
    // Two headings before, two after, so anchors carry positionally.
    expect(Sections.list(String(row().body)).map((s) => s.anchor)).toEqual([
      'uses',
      'working',
    ]);
  });

  it('a new page gets anchors minted for it', async () => {
    await run({
      subcommand: 'create',
      page: 'pine',
      body: '<h2>Uses</h2>x',
    });
    expect(String(row().body)).toContain('anchor="uses"');
  });

  it('an anchor survives a ROLLBACK, because it is in the snapshot', async () => {
    await seedArticle();
    await run({ subcommand: 'edit', page: 'oak', body: '<h2>Something</h2>y' });
    await run({ subcommand: 'rollback', page: 'oak', rev: '1' });
    expect(String(row().body)).toContain('anchor="uses"');
  });
});

describe('drafts (37)', () => {
  it('⭐ a draft does NOT change what the page serves', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'PUBLISHED' });
    await run({ subcommand: 'edit', page: 'oak', body: 'DRAFT', draft: true });
    expect(row().body).toBe('PUBLISHED');
    const read = await run({ page: 'oak' });
    expect(read.body).toContain('PUBLISHED');
    expect(read.body).not.toContain('DRAFT');
  });

  it('the draft IS recorded — same log, one flag, no second store', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'PUBLISHED' });
    await run({ subcommand: 'edit', page: 'oak', body: 'DRAFT', draft: true });
    const revs = db.all(Collections.WikiRevisions);
    expect(revs).toHaveLength(2);
    const draft = revs.find((r) => r.published === false)!;
    expect(draft.body).toBe('DRAFT');
  });

  it('history flags a draft as such', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'x' });
    await run({ subcommand: 'edit', page: 'oak', body: 'y', draft: true });
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    expect(body).toContain('[draft]');
  });

  it('says what the page is still serving', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'x' });
    const { body } = await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'y',
      draft: true,
    });
    expect(body).toContain('Drafted');
    expect(body).toContain('still serves rev 1');
  });

  it('a later published edit supersedes the draft normally', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    await run({ subcommand: 'edit', page: 'oak', body: 'draft', draft: true });
    await run({ subcommand: 'edit', page: 'oak', body: 'v3' });
    expect(row().body).toBe('v3');
  });
});

describe('edit summaries (38)', () => {
  it('a summary appears in history', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'v2',
      summary: 'added the density figure',
    });
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    expect(body).toContain('added the density figure');
  });

  it('an edit with no summary is still listed', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v2' });
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    expect(body).toContain('2. edit');
  });

  it('a rollback records what it restored', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v2' });
    await run({ subcommand: 'rollback', page: 'oak', rev: '1' });
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    expect(body).toContain('restored rev 1');
  });
});

describe('⭐ preview is the SAME pipeline (36)', () => {
  it('identical text renders identically saved and previewed', async () => {
    // The criterion, asserted the way it asks to be. This is free only
    // because the pipeline keys on a BODY (A4): with a page-id key,
    // preview would be a second path, and second paths drift until
    // preview lies about what saving will do.
    const text = 'prose with <strong>markup</strong> and [[pine]]';
    await run({ subcommand: 'create', page: 'oak', title: 'Oak', body: text });
    const saved = await run({ page: 'oak' });
    const previewed = await run({ subcommand: 'preview', page: 'oak', body: text });

    const strip = (s: string) =>
      s.replace(/^\n.*\n\n/, '').replace(/\n$/, '');
    expect(strip(previewed.body)).toBe(strip(saved.body));
  });

  it('previews text that has not been saved', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'OLD' });
    const { body } = await run({
      subcommand: 'preview',
      page: 'oak',
      body: 'NEW, unsaved',
    });
    expect(body).toContain('NEW, unsaved');
    // …and saving did not happen.
    expect(row().body).toBe('OLD');
  });

  it('previews an article that does not exist yet', async () => {
    // When preview is most useful: drafting a page before creating it.
    const { body } = await run({
      subcommand: 'preview',
      body: 'a <strong>brand new</strong> article',
    });
    expect(body).toContain('brand new');
    expect(db.all(Collections.Wiki)).toHaveLength(0);
  });

  it('resolves links and snippets in a preview', async () => {
    await run({ subcommand: 'create', page: 'pine', title: 'Pine', body: '' });
    await run({
      subcommand: 'create',
      page: 'snippet:hello',
      body: 'EXPANDED',
    });
    const { body } = await run({
      subcommand: 'preview',
      body: '{{hello}} and [[pine]]',
    });
    expect(body).toContain('EXPANDED');
    expect(body).toContain('mudcmd:wiki main:pine');
  });

  it('refuses an empty preview', async () => {
    const { notes } = await run({ subcommand: 'preview' });
    expect(reasons(notes)).toContain('body-required');
  });

  it('labels itself so it is never mistaken for the saved page', async () => {
    const { body } = await run({ subcommand: 'preview', body: 'x' });
    expect(body).toContain('(preview)');
  });
});

/**
 * ⚠ **The editor opens on what is THERE.** Found by driving, not by
 * the suite: every test above submits `--body`, so the interactive
 * path — the one a player actually uses — was never exercised, and it
 * opened an empty box. Posting from an empty box replaces the whole
 * article, which makes `wiki edit` mean `wiki retype`.
 */
describe('the composer is seeded with what is being edited', () => {
  /** Capture the opts `PromptApi.compose` is called with. */
  function captureCompose(reply: string): { opts: () => Record<string, unknown> } {
    let seen: Record<string, unknown> = {};
    vi.spyOn(PromptApi, 'compose').mockImplementation(
      async (_i: unknown, _label: string, opts?: unknown) => {
        seen = (opts ?? {}) as Record<string, unknown>;
        return reply;
      },
    );
    return { opts: () => seen };
  }

  it('a full edit opens on the whole current body', async () => {
    await seedArticle();
    const before = String(row().body);
    const cap = captureCompose('replacement');
    await run({ subcommand: 'edit', page: 'oak' }, {});
    expect(cap.opts().initial).toBe(before);
  });

  it('a section edit opens on THAT SECTION, not the article', async () => {
    await seedArticle();
    const before = String(row().body);
    const cap = captureCompose('<h2 anchor="uses">Uses</h2>oak');
    await run({ subcommand: 'edit', page: 'oak', section: 'uses' }, {});
    expect(cap.opts().initial).toBe(Sections.extract(before, 'uses'));
    expect(cap.opts().initial).not.toContain('Working');
  });

  it('creating opens EMPTY — there is nothing to open on', async () => {
    const cap = captureCompose('# New');
    await run({ subcommand: 'create', page: 'fresh', title: 'Fresh' }, {});
    expect(cap.opts().initial).toBeUndefined();
  });
});

/**
 * ⚠ A guest is refused **before the composer opens**.
 *
 * The registry refuses on its own either way, so this is not about
 * whether the edit lands — it is about when somebody finds out. A
 * refusal that arrives after an article has been typed is the same
 * decision delivered at the worst possible moment.
 */
describe('a write nobody may make is refused up front', () => {
  it('does not open the composer for a refused CREATE', async () => {
    const compose = vi.spyOn(PromptApi, 'compose');
    vi.spyOn(WikiRegistry.prototype, 'refusalToCreate').mockResolvedValue(
      'the wiki is read-only for guests',
    );
    const { notes } = await run(
      { subcommand: 'create', page: 'graffiti', title: 'x' },
      {},
    );
    expect(reasons(notes)).toEqual(['wiki-denied']);
    expect(compose).not.toHaveBeenCalled();
    expect(db.all(Collections.Wiki)).toHaveLength(0);
  });

  it('does not open the composer for a refused EDIT', async () => {
    await seedArticle();
    const before = String(row().body);
    const compose = vi.spyOn(PromptApi, 'compose');
    vi.spyOn(WikiRegistry.prototype, 'refusalToEdit').mockResolvedValue(
      'the wiki is read-only for guests',
    );
    const { body, notes } = await run({ subcommand: 'edit', page: 'oak' }, {});
    expect(reasons(notes)).toEqual(['wiki-denied']);
    expect(compose).not.toHaveBeenCalled();
    expect(body).toContain('read-only for guests');
    expect(String(row().body)).toBe(before);
  });
});
