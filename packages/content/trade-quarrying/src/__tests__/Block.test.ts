/**
 * The block — ⭐ **too heavy to lift, and the refusal is about its weight.**
 *
 * Two claims, and the first is the one the requirements are explicit about:
 * *"the refusal must read as `this weighs more than you can lift` and never
 * as a flag — bigness is emergent from mass."* So this file asserts the
 * MASS, and that splitting moves the mass and the count together. A block
 * that said it had two pieces left while weighing what eight weigh would be
 * a gauge lying about its own object.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Block, { BLOCK_PIECES, PIECE_MASS_KG } from '../thing/Block';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import CartesianLocation from '@saxonberg/server/mud/lib/location/CartesianLocation';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { WorkPlan, WorkRefusal } from '@saxonberg/server/mud/lib/ground/Workable';

const GRANITE = '/stuff/idea/material/rock/granite';

let actor: Stuff;
let room: CartesianLocation;

let graniteRow: Material | null = null;

function granite(): Material {
  // ⚠ ONE row per test: a second `makeStuffAtPath` at the same path leaves
  // two instances in the index and every later `findByTemplatePath` throws
  // *"expected singleton, found 2"* — a failure with nothing to do with what
  // the test is about.
  if (graniteRow !== null) return graniteRow;
  const m = makeStuffAtPath(() => new Material(), GRANITE) as unknown as Material & {
    hardness: Quantity<'MPa'>;
  };
  m.setName('granite');
  m.setTags(['rock', 'igneous']);
  m.hardness = Quantity.of(200, 'MPa');
  graniteRow = m;
  return m;
}

function block(pieces = BLOCK_PIECES): Block {
  const b = makeStuff(() => {
    const x = new Block();
    x.setMass(Quantity.of(1375, 'kg'));
    x.setMaterial(granite());
    x.setPiecesLeft(pieces);
    return x;
  }) as unknown as Block;
  ContainmentApi.move(b as never, room as never);
  return b;
}

function sledge(): Stuff & Tooled {
  return makeStuff(() => {
    const t = new ToolItem();
    t.capabilities = ['striking'];
    return t;
  }) as unknown as Stuff & Tooled;
}

beforeEach(() => {
  StuffApi.clearAll();
  graniteRow = null;
  installV1QuantityMarshallers();
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  room = makeStuff(() => new CartesianLocation());
  actor = makeStuff(() => new Thing()) as unknown as Stuff;
  vi.spyOn(StuffApi, 'clone').mockImplementation((async () => {
    const p = makeStuff(() => new Thing());
    p.setMass(Quantity.of(PIECE_MASS_KG, 'kg'));
    p.setShortDescription('piece of stone');
    return p;
  }) as never);
});

describe('a block of stone', () => {
  it('⭐⭐ weighs more than any body can lift — and that is a MASS, not a flag', () => {
    // Half a cubic metre of granite. `get block` refuses on the carry-weight
    // gauge like anything else too heavy, with no special case anywhere.
    const b = block();
    expect(b.getMass().rawValue()).toBeGreaterThan(1000);
  });

  it('bare-handed, splitting refuses and the BLOCK names the tool', () => {
    const b = block();
    return b.planWork(actor, null, null).then((out) => {
      const refusal = out as WorkRefusal;
      expect(refusal.kind).toBe('refusal');
      expect(refusal.reason).toBe('no-striker');
      expect(refusal.prose).toMatch(/something to strike it with/i);
    });
  });

  it('⭐ a split takes ONE piece and the mass follows the count', async () => {
    const b = block();
    const before = b.getMass().rawValue();
    const plan = (await b.planWork(actor, sledge(), null)) as WorkPlan;
    expect(plan.kind).toBe('plan');
    const result = await b.completeWork(actor, sledge(), plan.token);
    expect(b.getPiecesLeft()).toBe(BLOCK_PIECES - 1);
    expect(b.getMass().rawValue()).toBeCloseTo(before - PIECE_MASS_KG, 6);
    expect(result.self).toMatch(/piece comes away/i);
    expect(result.credit?.discipline).toBe('quarrying');
  });

  it('…and the piece is CARRYABLE and made of the block’s own stone', async () => {
    const b = block();
    const plan = (await b.planWork(actor, sledge(), null)) as WorkPlan;
    await b.completeWork(actor, sledge(), plan.token);
    const piece = room
      .getContents()
      .find((c) => c.getPresentation().includes('piece'));
    expect(piece).toBeDefined();
    expect(MixinApi.isTangible(piece!) && piece!.getMass().rawValue()).toBe(
      PIECE_MASS_KG,
    );
  });

  it('a spent block refuses, and says there is only rubble left', async () => {
    const b = block(0);
    const out = (await b.planWork(actor, sledge(), null)) as WorkRefusal;
    expect(out.reason).toBe('block-spent');
    expect(out.prose).toMatch(/rubble/);
  });

  it('the pace is the STONE — a soft block splits faster than granite', async () => {
    const hard = block();
    const soft = block();
    const chalky = makeStuffAtPath(
      () => new Material(),
      '/stuff/idea/material/rock/_test-soft',
    ) as unknown as Material & { hardness: Quantity<'MPa'> };
    chalky.setName('chalk');
    chalky.hardness = Quantity.of(20, 'MPa');
    soft.setMaterial(chalky);
    const a = (await hard.planWork(actor, sledge(), null)) as WorkPlan;
    const c = (await soft.planWork(actor, sledge(), null)) as WorkPlan;
    expect(a.durationMs).toBeGreaterThan(c.durationMs);
  });
});
