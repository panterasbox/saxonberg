/**
 * WikiController — the `wiki` verb end to end, against a working store.
 *
 * The registry suite proves the model; this proves the **verb**: that
 * the subcommands reach the right mutations, that refusals arrive as
 * named `controller-rejected` notes rather than as thrown errors or a
 * `{success:false}` return, and that a read renders through the
 * per-reader pipeline.
 *
 * ⭐ It also proves the chokepoint from the other side. The registry's
 * mutators are gated `FromModule('/platform/idea/cmd/system/WikiController')`;
 * the registry suite asserts that everything ELSE is refused, and this
 * suite asserts the controller itself gets through. Neither claim is
 * worth much without the other.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WikiController from '../WikiController';
import WikiRegistry from '../../../WikiRegistry';
import WikiRenderer from '../../../WikiRenderer';
import WikiNamespaceZone from '../../../WikiNamespaceZone';
import { Idea } from '../../../../../lib/stuff/Idea';
import { CommandApi, type CommandModel } from '../../../../../api/command';
import type { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { MessageApi } from '../../../../../api/message';
import { AccessApi } from '../../../../../api/access';
import { AppApi } from '../../../../../api/app';
import { PlayerApi } from '../../../../../api/player';
import { ShellApi } from '../../../../../api/shell';
import { StuffApi } from '../../../../../api/stuff';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { TemplatePaths } from '../../../../../lib/paths';
import { Collections } from '../../../../../lib/persistence/Collections';
import { installWikiTestDb, type WikiTestDb } from '../../../../../lib/wiki/__tests__/wiki-test-db';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { Note } from '@saxonberg/types';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

class Principal extends Idea {}

let db: WikiTestDb;
let registry: WikiRegistry;
let renderer: WikiRenderer;
let zone: WikiNamespaceZone;
let giver: Stuff;
let sent: string[];

/** Drive one `wiki` invocation and collect what it emitted. */
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

/** The reasons on any `controller-rejected` notes emitted. */
function reasons(notes: readonly Note[]): string[] {
  return notes
    .filter((n): n is Extract<Note, { kind: 'controller-rejected' }> =>
      n.kind === 'controller-rejected',
    )
    .map((n) => n.reason);
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
  vi.spyOn(zone, 'lookupField').mockResolvedValue(null); // the `anyone` floor
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
  vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(3 as unknown as never);
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(true);
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
  vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
  vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐ the controller IS the chokepoint', () => {
  it('reaches the gated mutators the registry refuses to everyone else', async () => {
    const { notes } = await run({
      subcommand: 'create',
      page: 'oak',
      body: 'Hardwood.',
    });
    expect(reasons(notes)).toEqual([]);
    expect(db.all(Collections.Wiki)).toHaveLength(1);
  });
});

describe('create', () => {
  it('creates a page and reports its handle', async () => {
    const { body } = await run({
      subcommand: 'create',
      page: 'oak',
      title: 'Oak',
      body: 'Hardwood.',
    });
    expect(body).toContain('main:oak');
    expect(db.all(Collections.Wiki)[0]!.title).toBe('Oak');
  });

  it('parses a typed subject', async () => {
    await run({
      subcommand: 'create',
      page: 'oak',
      body: '',
      subject: 'template:/stuff/idea/material/oak',
    });
    expect(db.all(Collections.Wiki)[0]!.subject).toEqual({
      kind: 'template',
      ref: '/stuff/idea/material/oak',
    });
  });

  it('rejects an unparseable subject NAMING the three kinds', async () => {
    const { body, notes } = await run({
      subcommand: 'create',
      page: 'oak',
      subject: 'nonsense',
    });
    expect(reasons(notes)).toContain('bad-subject');
    expect(body).toContain('mixin:');
    expect(db.all(Collections.Wiki)).toHaveLength(0);
  });

  it('creates into an explicit namespace', async () => {
    await run({ subcommand: 'create', page: 'snippet:infobox', body: '' });
    expect(db.all(Collections.Wiki)[0]!.namespace).toBe('snippet');
  });

  it('surfaces a name collision as a NAMED rejection, not a throw', async () => {
    await run({ subcommand: 'create', page: 'oak', title: 'Oak', body: '' });
    const { body, notes } = await run({
      subcommand: 'create',
      page: 'oak',
      body: '',
    });
    expect(reasons(notes)).toContain('wiki-denied');
    expect(body).toContain('Oak');
  });

  it('splits comma-separated tags and related', async () => {
    await run({
      subcommand: 'create',
      page: 'oak',
      body: '',
      tag: 'material, wood ,,',
      related: 'pine,ash',
    });
    const row = db.all(Collections.Wiki)[0]!;
    expect(row.tags).toEqual(['material', 'wood']);
    expect(row.related).toEqual(['pine', 'ash']);
  });
});

describe('read (the fallthrough form)', () => {
  it('bare `wiki <page>` reads', async () => {
    await run({ subcommand: 'create', page: 'oak', title: 'Oak', body: 'Hardwood.' });
    const { body } = await run({ page: 'oak' });
    expect(body).toContain('Oak');
    expect(body).toContain('Hardwood.');
  });

  it('renders through the pipeline, resolving [[links]]', async () => {
    await run({ subcommand: 'create', page: 'oak', title: 'Oak', body: '' });
    await run({
      subcommand: 'create',
      page: 'furniture',
      body: 'Often made of [[oak]].',
    });
    const { body } = await run({ page: 'furniture' });
    expect(body).toContain('<link href="mudcmd:wiki main:oak">Oak</link>');
  });

  it('a missing page is an INVITATION, not an error', async () => {
    const { body, notes } = await run({ page: 'mimic' });
    expect(body).toContain('wiki create mimic');
    // `empty-result`, not `controller-rejected` — the reader did
    // nothing wrong, and the wiki wants them to write it.
    expect(reasons(notes)).toEqual([]);
    expect(notes.map((n) => n.kind)).toContain('empty-result');
  });

  it('notes when a name resolved via an alias', async () => {
    await run({ subcommand: 'create', page: 'oak', title: 'Oak', body: '' });
    await run({ subcommand: 'move', page: 'oak', slug: 'oak-wood' });
    const { body } = await run({ page: 'oak' });
    expect(body).toContain('via');
    expect(body).toContain('main:oak-wood');
  });

  it('honours --spoiler for one reading', async () => {
    vi.spyOn(ShellApi, 'resolveSetting').mockReturnValue(0 as unknown as never);
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    await run({
      subcommand: 'create',
      page: 'boss',
      body: 'a <spoiler level="2">mimic</spoiler>',
    });
    const collapsed = await run({ page: 'boss' });
    expect(collapsed.body).toContain('<spoiler level="2">');
    const opened = await run({ page: 'boss', spoiler: '2' });
    expect(opened.body).not.toContain('<spoiler');
    expect(opened.body).toContain('mimic');
  });

  it('refuses a read with no page named', async () => {
    const { notes } = await run({ subcommand: 'read' });
    expect(reasons(notes)).toContain('page-required');
  });
});

describe('edit', () => {
  it('replaces the body and appends a revision', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    const { body } = await run({ subcommand: 'edit', page: 'oak', body: 'v2' });
    expect(body).toContain('rev 2');
    expect(db.all(Collections.WikiRevisions)).toHaveLength(2);
  });

  it('changes only the frontmatter fields that were passed', async () => {
    await run({
      subcommand: 'create',
      page: 'oak',
      title: 'Oak',
      body: 'v1',
      tag: 'wood',
    });
    await run({ subcommand: 'edit', page: 'oak', title: 'Oak Wood', body: 'v2' });
    const row = db.all(Collections.Wiki)[0]!;
    expect(row.title).toBe('Oak Wood');
    // Untouched — an unpassed option does not clear the field.
    expect(row.tags).toEqual(['wood']);
  });

  it('⭐ frontmatter-only: options and no body do NOT demand a body', async () => {
    // Caught by driving it in a browser. `wiki edit oak --reveal 2`
    // used to open the article editor, which meant an author who
    // wanted to retitle a page had to retype the whole article — and
    // that there was no way to change frontmatter WITHOUT rewriting
    // the body. The controller's own comment described a path that was
    // unreachable from the shell.
    await run({ subcommand: 'create', page: 'oak', title: 'Oak', body: 'PROSE' });
    const { body, notes } = await run({
      subcommand: 'edit',
      page: 'oak',
      reveal: '2',
    });
    expect(reasons(notes)).toEqual([]);
    expect(body).toContain('Updated');
    // The level changed…
    expect(row().spoilerLevel).toBe(2);
    // …and the prose is untouched, with no new revision appended.
    expect(row().body).toBe('PROSE');
    expect(db.all(Collections.WikiRevisions)).toHaveLength(1);
  });

  it('an explicit --section still means prose, whatever else was passed', async () => {
    await run({
      subcommand: 'create',
      page: 'oak',
      body: '<h2 anchor="uses">Uses</h2>x',
    });
    const { notes } = await run({
      subcommand: 'edit',
      page: 'oak',
      reveal: '1',
      section: 'uses',
      body: '<h2 anchor="uses">Uses</h2>REWRITTEN',
    });
    expect(reasons(notes)).toEqual([]);
    expect(String(row().body)).toContain('REWRITTEN');
    expect(row().spoilerLevel).toBe(1);
  });

  it('refuses an edit to a page that does not exist', async () => {
    const { notes } = await run({ subcommand: 'edit', page: 'nope', body: 'x' });
    expect(reasons(notes)).toContain('no-such-page');
  });
});

describe('history and rollback', () => {
  it('lists revisions newest-first with author and summary', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v2' });
    const { body } = await run({ subcommand: 'history', page: 'oak' });
    const first = body.indexOf('2. edit');
    const second = body.indexOf('1. create');
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
  });

  it('rolls back and says which rev was restored', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v2' });
    const { body } = await run({
      subcommand: 'rollback',
      page: 'oak',
      rev: '1',
    });
    expect(body).toContain('Restored rev 1');
    expect(db.all(Collections.Wiki)[0]!.body).toBe('v1');
  });

  it('refuses a non-numeric rev', async () => {
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    const { notes } = await run({
      subcommand: 'rollback',
      page: 'oak',
      rev: 'latest',
    });
    expect(reasons(notes)).toContain('rev-required');
  });
});

describe('move, delete, undelete, protect', () => {
  it('move reports that the old name still works', async () => {
    await run({ subcommand: 'create', page: 'oak', body: '' });
    const { body } = await run({
      subcommand: 'move',
      page: 'oak',
      slug: 'oak-wood',
    });
    expect(body).toContain('still resolves');
  });

  it('delete then undelete round-trips', async () => {
    await run({ subcommand: 'create', page: 'oak', title: 'Oak', body: '' });
    await run({ subcommand: 'delete', page: 'oak' });
    expect((await run({ page: 'oak' })).body).toContain('wiki create');
    await run({ subcommand: 'undelete', page: 'oak' });
    expect((await run({ page: 'oak' })).body).toContain('Oak');
  });

  it('a non-moderator is refused a delete, with a reason', async () => {
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    await run({ subcommand: 'create', page: 'oak', body: '' });
    const { notes } = await run({ subcommand: 'delete', page: 'oak' });
    expect(reasons(notes)).toContain('wiki-denied');
  });

  it('protect reports the EFFECTIVE level, not what was asked for', async () => {
    vi.spyOn(zone, 'lookupField').mockResolvedValue(
      'editors' as unknown as never,
    );
    await run({ subcommand: 'create', page: 'oak', body: '' });
    // Asking for `anyone` inside an `editors` namespace cannot loosen
    // it, and the readout says so rather than confirming the request.
    const { body } = await run({
      subcommand: 'protect',
      page: 'oak',
      level: 'anyone',
    });
    expect(body).toContain('editors');
  });

  it('refuses an unknown protection level', async () => {
    await run({ subcommand: 'create', page: 'oak', body: '' });
    const { notes } = await run({
      subcommand: 'protect',
      page: 'oak',
      level: 'everyone',
    });
    expect(reasons(notes)).toContain('bad-protection');
  });

  it('`none` clears a per-page override', async () => {
    await run({ subcommand: 'create', page: 'oak', body: '' });
    await run({ subcommand: 'protect', page: 'oak', level: 'moderators' });
    await run({ subcommand: 'protect', page: 'oak', level: 'none' });
    expect(db.all(Collections.Wiki)[0]!.protection).toBeNull();
  });
});

describe('purge', () => {
  it('destroys page and revisions when there is nobody to confirm', async () => {
    // No `interactive` on the context — a scripted caller has already
    // cleared the moderator gate, and a prompt it cannot answer would
    // hang rather than protect.
    await run({ subcommand: 'create', page: 'oak', body: 'v1' });
    await run({ subcommand: 'edit', page: 'oak', body: 'v2' });
    const { body } = await run({ subcommand: 'purge', page: 'oak' });
    expect(body).toContain('2 revisions');
    expect(db.all(Collections.Wiki)).toHaveLength(0);
    // The tombstone survives: the act is recorded, the content is gone.
    expect(db.all(Collections.WikiRevisions)).toHaveLength(1);
    expect(String(db.all(Collections.WikiRevisions)[0]!.summary)).toContain(
      'purged',
    );
  });

  it('refuses a non-moderator', async () => {
    vi.spyOn(AccessApi, 'canMutateZone').mockResolvedValue(false);
    await run({ subcommand: 'create', page: 'oak', body: '' });
    const { notes } = await run({ subcommand: 'purge', page: 'oak' });
    expect(reasons(notes)).toContain('wiki-denied');
    expect(db.all(Collections.Wiki)).toHaveLength(1);
  });
});

describe('list', () => {
  it('lists every page, flagging subject-bound ones', async () => {
    await run({
      subcommand: 'create',
      page: 'oak',
      body: '',
      subject: 'template:/stuff/idea/material/oak',
    });
    await run({ subcommand: 'create', page: 'lore:ordinance', body: '' });
    const { body } = await run({ subcommand: 'list' });
    expect(body).toContain('main:oak');
    expect(body).toContain('[template: /stuff/idea/material/oak]');
    expect(body).toContain('lore:ordinance');
  });

  it('filters to one namespace', async () => {
    await run({ subcommand: 'create', page: 'oak', body: '' });
    await run({ subcommand: 'create', page: 'lore:ordinance', body: '' });
    const { body } = await run({ subcommand: 'list', namespace: 'lore' });
    expect(body).toContain('lore:ordinance');
    expect(body).not.toContain('main:oak');
  });
});

describe('the envelope contract', () => {
  it('an unknown subcommand is a named rejection', async () => {
    const { notes } = await run({ subcommand: 'frobnicate' });
    expect(reasons(notes)).toContain('unknown-subcommand');
  });

  it('every refusal returns void and rides a note', async () => {
    // Controllers return `void`; the outcome is the envelope's. A
    // `{success:false}` return would be invisible to the dispatcher.
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
    const result = await ExecutionContextApi.runRoot(null, 'x', async () => {
      ExecutionContextApi.tagActingAuthor(giver);
      return ctrl.execute({ subcommand: 'nope' } as never, ctx);
    });
    expect(result).toBeUndefined();
    expect(ctx.getNotes().length).toBeGreaterThan(0);
  });

  it('a rejection escalates the dispatch status to `declined`', async () => {
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
      await ctrl.execute({ subcommand: 'nope' } as never, ctx);
    });
    expect(ctx.getStatus()).toBe('declined');
  });
});
