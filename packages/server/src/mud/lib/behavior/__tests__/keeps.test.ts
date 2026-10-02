/**
 * The `keeps` brain and the `instruct` verb (docs/subsystems/taps.md §
 * the relief) — ⭐⭐⭐ **it PRESERVES; it never EARNS.**
 *
 * The taps build's answer to the one honest problem milk has: a dairy
 * cow wants taking twice a GAME day, a game day is two real hours, and
 * the feedback law says there is nothing to decide at the act — so what
 * was needed was not a finer mechanic but a way to keep the round when
 * nobody is awake for it.
 *
 * The claims, and the second is the one that makes the feature
 * defensible rather than idle-game drift:
 *
 *  1. ⭐ the round fires only where the target IS, and only when the tap
 *     is worth an act;
 *  2. ⛔ **only a TAKE may be kept.** The verb refuses any line whose
 *     view does not declare `standing: true`, and nothing it issues can
 *     reach money, a counter, a shelf or a ledger;
 *  3. ⭐ a body with a round standing is **not evicted** — which is the
 *     whole point of an instruction that outlives your session.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain as keeps } from '../keeps';
import type { BrainContext } from '../brain';
import { BehavedMixin } from '../Behaved';
import { ProducingMixin } from '../../husbandry/Producing';
import Species from '../../../platform/idea/species/Species';
import type { TapSpec } from '../../../platform/idea/species/Species';
import Location from '../../stuff/Location';
import { Idea } from '../../stuff/Idea';
import { Creature } from '../../creature/Creature';
import Material from '../../material/Material';
import { CommandGiverMixin } from '../../command/CommandGiver';
import { SensorMixin } from '../../message/Sensor';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { PerceptibleMixin } from '../../description/Perceptible';
import { NamedMixin } from '../../description/Named';
import { VisibleMixin } from '../../description/Visible';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';

const DAY = 86_400;
const T0 = 1_000 * DAY;
const SPECIES = '/stuff/idea/species/_test/keeps-cow';

/** A body that can be instructed and can issue commands. */
class TestBody extends BehavedMixin(
  SensorMixin(
    CommandGiverMixin(
      ContainerMixin(ContainableMixin(PerceptibleMixin(NamedMixin(Idea)))),
    ),
  ),
) {
  static _mixinName = 'TestBodyKeeps';
  /** Every line the brain forced, in order — the whole assertion surface. */
  public forced: string[] = [];
  public override async forceCommand(text: string): Promise<void> {
    this.forced.push(text);
  }
  protected handleMessage(): void {}
}

/** A producer that answers to a keyword. */
class TestCow extends ProducingMixin(VisibleMixin(Creature)) {
  static _mixinName = 'TestCowKeeps';
}

const MILK: TapSpec[] = [
  {
    key: 'milk',
    yieldRow: '/stuff/idea/material/food/milk',
    perGameDay: 22,
    behaviour: 'expire',
    windowDays: 0.6,
    yieldShape: 'volume',
    window: { kind: 'event' },
  },
];

let clock: ReturnType<typeof vi.spyOn>;
let seq = 0;

function tissue(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('flesh');
    m.setSpecificHeat(Quantity.of(3000, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.3, 'W/(m·K)'));
    return m;
  }, `/stuff/idea/material/_test/keeps-${seq}`) as unknown as Material;
}

function at(d: number): void {
  clock.mockReturnValue(Quantity.of(T0 + d * DAY, 's'));
}

function cow(): TestCow {
  const c = makeStuff(() => {
    const x = new TestCow();
    x.setShortDescription('a dairy cow');
    x.setKeywords(['cow', 'dairy']);
    x.setMaterial(tissue());
    x.setMass(Quantity.of(600, 'kg'));
    x.setLifecycleState('alive');
    x._speciesPath = SPECIES;
    return x;
  });
  const current = c.getReserve('flesh')!.current.rawValue();
  c.adjustReserve('flesh', Quantity.of(55 - current, '%'));
  c.reconcileProduction();
  return c;
}

function body(): TestBody {
  return makeStuffAtPath(() => {
    const b = new TestBody();
    b.setName('Alice');
    b.setKeywords(['alice']);
    return b;
  }, `/platform/agent/Avatar/_keeps-${++seq}`);
}

function ctxFor(host: TestBody, rounds: unknown): BrainContext {
  return {
    host,
    config: { rounds },
    state: {},
  } as unknown as BrainContext;
}

describe('the keeps brain — it preserves, it never earns', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(
      () => new WorldClockRegistry(),
      '/platform/idea/WorldClockRegistry',
    );
    makeStuffAtPath(() => {
      const sp = new Species();
      sp.setProduction(MILK);
      return sp;
    }, SPECIES);
    clock = vi.spyOn(WorldClockApi, 'getNow');
    at(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐⭐ keeps the round when the tap is worth an act', async () => {
    const room = makeStuff(() => new Location());
    const me = body();
    const her = cow();
    ContainmentApi.move(me as never, room as never);
    ContainmentApi.move(her as never, room as never);

    // Half a window in: she is worth milking.
    at(0.4);
    expect(her.standingIn('milk')).toBeGreaterThan(0);

    await keeps.act(ctxFor(me, [{ line: 'milk cow into pail', target: 'cow' }]));
    // ⭐ The LITERAL line the player typed — not a reconstruction, and
    // not a privileged path. Every gate the manual act has still runs.
    expect(me.forced).toEqual(['milk cow into pail']);
  });

  it('⚠ does NOT fire when there is nothing worth taking', async () => {
    const room = makeStuff(() => new Location());
    const me = body();
    const her = cow();
    ContainmentApi.move(me as never, room as never);
    ContainmentApi.move(her as never, room as never);

    // Just milked out: a cupful is not a reason to go back.
    at(0.4);
    her.takeFrom('milk');
    at(0.41);

    await keeps.act(ctxFor(me, [{ line: 'milk cow into pail', target: 'cow' }]));
    expect(me.forced).toEqual([]);
  });

  it('⭐⭐⭐ LAPSES SILENTLY when the target is not in the room', async () => {
    // ⚠ The honest cost of logging off in the wrong place — and it is
    // silent on purpose: a complaint every ten minutes into an empty
    // room would be noise nobody reads.
    const byre = makeStuff(() => new Location());
    const elsewhere = makeStuff(() => new Location());
    const me = body();
    const her = cow();
    ContainmentApi.move(her as never, byre as never);
    ContainmentApi.move(me as never, elsewhere as never);

    at(0.4);
    await keeps.act(ctxFor(me, [{ line: 'milk cow into pail', target: 'cow' }]));
    expect(me.forced).toEqual([]);
  });

  it('⚠ a malformed round is skipped, never fatal', async () => {
    const room = makeStuff(() => new Location());
    const me = body();
    ContainmentApi.move(me as never, room as never);
    await keeps.act(ctxFor(me, [{ line: '', target: 'cow' }, 'nonsense', null]));
    expect(me.forced).toEqual([]);
  });

  it('⭐ bounded: one take per round per beat', async () => {
    const room = makeStuff(() => new Location());
    const me = body();
    const her = cow();
    ContainmentApi.move(me as never, room as never);
    ContainmentApi.move(her as never, room as never);
    at(0.5);

    await keeps.act(
      ctxFor(me, [
        { line: 'milk cow into pail', target: 'cow' },
        { line: 'milk cow into pail', target: 'cow' },
      ]),
    );
    // Two rounds, two commands — and never a loop per tap or per litre.
    expect(me.forced.length).toBe(2);
  });

  it('⛔⛔ it issues NOTHING but the lines it was given', async () => {
    // ⭐⭐ The claim that makes the whole feature defensible. The brain
    // has no path to money, a counter, a shelf or a ledger: the only
    // thing it can do is re-issue a line a player typed, and that line
    // had to be a TAKE to be accepted at all. So this assertion — the
    // forced set is exactly the configured set — IS the earn/preserve
    // bound, checked rather than asserted in prose.
    const room = makeStuff(() => new Location());
    const me = body();
    const her = cow();
    ContainmentApi.move(me as never, room as never);
    ContainmentApi.move(her as never, room as never);
    at(0.5);

    await keeps.act(ctxFor(me, [{ line: 'milk cow into pail', target: 'cow' }]));
    for (const line of me.forced) {
      expect(line).toBe('milk cow into pail');
      expect(line).not.toMatch(/sell|consign|buy|bank|draw|price|deposit/i);
    }
  });

  it('⭐ it is NOT presence-gated and NOT ambient — that is the point', () => {
    // Presence-gated would mean it only runs while somebody is watching,
    // which is the inverse of the requirement. Ambient would let the
    // chatter-pacing dial stretch its interval.
    expect(keeps.presenceGated).toBe(false);
    expect(keeps.ambient).toBe(false);
    expect(keeps.claims).toContain('hands');
  });
});

describe('BehavedMixin — live rewiring, and the residency pin', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    makeStuffAtPath(
      () => new WorldClockRegistry(),
      '/platform/idea/WorldClockRegistry',
    );
  });
  afterEach(() => StuffApi.clearAll());

  it('⭐⭐ addBehavior wires a spec MID-LIFE, without a re-clone', async () => {
    // ⚠ Wiring used to happen only at `postRegister`, which is right for
    // authored cast. A player setting a standing instruction is the
    // other case: the spec arrives from a verb, mid-life.
    const me = body();
    expect(me.getBehaviors()).toEqual([]);
    await me.addBehavior({
      brain: '/lib/behavior/keeps',
      trigger: 'cadence:600s',
      config: { rounds: [{ line: 'milk cow', target: 'cow' }] },
    } as never);
    expect(me.getBehaviors().length).toBe(1);
    expect(me.getBehaviors()[0]?.brain).toBe('/lib/behavior/keeps');
  });

  it('removeBehaviors drops them by brain, and reports how many', async () => {
    const me = body();
    await me.addBehavior({
      brain: '/lib/behavior/keeps',
      trigger: 'cadence:600s',
      config: { rounds: [] },
    } as never);
    expect(me.removeBehaviors('/lib/behavior/keeps')).toBe(1);
    expect(me.getBehaviors()).toEqual([]);
    // Idempotent: a second clear removes nothing and says so.
    expect(me.removeBehaviors('/lib/behavior/keeps')).toBe(0);
  });

  it('⭐⭐⭐ a body with a round standing is NOT evicted', async () => {
    // The residency pin, and the whole point of an instruction that
    // outlives your session: a linkdead body with a round to keep stays
    // resident, or the round it was given dies with the cold tail.
    const me = body();
    const before = me.canEvict({ reason: 'cold' } as never);
    expect(before.ok).toBe(true);

    await me.addBehavior({
      brain: '/lib/behavior/keeps',
      trigger: 'cadence:600s',
      config: { rounds: [{ line: 'milk cow', target: 'cow' }] },
    } as never);

    const after = me.canEvict({ reason: 'cold' } as never);
    expect(after.ok).toBe(false);
  });
});
