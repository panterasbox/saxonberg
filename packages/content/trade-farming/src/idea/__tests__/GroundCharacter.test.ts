/**
 * GroundCharacter — the seeded half of soil (W2 / D2, D55).
 *
 * ⭐ The two properties that matter here are **totality** and
 * **determinism**: every spot has a character whether or not anybody
 * authored one, and the answer was true before anyone asked. Nothing is
 * stored, so a cold boot is not a hazard — it is a non-event.
 *
 * ⚠ And the fold order is the spine invariant, inherited from `Deposit`:
 * an authored **pin** wins over an authored **lean**, which SCALES the
 * procedural value rather than replacing it, so an authored valley floor
 * and a computed one are indistinguishable to every consumer downstream.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import GroundCharacter, {
  TEXTURE_CLASSES,
  type GroundSample,
  type Spot,
} from '../GroundCharacter';

const SEED = GroundCharacter.seedFor('/terminus/hinkley-hills');
const OTHER = GroundCharacter.seedFor('/terminus/wharfside');

const at = (x: number, y: number): Spot => [x, y];
const sample = (x: number, y: number, seed = SEED): GroundSample =>
  GroundCharacter.resolve(null, at(x, y), seed);

describe('GroundCharacter — the seeded field', () => {
  it('⭐ is TOTAL: every spot answers, with no model authored anywhere', () => {
    for (let x = -3; x <= 3; x++) {
      for (let y = -3; y <= 3; y++) {
        const s = sample(x, y);
        expect(TEXTURE_CLASSES).toContain(s.texture);
        expect(s.drainage).toBeGreaterThanOrEqual(0);
        expect(s.drainage).toBeLessThanOrEqual(1);
        expect(s.nativePh).toBeGreaterThan(3);
        expect(s.nativePh).toBeLessThan(9);
        expect(s.topsoilM).toBeGreaterThan(0);
      }
    }
  });

  it('⭐ is DETERMINISTIC — same address, same spot, same answer, forever', () => {
    expect(sample(4, 7)).toEqual(sample(4, 7));
    // A different address is a different field, not a shifted one.
    expect(sample(4, 7, OTHER)).not.toEqual(sample(4, 7));
  });

  it('the seed is derived from the address and stored NOWHERE', () => {
    expect(GroundCharacter.seedFor('/a')).toBe(GroundCharacter.seedFor('/a'));
    expect(GroundCharacter.seedFor('/a')).not.toBe(GroundCharacter.seedFor('/b'));
  });

  it('⭐ properties are CORRELATED, because real ground is', () => {
    // Sampled broadly: steeper ground drains better and carries less
    // topsoil. Six independent draws would produce free-draining clay on
    // a flat bottom, which no field in the world has ever been.
    const flat: number[] = [];
    const steep: number[] = [];
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 40; y++) {
        const s = sample(x, y);
        (s.slopeDeg < 4 ? flat : s.slopeDeg > 12 ? steep : []).push(s.drainage);
      }
    }
    expect(flat.length).toBeGreaterThan(20);
    expect(steep.length).toBeGreaterThan(20);
    expect(mean(steep)).toBeGreaterThan(mean(flat));
  });

  it('texture varies SMOOTHLY across a holding, not cell by cell', () => {
    // A chequerboard of textures would be a lie about how ground works.
    let changes = 0;
    for (let x = 0; x < 40; x++) {
      if (sample(x, 0).texture !== sample(x + 1, 0).texture) changes += 1;
    }
    expect(changes).toBeLessThan(20);
  });

  it('⭐⭐ character prices IMPROVEMENT, and never yield', () => {
    const stony = { ...sample(0, 0), stoniness: 0.9, nativePh: 6.5, slopeDeg: 2, drainage: 0.7 };
    const clean = { ...stony, stoniness: 0.05 };
    expect(GroundCharacter.improvementCost(stony).stonePicking).toBeGreaterThan(
      GroundCharacter.improvementCost(clean).stonePicking,
    );

    const sour = { ...clean, nativePh: 4.9 };
    expect(GroundCharacter.improvementCost(sour).liming).toBeGreaterThan(0);
    expect(GroundCharacter.improvementCost(clean).liming).toBe(0);

    const wet = { ...clean, drainage: 0.1 };
    expect(GroundCharacter.improvementCost(wet).draining).toBeGreaterThan(0);
    expect(GroundCharacter.improvementCost(clean).draining).toBe(0);

    const steep = { ...clean, slopeDeg: 20 };
    expect(GroundCharacter.improvementCost(steep).terracing).toBeGreaterThan(0);
    expect(GroundCharacter.improvementCost(clean).terracing).toBe(0);
  });

  it('texture modulates water, leaching and poaching in the real directions', () => {
    expect(GroundCharacter.waterHoldingFactor('clay')).toBeGreaterThan(
      GroundCharacter.waterHoldingFactor('sand'),
    );
    expect(GroundCharacter.leachFactor('sand')).toBeGreaterThan(
      GroundCharacter.leachFactor('clay'),
    );
    expect(GroundCharacter.poachingFactor('clay')).toBeGreaterThan(
      GroundCharacter.poachingFactor('sand'),
    );
  });
});

describe('the fold — pin over lean over procedural', () => {
  const model = async (): Promise<GroundCharacter> =>
    StuffApi.create(() => {
      const g = new GroundCharacter();
      g.setBands([
        { from: [0, 0], to: [4, 4], drainageScale: 0.2, note: 'the wet bottom' },
      ]);
      g.setPins({ '2,2': { texture: 'clay', nativePh: 5.0 } });
      return g;
    });

  it('a lean SCALES the computed value rather than replacing it', async () => {
    const m = await model();
    const bare = GroundCharacter.resolve(null, at(3, 3), SEED);
    const leaned = GroundCharacter.resolve(m, at(3, 3), SEED);
    expect(leaned.drainage).toBeLessThan(bare.drainage);
    // Everything the band says nothing about is untouched.
    expect(leaned.texture).toBe(bare.texture);
    expect(leaned.slopeDeg).toBe(bare.slopeDeg);
  });

  it('a lean applies only inside its rectangle', async () => {
    const m = await model();
    expect(GroundCharacter.resolve(m, at(9, 9), SEED)).toEqual(
      GroundCharacter.resolve(null, at(9, 9), SEED),
    );
  });

  it('⭐ a pin WINS, and only over the fields it names', async () => {
    const m = await model();
    const pinned = GroundCharacter.resolve(m, at(2, 2), SEED);
    const bare = GroundCharacter.resolve(null, at(2, 2), SEED);
    expect(pinned.texture).toBe('clay');
    expect(pinned.nativePh).toBe(5.0);
    // Un-pinned fields still carry the LEAN, not the bare value.
    expect(pinned.drainage).toBeLessThan(bare.drainage);
  });
});

describe('what it reads like (D86)', () => {
  it('⭐⭐ the free look is a PERCEPT, never a number in words', () => {
    for (const texture of TEXTURE_CLASSES) {
      const phrase = GroundCharacter.lookPhrase({
        ...sample(0, 0),
        texture,
      });
      expect(phrase).not.toMatch(/\d/);
      expect(phrase).not.toMatch(/texture|drainage|stoniness|pH/i);
      expect(phrase.length).toBeGreaterThan(20);
    }
  });

  it('⚠ the free look never leaks the INVISIBLE properties', () => {
    // pH is the whole argument for the instrument rung. Sour ground
    // looks exactly like sweet ground.
    const sour = GroundCharacter.lookPhrase({ ...sample(0, 0), nativePh: 4.6 });
    const sweet = GroundCharacter.lookPhrase({ ...sample(0, 0), nativePh: 7.4 });
    expect(sour).toBe(sweet);
  });

  it('⭐ every texture class has a DISTINCT ribbon phrase and look phrase', () => {
    const ribbons = new Set(TEXTURE_CLASSES.map((t) => GroundCharacter.ribbonPhrase(t)));
    expect(ribbons.size).toBe(TEXTURE_CLASSES.length);
    const looks = new Set(
      TEXTURE_CLASSES.map((t) => GroundCharacter.lookPhrase({ ...sample(0, 0), texture: t })),
    );
    expect(looks.size).toBe(TEXTURE_CLASSES.length);
  });
});

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
