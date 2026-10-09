/**
 * The retort (the fire build, W3) — ⭐⭐ **the chamber that keeps what the
 * clamp throws away.**
 *
 * A clamp and a retort make the same charcoal. The difference is
 * entirely in the by-product: a clamp vents the tar out of its dome —
 * that blue smoke IS the tar — and a retort hands it to whatever is
 * standing on the head. ⭐ From coal it gives three things, which is the
 * firing a gasworks lived on: coke, coal tar and a gas that burns.
 *
 * ⚠ The assertions here are about the ROUTING, because that is what has
 * three ways to fail silently: a receiver that swallows a gas, a
 * condenser that drops an overflow, and a chamber with nothing on it
 * that loses the lot instead of filling the room.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';
import YAML from 'yaml';
import Retort from '../thing/Retort';
import Condenser from '../thing/Condenser';
import Gasometer from '../thing/Gasometer';
import Material from '@saxonberg/server/mud/lib/material/Material';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import CartesianLocation from '@saxonberg/server/mud/lib/location/CartesianLocation';
import { Recipe } from '@saxonberg/server/mud/lib/craft/Recipe';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';

const PACK = fileURLToPath(new URL('../../', import.meta.url));
const TAR = '/stuff/idea/material/bulk/wood-tar';
const COAL_TAR = '/stuff/idea/material/bulk/coal-tar';
const COAL_GAS = '/stuff/idea/material/gas/coal-gas';

/** A content row, read off disk. */
function row(rel: string): Record<string, unknown> {
  const file = join(PACK, 'content', rel);
  if (!existsSync(file)) throw new Error(`no row at ${rel}`);
  return YAML.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

/** The shipped material row, installed at its real path. */
function installMaterial(rel: string, path: string): Material {
  const data = (row(rel).data ?? {}) as Record<string, unknown>;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(String(data.name ?? 'x'));
    if (typeof data.density === 'number') {
      m.setDensity(Quantity.of(data.density, 'kg/m³'));
    }
    if (typeof data.boilingPoint === 'number') {
      m.setBoilingPoint(Quantity.of(data.boilingPoint, 'K'));
    }
    return m;
  }, path) as unknown as Material;
}

describe('the retort', () => {
  let zone: CartesianZone;
  let yardRoom: CartesianLocation;

  beforeEach(() => {
    installV1QuantityMarshallers();
    zone = makeStuff(() => new CartesianZone());
    yardRoom = makeStuff(() => new CartesianLocation());
    zone.addLocation(yardRoom, 0, 0, 0);
    installMaterial('stuff/idea/material/bulk/wood-tar.yaml', TAR);
    installMaterial('stuff/idea/material/bulk/coal-tar.yaml', COAL_TAR);
    installMaterial('stuff/idea/material/gas/coal-gas.yaml', COAL_GAS);
  });
  afterEach(() => StuffApi.clearAll());

  function retort(): Retort {
    const r = makeStuff(() => new Retort()) as Retort;
    r.setPlacements(['on']);
    ContainmentApi.move(r as never, yardRoom as never);
    return r;
  }
  function condenser(capacityL = 40): Condenser {
    const c = makeStuff(() => {
      const x = new Condenser();
      (x as unknown as { interiorBulk: boolean }).interiorBulk = true;
      x.setInteriorCapacity(Quantity.of(capacityL, 'L'));
      x.setClosure('liquidTight');
      return x;
    }) as Condenser;
    c.setPlacements(['on']);
    return c;
  }
  function gasometer(capacityL = 20_000): Gasometer {
    return makeStuff(() => {
      const x = new Gasometer();
      (x as unknown as { interiorBulk: boolean }).interiorBulk = true;
      x.setInteriorCapacity(Quantity.of(capacityL, 'L'));
      x.setClosure('sealed');
      return x;
    }) as Gasometer;
  }

  function airOf(path: string): number {
    const hit = BiomeApi.resolveAtmosphereContentsFor(
      yardRoom as unknown as Stuff & Container,
    ).find((c) => c.type === path);
    return hit?.amount ?? 0;
  }

  describe('the rows say what the mechanism needs', () => {
    it('⭐ the two firings declare their volatiles, and the keys validate', () => {
      const wood = Recipe.fromData(row('recipes/retort-wood.yaml'));
      expect(wood.getVolatiles()).toEqual([
        { material: TAR, litresPerKg: 0.08 },
      ]);
      const coal = Recipe.fromData(row('recipes/retort-coal.yaml'));
      expect(coal.getVolatiles().map((v) => v.material)).toEqual([
        COAL_TAR,
        COAL_GAS,
      ]);
    });

    it('⚠ a misspelt volatiles key fails at READ, not silently', () => {
      // A retort that quietly made no tar would still produce its char
      // and still look right, which is the shape of defect this refuses.
      //
      // ⭐ Asserted through `fromData` — the path a pack install actually
      // takes — rather than through the validator directly. The
      // validator is private (`lint:lib-statics`: one caller), and this
      // is the better test for it anyway.
      const base = row('recipes/retort-wood.yaml') as Record<string, unknown>;
      const withVolatiles = (v: unknown): Record<string, unknown> => ({
        ...base,
        volatiles: v,
      });
      expect(() =>
        Recipe.fromData(withVolatiles([{ material: TAR, litresPerKG: 0.08 }])),
      ).toThrow(/litresPerKg|unknown key/);
      expect(() =>
        Recipe.fromData(withVolatiles([{ material: '', litresPerKg: 1 }])),
      ).toThrow(/material/);
      expect(() =>
        Recipe.fromData(withVolatiles([{ material: TAR, litresPerKg: 0 }])),
      ).toThrow(/litresPerKg/);
      expect(() => Recipe.fromData(withVolatiles('tar'))).toThrow(/volatiles/);
    });

    it('⭐⭐ the charges are told apart by TAG — coal is not just `fuel`', () => {
      // ⚠ Coal shares `fuel` and `carbon` with charcoal and coke, so
      // without a tag meaning *this substance* a `fire` on a loaded
      // retort could not tell a coal charge from a charcoal one.
      expect(Recipe.fromData(row('recipes/retort-wood.yaml')).inputSlots[0])
        .toMatchObject({ category: 'wood' });
      expect(Recipe.fromData(row('recipes/retort-coal.yaml')).inputSlots[0])
        .toMatchObject({ category: 'coal' });
    });

    it('⭐ coke is tagged for the smelt and NOT sulfurous', () => {
      const tags = (row('stuff/idea/material/organic/coke.yaml').data as {
        tags: string[];
      }).tags;
      // The smelt reads `fuel` + `carbon` for the reducing charge and
      // `sulfurous` for the hot-short arm. That absence IS the mechanism.
      expect(tags).toContain('fuel');
      expect(tags).toContain('carbon');
      expect(tags).not.toContain('sulfurous');
    });

    it('⭐ tar boils to pitch through the shipped arrow — zero code', () => {
      const tar = row('stuff/idea/material/bulk/wood-tar.yaml').data as {
        purifiedByBoiling: string;
      };
      expect(tar.purifiedByBoiling).toBe('/stuff/idea/material/bulk/pitch');
      expect(existsSync(join(PACK, 'content/stuff/idea/material/bulk/pitch.yaml')))
        .toBe(true);
    });
  });

  describe('⭐⭐ the chamber routes what leaves the charge', () => {
    it('with NO condenser the tar is in the AIR — which is the lesson', () => {
      const r = retort();
      r.receiveVolatiles(TAR, 10);
      expect(airOf(TAR)).toBeGreaterThan(0);
    });

    it('with a condenser on it, the tar is a LIQUID in the receiver', () => {
      const r = retort();
      const c = condenser();
      ContainmentApi.place(c as never, 'on', r as never);
      r.receiveVolatiles(TAR, 10);
      expect(c.getBulkAmount('interior').rawValue()).toBeCloseTo(10);
      expect(c.getBulkMaterialPath('interior')).toBe(TAR);
      expect(airOf(TAR)).toBe(0);
    });

    it('⭐⭐ a GAS passes STRAIGHT THROUGH the condenser', () => {
      // Derived, not authored: coal gas boils at 110 K, so a coil at
      // yard temperature cannot condense it, and a condenser that
      // swallowed it would make a gasworks impossible.
      expect(BulkableApi.requiredClosureFor(
        StuffApi.findByTemplatePath<Material>(COAL_GAS)!,
      )).toBe('sealed');
      const r = retort();
      const c = condenser();
      ContainmentApi.place(c as never, 'on', r as never);
      r.receiveVolatiles(COAL_GAS, 500);
      expect(c.getBulkAmount('interior').rawValue()).toBe(0);
      expect(airOf(COAL_GAS)).toBeGreaterThan(0);
    });

    it('⭐ …and into a gasometer standing on the condenser', () => {
      const r = retort();
      const c = condenser();
      const g = gasometer();
      ContainmentApi.place(c as never, 'on', r as never);
      ContainmentApi.place(g as never, 'on', c as never);
      r.receiveVolatiles(COAL_GAS, 500);
      expect(g.getBulkAmount('interior').rawValue()).toBeCloseTo(500);
      expect(airOf(COAL_GAS)).toBe(0);
    });

    it('a condenser overflow goes to the air, not nowhere', () => {
      const r = retort();
      const c = condenser(5);
      ContainmentApi.place(c as never, 'on', r as never);
      r.receiveVolatiles(TAR, 20);
      expect(c.getBulkAmount('interior').rawValue()).toBeCloseTo(5);
      // ⭐ The other 15 L is vapour in the yard. A run you did not watch
      // loses what it loses, visibly.
      expect(airOf(TAR)).toBeGreaterThan(0);
    });
  });

  describe('the gasometer reads in words', () => {
    it('⭐⭐ a level, never a figure, and two viewers agree', () => {
      const g = gasometer(1000);
      expect(g.getGasPressureAtm('interior')).toBeNull(); // empty
      g.receive(COAL_GAS, 900);
      expect(g.getGasPressureAtm('interior')).toBeCloseTo(0.9);
      g.receive(COAL_GAS, 400); // past full — it takes what it can
      expect(g.getBulkAmount('interior').rawValue()).toBeCloseTo(1000);
      expect(g.getGasPressureAtm('interior')).toBeCloseTo(1);
    });

    it('it refuses a substance it is not holding', () => {
      const g = gasometer(1000);
      g.receive(COAL_GAS, 100);
      expect(g.receive(TAR, 100)).toBe(0);
    });
  });
});
