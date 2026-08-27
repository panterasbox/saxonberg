/**
 * ForumsApi — the argument organizer (forums cycle 2, Wave 1): the typed
 * claim-graph contribution surface over the shared Board/Entry store.
 *
 *   - `makeForum({ organizer: 'ordered' })` lights an `argument-forum`
 *     manifestation; a root Entry is the prose **spine** (no vote seeding —
 *     argument entries are reputation-blind).
 *   - `attachClaim` builds a typed edge (`supports` / `objects-to` /
 *     `responds-to`), at arbitrary depth (the depth-2 rebuttal).
 *   - the relation vocabulary is **organizer-scoped**: a popularity `reply`
 *     is refused on an argument board and a typed edge on a popularity one.
 *   - voting is refused on an argument board (nothing is ranked here).
 *   - `editBody` edits in place AND appends a lossless `'entry-edited'`
 *     event carrying the prior body.
 *
 * Harness mirrors forums.test.ts: Mongo faked in-memory; actors are
 * non-avatars (author = stuffId); open subjects skip the group machinery.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForumsApi } from '../forums';
import SubjectCatalogue from '../../platform/idea/SubjectCatalogue';
import { Idea } from '../../lib/stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { StuffApi } from '../stuff';
import { PlayerApi } from '../player';
import type { Stuff } from '../../lib/stuff/Stuff';

let store: Map<string, Map<string, Record<string, unknown>>>;
let idCounter = 0;

function col(name: string): Map<string, Record<string, unknown>> {
  let c = store.get(name);
  if (!c) {
    c = new Map();
    store.set(name, c);
  }
  return c;
}

/** Event-log rows of a given kind (the append-only `forum_events`). */
function eventsOfKind(kind: string): Record<string, unknown>[] {
  return [...col('forum_events').values()].filter((e) => e.kind === kind);
}

class Actor extends Idea {}
function makeActor(): Stuff {
  return makeStuff(() => new Actor());
}

async function makeArgumentBoard(creator: Stuff) {
  const { board, subject } = await ForumsApi.makeForum(creator, 'RCV', {
    open: true,
    organizer: 'ordered',
  });
  const spine = await ForumsApi.postThread(
    creator,
    board,
    'Ranked-choice voting',
    'Adopt ranked-choice voting.',
  );
  return { board, subject, spine };
}

beforeEach(() => {
  StuffApi.clearAll();
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'save').mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      col(c).set(id, { ...doc, _id: id });
      return id;
    },
  );
  vi.spyOn(pm, 'find').mockImplementation(
    async (c: string, query: Record<string, unknown>) =>
      [...col(c).values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
  );
  vi.spyOn(pm, 'findById').mockImplementation(
    async (c: string, id: string) => (col(c).get(id) ?? null) as never,
  );
  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(false as never);
  makeStuffAtPath(() => new SubjectCatalogue(), '/platform/idea/SubjectCatalogue');
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('argument board creation + the spine', () => {
  it('lights an argument-forum manifestation with a reputation-blind spine', async () => {
    const creator = makeActor();
    const { board, subject, spine } = await makeArgumentBoard(creator);

    expect(board.getOrganizer()).toBe('ordered');
    expect(subject.hasManifestation('ordered-forum')).toBe(true);
    expect(subject.manifestationRef('ordered-forum')).toBe(board._id);
    // The spine is a root (parent: null) and is NOT vote-seeded.
    expect(spine.isRoot()).toBe(true);
    expect(spine.up).toBe(0);
    expect(eventsOfKind('vote-cast')).toHaveLength(0);

    // Resolvable by its flat handle (argument manifestation, not popularity).
    const view = await ForumsApi.resolveBoardByHandle('RCV');
    expect(view?.board._id).toBe(board._id);
    expect(view?.board.getOrganizer()).toBe('ordered');
  });
});

describe('typed-edge contribution (attachClaim)', () => {
  it('attaches pro / con / question edges, including a depth-2 rebuttal', async () => {
    const creator = makeActor();
    const { spine } = await makeArgumentBoard(creator);

    const pro = await ForumsApi.attachClaim(
      creator,
      spine,
      'supports',
      'Reduces the spoiler effect.',
    );
    const con = await ForumsApi.attachClaim(
      creator,
      spine,
      'objects-to',
      'Ballots are harder to count.',
    );
    const question = await ForumsApi.attachClaim(
      creator,
      spine,
      'responds-to',
      'What does ranked-choice mean exactly?',
    );
    // Depth-2 rebuttal: an objection attached to the PRO (an argument
    // about an argument) — depth in the tree, not a fourth edge.
    const rebuttal = await ForumsApi.attachClaim(
      creator,
      pro,
      'objects-to',
      'The Maine 2018 data is thin.',
    );

    expect(pro.getRelation()).toBe('supports');
    expect(con.getRelation()).toBe('objects-to');
    expect(question.getRelation()).toBe('responds-to');
    expect(pro.getParent()).toBe(spine._id);
    expect(rebuttal.getParent()).toBe(pro._id);
    // Reputation-blind: claims are never vote-seeded.
    expect(pro.up).toBe(0);
    // Four contributions → four append-only rows, one per claim.
    expect(eventsOfKind('argument-attached')).toHaveLength(4);
  });
});

describe('organizer-scoped vocabulary', () => {
  it('an argument board refuses a popularity reply', async () => {
    const creator = makeActor();
    const { spine } = await makeArgumentBoard(creator);
    await expect(ForumsApi.reply(creator, spine, 'just a reply')).rejects.toThrow(
      /--pro|--con|argument/i,
    );
  });

  it('an open board refuses a typed edge', async () => {
    const creator = makeActor();
    const { board } = await ForumsApi.makeForum(creator, 'Gossip', {
      open: true,
    });
    const thread = await ForumsApi.postThread(creator, board, 'Hi', 'body');
    await expect(
      ForumsApi.attachClaim(creator, thread, 'supports', 'nope'),
    ).rejects.toThrow(/not valid on an open/i);
  });
});

describe('voting is unavailable on an argument board', () => {
  it('refuses castVote', async () => {
    const creator = makeActor();
    const { spine } = await makeArgumentBoard(creator);
    const con = await ForumsApi.attachClaim(
      creator,
      spine,
      'objects-to',
      'A concern.',
    );
    const voter = makeActor();
    await expect(ForumsApi.castVote(voter, con, 'up')).rejects.toThrow(
      /argument board/i,
    );
  });
});

describe('edit-in-place with a lossless trail', () => {
  it('mutates the body and appends one entry-edited event carrying the prior body', async () => {
    const creator = makeActor();
    const { spine } = await makeArgumentBoard(creator);
    const con = await ForumsApi.attachClaim(
      creator,
      spine,
      'objects-to',
      'Ballots are harder to count.',
    );
    const priorBody = con.getBody();

    const edited = await ForumsApi.editBody(
      creator,
      con,
      'Counting is fine with modern software.',
    );

    // Edit-in-place: the body changed and an edit stamp landed.
    expect(edited.getBody()).not.toBe(priorBody);
    expect(edited.getBody()).toContain('modern software');
    expect(edited.getEditedAt()).not.toBeNull();

    // The lossless trail: exactly one append-only row carrying the prior body.
    const editEvents = eventsOfKind('entry-edited');
    expect(editEvents).toHaveLength(1);
    const data = editEvents[0]!.data as { priorBody?: string };
    expect(data.priorBody).toBe(priorBody);
  });
});

describe('the mature → vote seam', () => {
  it('emits a decoupled mature event with the board/subject keys and no consumer', async () => {
    const creator = makeActor();
    const { board, subject, spine } = await makeArgumentBoard(creator);
    const entriesBefore = col('forum_entries').size;

    await ForumsApi.matureArgument(creator, board);

    const mature = eventsOfKind('mature');
    expect(mature).toHaveLength(1);
    expect(mature[0]!.board).toBe(board._id);
    expect(mature[0]!.subject).toBe(subject._id);
    // Keys carry the spine so a thread subscription re-resolves too.
    expect(mature[0]!.thread).toBe(spine._id);
    expect(mature[0]!.entry).toBe(spine._id);

    // No consumer: nothing was bound — no entry created, no measure/vote
    // collection materialized; the board is otherwise unchanged.
    expect(col('forum_entries').size).toBe(entriesBefore);
    expect(store.get('measures')).toBeUndefined();
    expect(store.get('ballots')).toBeUndefined();
  });
});
