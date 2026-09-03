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

import "../../../../../../test-bootstrap";
import { AdvancementMixin } from "../../../../../lib/advancement/Advancement";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TreatController from '../TreatController';
import UndressController from '../UndressController';
import Bandage from '../../../../thing/Bandage';
import { DressingMixin } from '../../../../../lib/vitals/Dressing';
import Thing from '../../../../../lib/stuff/Thing';
import Location from '../../../../../lib/stuff/Location';
import { Creature } from '../../../../../lib/creature/Creature';
import { MessageApi } from '../../../../../api/message';
import { ContainmentApi } from '../../../../../api/containment';
import { StuffApi } from '../../../../../api/stuff';
import { WorldClockApi } from '../../../../../api/worldclock';
import '../../../WorldClockRegistry'; // registers the class the reconcile probes for
import { PersistenceManager } from '../../../../../../backend/PersistenceManager';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Quantity } from '../../../../../lib/quantity';
import type { CommandContext } from '../../../../../api/command';
import type { Trauma } from '../../../Condition';
import { OUTCOMES, type Outcome } from '../../../../../lib/advancement/ActSignature';

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
  medic: MedicCreature;
  room: Location;
} {
  const room = makeStuff(() => new Location());
  const medic = makeStuff(() => new MedicCreature());
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

// The medicine-band read + the treat credit run ON the medic since the
// OO sweep — compose the transcript face onto the fixture creature.
class MedicCreature extends AdvancementMixin(Creature) {}

describe('TreatController', () => {
  it('consumes any isDressing item, sets dressed, arrests the bleed, mints a deed', async () => {
    const rag = makeStuff(() => new CleanRag()); // not a Bandage
    const { medic, room } = medicWith(rag, '/platform/agent/Avatar/medic-a');
    const ctrl = makeStuff(() => new TreatController());

    await ctrl.execute({}, ctxFor(medic, room));

    const w = woundOf(medic);
    expect(w.dressed).toBe(true);
    expect(w.bleeding).toBe(false);
    // The dressing was consumed.
    expect(StuffApi.findById(rag.stuffId)).toBeFalsy();
    // A medicine deed was written.
    const rows = await medic.transcriptEntries('medicine');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every((r) => r.kind === 'deed')).toBe(true);
  });

  it('a Bandage is a valid dressing too', async () => {
    const bandage = makeStuff(() => new Bandage());
    const { medic, room } = medicWith(bandage, '/platform/agent/Avatar/medic-b');
    const ctrl = makeStuff(() => new TreatController());
    await ctrl.execute({}, ctxFor(medic, room));
    expect(woundOf(medic).dressed).toBe(true);
    expect(StuffApi.findById(bandage.stuffId)).toBeFalsy();
  });

  it('rejects when there is no wound to dress', async () => {
    const room = makeStuff(() => new Location());
    const medic = makeStuff(() => new MedicCreature());
    stampTemplatePathForTest(medic, '/platform/agent/Avatar/medic-c');
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
    const low = medicWith(makeStuff(() => new Bandage()), '/platform/agent/Avatar/low');
    await makeStuff(() => new TreatController()).execute(
      {},
      ctxFor(low.medic, low.room)
    );
    const lowRows = await low.medic.transcriptEntries('medicine');
    const lowOutcome = standardOutcome(lowRows);

    // High: seed medicine competence with hard/critical deeds (difficulty
    // 'hard' so the treat's 'standard' row is distinguishable).
    const high = medicWith(makeStuff(() => new Bandage()), '/platform/agent/Avatar/high');
    for (let i = 0; i < 10; i++) {
      await high.medic.creditDeed({
        discipline: 'medicine',
        difficulty: 'hard',
        outcome: 'critical',
      });
    }
    expect(await high.medic.competenceBandFor('medicine')).not.toBe(
      'untrained'
    );
    await makeStuff(() => new TreatController()).execute(
      {},
      ctxFor(high.medic, high.room)
    );
    const highRows = await high.medic.transcriptEntries('medicine');
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
      '/platform/agent/Avatar/undress-a',
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
      '/platform/agent/Avatar/undress-b',
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

/**
 * Stabilization — the first time a non-combat Discipline decides whether
 * someone lives.
 *
 * The distinction the whole seam turns on: `treat` on a dying body
 * RESCUES, it does not HEAL. Whatever drove them under is untouched, so a
 * body still below its threshold falls back into the window on the next
 * reconcile. Stabilizing someone in a snowdrift buys them time, not a
 * life.
 */
describe('TreatController — stabilization', () => {
  /** A patient in the dying window, and a medic with a dressing. */
  function dyingPatient(): {
    medic: MedicCreature;
    patient: Creature;
    room: Location;
    dressing: Thing;
  } {
    const room = makeStuff(() => new Location());
    const medic = makeStuff(() => new MedicCreature());
    stampTemplatePathForTest(medic, '/platform/agent/Avatar/medic-stab');
    const patient = makeStuff(() => new MedicCreature());
    stampTemplatePathForTest(patient, '/platform/agent/Avatar/patient-stab');
    patient.setLifecycleState('alive');
    const dressing = makeStuff(() => new Bandage());
    ContainmentApi.move(medic, room);
    ContainmentApi.move(patient, room);
    ContainmentApi.move(dressing, medic);
    return { medic, patient, room, dressing };
  }

  it('pulls a dying body out of the window — with NO wound to dress', async () => {
    const { medic, patient, room } = dyingPatient();
    // Dying of cold: there is nothing to bandage, and the old controller
    // would have refused with "no wound to dress".
    patient.beginDying('hypothermia', 300);
    expect(patient.isDying()).toBe(true);

    const ctrl = makeStuff(() => new TreatController());
    await ctrl.execute(
      { target: { stuff: patient } } as never,
      ctxFor(medic, room),
    );

    expect(patient.isDying()).toBe(false);
    expect(patient.getLifecycleState()).not.toBe('dead');
  });

  it('rescued is NOT healed — what was killing them is untouched', async () => {
    const { medic, patient, room } = dyingPatient();
    // Bleeding out: blood already on the floor, wound still open.
    patient.setVitalSign('bloodVolume', Quantity.of(0.4, 'L'));
    patient.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 8,
      bleeding: true,
    });
    patient.beginDying('exsanguination', 300);

    const ctrl = makeStuff(() => new TreatController());
    await ctrl.execute(
      { target: { stuff: patient } } as never,
      ctxFor(medic, room),
    );

    // Out of the window…
    expect(patient.isDying()).toBe(false);
    expect(patient.getLifecycleState()).not.toBe('dead');

    // …but the blood is still gone. The medic bought time, not a cure;
    // the reconcile puts a body still under its floor straight back into
    // the window (covered end-to-end in dying-per-driver).
    expect(patient.getVitalSign('bloodVolume').rawValue()).toBeLessThanOrEqual(
      patient.getVitalBand('bloodVolume').survivableMin,
    );
  });

  it('mints a medicine deed for the stabilization', async () => {
    const { medic, patient, room } = dyingPatient();
    patient.beginDying('hypothermia', 300);

    const ctrl = makeStuff(() => new TreatController());
    await ctrl.execute(
      { target: { stuff: patient } } as never,
      ctxFor(medic, room),
    );

    const rows = await medic.transcriptEntries('medicine');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.every((r) => r.kind === 'deed')).toBe(true);
  });

  it('a failed attempt does not stabilize — and still spends the dressing', async () => {
    const { medic, patient, room, dressing } = dyingPatient();
    patient.beginDying('hypothermia', 300);
    // A worthless dressing in untrained hands → the failure outcome.
    (dressing as unknown as { setDressingQuality(q: number): void })
      .setDressingQuality(0);

    const ctrl = makeStuff(() => new TreatController());
    await ctrl.execute(
      { target: { stuff: patient } } as never,
      ctxFor(medic, room),
    );

    expect(patient.isDying()).toBe(true);
    expect(StuffApi.findById(dressing.stuffId)).toBeFalsy();
  });

  it('a body that is neither wounded nor dying is still refused', async () => {
    const { medic, patient, room } = dyingPatient();
    const ctrl = makeStuff(() => new TreatController());
    await ctrl.execute(
      { target: { stuff: patient } } as never,
      ctxFor(medic, room),
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'no-wound' }),
    );
  });
});
