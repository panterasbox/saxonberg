/**
 * ForumsApi.readArgumentLens — the neutral default lens (forums cycle 2,
 * Wave 2): spine + valence-grouped children + the open-objection flag,
 * computed from pure relations.
 *
 *   - lens order is structural: a parent's children group Supporting →
 *     Objections → Questions; never by score.
 *   - `openObjection` is an `objects-to` with no answering child; attaching
 *     ANY child clears it (the "answer it" rule).
 *   - the lens reads no `up`/`down` — a lopsided vote count never reorders.
 *
 * Harness mirrors forums.test.ts (Mongo faked; non-avatar actors).
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
import type Entry from '../../lib/forum/Entry';

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

class Actor extends Idea {}
function makeActor(): Stuff {
  return makeStuff(() => new Actor());
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

/** A spine with one pro, one con (open), and one question under it. */
async function buildMap() {
  const creator = makeActor();
  const { board } = await ForumsApi.makeForum(creator, 'RCV', {
    open: true,
    organizer: 'ordered',
  });
  const spine = await ForumsApi.postThread(
    creator,
    board,
    'RCV',
    'Adopt ranked-choice voting.',
  );
  const pro = await ForumsApi.attachClaim(creator, spine, 'supports', 'Reduces spoilers.');
  const con = await ForumsApi.attachClaim(creator, spine, 'objects-to', 'Harder to count.');
  const question = await ForumsApi.attachClaim(
    creator,
    spine,
    'responds-to',
    'What is RCV?',
  );
  return { creator, board, spine, pro, con, question };
}

const idOf = (n: { entry: Entry }) => n.entry._id;
const flagOf = (nodes: { entry: Entry; openObjection: boolean }[], e: Entry) =>
  nodes.find((n) => n.entry._id === e._id)?.openObjection;

describe('the neutral default lens', () => {
  it('orders children Supporting → Objections → Questions (structural, not ranked)', async () => {
    const { board, spine, pro, con, question } = await buildMap();
    const lens = await ForumsApi.readArgumentLens(board);

    // Parent-before-child, spine first, then valence-grouped children.
    expect(lens.map(idOf)).toEqual([spine._id, pro._id, con._id, question._id]);
  });

  it('a lopsided vote count never reorders the lens (reads no up/down)', async () => {
    const { board, pro, con } = await buildMap();
    // Stuff the con with a huge score and zero the pro — under popularity
    // this would float the con; the argument lens must ignore it.
    con.up = 999;
    await con.save();
    pro.up = 0;
    await pro.save();

    const lens = await ForumsApi.readArgumentLens(board);
    const proIdx = lens.findIndex((n) => n.entry._id === pro._id);
    const conIdx = lens.findIndex((n) => n.entry._id === con._id);
    expect(proIdx).toBeLessThan(conIdx); // supports still before objects-to
  });

  it('flags an open objection and clears it when answered', async () => {
    const { creator, board, pro, con, question } = await buildMap();
    let lens = await ForumsApi.readArgumentLens(board);

    // Only the childless objection is open.
    expect(flagOf(lens, con)).toBe(true);
    expect(flagOf(lens, pro)).toBe(false);
    expect(flagOf(lens, question)).toBe(false);

    // Answer it — attach ANY child to the objection.
    await ForumsApi.attachClaim(creator, con, 'objects-to', 'Software counts fine.');
    lens = await ForumsApi.readArgumentLens(board);
    expect(flagOf(lens, con)).toBe(false); // answered → no longer open
  });
});
