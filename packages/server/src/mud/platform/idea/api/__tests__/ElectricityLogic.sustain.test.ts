/**
 * The reconcile-on-read being-shocked sustain, tetany, and the
 * electrocution death seam (the previously-undriven heartRate). A persisting
 * closed circuit becomes a SustainedShock that integrates current × time
 * lazily on read (presence-frozen), clears when the circuit breaks, is held
 * closed by tetany, and — at the fibrillation band — drives heartRate to
 * arrest → death with cause 'electrocution' (never destruction). Driven by a
 * manual world clock + reading the body (no push tick).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ElectricityApi } from '../../../../api/electricity';
import { EnergizedMixin } from '../../../../lib/electricity/Energized';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../lib/description/Named';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import Floor from '../../../thing/Floor';
import { Creature } from '../../../../lib/creature/Creature';
import { HasInteractiveMixin } from '../../../../lib/connection/HasInteractive';
import type Interactive from '../../Interactive';
import Species from '../../species/Species';
import BodyPlan from '../../species/BodyPlan';
import Material from '../../../../lib/material/Material';
import { ContainmentApi } from '../../../../api/containment';
import { WorldClockApi } from '../../../../api/worldclock';
import '../../WorldClockRegistry';
import { Quantity } from '../../../../lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma, SustainedShock } from '../../Condition';
import requiresConscious from '../../../../lib/command/validators/requiresConscious';

class TestWire extends EnergizedMixin(ContainableMixin(NamedMixin(Idea))) {
  static _mixinName = 'TestWire';
}
class TestBody extends HasInteractiveMixin(Creature) {
  static _mixinName = 'TestBody';
}

let seq = 0;
let real = 0;
const STEP_MS = 5_000;

function saltWater(): Material {
  const m = makeStuff(() => new Material());
  m.setName('salt-water');
  m.setElectricalConductivity(Quantity.of(5, 'S/m'));
  stampTemplatePathForTest(m, `/stuff/idea/material/test/salt-${seq++}`);
  return m;
}

function makeRoom(): Location {
  return makeStuff(() => new Location());
}

function floodFloor(room: Location, litres: number): Floor {
  const floor = makeStuff(() => {
    const f = new Floor();
    f.surfaceBulk = true;
    return f;
  });
  (room as unknown as { addFixture(f: unknown): boolean }).addFixture(floor);
  floor.setBulkMaterial('surface', saltWater());
  floor.setBulkAmount('surface', Quantity.of(litres, 'L'));
  return floor;
}

function makeWire(room: Location, volts: number): TestWire {
  const w = makeStuff(() => {
    const wire = new TestWire();
    wire.setName('live wire');
    wire.setVoltage(Quantity.of(volts, 'V'));
    return wire;
  });
  stampTemplatePathForTest(w, `/obj/test-wire-${seq++}`);
  ContainmentApi.move(w as never, room as never);
  return w;
}

function makeBody(room: Location, connected = true): TestBody {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-biped');
  plan.setSlots([]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.leg.left', parent: 'body.torso', tissues: [] },
    {
      key: 'body.leg.left.foot',
      parent: 'body.leg.left',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 0.5 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/test-sustain-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/sustain-${id}`);
  const c = makeStuff(() => new TestBody());
  c.setSpecies(species);
  // A body with no interactive reads as linkdead (reconcile freezes it); a
  // present body must be connected. The freeze test uses `connected=false`.
  if (connected) c.addInteractive({} as unknown as Interactive);
  ContainmentApi.move(c as never, room as never);
  return c;
}

/** Advance game-time one step and READ the body to drive reconcile-on-read
 * (both the condition band and the heart-rate death seam). */
function tick(b: TestBody, times = 1): void {
  for (let i = 0; i < times; i++) {
    real += STEP_MS;
    b.getConditionBand();
    b.getVitalSign('heartRate');
  }
}

function shockOf(b: TestBody): SustainedShock | undefined {
  return b.getConditions().find((c) => c.kind === 'shock') as
    | SustainedShock
    | undefined;
}
function burnSeverity(b: TestBody): number {
  const burn = b
    .getConditions()
    .find(
      (c): c is Trauma => c.kind === 'trauma' && c.type === 'burn',
    );
  return burn?.severity ?? 0;
}

describe('ElectricityLogic — being-shocked sustain + tetany + death', () => {
  beforeEach(() => {
    // NB: do NOT StuffApi.clearAll() here — it wipes the WorldClockRegistry
    // from the template-path index (which `_resetForTesting` reuses but does
    // not re-register), and reconcile's clock guard would then early-return.
    // Unique per-test paths keep the accumulating world isolated (the bleed
    // test precedent).
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('conduct afflicts a being-shocked sustain that accrues burn on read', () => {
    const room = makeRoom();
    floodFloor(room, 20);
    const wire = makeWire(room, 50); // ~0.05 A wet → tetanic, sub-fibrillation
    const body = makeBody(room);

    ElectricityApi.conduct(wire);
    expect(shockOf(body)).toBeDefined();
    expect(body.isBeingShocked()).toBe(true);

    const before = burnSeverity(body);
    tick(body, 2);
    expect(burnSeverity(body)).toBeGreaterThan(before); // accrues over time
  });

  it('clears the sustain when the circuit breaks (drained pool)', () => {
    const room = makeRoom();
    const floor = floodFloor(room, 20);
    const wire = makeWire(room, 15); // ~0.015 A → above let-go, below tetany
    const body = makeBody(room);
    ElectricityApi.conduct(wire);
    expect(body.isBeingShocked()).toBe(true);

    floor.setBulkAmount('surface', Quantity.of(0, 'L')); // the pool drains
    tick(body, 2); // first read stamps, second re-verifies → relieves
    expect(body.isBeingShocked()).toBe(false); // circuit broke → relieved
  });

  it('presence-freeze: a linkdead body integrates nothing across the gap', () => {
    const room = makeRoom();
    floodFloor(room, 20);
    const wire = makeWire(room, 50);
    const body = makeBody(room, false); // unconnected ⇒ linkdead
    expect(body.isLinkdead()).toBe(true);
    ElectricityApi.conduct(wire);
    body.getConditionBand(); // first-touch stamp
    const before = burnSeverity(body);

    tick(body, 5); // a long away-gap while linkdead
    expect(burnSeverity(body)).toBeCloseTo(before, 6); // froze
  });

  it('a live tetanic circuit latches tetany and keeps accruing while it flows', () => {
    const room = makeRoom();
    floodFloor(room, 20);
    const wire = makeWire(room, 50); // ≥ tetanic → latches tetany
    const body = makeBody(room);
    ElectricityApi.conduct(wire);
    expect(shockOf(body)?.tetany).toBe(true);
    expect(body.isTetanized()).toBe(true); // the "can't let go" grip
    const before = burnSeverity(body);
    tick(body, 2);
    // The pool stays live: the circuit re-probes closed and keeps burning.
    expect(body.isBeingShocked()).toBe(true);
    expect(burnSeverity(body)).toBeGreaterThan(before);
  });

  it('breaking the LIVE circuit releases tetany (the rescue works — bar-fight W1)', () => {
    // ⚠ Corrected semantics (the bar-fight build): tetany no longer
    // manufactures current from a broken circuit. "Can't let go" is now
    // the *victim's* volition gate (requiresConscious → isTetanized), so
    // an outside rescue — draining the pool, cutting the source, dragging
    // them clear — physically breaks the circuit and RELEASES them. A solo
    // victim can no longer be self-sustained to death with the source gone
    // (the hazard-counterplay audit). The after-grip lingers one window,
    // then the sustain relieves.
    const room = makeRoom();
    const floor = floodFloor(room, 20);
    const wire = makeWire(room, 50); // ≥ tetanic
    const body = makeBody(room);
    ElectricityApi.conduct(wire);
    expect(body.isTetanized()).toBe(true);

    floor.setBulkAmount('surface', Quantity.of(0, 'L')); // the rescue
    const before = burnSeverity(body);
    tick(body, 3); // past the after-grip window
    expect(body.isBeingShocked()).toBe(false); // circuit broke → released
    expect(body.isTetanized()).toBe(false);
    // No further shock-burn accrues once the circuit breaks (the existing
    // contact burn only heals from here — never grows).
    expect(burnSeverity(body)).toBeLessThanOrEqual(before + 1e-9);
  });

  it('a fibrillating current drives heartRate to arrest → death (electrocution)', () => {
    const room = makeRoom();
    floodFloor(room, 20);
    const wire = makeWire(room, 240); // ~0.24 A wet → fibrillation
    const body = makeBody(room);
    ElectricityApi.conduct(wire);

    tick(body, 3);
    expect(body.getVitalSign('heartRate').rawValue()).toBeLessThanOrEqual(30);
    // Arrest opens the DYING window rather than killing outright — the
    // clock decides from here, which is the interval a medic can act in.
    expect(body.isDying()).toBe(true);
    expect(body.getLifecycleState()).not.toBe('dead');

    // Nobody intervenes: run the electrocution window out.
    tick(body, 400);
    expect(body.getLifecycleState()).toBe('dead');
    expect(body.getCauseOfDeath()).toBe('electrocution');
    // Death ≠ destruction.
    expect(body.isDestroyed()).toBe(false);
  });

  it('a mid (tetanic, sub-fibrillation) current paralyses but does not kill', () => {
    const room = makeRoom();
    floodFloor(room, 20);
    const wire = makeWire(room, 50); // ~0.05 A → tetany, no fibrillation
    const body = makeBody(room);
    ElectricityApi.conduct(wire);

    tick(body, 3);
    expect(body.isTetanized()).toBe(true);
    expect(body.getLifecycleState()).not.toBe('dead');
    expect(body.getVitalSign('heartRate').rawValue()).toBeGreaterThan(30);
  });

  // ── The stun-baton pulse window (bar-fight W1) ──

  it('a discrete contact (a baton tap) tetanizes for a bounded window, then releases', () => {
    const room = makeRoom();
    const baton = makeWire(room, 5000); // a switched-on stun baton
    const body = makeBody(room);
    // The two-terminal contact path: no medium, no standing circuit — a
    // one-shot that mints a bounded-window tetany.
    ElectricityApi.shockContact(baton, body);
    expect(body.isTetanized()).toBe(true); // seized, this instant
    const gripBurn = burnSeverity(body);

    // No live circuit holds it: within the ~6 game-second window the body
    // is rigid but NO current flows (contact is over), so nothing accrues.
    // (`isTetanized()` reconciles on read, so advancing `real` is enough.)
    real += 200; // ≈ +2.4 game-seconds — inside the window
    expect(body.isTetanized()).toBe(true);
    // No current flows during the window, so the contact burn never grows
    // (it only heals a hair) — the honest less-lethal after-grip.
    expect(burnSeverity(body)).toBeLessThanOrEqual(gripBurn + 1e-9);

    // Past the window the after-grip releases (reconcile-on-read).
    real += 5000; // ≫ the window
    expect(body.isTetanized()).toBe(false);
    expect(body.isBeingShocked()).toBe(false);
    expect(body.getLifecycleState()).not.toBe('dead'); // less-lethal
  });

  it('the tetany volition gate refuses release/exertion verbs while it holds', () => {
    const room = makeRoom();
    const baton = makeWire(room, 5000);
    const body = makeBody(room);
    ElectricityApi.shockContact(baton, body);

    // The `requiresConscious` validator is the volition gate: tetanized →
    // a refusal string; released → undefined (verb allowed).
    const ctx = { commandGiver: body } as unknown as Parameters<
      typeof requiresConscious
    >[0];
    expect(body.isTetanized()).toBe(true);
    const refusal = requiresConscious(ctx);
    expect(refusal).toBeTruthy();
    expect(String(refusal).toLowerCase()).toContain('let go');

    tick(body, 3); // window elapses
    expect(body.isTetanized()).toBe(false);
    expect(requiresConscious(ctx)).toBeUndefined();
  });
});
