/**
 * check-instanceable-placement's invariant 7, the pure decision: under
 * `/trade/<industry>/` an instanceable template sits under `obj/` or
 * `command/`; anything without a `class:` (a folder row, a recipe-shaped
 * leaf) is nobody's business; paths outside `/trade/` are untouched.
 */

import { describe, it, expect } from 'vitest';
import {
  tradePlacementOk,
  packSrcPlacementOk,
  packBrainShapeOk,
  packLibShapeOk,
} from '../check-instanceable-placement';

describe('check-instanceable-placement.tradePlacementOk', () => {
  it('an instanceable row under <root>/<branch>/ passes', () => {
    expect(tradePlacementOk('/trade/smithing/thing/anvil', true)).toBe(true);
    expect(tradePlacementOk('/trade/smithing/idea/cmd/TemperController', true)).toBe(true);
    expect(tradePlacementOk('/platform/idea/cmd/perception/LookController', true)).toBe(true);
    expect(tradePlacementOk('/stuff/thing/gear/hat', true)).toBe(true);
  });

  it('an instanceable row with no branch segment under a rooted tree is reported', () => {
    expect(tradePlacementOk('/trade/smithing/anvil', true)).toBe(false);
    expect(tradePlacementOk('/trade/smithing/stock/iron-ingot', true)).toBe(false);
    expect(tradePlacementOk('/platform/AccessRegistry', true)).toBe(false);
    expect(tradePlacementOk('/stuff/gear/hat', true)).toBe(false);
  });

  it('a row with no class (a folder, a document-shaped leaf) and anything outside /trade/ are ignored', () => {
    expect(tradePlacementOk('/trade/smithing', false)).toBe(true);
    expect(tradePlacementOk('/trade/smithing/stock', false)).toBe(true);
    expect(tradePlacementOk('/test/x/anvil', true)).toBe(true);
    expect(tradePlacementOk('/stuff/thing/gear/hat', true)).toBe(true);
  });
});

describe('check-instanceable-placement over a capability pack', () => {
  it("invariant 7 admits a pack's own root as a rooted tree", () => {
    expect(tradePlacementOk('/system/arcana/thing/Wand', true, ['/system/arcana'])).toBe(true);
    expect(tradePlacementOk('/system/arcana/idea/cmd/magic/CastController', true, ['/system/arcana'])).toBe(true);
    expect(tradePlacementOk('/system/arcana/Wand', true, ['/system/arcana'])).toBe(false);
    // An unregistered root is still nobody's business.
    expect(tradePlacementOk('/system/arcana/Wand', true, [])).toBe(true);
  });

  it('invariant 8: a pack src/ holds branches, behavior/ and lib/, and nothing else', () => {
    expect(packSrcPlacementOk('thing/Wand.ts')).toBe(true);
    expect(packSrcPlacementOk('idea/cmd/magic/CastController.ts')).toBe(true);
    expect(packSrcPlacementOk('__tests__/x.test.ts')).toBe(true);
    expect(packSrcPlacementOk('Helper.ts')).toBe(false);
    expect(packSrcPlacementOk('util/Helper.ts')).toBe(false);
    // behavior/ is the Brain category's home in a pack — flat, one file per brain.
    expect(packSrcPlacementOk('behavior/paces.ts')).toBe(true);
    expect(packSrcPlacementOk('behavior/nested/paces.ts')).toBe(false);
    // lib/ is the pack's own substrate since the TPA reform (P2a) — the
    // DIRECTORY is admitted here; what may live in it is packLibShapeOk's.
    expect(packSrcPlacementOk('lib/ManaPowered.ts')).toBe(true);
    expect(packSrcPlacementOk('lib/magic/ManaPowered.ts')).toBe(true);
    // A locality pack mirrors its rows: locality subdirs and flat files pass.
    expect(packSrcPlacementOk('duncan-hall/DormWarren.ts', true)).toBe(true);
    expect(packSrcPlacementOk('duncan-hall/idea/cmd/ProvisionController.ts', true)).toBe(true);
    expect(packSrcPlacementOk('TicketClerk.ts', true)).toBe(true);
  });

  it("invariant 8: a pack lib/ holds only inherited substrate", () => {
    const mixin =
      "export const MANA_POWERED_MIXIN = 'ManaPoweredMixin';\n" +
      'export function ManaPoweredMixin<T>(Base: T) {\n  return class extends (Base as never) {};\n}\n';
    expect(packLibShapeOk('ManaPowered.ts', mixin)).toBeNull();
    // A value object is substrate too.
    expect(packLibShapeOk('Charge.ts', 'export class Charge {\n  static UNIT = "pt";\n}\n')).toBeNull();

    // An Api, a logic singleton and a free helper each stay the kernel's.
    expect(packLibShapeOk('api/mana.ts', 'export class ManaApi {}\n')).toMatch(/Api/);
    expect(packLibShapeOk('Mana.ts', 'export class ManaApi {}\n')).toMatch(/Api/);
    expect(packLibShapeOk('ManaLogic.ts', 'export class ManaLogic {}\n')).toMatch(/logic singleton/);
    expect(packLibShapeOk('Mana.ts', 'export class X extends ApiLogic {}\n')).toMatch(/logic singleton/);
    expect(packLibShapeOk('helpers.ts', 'export function tauOf(x: number) {\n  return x;\n}\n')).toMatch(
      /free function/,
    );
  });

  it('a pack behavior/ module must be brain-shaped', () => {
    expect(packBrainShapeOk("import type { BrainContext } from 'x';\nexport const brain = class {\n  static label = 'paces';\n  static act() {}\n};\n")).toBe(true);
    expect(packBrainShapeOk("export const brain = class {};\nexport type Foo = number;\n")).toBe(true);
    // A second value export, an anonymous object, or a class declaration are not the shape.
    expect(packBrainShapeOk("export const brain = class {};\nexport const helper = 1;\n")).toBe(false);
    expect(packBrainShapeOk("export const brain = { label: 'x' };\n")).toBe(false);
    expect(packBrainShapeOk("export class Paces {}\n")).toBe(false);
  });
});
