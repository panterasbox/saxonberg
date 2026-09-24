/**
 * ⭐⭐ `GroundSourceMixin` — the seam that lets a kernel `Floor` ask the
 * ground what it is made of without importing either model.
 *
 * Why it exists at all: the two things that know are both pack-owned, and
 * the kernel cannot import a pack. The reverse — a pack adding a field to a
 * kernel class — is the failure already recorded in `SpatialZone.ts`, where
 * `deposit` and `groundCharacter` sit as authorable strings the kernel
 * interprets nowhere. So the kernel declares the capability and this pack
 * implements it.
 *
 * What the two implementations must NOT do is overlap: a character knows
 * its topsoil, a column knows everything from the collar down, and the
 * boundary between them is what lets a field read loam while the gallery
 * under it reads its host rock — one ladder, two sources, no arbitration.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mixins } from '@saxonberg/server/mud/lib/mixin';
import Deposit from '../idea/Deposit';
import GroundCharacter, { TEXTURE_MATERIALS } from '../idea/GroundCharacter';

const ADDRESS = '/terminus/rejection';
const SPOT: readonly [number, number] = [0, 0];

function deposit(): Deposit {
  const d = StuffApi.createSync(() => new Deposit());
  d.setStratigraphy([
    { toZ: -60, host: '/stuff/idea/material/rock/slate' },
    { toZ: -400, host: '/stuff/idea/material/rock/granite' },
  ]);
  return d;
}

function character(): GroundCharacter {
  return StuffApi.createSync(() => new GroundCharacter());
}

describe('both models compose the capability', () => {
  it('Deposit and GroundCharacter are GroundSources', () => {
    expect(MixinApi.hasMixin(Deposit, Mixins.GroundSource)).toBe(true);
    expect(MixinApi.hasMixin(GroundCharacter, Mixins.GroundSource)).toBe(true);
  });

  it('…and narrow through MixinApi, which is how the floor finds them', () => {
    expect(MixinApi.isGroundSource(deposit())).toBe(true);
    expect(MixinApi.isGroundSource(character())).toBe(true);
  });
});

describe('a Deposit answers the column', () => {
  let d: Deposit;
  beforeEach(() => {
    StuffApi.clearAll();
    d = deposit();
  });

  it('slate near the surface, granite deep', () => {
    expect(d.groundMaterialAt(SPOT, -10, ADDRESS)).toBe(
      '/stuff/idea/material/rock/slate'
    );
    expect(d.groundMaterialAt(SPOT, -100, ADDRESS)).toBe(
      '/stuff/idea/material/rock/granite'
    );
  });

  it('at the collar it is still rock — the collar is ground, not air', () => {
    expect(d.groundMaterialAt(SPOT, 0, ADDRESS)).toBe(
      '/stuff/idea/material/rock/slate'
    );
  });

  it('⚠ above the collar it knows NOTHING — z > 0 is air', () => {
    // The same bound `sampleAt` carries, and for the same reason: without
    // it a cell above the surface that satisfied the plane test read as
    // ore, and you could hew a seam out of the sky.
    expect(d.groundMaterialAt(SPOT, 1, ADDRESS)).toBeNull();
    expect(d.groundMaterialAt(SPOT, 40, ADDRESS)).toBeNull();
  });

  it('an authored pin wins — the fold order, held here too', () => {
    d.setFeatures({
      pins: { '0,0,-10': { host: '/stuff/idea/material/rock/granite' } },
    });
    expect(d.groundMaterialAt(SPOT, -10, ADDRESS)).toBe(
      '/stuff/idea/material/rock/granite'
    );
  });

  it('the deepest band continues down forever', () => {
    expect(d.groundMaterialAt(SPOT, -9000, ADDRESS)).toBe(
      '/stuff/idea/material/rock/granite'
    );
  });
});

describe('a GroundCharacter answers the topsoil, and only the topsoil', () => {
  let c: GroundCharacter;
  beforeEach(() => {
    StuffApi.clearAll();
    c = character();
  });

  it('at the surface it names one of the three earth materials', () => {
    const answer = c.groundMaterialAt(SPOT, 0, ADDRESS);
    expect(answer).not.toBeNull();
    expect(Object.values(TEXTURE_MATERIALS)).toContain(answer!);
  });

  it('⚠ below its own topsoil it answers null — that is the column’s business', () => {
    // The boundary that makes one ladder enough: the gallery under a field
    // falls past the character to the deposit with nothing arbitrating.
    const sample = GroundCharacter.resolve(
      c,
      SPOT,
      GroundCharacter.seedFor(ADDRESS)
    );
    expect(c.groundMaterialAt(SPOT, -sample.topsoilM - 0.01, ADDRESS)).toBeNull();
    expect(c.groundMaterialAt(SPOT, -50, ADDRESS)).toBeNull();
  });

  it('above the collar it is air here too', () => {
    expect(c.groundMaterialAt(SPOT, 1, ADDRESS)).toBeNull();
  });

  it('⭐ a pinned texture reads as its material', () => {
    c.setPins({ '0,0': { texture: 'clay' } });
    expect(c.groundMaterialAt(SPOT, 0, ADDRESS)).toBe(
      '/stuff/idea/material/earth/clay'
    );
    c.setPins({ '0,0': { texture: 'sand' } });
    expect(c.groundMaterialAt(SPOT, 0, ADDRESS)).toBe(
      '/stuff/idea/material/earth/sand'
    );
    // ⭐ The three middle classes collapse to loam, deliberately: a texture
    // class is a position on a triangle, and a boot cannot tell sandy-loam
    // from silt-loam. What the six classes exist FOR — drainage, the cost
    // of improvement — is `GroundSample`'s and is not lost.
    for (const t of ['sandy-loam', 'loam', 'silt-loam'] as const) {
      c.setPins({ '0,0': { texture: t } });
      expect(c.groundMaterialAt(SPOT, 0, ADDRESS)).toBe(
        '/stuff/idea/material/earth/loam'
      );
    }
  });

  it('the address decides the answer — two addresses, independent ground', () => {
    const a = c.groundMaterialAt(SPOT, 0, '/terminus/hinkley-hills');
    const b = c.groundMaterialAt(SPOT, 0, '/terminus/wharfside');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    // Not asserting they DIFFER (two draws can agree); asserting each is
    // stable, which is what "seeded, never drawn" means.
    expect(c.groundMaterialAt(SPOT, 0, '/terminus/hinkley-hills')).toBe(a);
    expect(c.groundMaterialAt(SPOT, 0, '/terminus/wharfside')).toBe(b);
  });

  it('⭐ an UNAUTHORED model still answers — the default row is empty on purpose', () => {
    // `default-character.yaml` pins nothing and leans nothing. That is the
    // whole point: resolve is total, so the world is derivable underfoot
    // even where nobody wrote anything down.
    const bare = character();
    expect(bare.getPins()).toEqual({});
    expect(bare.getBands()).toEqual([]);
    expect(bare.groundMaterialAt([17, -4], 0, ADDRESS)).not.toBeNull();
  });
});
