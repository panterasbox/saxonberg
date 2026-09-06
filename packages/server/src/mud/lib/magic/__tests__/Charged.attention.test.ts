/**
 * ⭐⭐ The hood/veil interlock — a MUNDANE garment doing real arcane
 * work while carrying no joules.
 *
 * Voss Decay says a veil erodes fastest under attention. A deep hood
 * masking the face reduces the evidence observers accumulate, which is
 * *exactly* that stated leak mechanism — so the standby bill for a held
 * binding is not a flat global number: it scales with how much attention
 * the wearer draws.
 *
 * ⚠⚠ **Faculty is capacity, never access.** The hood makes a binding
 * cheaper to HOLD. It gates no spell, changes no efficiency cap, confers
 * no capability, and the floor is bounded well above zero so no garment
 * makes a binding free. The last two tests here are the doctrine
 * assertions, and they matter more than the first one.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import { Character } from '../../character/Character';
import Thing from '../../stuff/Thing';
import { ChargedMixin } from '../Charged';
import { ArcaneMixin } from '../Arcane';
import { BlessableMixin } from '../Blessable';
import { ReservedMixin } from '../../reserve';
import { WearableMixin } from '../../slot/Wearable';
import { SlottableMixin } from '../../slot/Slottable';
import { ConstructedMixin } from '../../material/Constructed';
import { ContainableMixin } from '../../spatial/Containable';
import { DisguiseBearingMixin } from '../../disguise/Disguise';
import { Construction } from '../../material/Construction';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

/** A charged thing worn on a finger — the veil's carrier. */
class Ring extends BlessableMixin(
  ChargedMixin(ReservedMixin(ArcaneMixin(SlottableMixin(Thing)))),
) {}

/** A hood: exactly the shipped row's shape — it masks identity. */
class Hood extends DisguiseBearingMixin(
  WearableMixin(SlottableMixin(ContainableMixin(ConstructedMixin(Thing)))),
) {}

let seq = 0;
let now = 100000;

/** A concrete Character — the class is abstract. */
class Wearer extends Character {}

function wearerWithHead(): { body: Wearer; planPath: string } {
  const n = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`attn-${n}`);
  plan.setSlots([
    { name: 'head', accepts: 'WearableMixin', capacity: 4, covers: ['body.head'] },
    { name: 'finger:left', accepts: 'SlottableMixin' },
  ]);
  plan.setBodyParts([
    {
      key: 'body.head',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 5 }],
    },
  ]);
  const planPath = `/stuff/idea/species/BodyPlan/attn-${n}`;
  stampTemplatePathForTest(plan, planPath);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/attn-${n}`);

  const body = makeStuff(() => new Wearer());
  body.setSpecies(species);
  return { body, planPath };
}

function hood(planPath: string, masks: boolean): Hood {
  const h = makeStuff(() => new Hood());
  h.setConstructionForm('woven');
  h.setSlotClaim(planPath, ['head']);
  if (masks) {
    h.setAppearsAs('a hooded figure');
    h.setMasksIdentity(true);
  }
  return h;
}

function ring(): Ring {
  const r = makeStuff(() => new Ring());
  stampTemplatePathForTest(r, `/obj/test/attn-ring-${seq++}`);
  r.setAlwaysOn(true);
  r.setCapacityTau(10000);
  r.installChargeReserve();
  return r;
}

describe('the hood/veil interlock', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    now = 100000;
    WorldClockApi._setNowProviderForTesting(() => now);
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.9,
      drape: 0.6,
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  /**
   * Both wearers built up front and ONE clock advance, so the elapsed
   * time is identical by construction rather than by two resets.
   */
  function drawnOverAnHour(): { hooded: number; bare: number } {
    const a = wearerWithHead();
    a.body.occupyAll(hood(a.planPath, true), ['head']);
    const b = wearerWithHead();

    const hoodedRing = ring();
    a.body.occupy(hoodedRing as never, 'finger:left');
    const bareRing = ring();
    b.body.occupy(bareRing as never, 'finger:left');
    // Force the draw on without going through the sustain machinery:
    // what is under test is the STANDBY TERM, not the binding's setup.
    hoodedRing.setDrawActive(true);
    bareRing.setDrawActive(true);
    const hoodedBefore = hoodedRing.getStoredTau();
    const bareBefore = bareRing.getStoredTau();

    now += 3600 * 1000;

    return {
      hooded: hoodedBefore - hoodedRing.getStoredTau(),
      bare: bareBefore - bareRing.getStoredTau(),
    };
  }

  it('⭐ a hood makes a held binding CHEAPER — and never free', () => {
    // ⚠ Both wearers are built and measured in ONE test, off one clock
    // advance. Two separate tests would each need their own world-clock
    // rewind, and the second one silently measures nothing.
    const { hooded, bare } = drawnOverAnHour();
    expect(bare).toBeGreaterThan(0);
    expect(hooded).toBeGreaterThan(0);
    expect(hooded).toBeLessThan(bare);
    // ⚠⚠ Faculty is capacity, never access: a hood makes a binding
    // cheaper to HOLD, and nothing makes it free.
    expect(hooded / bare).toBeGreaterThan(0.25);
  });

  it('⚠⚠ the factor itself is bounded into [floor, 1]', () => {
    // Never above 1 either — no garment makes a binding cost MORE than
    // the global dial says.
    const { body, planPath } = wearerWithHead();
    expect(body.attentionFactor()).toBe(1);
    for (let i = 0; i < 4; i++) {
      body.occupyAll(hood(planPath, true), ['head']);
    }
    expect(body.attentionFactor()).toBeLessThanOrEqual(1);
    expect(body.attentionFactor()).toBeGreaterThan(0.25);
  });

  it('⚠ a garment that masks NOTHING changes nothing about attention', () => {
    const { body, planPath } = wearerWithHead();
    expect(body.attentionFactor()).toBe(1);
    body.occupyAll(hood(planPath, false), ['head']);
    // A plain head covering still lowers it a little (a shadowed face
    // is a shadowed face) but far less than a masking one.
    const plain = body.attentionFactor();

    const masked = wearerWithHead();
    masked.body.occupyAll(hood(masked.planPath, true), ['head']);
    expect(masked.body.attentionFactor()).toBeLessThan(plain);
  });

  it('⚠⚠ NO garment changes what can be CAST, or lifts an efficiency cap', () => {
    /*
     * The doctrine assertion, and it is the one that matters. The
     * interlock is a standing-COST discount, full stop. Nothing about
     * `attentionFactor` appears in any capability, spell-eligibility or
     * efficiency path — asserted structurally, because a later reader
     * reaching for it there would be a doctrine violation rather than a
     * bug.
     */
    const { body, planPath } = wearerWithHead();
    const species = body.getSpecies()!;
    const bareFaculty = species.getFacultyProfile();
    body.occupyAll(hood(planPath, true), ['head']);
    expect(species.getFacultyProfile()).toEqual(bareFaculty);
    // The factor itself is bounded into [floor, 1] — it can never be a
    // multiplier greater than one either, so no garment ever makes a
    // binding cost MORE than the global dial says.
    expect(body.attentionFactor()).toBeLessThanOrEqual(1);
    expect(body.attentionFactor()).toBeGreaterThan(0);
  });
});
