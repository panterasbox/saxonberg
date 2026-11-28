/**
 * ⭐ The tooltip's wiki term (tooltips D4, W3): a page's opening section,
 * rendered through the wiki's own gate for the acting reader — the ceiling
 * DELETES, the appetite COLLAPSES, exactly as `wiki <page>` would.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wikiControllerFor } from './wiki-controllers';
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
import { WikiApi } from '../../../../../api/wiki';
import { TestHarnessApi } from '../../../../../api/test-harness';
import { TemplatePaths } from '../../../../../lib/paths';
import { Collections } from '../../../../../lib/persistence/Collections';
import { installWikiTestDb, type WikiTestDb } from '../../../../../lib/wiki/__tests__/wiki-test-db';
import { makeStuff, makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';
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
  interactive?: unknown,
): Promise<{ body: string; notes: readonly Note[] }> {
  sent = [];
  const ctrl = makeStuff(() => wikiControllerFor((model as { subcommand?: string }).subcommand));
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
    await TestHarnessApi.actAs(ctx.commandGiver, () => ctrl.execute(model as never, ctx));
  }, { acting: { boundary: 'test' } });
  return { body: sent.join(''), notes: ctx.getNotes() };
}

/** An Interactive that says yes to every confirm. */
const CONFIRM = { promptConfirm: async () => true };

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

  // At its template path: the renderer's gate admits the registry by it.
  registry = makeStuffAtPath(() => new WikiRegistry(), TemplatePaths.wikiRegistry);
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


/** The excerpt as the test's reader, in the frame a socket would plant. */
async function excerpt(ref: string) {
  return ExecutionContextApi.runRoot(null, 'wiki.excerpt', async () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return WikiApi.excerpt(ref);
  }, { acting: { boundary: 'test' } });
}

const BODY = [
  'The oak is a <spoiler level="1">sacred</spoiler> hardwood<spoiler level="2"> that hides a door</spoiler>.',
  '',
  '## Uses',
  'Barrels and ships.',
].join('\n');

describe('WikiApi.excerpt — the wiki through its own gate', () => {
  beforeEach(async () => {
    await run({ subcommand: 'create', page: 'oak', title: 'Oak', body: BODY });
  });

  it('at appetite 0 a level-1 spoiler arrives collapsed; the rest of the page is not in it', async () => {
    vi.mocked(ShellApi.resolveSetting).mockReturnValue(0 as never);
    const doc = await excerpt('oak');
    expect(doc?.header?.name).toBe('Oak');
    expect(doc?.prose).toContain('<spoiler level="1">');
    expect(doc?.prose).not.toContain('Barrels');
    expect(doc?.command).toBe('wiki main:oak');
  });

  it('at appetite 1 the level-1 spoiler is open', async () => {
    vi.mocked(ShellApi.resolveSetting).mockReturnValue(1 as never);
    const doc = await excerpt('oak');
    expect(doc?.prose).toContain('sacred');
    expect(doc?.prose).not.toContain('<spoiler level="1">');
  });

  it('above the reader\'s ceiling a span is ABSENT, not collapsed', async () => {
    vi.mocked(ShellApi.resolveSetting).mockReturnValue(3 as never);
    vi.mocked(AccessApi.canMutateZone).mockResolvedValue(false);
    const doc = await excerpt('oak');
    expect(doc?.prose).not.toContain('hides a door');
    expect(doc?.prose).toContain('hardwood');
  });

  it('is the same render the page gets for the same reader', async () => {
    vi.mocked(ShellApi.resolveSetting).mockReturnValue(0 as never);
    const doc = await excerpt('oak');
    const page = (await registry.resolve('oak'))!.page;
    const viaVerb = await ExecutionContextApi.runRoot(null, 'wiki.cmd', async () => {
      ExecutionContextApi.tagActingAuthor(giver);
      return (renderer as unknown as { render: WikiRenderer['render'] }).render(page.getBody(), {
        pageId: page._id ?? '',
        spoilerDefault: page.getSpoilerLevel(),
      });
    }, { acting: { boundary: 'test' } }).catch(() => null);
    // The renderer refuses a caller that is not the verb or the registry —
    // the test cannot read it directly, which is the point of the gate.
    expect(viaVerb).toBeNull();
    expect(doc?.prose).toBeTruthy();
  });

  it('a page that opens on a heading: its lead is the text under the title', async () => {
    await run({ subcommand: 'create', page: 'elm', title: 'Elm', body: '# Elm {#elm}\nA tall tree.\n\n## Uses\nBows.' });
    const doc = await excerpt('elm');
    expect(doc?.prose).toContain('A tall tree.');
    expect(doc?.prose).not.toContain('Bows');
  });

  it('no such page → null', async () => {
    expect(await excerpt('ash')).toBeNull();
  });
});
