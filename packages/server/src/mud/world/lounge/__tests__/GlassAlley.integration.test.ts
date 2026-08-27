/**
 * GlassAlley — the harm-driver demonstrator, end-to-end through the real
 * movement + medic seams.
 *
 * - Barefoot walk-in → laceration inflicted through `inflict`; shod (feet
 *   slot worn) → no cut (the coverage gate).
 * - step → bleed → `treat` (consumes a bandage) → arrested → heals to clear.
 * - step → bleed → treat → `undress` while still open → re-bleeds; treat
 *   again + clot → safe.
 * - step → bleed → (untreated, advance the world clock) → death by
 *   `exsanguination`.
 *
 * Movement is a real `Mobile.traverse` (fires the room's `onEntered`);
 * wound progression is reconcile-on-read, driven by reading the body after
 * advancing a manual world clock; the medic verbs run through the real
 * controllers (Mongo faked, scene stubbed).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GlassAlley from '../GlassAlley';
import Bandage from '../../../platform/thing/Bandage';
import TreatController from '../../../platform/idea/cmd/medical/TreatController';
import UndressController from '../../../platform/idea/cmd/medical/UndressController';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { WearableMixin } from '../../../lib/slot/Wearable';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { ConstructedMixin } from '../../../lib/material/Constructed';
import { Construction } from '../../../lib/material/Construction';
import Material from '../../../lib/material/Material';
import { Quantity } from '../../../lib/quantity';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Thing from '../../../lib/stuff/Thing';
import Location from '../../../lib/stuff/Location';
import Exit from '../../../lib/boundary/Exit';
import { MessageApi } from '../../../api/message';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { HARM_DEFAULTS } from '../../../platform/idea/Condition';
import type { Trauma } from '../../../platform/idea/Condition';
import type { CommandContext } from '../../../api/command';

const TICK = HARM_DEFAULTS.TICK_INTERVAL_MS;
let real = 0;
// Unique per test — the harness keeps the world-clock registry alive
// across tests (no clearAll), so fixed template paths would collide.
let n = 0;
let bodyplanPath = '';

class MobileCreature extends MobileMixin(Creature) {
  static _mixinName = 'MobileCreature';
}
// A stout iron-shod boot: a Constructed steel-plate Wearable that turns the
// alley's edge through the real materials-response covering stack.
const Boot = WearableMixin(SlottableMixin(ConstructedMixin(Thing)));
class DemoBoot extends Boot {
  static _mixinName = 'DemoBoot';
}

/** The steel the demo boot is soled with (registered so getMaterial resolves). */
function demoSteel(): Material {
  const m = makeStuff(() => new Material());
  m.setName('steel');
  m.setHardness(Quantity.of(600, 'MPa'));
  m.setToughness(Quantity.of(200, 'MJ/m³'));
  stampTemplatePathForTest(m, `/stuff/idea/material/alloy/steel-demo-${n}`);
  return m;
}

function footedBodyPlan(): BodyPlan {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('demo-biped');
  plan.setSlots([
    {
      name: 'feet',
      accepts: 'WearableMixin',
      covers: ['body.leg.left.foot', 'body.leg.right.foot'],
    },
  ]);
  plan.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.leg.left', parent: 'body.torso', tissues: [] },
    { key: 'body.leg.left.foot', parent: 'body.leg.left', tissues: [] },
    { key: 'body.leg.right', parent: 'body.torso', tissues: [] },
    { key: 'body.leg.right.foot', parent: 'body.leg.right', tissues: [] },
  ]);
  stampTemplatePathForTest(plan, bodyplanPath);
  return plan;
}

let sharedSpecies: Species;
function mover(path: string): MobileCreature {
  const c = makeStuff(() => new MobileCreature());
  c.setSpecies(sharedSpecies);
  stampTemplatePathForTest(c, path);
  return c;
}

/** Street → alley walk (real Mobile.traverse fires the alley's onEntered). */
async function walkIntoAlley(m: MobileCreature): Promise<GlassAlley> {
  const street = makeStuff(() => new Location());
  const alley = makeStuff(() => new GlassAlley());
  ContainmentApi.move(m, street);
  const exit = makeStuff(
    () => new Exit({ direction: 'east', source: street, destination: alley })
  );
  await m.traverse(exit, 'walk');
  return alley;
}

function wound(m: Creature): Trauma | undefined {
  return m.getConditions().find((c) => c.kind === 'trauma') as
    | Trauma
    | undefined;
}

/** Advance game-time one interval and READ the body to drive reconcile. */
function tick(m: MobileCreature, times = 1): void {
  for (let i = 0; i < times; i++) {
    real += TICK;
    vi.advanceTimersByTime(TICK);
    m.getConditionBand(); // a read drives reconcile-on-read
  }
}

function ctx(m: unknown, loc: unknown): CommandContext {
  return { commandGiver: m, location: loc, note: vi.fn() } as unknown as CommandContext;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  // Fake Mongo (so the treat deed writes without a real DB).
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockResolvedValue([] as never);
  vi.spyOn(pm, 'save').mockResolvedValue('id-0' as never);
  // Stub the scene so controller/traverse messaging never needs routing.
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
  vi.useFakeTimers();
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  n++;
  bodyplanPath = `/stuff/idea/species/BodyPlan/demo-biped-${n}`;
  sharedSpecies = makeStuff(() => new Species());
  sharedSpecies.setBodyPlan(footedBodyPlan());
  stampTemplatePathForTest(sharedSpecies, `/stuff/idea/species/demo/biped-${n}`);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  vi.useRealTimers();
});

describe('GlassAlley — coverage gate', () => {
  it('cuts a barefoot foot on entry', async () => {
    const m = mover('/platform/agent/Avatar/barefoot');
    await walkIntoAlley(m);
    const w = wound(m);
    expect(w).toBeDefined();
    expect(w!.type).toBe('laceration');
    expect(w!.site.startsWith('body.leg')).toBe(true);
    expect(w!.bleeding).toBe(true);
  });

  it('does not cut a stoutly-shod foot', async () => {
    const m = mover('/platform/agent/Avatar/shod');
    const boot = makeStuff(() => new DemoBoot());
    boot.setSlotClaim(bodyplanPath, ['feet']);
    boot.setMaterial(demoSteel());
    boot.setConstruction(Construction.of('plate'));
    m.occupy(boot, 'feet');
    await walkIntoAlley(m);
    // The steel-plate boot's covering layer attenuates the edge below the
    // no-wound threshold — coverage *degree*, resolved through inflict.
    expect(wound(m)).toBeUndefined();
  });
});

describe('GlassAlley — full loop', () => {
  it('step → bleed → treat → arrested → heals to clear', async () => {
    const m = mover('/platform/agent/Avatar/treated');
    const alley = await walkIntoAlley(m);
    ContainmentApi.move(makeStuff(() => new Bandage()), m);
    expect(wound(m)!.bleeding).toBe(true);

    await makeStuff(() => new TreatController()).execute({}, ctx(m, alley));
    expect(wound(m)!.dressed).toBe(true);
    expect(wound(m)!.bleeding).toBe(false);

    let guard = 0;
    while (wound(m) && guard++ < 400) tick(m);
    expect(wound(m)).toBeUndefined(); // healed to clear
  });

  it('step → treat → undress-while-open → re-bleeds; re-treat → safe', async () => {
    const m = mover('/platform/agent/Avatar/reopen');
    const alley = await walkIntoAlley(m);
    ContainmentApi.move(makeStuff(() => new Bandage()), m);
    ContainmentApi.move(makeStuff(() => new Bandage()), m);

    await makeStuff(() => new TreatController()).execute({}, ctx(m, alley));
    expect(wound(m)!.dressed).toBe(true);

    // Premature undress (severity 2 > clot) reopens the bleed.
    await makeStuff(() => new UndressController()).execute({}, ctx(m, alley));
    expect(wound(m)!.dressed).toBe(false);
    expect(wound(m)!.bleeding).toBe(true);

    // Re-treat, let it clot, then a safe undress.
    await makeStuff(() => new TreatController()).execute({}, ctx(m, alley));
    wound(m)!.severity = 0.2; // clotted
    await makeStuff(() => new UndressController()).execute({}, ctx(m, alley));
    expect(wound(m)!.bleeding).toBeFalsy();
  });

  it('step → bleed → untreated → death by exsanguination', async () => {
    const m = mover('/platform/agent/Avatar/doomed');
    await walkIntoAlley(m);
    expect(wound(m)!.bleeding).toBe(true);

    let guard = 0;
    while (m.getLifecycleState() !== 'dead' && guard++ < 100) tick(m);
    expect(m.getLifecycleState()).toBe('dead');
    expect(m.getCauseOfDeath()).toBe('exsanguination');
  });
});
