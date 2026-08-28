/**
 * The mana potion is METABOLIC (capability packs D5): `mana-draught` is
 * a `PotionMaterial` with no spell whose meal chemistry feeds the
 * coupled recovery a caster's reserve already refills through — body
 * before gift. So a depleted caster who drinks it recovers NOTHING on
 * the tick it is drunk, more than a control across the recovery window,
 * about half as much on half a dose; and a non-caster is merely fed.
 *
 * The material is a kernel-side twin of the arcane library's row (a
 * kernel test never reads a pack's class); the chemistry is the row's.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import Species from '../../../platform/idea/species/Species';
import { ConsumableMaterial } from '../../../platform/idea/material/ConsumableMaterial';
import { Character } from '../../character/Character';
import { Quantity } from '../../quantity';
import { Postures } from '../../slot/Postured';
import { MANA_RESERVE_KEY } from '../Caster';
import { makeStuff, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestCharacter extends Character {}

const SCALE = 12;
let real = 0;
let seq = 0;

function makeCaster(caster = true): TestCharacter {
  const n = seq++;
  const species = makeStuff(() => new Species());
  if (caster) {
    species.setFacultyProfile({ depth: 'mid', serenity: 'mid', composure: 'mid' });
    species.setInnateMixins(['CasterMixin']);
  }
  species.setSentient(true);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/mana-potion-${n}`);
  const c = makeStuff(() => new TestCharacter());
  c.setSpecies(species);
  stampTemplatePathForTest(c, `/obj/test/mana-potion-${n}`);
  if (caster) c.installArcaneReserve();
  c.setPosture(Postures.Lie);
  return c;
}

/** The mana draught's chemistry: water + sugar + carb, no spell. */
function manaDraught(): ConsumableMaterial {
  const m = makeStuff(() => new ConsumableMaterial());
  stampTemplatePathForTest(m, `/obj/test/mana-draught-${seq++}`);
  m.setName('mana draught');
  m.setNutrients(['water', 'sugar', 'carb']);
  m.setEdibility(true);
  return m;
}

const L = (n: number) => Quantity.of(n, 'L');
const Q = (n: number) => Quantity.of(n, '%');
const mana = (c: TestCharacter) => c.getMana()!.current.rawValue();
const sat = (c: TestCharacter) => c.getReserve('satiation')!.current.rawValue();

function advanceAll(cs: TestCharacter[], gameSec: number, chunk = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunk, remaining);
    real += (s / SCALE) * 1000;
    for (const c of cs) c.getReserve('satiation');
    remaining -= s;
  }
}

/** A depleted, hungry caster — the shape a mana potion is for. */
function depleted(): TestCharacter {
  const c = makeCaster();
  c.getMana();
  c.adjustReserve(MANA_RESERVE_KEY, Quantity.of(-80, 'pt'));
  // Empty pools: recovery halts on nothing to pay with (the coupled
  // test's own precedent), so what the potion feeds is the whole gain.
  c.adjustReserve('satiation', Q(-100));
  c.adjustReserve('hydration', Q(-40));
  return c;
}

describe('the mana potion — metabolic, never a generator', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => vi.restoreAllMocks());

  it('drinking recovers nothing on the tick; across the window a drinker reaches more mana than a control', () => {
    const drinker = depleted();
    const control = depleted();
    const before = mana(drinker);
    drinker.ingest(manaDraught(), L(0.25), 'liquid');
    expect(mana(drinker)).toBeCloseTo(before, 3);
    advanceAll([drinker, control], 6000);
    expect(mana(drinker)).toBeGreaterThan(mana(control));
  });

  it('half a dose recovers about half', () => {
    const full = depleted();
    const half = depleted();
    const control = depleted();
    // Sips, so the FUEL runs out inside the window and the gain is the
    // dose's (a whole flask on an empty stomach out-feeds the recovery
    // rate for longer than the test wants to wait).
    full.ingest(manaDraught(), L(0.06), 'liquid');
    half.ingest(manaDraught(), L(0.03), 'liquid');
    advanceAll([full, half, control], 12000);
    const gainFull = mana(full) - mana(control);
    const gainHalf = mana(half) - mana(control);
    expect(gainFull).toBeGreaterThan(0);
    // "About half": body before gift — the body's own consumers take a
    // fixed first cut of any meal, and the recovery RATE caps what a
    // bigger dose can buy inside one window, so the proportion sits
    // between the two, never at either extreme.
    expect(gainHalf / gainFull).toBeGreaterThan(0.35);
    expect(gainHalf / gainFull).toBeLessThan(0.8);
  });

  it("a non-caster's satiation rises and nothing else happens", () => {
    const eater = makeCaster(false);
    eater.getReserve('satiation');
    eater.adjustReserve('satiation', Q(-60));
    const before = sat(eater);
    eater.ingest(manaDraught(), L(0.25), 'liquid');
    advanceAll([eater], 6000);
    expect(sat(eater)).toBeGreaterThan(before);
    expect(eater.getMana()).toBeNull();
  });
});
