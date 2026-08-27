/**
 * The care↔speed axis over a concealed trap (Phase 5) — the acceptance
 * proof that the locomotion mode changes the trap outcome, in BOTH
 * directions, deterministically:
 *
 *   (a) a trap a `walk` springs is AVOIDED when SNEAKING — moving
 *       carefully raises traverse-time perception above the requirement;
 *   (b) a trap a `walk` avoids is SPRUNG when RUNNING — barreling along
 *       drops perception below the requirement.
 *
 * This is "sneak avoids where walk springs; run springs where walk avoids"
 * — the risk-dial. The whole decision is a pure function of the mover's
 * warmed `awareness` band + the concealment requirement + the mode's
 * attention modifier; NO `Math.random`, so a single input tuple is
 * bit-identical across runs (asserted at the tail).
 *
 * Concrete inputs (all from seeded-literal dial fallbacks — no AppSettings
 * warm needed): capacityPerBand = 3, so a `novice` mover has capacity 3.
 * modeAttention: walk 0, sneak +2, run −2. Concealment requirements:
 * `subtle` = 2, `hidden` = 4. Then:
 *   - `hidden`(4): walk 3+0=3 < 4 → springs;  sneak 3+2=5 ≥ 4 → avoids.
 *   - `subtle`(2): walk 3+0=3 ≥ 2 → avoids;   run   3−2=1 < 2 → springs.
 *
 * (No test asserts others-can't-see-a-sneaker — that observer-side stealth
 * is the deferred consumer.)
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Trap from '../../../platform/thing/Trap';
import { HazardDelivery, type HazardDeliveryOptions } from '../HazardDelivery';
import { MobileMixin } from '../../spatial/Mobile';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Location from '../../stuff/Location';
import { MessageApi } from '../../../api/message';
import { ContainmentApi } from '../../../api/containment';
import { PerceptionApi } from '../../../api/perception';
import { AdvancementApi } from '../../../api/advancement';
import { SpeciesApi } from '../../../api/species';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../../platform/idea/Condition';
import type { ConcealmentLevel } from '../../concealment/ConcealmentLevel';

let n = 0;
let bodyplanPath = '';
let sharedSpecies: Species;
let trapCounter = 0;

// A plain mover: Mobile (so it traverses) over Creature (so it has anatomy
// the trap delivery resolves a site against). No BeliefStore — discovery
// plays no part here; the outcome rides perception alone.
class CareSpeedMover extends MobileMixin(Creature) {
  static _mixinName = 'CareSpeedMover';
}

const FEET = ['body.leg.left.foot', 'body.leg.right.foot'];

function footedBodyPlan(): BodyPlan {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('demo-biped');
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

/**
 * A mover warmed to a given `awareness` competence band. `bandFor` +
 * `preloadAnatomy` are stubbed so `preloadForSenseGate` (the real warm
 * seam) snapshots the band into the sync detection gate's cache — capacity
 * = rank(band) × capacityPerBand.
 */
async function warmedMover(path: string, band: string): Promise<CareSpeedMover> {
  const c = makeStuff(() => new CareSpeedMover());
  c.setSpecies(sharedSpecies);
  stampTemplatePathForTest(c, path);
  ContainmentApi.move(c, makeStuff(() => new Location()));
  vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue(band as never);
  vi.spyOn(SpeciesApi, 'preloadAnatomy').mockResolvedValue(undefined as never);
  await PerceptionApi.preloadForSenseGate(c);
  return c;
}

function makeTrap(
  delivery: HazardDeliveryOptions,
  concealment: ConcealmentLevel,
): Trap {
  const t = makeStuff(() => new Trap());
  t.setDelivery(new HazardDelivery(delivery));
  t.setConcealment(concealment);
  stampTemplatePathForTest(t, `/obj/test/cs-trap-${n}-${++trapCounter}`);
  return t;
}

function wound(m: Creature): Trauma | undefined {
  return m.getConditions().find((c) => c.kind === 'trauma') as
    | Trauma
    | undefined;
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
  n++;
  trapCounter = 0;
  bodyplanPath = `/stuff/idea/species/BodyPlan/carespeed-biped-${n}`;
  sharedSpecies = makeStuff(() => new Species());
  sharedSpecies.setBodyPlan(footedBodyPlan());
  stampTemplatePathForTest(sharedSpecies, `/stuff/idea/species/carespeed/biped-${n}`);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('care↔speed — the mode changes the trap outcome', () => {
  it('(a) sneak avoids a hidden trap a walk springs', async () => {
    // A `hidden` trap (requirement 4) vs a novice mover (capacity 3).
    const walker = await warmedMover('/platform/agent/Avatar/cs-walk-a', 'novice');
    const walkTrap = makeTrap(
      { channel: 'edge', energy: 3, siteSelector: FEET },
      'hidden',
    );
    walkTrap.resolveTraversal(walker, 'walk');
    expect(walkTrap.getHazardState()).toBe('sprung'); // walk sets it off
    expect(wound(walker)).toBeDefined();

    const sneaker = await warmedMover('/platform/agent/Avatar/cs-sneak-a', 'novice');
    const sneakTrap = makeTrap(
      { channel: 'edge', energy: 3, siteSelector: FEET },
      'hidden',
    );
    sneakTrap.resolveTraversal(sneaker, 'sneak');
    expect(sneakTrap.isArmed()).toBe(true); // sneak steps around it
    expect(wound(sneaker)).toBeUndefined();
  });

  it('(b) run springs a subtle trap a walk avoids', async () => {
    // A `subtle` trap (requirement 2) vs a novice mover (capacity 3).
    const walker = await warmedMover('/platform/agent/Avatar/cs-walk-b', 'novice');
    const walkTrap = makeTrap(
      { channel: 'edge', energy: 3, siteSelector: FEET },
      'subtle',
    );
    walkTrap.resolveTraversal(walker, 'walk');
    expect(walkTrap.isArmed()).toBe(true); // walk notices + steps around it
    expect(wound(walker)).toBeUndefined();

    const runner = await warmedMover('/platform/agent/Avatar/cs-run-b', 'novice');
    const runTrap = makeTrap(
      { channel: 'edge', energy: 3, siteSelector: FEET },
      'subtle',
    );
    runTrap.resolveTraversal(runner, 'run');
    expect(runTrap.getHazardState()).toBe('sprung'); // run barrels into it
    expect(wound(runner)).toBeDefined();
  });

  it('is deterministic — the same input tuple resolves identically every run', async () => {
    // Re-run the (a) sneak-avoids resolution twice over independent, but
    // identically-configured, movers/traps: the outcome is bit-identical
    // (no RNG). Repeat the walk-springs half too, for both directions.
    for (let i = 0; i < 3; i++) {
      const s = await warmedMover(`/platform/agent/Avatar/cs-det-sneak-${i}`, 'novice');
      const st = makeTrap(
        { channel: 'edge', energy: 3, siteSelector: FEET },
        'hidden',
      );
      st.resolveTraversal(s, 'sneak');
      expect(st.isArmed()).toBe(true);

      const w = await warmedMover(`/platform/agent/Avatar/cs-det-walk-${i}`, 'novice');
      const wt = makeTrap(
        { channel: 'edge', energy: 3, siteSelector: FEET },
        'hidden',
      );
      wt.resolveTraversal(w, 'walk');
      expect(wt.getHazardState()).toBe('sprung');
    }
  });
});
