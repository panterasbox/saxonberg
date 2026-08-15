/**
 * History and diff, and **the gate they both apply**.
 *
 * Gates acceptance criteria **9** (history newest-first), **10**
 * (rollback appends), **46** (a citation resolves to the page's current
 * content, not a pinned revision), **66** (a word-level diff over
 * source), **67** (⭐ a fragment above the reader's capability is
 * ABSENT from history, diff and the conflict response — not redacted,
 * not counted) and **68** (⭐ a reader cannot learn *that* an
 * over-ceiling fragment changed).
 *
 * 67 and 68 are the reason this file exists. A diff is a spoiler
 * bypass unless it is gated: a reader who cannot see a level-3 section
 * can otherwise read it in a diff — or, only slightly better, can see
 * *that* it changed, which is itself information ("something about the
 * boss fight was rewritten"). History becomes the hole in a wall the
 * renderer carefully built.
 */

import "../../../../../test-bootstrap";
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
import { installWikiTestDb, type WikiTestDb } from '../../../../lib/wiki/__tests__/wiki-test-db';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { Note } from '@saxonberg/types';
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

/** Drop the reader's ceiling to 0 — they see only open content. */
function readerSeesNothingGated(): void {
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
  vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
  vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
}

beforeEach(() => {
  vi.restoreAllMocks();
  db = installWikiTestDb();
  db.reset();
  sent = [];
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    // ⭐ `meta({ carded: true })` — the marker `shell.result` filters on.
    b.meta = () => b;
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

describe('diff (66)', () => {
  it('compares the latest two revisions by default', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'oak is a wood' });
    await run({ subcommand: 'edit', page: 'oak', body: 'oak is a hard wood' });
    const { body } = await run({ subcommand: 'diff', page: 'oak' });
    expect(body).toContain('+ hard');
    expect(body).toContain('rev 1 → rev 2');
  });

  it('compares two named revisions', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v one' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v two' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v three' });
    const { body } = await run({
      subcommand: 'diff',
      page: 'oak',
      from: '1',
      to: '3',
    });
    expect(body).toContain('- one');
    expect(body).toContain('+ three');
  });

  it('says so plainly when nothing changed', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'same' });
    await run({ subcommand: 'edit', page: 'oak', body: 'same' });
    const { body } = await run({ subcommand: 'diff', page: 'oak' });
    expect(body).toContain('No visible difference');
  });

  it('refuses a revision that does not exist', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'x' });
    await run({ subcommand: 'edit', page: 'oak', body: 'y' });
    const { notes } = await run({
      subcommand: 'diff',
      page: 'oak',
      from: '1',
      to: '99',
    });
    expect(reasons(notes)).toContain('no-such-revision');
  });

  it('refuses a non-numeric revision', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'x' });
    const { notes } = await run({
      subcommand: 'diff',
      page: 'oak',
      from: 'first',
    });
    expect(reasons(notes)).toContain('bad-rev');
  });

  it('has nothing to compare on a one-revision page', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'x' });
    const { body } = await run({ subcommand: 'diff', page: 'oak' });
    expect(body).toContain('Nothing to compare');
  });
});

describe('⭐ diff is spoiler-gated (67, 68)', () => {
  it('an over-ceiling change produces NO OPERATION AT ALL', async () => {
    // Redact, THEN diff. The fragment is absent from both inputs, so
    // there is nothing for the algorithm to report — which is stronger
    // than filtering the output, where the ops would already name the
    // changed text.
    await run({ subcommand: 'create', page: 'oak', body: 'open' });
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'open <spoiler level="3">the boss is a mimic</spoiler>',
    });
    readerSeesNothingGated();
    const { body } = await run({ subcommand: 'diff', page: 'oak' });
    expect(body).not.toContain('mimic');
    expect(body).not.toContain('boss');
  });

  it('⭐ the reader cannot learn THAT it changed (68)', async () => {
    // Not "1 change hidden". A redaction marker is the leak in
    // miniature: it says there is something here you cannot see, which
    // is the information.
    await run({
      subcommand: 'create',
      page: 'oak',
      body: 'open <spoiler level="3">before</spoiler>',
    });
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'open <spoiler level="3">after</spoiler>',
    });
    readerSeesNothingGated();
    const { body } = await run({ subcommand: 'diff', page: 'oak' });
    expect(body).toContain('No visible difference');
    expect(body).not.toMatch(/hidden|redacted|\d+ change/i);
  });

  it('a reader WITH the capability sees the change normally', async () => {
    // The control: the gate is about the reader, not about the content.
    await run({
      subcommand: 'create',
      page: 'oak',
      body: 'open <spoiler level="3">before</spoiler>',
    });
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'open <spoiler level="3">after</spoiler>',
    });
    const { body } = await run({ subcommand: 'diff', page: 'oak' });
    // The tokens carry their surrounding markup, because markup IS
    // part of what an editor changed and a diff that hid it would lie
    // about the edit. So the assertion is on the words, not on a
    // bare-word token.
    expect(body).toContain('after');
    expect(body).toContain('before');
    expect(body).toMatch(/\+ .*after/);
    expect(body).toMatch(/- .*before/);
  });

  it('an OPEN change beside a gated one is still shown', async () => {
    await run({
      subcommand: 'create',
      page: 'oak',
      body: 'one <spoiler level="3">secret</spoiler>',
    });
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'two <spoiler level="3">different secret</spoiler>',
    });
    readerSeesNothingGated();
    const { body } = await run({ subcommand: 'diff', page: 'oak' });
    expect(body).toContain('+ two');
    expect(body).toContain('- one');
    expect(body).not.toContain('secret');
  });
});

describe('⭐ history is gated too (9, 67, 68)', () => {
  it('lists revisions newest-first (9)', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v2' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v3' });
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    const positions = [3, 2, 1].map((n) => body.indexOf(`${n}. `));
    expect(positions[0]).toBeLessThan(positions[1]!);
    expect(positions[1]).toBeLessThan(positions[2]!);
  });

  it('⭐ omits a revision whose ONLY change was over the ceiling', async () => {
    // Listing it would tell the reader that something they cannot see
    // changed — the same leak as an un-gated diff, at a different edge.
    await run({ subcommand: 'create', page: 'oak', body: 'open' });
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'open <spoiler level="3">secret</spoiler>',
      summary: 'reworked the boss fight',
    });
    readerSeesNothingGated();
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    expect(body).not.toContain('reworked the boss fight');
    expect(body).not.toContain('2. edit');
    expect(body).toContain('1. create');
  });

  it('a reader WITH the capability sees that revision', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'open' });
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'open <spoiler level="3">secret</spoiler>',
      summary: 'reworked the boss fight',
    });
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    expect(body).toContain('reworked the boss fight');
  });

  it('keeps a revision that changed something visible', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'open' });
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: 'changed <spoiler level="3">secret</spoiler>',
      summary: 'both at once',
    });
    readerSeesNothingGated();
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    expect(body).toContain('both at once');
  });

  it('a wholly-gated page lists only its creation, and counts nothing', async () => {
    // The creation stays listed on purpose: the reader can already see
    // the page exists (it is in `wiki list`) and that it renders
    // empty, so "created by X" tells them nothing new. What must NOT
    // appear is the later edit, or any count of what was withheld —
    // a tally is the leak in miniature just as a marker is.
    await run({
      subcommand: 'create',
      page: 'oak',
      body: '<spoiler level="3">a</spoiler>',
    });
    await run({
      subcommand: 'edit',
      page: 'oak',
      body: '<spoiler level="3">b</spoiler>',
      summary: 'rewrote the twist',
    });
    readerSeesNothingGated();
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    expect(body).toContain('1. create');
    expect(body).not.toContain('2. edit');
    expect(body).not.toContain('rewrote the twist');
    expect(body).not.toMatch(/\d+ hidden|withheld|redacted/i);
  });
});

describe('rollback and citations (10, 46)', () => {
  it('rollback appends rather than rewriting (10)', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v2' });
    await run({ subcommand: 'rollback', page: 'oak', rev: '1' });
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    // Rev 2 is still listed: the rollback is itself reversible.
    expect(body).toContain('2. edit');
    expect(body).toContain('3. rollback');
  });

  it('⭐ a citation names the PAGE, so it follows improvements (46)', async () => {
    // Pinning a revision would freeze a lesson against exactly the
    // improvement the cite-never-restate arrangement exists to
    // inherit. Reading a page always yields its current content.
    await run({ subcommand: 'create', page: 'oak', title: 'Oak', body: 'old text' });
    const before = await run({ page: 'oak' });
    expect(before.body).toContain('old text');
    await run({ subcommand: 'edit', page: 'oak', body: 'improved text' });
    const after = await run({ page: 'oak' });
    expect(after.body).toContain('improved text');
    expect(after.body).not.toContain('old text');
  });

  it('a diff can still reach the older content deliberately', async () => {
    // Citations follow the page; history is how you get at what it
    // used to say, on purpose rather than by accident.
    await run({ subcommand: 'create', page: 'oak', body: 'old text' });
    await run({ subcommand: 'edit', page: 'oak', body: 'improved text' });
    const { body } = await run({ subcommand: 'diff', page: 'oak' });
    expect(body).toContain('- old');
  });
});
