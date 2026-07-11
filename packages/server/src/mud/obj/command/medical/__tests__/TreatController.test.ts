/**
 * TreatController / UndressController — the medic vertical.
 *
 * treat: consumes a reachable dressing (gated on isDressing, not
 * instanceof Bandage), sets the wound `dressed` + arrests the bleed, mints
 * a medicine deed into the treater's Transcript, and the outcome grades by
 * competence (low vs high). undress: the clot gate — a premature removal
 * (above CLOT_SEVERITY) reopens the bleed; after clot it is safe.
 *
 * Mongo is faked (the PracticeController harness) so the Transcript writes;
 * MessageApi.scene is stubbed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TreatController from '../TreatController';
import UndressController from '../UndressController';
import Bandage from '../../../Bandage';
import { DressingMixin } from '../../../../lib/vitals/Dressing';
import Thing from '../../../../lib/stuff/Thing';
import Location from '../../../../lib/stuff/Location';
import { Creature } from '../../../../lib/creature/Creature';
import { AdvancementApi } from '../../../../api/advancement';
import { MessageApi } from '../../../../api/message';
import { ContainmentApi } from '../../../../api/containment';
import { StuffApi } from '../../../../api/stuff';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../api/command';
import type { Trauma } from '../../../../lib/vitals/Condition';
import { OUTCOMES, type Outcome } from '../../../../lib/advancement/ActSignature';

// A dressing-capable item that is NOT a Bandage — proves the gate is
// `isDressing`, not `instanceof Bandage`.
class CleanRag extends DressingMixin(Thing) {
  static _mixinName = 'CleanRag';
}

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

function fakeMongo(): void {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (_c: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
}

function stubScene(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

let note: ReturnType<typeof vi.fn>;
function ctxFor(actor: unknown, location: unknown): CommandContext {
  note = vi.fn();
  return { commandGiver: actor, location, note } as unknown as CommandContext;
}

function woundOf(c: Creature): Trauma {
  return c.getConditions().find((x) => x.kind === 'trauma') as Trauma;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  fakeMongo();
  WorldClockApi._setNowProviderForTesting(() => 100);
  stubScene();
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

/** A medic in a room, carrying `dressing`, with a bleeding foot wound. */
function medicWith(dressing: Thing, path: string, severity = 1.5): {
  medic: Creature;
  room: Location;
} {
  const room = makeStuff(() => new Location());
  const medic = makeStuff(() => new Creature());
  stampTemplatePathForTest(medic, path);
  ContainmentApi.move(medic, room);
  ContainmentApi.move(dressing, medic);
  medic.afflict({
    kind: 'trauma',
    type: 'laceration',
    site: 'body.leg.left.foot',
    severity,
    bleeding: true,
  });
  return { medic, room };
}

describe('TreatController', () => {
  it('consumes any isDressing item, sets dressed, arrests the bleed, mints a deed', async () => {
    const rag = makeStuff(() => new CleanRag()); // not a Bandage
    const { medic, room } = medicWith(rag, '/obj/Avatar/medic-a');
    const ctrl = makeStuff(() => new TreatController());

    await ctrl.execute({}, ctxFor(medic, room));

    const w = woundOf(medic);
    expect(w.dressed).toBe(true);
    expect(w.bleeding).toBe(false);
    // The dressing was consumed.
    expect(StuffApi.findById(rag.stuffId)).toBeFalsy();
    // A medicine deed was written.
    const rows = await AdvancementApi.entriesFor(medic, 'medicine');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every((r) => r.kind === 'deed')).toBe(true);
  });

  it('a Bandage is a valid dressing too', async () => {
    const bandage = makeStuff(() => new Bandage());
    const { medic, room } = medicWith(bandage, '/obj/Avatar/medic-b');
    const ctrl = makeStuff(() => new TreatController());
    await ctrl.execute({}, ctxFor(medic, room));
    expect(woundOf(medic).dressed).toBe(true);
    expect(StuffApi.findById(bandage.stuffId)).toBeFalsy();
  });

  it('rejects when there is no wound to dress', async () => {
    const room = makeStuff(() => new Location());
    const medic = makeStuff(() => new Creature());
    stampTemplatePathForTest(medic, '/obj/Avatar/medic-c');
    ContainmentApi.move(medic, room);
    ContainmentApi.move(makeStuff(() => new Bandage()), medic);
    const ctrl = makeStuff(() => new TreatController());

    await ctrl.execute({}, ctxFor(medic, room));
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'no-wound' })
    );
  });

  it('grades the outcome by competence — high beats low', async () => {
    const standardOutcome = (rows: { difficulty: string; outcome: Outcome }[]) =>
      rows.find((r) => r.difficulty === 'standard')!.outcome;

    // Low: an untrained treater.
    const low = medicWith(makeStuff(() => new Bandage()), '/obj/Avatar/low');
    await makeStuff(() => new TreatController()).execute(
      {},
      ctxFor(low.medic, low.room)
    );
    const lowRows = await AdvancementApi.entriesFor(low.medic, 'medicine');
    const lowOutcome = standardOutcome(lowRows);

    // High: seed medicine competence with hard/critical deeds (difficulty
    // 'hard' so the treat's 'standard' row is distinguishable).
    const high = medicWith(makeStuff(() => new Bandage()), '/obj/Avatar/high');
    for (let i = 0; i < 10; i++) {
      await AdvancementApi.recordDeed(high.medic, {
        discipline: 'medicine',
        difficulty: 'hard',
        outcome: 'critical',
      });
    }
    expect(await AdvancementApi.bandFor(high.medic, 'medicine')).not.toBe(
      'untrained'
    );
    await makeStuff(() => new TreatController()).execute(
      {},
      ctxFor(high.medic, high.room)
    );
    const highRows = await AdvancementApi.entriesFor(high.medic, 'medicine');
    const highOutcome = standardOutcome(highRows);

    expect(OUTCOMES.indexOf(highOutcome)).toBeGreaterThan(
      OUTCOMES.indexOf(lowOutcome)
    );
  });
});

describe('UndressController — the clot gate', () => {
  it('premature removal (above the clot threshold) reopens the bleed', async () => {
    const { medic, room } = medicWith(
      makeStuff(() => new Bandage()),
      '/obj/Avatar/undress-a',
      2
    );
    await makeStuff(() => new TreatController()).execute(
      {},
      ctxFor(medic, room)
    );
    expect(woundOf(medic).dressed).toBe(true);

    await makeStuff(() => new UndressController()).execute(
      {},
      ctxFor(medic, room)
    );
    const w = woundOf(medic);
    expect(w.dressed).toBe(false);
    expect(w.bleeding).toBe(true); // severity 2 > CLOT → reopened
  });

  it('a clotted (low-severity) wound is safe to undress', async () => {
    const { medic, room } = medicWith(
      makeStuff(() => new Bandage()),
      '/obj/Avatar/undress-b',
      2
    );
    await makeStuff(() => new TreatController()).execute(
      {},
      ctxFor(medic, room)
    );
    // Simulate the dressed wound having clotted (severity decayed low).
    woundOf(medic).severity = 0.2;

    await makeStuff(() => new UndressController()).execute(
      {},
      ctxFor(medic, room)
    );
    const w = woundOf(medic);
    expect(w.dressed).toBe(false);
    expect(w.bleeding).toBeFalsy(); // clotted → safe
  });
});
