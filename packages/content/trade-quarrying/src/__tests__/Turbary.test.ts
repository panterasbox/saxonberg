/**
 * The turbary — ⭐⭐ **the fuel or the field, and not both.**
 *
 * The one RGO in this game that carries an irreversible choice with no
 * dominant option, and the three things that make it one:
 *
 *  1. **Cutting removes depth**, and nothing puts it back. A bank cut out
 *     stays cut, **across a restore** — which is why a turbary is Persistable
 *     and a mine's authored gallery is not.
 *  2. ⭐⭐ **Draining destroys it.** Progress on `draining` is literally the
 *     subsidence rate, because an unditched moss is waterlogged and anaerobic,
 *     which is the whole reason the peat is there. So the ground gets better
 *     and the fuel goes, and both are true at once.
 *  3. ⚠ **No far-past guard.** Land changes over the whole absence, which is
 *     what makes the choice irreversible rather than reversible by logging out.
 *
 * Plus the composition claim: a moss answers its own improvement bill, which is
 * the hook that let `ImprovableMixin` leave the trade that invented it — a
 * `Field` reads farming's seeded model and a bog reads itself, and the kernel's
 * `grub`/`ditch`/`lime` never learn what either is.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Turbary from '../location/Turbary';
import Deposit from '@saxonberg/content-ground/src/idea/Deposit';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { WorkPlan, WorkRefusal } from '@saxonberg/server/mud/lib/ground/Workable';
import { IMPROVEMENT_JOBS } from '@saxonberg/server/mud/lib/ground/Improvable';

const ZONE = '/world/fx-moor/moor';
const DEPOSIT = '/world/fx-moor/idea/deposit/heath';
const PEAT = '/stuff/idea/material/organic/peat';
const GRANITE = '/stuff/idea/material/rock/granite';
const TURF_ROW = '/trade/quarrying/thing/turf';

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;

let zone: CartesianZone;
let actor: Stuff;
let bank: Turbary;

function seedMaterials(): void {
  const peat = makeStuffAtPath(() => new Material(), PEAT) as unknown as Material & {
    hardness: Quantity<'MPa'>;
  };
  peat.setName('peat');
  // ⭐ `earth`, which is what makes a turf bank a SPADE's job and not a pick's.
  peat.setTags(['organic', 'earth', 'solid', 'fibrous', 'fuel']);
  peat.hardness = Quantity.of(1, 'MPa');
  const granite = makeStuffAtPath(
    () => new Material(),
    GRANITE,
  ) as unknown as Material & { hardness: Quantity<'MPa'> };
  granite.setName('granite');
  granite.setTags(['rock', 'igneous']);
  granite.hardness = Quantity.of(200, 'MPa');
}

/** The column, seeded ONCE per test. */
function seedColumn(): void {
  const deposit = makeStuffAtPath(() => new Deposit(), DEPOSIT);
  deposit.setName('heath');
  deposit.setStratigraphy([
    { toZ: -2.5, host: PEAT, wins: TURF_ROW },
    { toZ: -400, host: GRANITE },
  ]);
  deposit.setWaterTable(-2.5);
}

let cellSeq = 0;

function makeBank(opts?: { floorDepthM?: number; subsidenceM?: number }): Turbary {
  const t = makeStuff(() => new Turbary()) as unknown as Turbary;
  t.faceRunM = 12;
  t.floorDepthM = opts?.floorDepthM ?? 0;
  t.subsidenceM = opts?.subsidenceM ?? 0;
  // ⚠ Its own cell, and ONE deposit per test: a second `makeStuffAtPath` at a
  // path that already holds a row leaves two instances in the index, every
  // later `findByTemplatePath` throws *"expected singleton, found 2"*, and the
  // bank then resolves NO column — which surfaces as `no-such-face`, a
  // refusal with nothing to do with what is being tested.
  cellSeq += 1;
  zone.addLocation(t as unknown as never, cellSeq, 0, 0);
  return t;
}

const spade = (): Stuff & Tooled =>
  makeStuff(() => {
    const i = new ToolItem();
    i.capabilities = ['digging'];
    return i;
  }) as unknown as Stuff & Tooled;

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
  makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  WorldClockApi._resetForTesting();
  now = BASE;
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  seedMaterials();
  zone = makeStuffAtPath(() => new CartesianZone(), ZONE);
  zone.setCellSize(3);
  (zone as unknown as { deposit: string }).deposit = DEPOSIT;
  cellSeq = 0;
  seedColumn();
  actor = makeStuff(() => new Thing()) as unknown as Stuff;
  vi.spyOn(StuffApi, 'clone').mockImplementation((async () =>
    makeStuff(() => new Thing())) as never);
  bank = makeBank();
});

afterEach(() => {
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
});

const advance = (gameDays: number): void => {
  now = BASE + gameDays * DAY;
};

describe('a peat bank is worked with a spade', () => {
  it('⭐ the peat band is EARTH, so a spade takes it and a pick does not', async () => {
    const faces = await bank.exposedBands();
    expect(faces).toHaveLength(1);
    expect(faces[0]!.earth).toBe(true);
    const plan = (await bank.planWork(actor, spade(), null)) as WorkPlan;
    expect(plan.kind).toBe('plan');
  });

  it('the water is at the BOTTOM of the peat — the floor stops there', async () => {
    // Which is not a coincidence anywhere in the world: the water is why the
    // peat is there. So there is nothing under a moss worth the swing.
    expect(await bank.floorStop()).toBeCloseTo(2.5, 6);
    const spent = makeBank({ floorDepthM: 2.4 });
    const out = (await spent.planWork(actor, spade(), null)) as WorkRefusal;
    expect(out.reason).toBe('at-the-water');
  });

  it('⭐ a turbary is genuinely EXHAUSTIBLE, unlike the stone pit', async () => {
    // 2.5 m of peat on a 12 m run — real, and finite. Deliberately far smaller
    // than the quarry's 320-unit granite band, because *"a cut turbary does not
    // come back"* is an acceptance criterion and the arithmetic has to agree
    // with it at the shipped scale.
    const face = (await bank.exposedBands())[0]!;
    expect(face.capacity).toBeGreaterThan(50);
    expect(face.capacity).toBeLessThan(200);
  });
});

describe('⭐⭐ draining destroys it — the fuel or the field', () => {
  it('an UNDITCHED moss does not subside at all, however long you leave it', async () => {
    // The peat is there BECAUSE it is waterlogged. No drains, no oxidation.
    const before = await bank.peatRemainingM();
    advance(400);
    expect(await bank.peatRemainingM()).toBeCloseTo(before, 6);
    expect(bank.subsidenceM).toBe(0);
  });

  it('⭐⭐ …and a DRAINED one loses the peat while the ground gets better', async () => {
    const bill = (await bank.improvementBill())!;
    // ⚠ The ground gets better only when the WHOLE bill is paid — the weakest
    // link decides the band, so a moss with beautiful drains and heather still
    // on it reads rough, which is correct and is the reason to bank all three.
    for (const job of IMPROVEMENT_JOBS) {
      let acts = 0;
      while (bank.progressOn(job, bill) < 1 && acts < 400) {
        bank.bankWork(job, 1, bill);
        acts += 1;
      }
      expect(bank.progressOn(job, bill), job).toBe(1);
    }
    expect(bank.improvementBand(bill)).toBe('in-heart');
    // ⚠ Read once to start the subsidence clock: a reconcile-on-read gauge
    // seeds its stamp on the first look and integrates from there. Which is
    // right — a bank nobody has ever looked at has no window to integrate.
    const before = await bank.peatRemainingM();

    advance(120);
    const after = await bank.peatRemainingM();
    // ⭐ The trade: the fuel is going.
    expect(after).toBeLessThan(before);
    // ⭐⭐ …and the ground goes back if nobody maintains it, which is the
    // SECOND lesson and is not a bug: four months of neglect and the scrub is
    // returning. So the field you bought with the fuel is a field you have to
    // keep, and that is what stops improvement being a one-way ratchet.
    expect(bank.improvementBand(bill)).not.toBe('in-heart');
  });

  it('⚠ the subsidence has NO far-past guard — it runs over the whole absence', async () => {
    // The family clock's guard is for the inhabited body alone. If land were
    // guarded, a moss you drained and walked away from would come back, and
    // the choice would be reversible by logging out.
    const bill = (await bank.improvementBill())!;
    for (let i = 0; i < 400 && bank.progressOn('draining', bill) < 1; i++) {
      bank.bankWork('draining', 1, bill);
    }
    // Start the clock, then go away for five real days of game time.
    await bank.peatRemainingM();
    advance(2_000);
    expect(await bank.peatRemainingM()).toBe(0);
  });

  it('⭐ cutting and subsidence are SEPARATE, and a reader can tell them apart', async () => {
    // One is what somebody cut; the other is what went while nobody was here.
    // A bank can be shallow either way and the difference is the whole story.
    const cut = makeBank({ floorDepthM: 1.0 });
    const drained = makeBank({ subsidenceM: 1.0 });
    expect(cut.getFloorDepthM()).toBe(1.0);
    expect(cut.subsidenceM).toBe(0);
    expect(drained.getFloorDepthM()).toBe(0);
    expect(drained.subsidenceM).toBe(1.0);
    // …and both have the same peat left, because both took a metre.
    expect(await cut.peatRemainingM()).toBeCloseTo(
      await drained.peatRemainingM(),
      6,
    );
  });
});

describe('the composition, and what it claims', () => {
  it('⭐⭐ a moss answers its OWN improvement bill — the hook the kernel asks', async () => {
    // A `Field` reads farming's seeded `GroundCharacter`; a bog reads itself,
    // because a bog's bill is not a mystery: there is scrub on it, the water
    // has nowhere to go, and it is sour. That asymmetry is exactly why the
    // hook exists — the kernel's acts never learn what a GroundCharacter is.
    const bill = await bank.improvementBill();
    expect(bill).not.toBeNull();
    expect(bill!.draining).toBeGreaterThan(0);
    expect(bill!.liming).toBeGreaterThan(0);
    // ⚠ Nothing to pick out of a bog, and nothing to terrace.
    expect(bill!.stonePicking).toBe(0);
    expect(bill!.terracing).toBe(0);
  });

  it('every improvement job is HONEST on a moss — no guard re-narrows the host', async () => {
    // The host-placement test, stated: clearing is the heather and the birch
    // scrub, draining is the lesson, liming is real because peat is acid. If
    // any job were meaningless here, `ImprovableMixin` would be on the wrong
    // host and a guard would be needed to say so.
    const bill = (await bank.improvementBill())!;
    for (const job of IMPROVEMENT_JOBS) {
      expect(bank.progressOn(job, bill), job).toBe(0);
    }
  });

  it('⚠ and the STONE pit is deliberately NOT improvable', async () => {
    // Ditching a stone pit would have no consequence in this build, and a verb
    // that does nothing is the antipattern a gate exists for. The requirement's
    // *"you ditch a road, a yard and a quarry"* is honoured as the reason for
    // the KERNEL home, not as a shipped act on a quarry face.
    const { default: OpenWorking } = await import('../location/OpenWorking');
    expect(MixinApi.hasMixin(OpenWorking, 'ImprovableMixin' as never)).toBe(false);
    expect(MixinApi.hasMixin(Turbary, 'ImprovableMixin' as never)).toBe(true);
  });
});
