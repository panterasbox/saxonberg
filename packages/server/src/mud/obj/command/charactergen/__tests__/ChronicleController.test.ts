/**
 * ChronicleController — the self-view render. Asserts the partitioned
 * order: bio → claims by `order` asc → deeds by `when` asc, NEVER
 * interleaved (even when seeded out of order). Plus the empty state.
 *
 * Entries are seeded through `ChronicleApi` against the in-memory PM
 * stub; the controller reads them back via `entriesFor`. The emitted
 * scene body is captured by stubbing `MessageApi.scene`.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChronicleController from '../ChronicleController';
import { ChronicleApi } from '../../../../api/chronicle';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { PersonaMixin } from '../../../../lib/character/Persona';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../api/command';

class Actor extends PersonaMixin(Idea) {}

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let captured: Mml | null;

function captureBody(): void {
  captured = null;
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      captured = body;
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
  captureBody();
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function ctxFor(actor: Idea): CommandContext {
  return {
    commandGiver: actor as never,
    note: vi.fn(),
  } as unknown as CommandContext;
}

describe('ChronicleController render', () => {
  it('renders bio → claims (by order) → deeds (by when), never interleaved', async () => {
    const actor = makeStuffAtPath(() => new Actor(), '/obj/Avatar/render');
    actor.setBio('I am a healer.');

    // Seed deliberately OUT of order.
    await ChronicleApi.seedClaims(actor, [
      { text: 'claim-two', order: 2 },
      { text: 'claim-one', order: 1 },
    ]);
    await ChronicleApi.record(actor, {
      kind: 'deed',
      text: 'deed-late',
      when: 200,
    });
    await ChronicleApi.record(actor, {
      kind: 'deed',
      text: 'deed-early',
      when: 100,
    });

    const ctrl = makeStuff(() => new ChronicleController());
    await ctrl.execute({} as CommandModel, ctxFor(actor));

    expect(captured).not.toBeNull();
    const body = captured!.toString();
    const at = (s: string) => body.indexOf(s);
    expect(at('I am a healer.')).toBeGreaterThanOrEqual(0);
    expect(at('I am a healer.')).toBeLessThan(at('claim-one'));
    expect(at('claim-one')).toBeLessThan(at('claim-two'));
    expect(at('claim-two')).toBeLessThan(at('deed-early'));
    expect(at('deed-early')).toBeLessThan(at('deed-late'));
  });

  it('renders an empty-state line plus the bio when there are no entries', async () => {
    const actor = makeStuffAtPath(() => new Actor(), '/obj/Avatar/empty');
    actor.setBio('A blank slate.');

    const ctrl = makeStuff(() => new ChronicleController());
    await ctrl.execute({} as CommandModel, ctxFor(actor));

    const body = captured!.toString();
    expect(body).toContain('A blank slate.');
    expect(body).toContain('just beginning');
  });
});
