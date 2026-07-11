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
 * Movement is a real `Mobile.traverse` (fires the room's `onEntered`); the
 * wound-tick runs under fake timers + a manual world clock; the medic verbs
 * run through the real controllers (Mongo faked, scene stubbed).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GlassAlley from '../GlassAlley';
import Bandage from '../../../obj/Bandage';
import TreatController from '../../../obj/command/medical/TreatController';
import UndressController from '../../../obj/command/medical/UndressController';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { WearableMixin } from '../../../lib/slot/Wearable';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { Creature } from '../../../lib/creature/Creature';
import Species from '../../../lib/species/Species';
import BodyPlan from '../../../lib/species/BodyPlan';
import Thing from '../../../lib/stuff/Thing';
import Location from '../../../lib/stuff/Location';
import Exit from '../../../lib/boundary/Exit';
import { MessageApi } from '../../../api/message';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { HARM_DEFAULTS } from '../../../lib/vitals/Condition';
import type { Trauma } from '../../../lib/vitals/Condition';
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
const Boot = WearableMixin(SlottableMixin(Thing));
class DemoBoot extends Boot {
  static _mixinName = 'DemoBoot';
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

/** Bar → alley walk (real Mobile.traverse fires the alley's onEntered). */
async function walkIntoAlley(m: MobileCreature): Promise<GlassAlley> {
  const bar = makeStuff(() => new Location());
  const alley = makeStuff(() => new GlassAlley());
  ContainmentApi.move(m, bar);
  const exit = makeStuff(
    () => new Exit({ direction: 'west', source: bar, destination: alley })
  );
  await m.traverse(exit, 'walk');
  return alley;
}

function wound(m: Creature): Trauma | undefined {
  return m.getConditions().find((c) => c.kind === 'trauma') as
    | Trauma
    | undefined;
}

function tick(times = 1): void {
  for (let i = 0; i < times; i++) {
    real += TICK;
    vi.advanceTimersByTime(TICK);
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
  bodyplanPath = `/lib/body-plans/demo-biped-${n}`;
  sharedSpecies = makeStuff(() => new Species());
  sharedSpecies.setBodyPlan(footedBodyPlan());
  stampTemplatePathForTest(sharedSpecies, `/lib/species/demo/biped-${n}`);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  vi.useRealTimers();
});

describe('GlassAlley — coverage gate', () => {
  it('cuts a barefoot foot on entry', async () => {
    const m = mover('/obj/Avatar/barefoot');
    await walkIntoAlley(m);
    const w = wound(m);
    expect(w).toBeDefined();
    expect(w!.type).toBe('laceration');
    expect(w!.site.startsWith('body.leg')).toBe(true);
    expect(w!.bleeding).toBe(true);
  });

  it('does not cut a shod foot', async () => {
    const m = mover('/obj/Avatar/shod');
    const boot = makeStuff(() => new DemoBoot());
    boot.setSlotClaim(bodyplanPath, ['feet']);
    m.occupy(boot, 'feet');
    await walkIntoAlley(m);
    expect(wound(m)).toBeUndefined();
  });
});

describe('GlassAlley — full loop', () => {
  it('step → bleed → treat → arrested → heals to clear', async () => {
    const m = mover('/obj/Avatar/treated');
    const alley = await walkIntoAlley(m);
    ContainmentApi.move(makeStuff(() => new Bandage()), m);
    expect(wound(m)!.bleeding).toBe(true);

    await makeStuff(() => new TreatController()).execute({}, ctx(m, alley));
    expect(wound(m)!.dressed).toBe(true);
    expect(wound(m)!.bleeding).toBe(false);

    let guard = 0;
    while (wound(m) && guard++ < 400) tick();
    expect(wound(m)).toBeUndefined(); // healed to clear
  });

  it('step → treat → undress-while-open → re-bleeds; re-treat → safe', async () => {
    const m = mover('/obj/Avatar/reopen');
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
    const m = mover('/obj/Avatar/doomed');
    await walkIntoAlley(m);
    expect(wound(m)!.bleeding).toBe(true);

    let guard = 0;
    while (m.getLifecycleState() !== 'dead' && guard++ < 100) tick();
    expect(m.getLifecycleState()).toBe('dead');
    expect(m.getCauseOfDeath()).toBe('exsanguination');
  });
});
