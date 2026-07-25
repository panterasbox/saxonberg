/**
 * HazardMixin resolution — the trap substrate over the real `inflict`
 * seam, sprung at a real `Mobile.traverse` (the generalized
 * `GlassAlley.onEntered`). The six criterion cases + a toxin dart:
 *
 *   - spring-when-not: a bare mover meets a concealed trap → wounded;
 *   - armor-mitigation: a steel-plate-booted foot takes no wound (the
 *     covering stack resolves for free — the `GlassAlley` boot proof);
 *   - avoid-when-found: a discovered trap is stepped around (never sprung);
 *   - fly-clears-ground: an `air`-medium crossing clears a ground hazard;
 *   - disarm (found-gated): you can't defuse a trap you haven't discovered;
 *   - veto/redirect: pin holds the `body` slot, trip → prone, drop → the
 *     authored below-location;
 *   - toxin dart: the injected dose lands on the metabolism burden.
 *
 * Deterministic — the spring/avoid decision is a pure function of
 * discovery + perception + medium; no RNG. Mongo faked, scene stubbed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Trap from '../Trap';
import { HazardDelivery, type HazardDeliveryOptions } from '../HazardDelivery';
import DisarmController from '../../../obj/command/device/DisarmController';
import { MobileMixin } from '../../spatial/Mobile';
import { EngagedMixin } from '../../activity/Engaged';
import { PosedMixin } from '../../character/Posed';
import { MetabolicMixin } from '../../metabolism/Metabolic';
import { BeliefStoreMixin } from '../../belief/BeliefStore';
import { WearableMixin } from '../../slot/Wearable';
import { SlottableMixin } from '../../slot/Slottable';
import { ConstructedMixin } from '../../material/Constructed';
import { Construction } from '../../material/Construction';
import Material from '../../material/Material';
import { Quantity } from '../../quantity';
import { Creature } from '../../creature/Creature';
import Species from '../../species/Species';
import BodyPlan from '../../species/BodyPlan';
import Thing from '../../stuff/Thing';
import Location from '../../stuff/Location';
import Exit from '../../boundary/Exit';
import { Postures } from '../../slot/Postured';
import { MessageApi } from '../../../api/message';
import { ContainmentApi } from '../../../api/containment';
import { PerceptionApi } from '../../../api/perception';
import { AccountabilityApi } from '../../../api/accountability';
import { SpeciesApi } from '../../../api/species';
import { LocomotionApi } from '../../../api/locomotion';
import { BiomeApi } from '../../../api/biome';
import { WorldClockApi } from '../../../api/worldclock';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../obj/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import '../../../obj/WorldClockRegistry';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../vitals/Condition';
import type { ConcealmentLevel } from '../../concealment/ConcealmentLevel';
import type { MqlOneResult } from '../../../api/mql';
import type { CommandContext } from '../../../api/command';

let n = 0;
let real = 0;
let bodyplanPath = '';
let sharedSpecies: Species;

// A plain mover: mobile + metabolic + belief-store (for discovery), but
// NOT Engaged/Posed — so DisarmController takes its synchronous fallback.
class PlainMover extends MobileMixin(
  MetabolicMixin(BeliefStoreMixin(Creature)),
) {
  static _mixinName = 'PlainHazardMover';
}
// A rich mover: adds Engaged + Posed so the pin/trip consequences bite.
class RichMover extends MobileMixin(EngagedMixin(PosedMixin(Creature))) {
  static _mixinName = 'RichHazardMover';
}

// The GlassAlley steel-plate boot — a Constructed Wearable covering the feet.
const Boot = WearableMixin(SlottableMixin(ConstructedMixin(Thing)));
class DemoBoot extends Boot {
  static _mixinName = 'DemoHazardBoot';
}

function demoSteel(): Material {
  const m = makeStuff(() => new Material());
  m.setName('steel');
  m.setHardness(Quantity.of(600, 'MPa'));
  m.setToughness(Quantity.of(200, 'MJ/m³'));
  stampTemplatePathForTest(m, `/lib/material/alloy/steel-hz-${n}`);
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

const FEET = ['body.leg.left.foot', 'body.leg.right.foot'];

function plainMover(path: string): PlainMover {
  const c = makeStuff(() => new PlainMover());
  c.setSpecies(sharedSpecies);
  stampTemplatePathForTest(c, path);
  return c;
}
function richMover(path: string): RichMover {
  const c = makeStuff(() => new RichMover());
  c.setSpecies(sharedSpecies);
  stampTemplatePathForTest(c, path);
  return c;
}

interface TrapOpts {
  concealment?: ConcealmentLevel;
  trigger?: 'traversal' | 'interact';
  traverseConsequence?: 'none' | 'pin' | 'trip' | 'drop';
  dropDestination?: string;
  groundTriggered?: boolean;
}
function makeTrap(delivery: HazardDeliveryOptions, opts: TrapOpts = {}): Trap {
  const t = makeStuff(() => new Trap());
  t.setDelivery(new HazardDelivery(delivery));
  t.setConcealment(opts.concealment ?? 'hidden');
  if (opts.trigger) t.setTrigger(opts.trigger);
  if (opts.traverseConsequence) t.setTraverseConsequence(opts.traverseConsequence);
  if (opts.dropDestination !== undefined) t.setDropDestination(opts.dropDestination);
  if (opts.groundTriggered !== undefined) t.setGroundTriggered(opts.groundTriggered);
  stampTemplatePathForTest(t, `/obj/test/trap-${n}-${++trapCounter}`);
  return t;
}
let trapCounter = 0;

/** Walk the mover from a fresh street into a room holding `trap`. */
async function walkInto(
  m: PlainMover | RichMover,
  trap: Trap | null,
): Promise<Location> {
  const street = makeStuff(() => new Location());
  const room = makeStuff(() => new Location());
  ContainmentApi.move(m, street);
  if (trap) ContainmentApi.move(trap as unknown as Thing, room);
  const exit = makeStuff(
    () => new Exit({ direction: 'east', source: street, destination: room }),
  );
  await m.traverse(exit, 'walk');
  return room;
}

function wound(m: Creature): Trauma | undefined {
  return m.getConditions().find((c) => c.kind === 'trauma') as Trauma | undefined;
}

function ctx(m: unknown, loc: unknown): CommandContext {
  return {
    commandGiver: m,
    location: loc,
    note: vi.fn(),
  } as unknown as CommandContext;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockResolvedValue([] as never);
  vi.spyOn(pm, 'save').mockResolvedValue('id-0' as never);
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
  // The arrival flow's respiration/atmosphere reassess resolves the biome
  // chain (async, detached from the traverse) — a plain test Location has
  // no seeded universe biome, so short-circuit it to a benign medium.
  vi.spyOn(BiomeApi, 'resolveAtmosphereFor').mockResolvedValue('air' as never);
  vi.useFakeTimers();
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  // The scheduler subscribes to StuffDestructed on start → EventRegistry
  // must be bootstrapped for a `pin` activity to start.
  const reg = makeStuff(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  EventApi._setRegistryForTesting(reg);
  n++;
  bodyplanPath = `/lib/body-plans/hazard-biped-${n}`;
  sharedSpecies = makeStuff(() => new Species());
  sharedSpecies.setBodyPlan(footedBodyPlan());
  stampTemplatePathForTest(sharedSpecies, `/lib/species/hazard/biped-${n}`);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  vi.useRealTimers();
});

describe('HazardMixin.resolveTraversal — spring vs avoid', () => {
  it('springs on a bare mover who neither found nor perceives it', async () => {
    const m = plainMover('/obj/Avatar/hz-bare');
    const trap = makeTrap({ channel: 'edge', energy: 2, siteSelector: FEET });
    await walkInto(m, trap);
    const w = wound(m);
    expect(w).toBeDefined();
    expect(w!.site.startsWith('body.leg')).toBe(true);
    expect(trap.getHazardState()).toBe('sprung');
  });

  it('narrates the spring to the victim (inflict is silent — the feedback beat)', async () => {
    // Regression: ConditionApi.inflict only mutates the body, so without a
    // spring line a player walks into a trap, takes the wound, and sees
    // NOTHING (a live run confirmed the silence). Capture the self-facing
    // scene lines and assert one announces the spring.
    const selfLines: string[] = [];
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = (line: unknown) => {
        selfLines.push(String(line));
        return b;
      };
      b.toPeers = () => b;
      b.send = () => {};
      return b as never;
    });
    const m = plainMover('/obj/Avatar/hz-narrate');
    const trap = makeTrap({ channel: 'edge', energy: 2, siteSelector: FEET });
    await walkInto(m, trap);
    expect(trap.getHazardState()).toBe('sprung');
    expect(selfLines.some((l) => /hidden trap springs/i.test(l))).toBe(true);
  });

  it('armor mitigates — a steel-plate boot takes the edge below the wound threshold', async () => {
    const m = plainMover('/obj/Avatar/hz-shod');
    const boot = makeStuff(() => new DemoBoot());
    boot.setSlotClaim(bodyplanPath, ['feet']);
    boot.setMaterial(demoSteel());
    boot.setConstruction(Construction.of('plate'));
    m.occupy(boot, 'feet');
    const trap = makeTrap({ channel: 'edge', energy: 2, siteSelector: FEET });
    await walkInto(m, trap);
    // The covering stack attenuates the edge — no wound, but it still sprang.
    expect(wound(m)).toBeUndefined();
    expect(trap.getHazardState()).toBe('sprung');
  });

  it('avoids a trap the mover has already discovered (never springs)', async () => {
    const m = plainMover('/obj/Avatar/hz-found');
    const trap = makeTrap({ channel: 'edge', energy: 2, siteSelector: FEET });
    PerceptionApi.recordDiscovery(m, trap as unknown as Thing);
    await walkInto(m, trap);
    expect(wound(m)).toBeUndefined();
    expect(trap.isArmed()).toBe(true);
  });

  it('a ground hazard is cleared by an air-medium crossing (fly)', () => {
    const m = plainMover('/obj/Avatar/hz-flier');
    ContainmentApi.move(m, makeStuff(() => new Location()));
    const trap = makeTrap({ channel: 'edge', energy: 2, siteSelector: FEET });
    // modeOf('fly') → an air-medium mode; the ground trap clears.
    vi.spyOn(LocomotionApi, 'modeOf').mockReturnValue({
      getMedium: () => 'air',
    } as never);
    trap.resolveTraversal(m, 'fly');
    expect(wound(m)).toBeUndefined();
    expect(trap.isArmed()).toBe(true);
  });
});

describe('HazardMixin — veto / redirect consequences', () => {
  it('pin holds the mover’s body slot', async () => {
    const m = richMover('/obj/Avatar/hz-pinned');
    const trap = makeTrap(
      { channel: 'point', energy: 1, siteSelector: FEET },
      { traverseConsequence: 'pin' },
    );
    await walkInto(m, trap);
    expect(m.hasEngagement('body')).toBe(true);
  });

  it('trip knocks the mover prone', async () => {
    const m = richMover('/obj/Avatar/hz-tripped');
    expect(m.getPosture()).toBe(Postures.Stand);
    const trap = makeTrap(
      { channel: 'edge', energy: 1, siteSelector: FEET },
      { traverseConsequence: 'trip' },
    );
    await walkInto(m, trap);
    expect(m.getPosture()).toBe(Postures.Lie);
  });

  it('drop relocates the mover to the authored below-location', async () => {
    const m = plainMover('/obj/Avatar/hz-dropped');
    const below = makeStuff(() => new Location());
    const belowPath = `/obj/test/pit-below-${n}`;
    stampTemplatePathForTest(below, belowPath);
    const trap = makeTrap(
      { channel: 'point', energy: 2, siteSelector: FEET },
      { traverseConsequence: 'drop', dropDestination: belowPath },
    );
    await walkInto(m, trap);
    expect(m.getContainer()).toBe(below);
    // The pit still sprang exactly once (reentrancy guard).
    expect(trap.getHazardState()).toBe('sprung');
  });
});

describe('HazardMixin — interact trigger + toxin dart', () => {
  it('an interact hazard springs on resolveInteract (and not on traversal)', async () => {
    const m = plainMover('/obj/Avatar/hz-chest');
    const trap = makeTrap(
      { channel: 'point', energy: 2, siteSelector: FEET },
      { trigger: 'interact' },
    );
    // Walking past an interact hazard does nothing.
    await walkInto(m, trap);
    expect(wound(m)).toBeUndefined();
    expect(trap.isArmed()).toBe(true);
    // The touch springs it.
    trap.resolveInteract(m);
    expect(wound(m)).toBeDefined();
    expect(trap.getHazardState()).toBe('sprung');
  });

  it('a toxin dart injects its dose into the metabolism burden', async () => {
    const m = plainMover('/obj/Avatar/hz-darted');
    const trap = makeTrap({
      channel: 'point',
      energy: 1,
      siteSelector: FEET,
      toxin: { type: 'venom', amount: 5 },
    });
    await walkInto(m, trap);
    // The dose lands straight on the burden (past digestion).
    expect((m as unknown as { toxinBurdens: Record<string, number> }).toxinBurdens.venom).toBe(5);
  });
});

describe('disarm — found-gated', () => {
  function target(t: Trap): MqlOneResult {
    return { stuff: t as unknown as Thing, raw: 'trap' } as unknown as MqlOneResult;
  }

  it('cannot disarm a trap the actor has not discovered', async () => {
    const m = plainMover('/obj/Avatar/hz-blind');
    ContainmentApi.move(m, makeStuff(() => new Location()));
    const trap = makeTrap({ channel: 'edge', energy: 2, siteSelector: FEET });
    const context = ctx(m, m.getContainer());
    await makeStuff(() => new DisarmController()).execute({ target: target(trap) }, context);
    expect(trap.isArmed()).toBe(true); // still live — you can't defuse what you can't see
  });

  it('disarms a trap the actor has discovered', async () => {
    const m = plainMover('/obj/Avatar/hz-sharp');
    ContainmentApi.move(m, makeStuff(() => new Location()));
    const trap = makeTrap({ channel: 'edge', energy: 2, siteSelector: FEET });
    PerceptionApi.recordDiscovery(m, trap as unknown as Thing);
    const context = ctx(m, m.getContainer());
    await makeStuff(() => new DisarmController()).execute({ target: target(trap) }, context);
    expect(trap.getHazardState()).toBe('disarmed');
  });
});

describe('HazardMixin — player-placed accountability (the trap producer)', () => {
  const benign: HazardDeliveryOptions = {
    channel: 'blunt',
    energy: 0,
    siteSelector: [],
  };

  /** A Map-backed ledger store so `AccountabilityApi.blameFor` reads back
   * the `harm` row the spring appends (the shared beforeEach discards saves). */
  function installLedgerStore(): void {
    const store: Record<string, unknown>[] = [];
    const pm = PersistenceManager.get();
    let id = 0;
    vi.spyOn(pm, 'save').mockImplementation(
      async (_col: string, doc: Record<string, unknown>) => {
        const _id = (doc._id as string | undefined) ?? `led-${id++}`;
        store.push({ ...doc, _id });
        return _id as never;
      },
    );
    vi.spyOn(pm, 'find').mockImplementation(
      async (_col: string, query: Record<string, unknown>) =>
        store.filter((d) =>
          Object.entries(query).every(([k, v]) => d[k] === v),
        ) as never,
    );
  }

  /** Flush the fire-and-forget `record` → append → save microtask chain. */
  async function flush(): Promise<void> {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  }

  it('a placed trap that springs on a non-consenting sentient derives a crime', async () => {
    installLedgerStore();
    vi.spyOn(SpeciesApi, 'isSentient').mockReturnValue(true);
    const trap = makeTrap(benign, { trigger: 'traversal' });
    trap.setPlacedBy('/obj/Avatar/trapper');
    const victim = plainMover('/obj/Avatar/victim');

    await walkInto(victim, trap);
    await flush();

    expect(await AccountabilityApi.crimeFor('/obj/Avatar/victim')).toBe(true);
    const verdict = await AccountabilityApi.blameFor('/obj/Avatar/victim');
    expect(verdict!.killer).toBe('/obj/Avatar/trapper');
  });

  it('a placed trap that springs on a beast is not a crime', async () => {
    installLedgerStore();
    vi.spyOn(SpeciesApi, 'isSentient').mockReturnValue(false);
    const trap = makeTrap(benign, { trigger: 'traversal' });
    trap.setPlacedBy('/obj/Avatar/trapper');
    const victim = plainMover('/obj/beast/boar');

    await walkInto(victim, trap);
    await flush();

    expect(await AccountabilityApi.crimeFor('/obj/beast/boar')).toBe(false);
  });

  it('an authored (unplaced) trap appends NO accountability row', async () => {
    const record = vi.spyOn(AccountabilityApi, 'record');
    const trap = makeTrap(benign, { trigger: 'traversal' }); // placedBy === ''
    const victim = plainMover('/obj/Avatar/passerby');

    await walkInto(victim, trap);

    expect(record).not.toHaveBeenCalled();
  });
});
