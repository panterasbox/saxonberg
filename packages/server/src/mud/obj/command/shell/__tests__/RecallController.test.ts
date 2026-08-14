/**
 * `recall` — one verb, three corpora, and a real command every time.
 *
 * ⚠ The point of the suite is the SCOPE ARGUMENT, not the search.
 * Relevance tuning is explicitly out of scope for this build (D5), so
 * what has to hold is that a scope reaches the corpus it names, that an
 * unknown scope is a named refusal rather than a silent default, and
 * that `frames` is the caller's own store.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RecallController from '../RecallController';
import Avatar from '../../../Avatar';
import { CommandApi, type CommandModel } from '../../../../api/command';
import type { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { MessageApi } from '../../../../api/message';
import { RecordApi } from '../../../../api/record';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { Collections } from '../../../../lib/persistence/Collections';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import {
  installRecordTestDb,
  type RecordTestDb,
} from '../../../../lib/persistence/__tests__/record-test-db';
import type { Note } from '@saxonberg/types';
import type { MessageFrame } from '@saxonberg/types';

let db: RecordTestDb;
let giver: Avatar;
let sent: string[];

function makeAvatar(playerId: string): Avatar {
  const a = makeStuff(() => new Avatar());
  a.setPlayerId(playerId);
  return a;
}

let frameSeq = 0;
function deliver(avatar: Avatar, body: string, topic = 'speech.vocal'): void {
  frameSeq += 1;
  const f: MessageFrame = {
    id: `f${frameSeq}`,
    topic,
    body,
    meta: { timestamp: Date.now() },
  };
  (avatar as unknown as { onMessage(f: MessageFrame): void }).onMessage(f);
}

async function run(
  model: Partial<CommandModel>,
): Promise<{ body: string; notes: readonly Note[] }> {
  sent = [];
  const ctrl = makeStuff(() => new RecallController());
  const ctx = CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: null,
    commandText: 'recall',
    executionId: 'e',
    commandId: 'c',
    verb: 'recall',
    command: { verbs: ['recall'] } as unknown as CommandDefinition,
  });
  await ExecutionContextApi.runRoot(null, 'recall.cmd', async () => {
    ExecutionContextApi.tagActingAuthor(giver);
    await ctrl.execute(model as never, ctx);
  });
  return { body: sent.join(''), notes: ctx.getNotes() };
}

function reasons(notes: readonly Note[]): string[] {
  return notes
    .filter(
      (n): n is Extract<Note, { kind: 'controller-rejected' }> =>
        n.kind === 'controller-rejected',
    )
    .map((n) => n.reason);
}

beforeEach(() => {
  vi.restoreAllMocks();
  db = installRecordTestDb();
  db.reset();
  RecordApi._clearAllForTesting();
  sent = [];
  giver = makeAvatar('p1');
  vi.spyOn(MessageApi, 'scene').mockImplementation(
    () =>
      ({
        topic: () => ({
          toSelf: (body: unknown) => ({
            send: () => {
              sent.push(String(body));
            },
          }),
        }),
      }) as never,
  );
});

afterEach(() => {
  RecordApi._clearAllForTesting();
  vi.restoreAllMocks();
});

describe('recall', () => {
  it('defaults to the frames scope', async () => {
    deliver(giver, 'the anvil rang like a bell');
    await RecordApi.flush();

    const { body } = await run({ terms: 'anvil' });
    expect(body).toContain('frames');
    expect(body).toContain('anvil');
  });

  it('⚠ renders as lines, not as a comma-joined array', async () => {
    deliver(giver, 'the anvil rang like a bell');
    deliver(giver, 'the anvil rang again');
    await RecordApi.flush();

    const { body } = await run({ terms: 'anvil' });
    /*
     * Found by DRIVING. `Mml.compose` interpolating an array stringifies
     * it with commas, so the readout shipped as
     * `,\n  sense.survey · 4m ago\n,    the lounge…` — one stray comma
     * per line, on every hit.
     *
     * ⚠⚠ Every assertion in this file was `toContain`, and a comma
     * sitting beside the text you are looking for is precisely what
     * `toContain` cannot notice. So this one asserts the SHAPE: no line
     * begins with a separator.
     */
    for (const line of body.split('\n')) {
      expect(line.trimStart().startsWith(',')).toBe(false);
    }
  });

  it('refuses an unknown scope by NAME rather than defaulting', async () => {
    const { body, notes } = await run({ terms: 'anvil', scope: 'chronicle' });
    expect(reasons(notes)).toContain('unknown-scope');
    // The refusal has to say what IS available, or a typo is a dead end.
    expect(body).toContain('frames');
    expect(body).toContain('wiki');
    expect(body).toContain('forums');
  });

  it('refuses with no terms', async () => {
    const { notes } = await run({ terms: '  ' });
    expect(reasons(notes)).toContain('terms-required');
  });

  it('says so plainly when nothing matches', async () => {
    deliver(giver, 'the anvil rang');
    await RecordApi.flush();

    const { body, notes } = await run({ terms: 'zeppelin' });
    // Not a rejection — an empty result is an answer, not a failure.
    expect(reasons(notes)).toEqual([]);
    expect(body).toContain('Nothing in frames');
  });

  it('reaches the wiki, and skips a soft-deleted page', async () => {
    db.seed(Collections.Wiki, [
      {
        namespace: 'main',
        slug: 'oak',
        title: 'Oak',
        body: 'A dense hardwood, good for a haft.',
        deletedAt: null,
      },
      {
        namespace: 'main',
        slug: 'ghost',
        title: 'Ghost Oak',
        body: 'A dense hardwood nobody should find.',
        deletedAt: 1,
      },
    ]);

    const { body } = await run({ terms: 'hardwood', scope: 'wiki' });
    expect(body).toContain('Oak');
    expect(body).not.toContain('Ghost Oak');
    // Every clickable previews exactly what it sends.
    expect(body).toContain('wiki read main:oak');
  });

  it('reaches the forums', async () => {
    db.seed(Collections.ForumEntries, [
      {
        board: 'b1',
        parent: null,
        title: 'On the tithe',
        body: 'The tithe is set too high this season.',
      },
    ]);

    const { body } = await run({ terms: 'tithe', scope: 'forums' });
    expect(body).toContain('On the tithe');
    expect(body).toContain('forum thread');
  });

  it('never reaches another player’s frames', async () => {
    const other = makeAvatar('p2');
    deliver(other, 'a secret about the anvil');
    await RecordApi.flush();

    const { body } = await run({ terms: 'anvil' });
    expect(body).toContain('Nothing in frames');
  });
});
