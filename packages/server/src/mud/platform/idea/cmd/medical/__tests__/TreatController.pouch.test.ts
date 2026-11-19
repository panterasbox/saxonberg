/**
 * ⭐ `treat` uses what the medic carries WHERE IT SITS (size and carrying
 * D-W10-1; finalize run 16): since W9 a bandage in a medic's pouch is the
 * POUCH's contents. With the pouch worn and open, a bare `treat` finds the
 * bandage; with its flap shut, it is refused naming the next command —
 * *Your medic's pouch is shut — `open pouch` first.* — never "bare hands
 * do nothing for that", and never an implicit open.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TreatController from '../TreatController';
import Bandage from '../../../../thing/Bandage';
import { MessageApi } from '../../../../../api/message';
import { ContainmentApi } from '../../../../../api/containment';
import { StuffApi } from '../../../../../api/stuff';
import { WorldClockApi } from '../../../../../api/worldclock';
import '../../../WorldClockRegistry';
import { makeStuff, stampTemplatePathForTest } from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { standShippedConditions } from '../../../../../lib/vitals/__tests__/conditions';
import { standMaterials, TEST_TISSUES } from '../../../../../lib/material/__tests__/materials';
import { makeBody, wornBag } from '../../../../../lib/slot/__tests__/carrying-fixture';
import Location from '../../../../../lib/location/Location';
import type { CommandContext } from '../../../../../api/command';
import type { Trauma } from '../../../Condition';
import { TestHarnessApi } from '../../../../../api/test-harness';

function stubScene(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

/** A healer-shaped body: a medic's pouch worn at the waist, bandages in it, a bleeding cut. */
function healer() {
  const room = makeStuff(() => new Location());
  const { me, plan } = makeBody();
  stampTemplatePathForTest(me, '/platform/agent/Avatar/healer-pouch');
  ContainmentApi.move(me, room);
  const pouch = wornBag(me, plan, "medic's pouch", 'waist');
  pouch.setKeywords(['pouch', "medic's pouch"]);
  const bandage = makeStuff(() => new Bandage());
  ContainmentApi.move(bandage, pouch);
  me.afflict({ kind: 'trauma', type: 'laceration', site: 'body', severity: 1.5, bleeding: true });
  return { room, me, pouch, bandage };
}

function ctxFor(actor: unknown, location: unknown): { ctx: CommandContext; note: ReturnType<typeof vi.fn> } {
  const note = vi.fn();
  return { ctx: { commandGiver: actor, location, note } as unknown as CommandContext, note };
}

beforeEach(async () => {
  await standShippedConditions();
  installV1QuantityMarshallers();
  WorldClockApi._setNowProviderForTesting(() => 100);
  stubScene();
  standMaterials(TEST_TISSUES);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('treat — the bandage in a worn medic\'s pouch, where it sits', () => {
  it('⭐ the pouch open: a bare `treat` finds the bandage and dresses the cut', async () => {
    const { room, me, pouch, bandage } = healer();
    expect(bandage.getContainer()).toBe(pouch);
    const { ctx } = ctxFor(me, room);
    await TestHarnessApi.actAs(ctx.commandGiver, () => makeStuff(() => new TreatController()).execute({}, ctx));
    const w = me.getConditions().find((c) => c.kind === 'trauma') as Trauma;
    expect(w.dressed).toBe(true);
    expect(StuffApi.findById(bandage.stuffId)).toBeFalsy();
  });

  it('⭐ the pouch shut: refused naming `open pouch` — the flap stays shut, the bandage stays put', async () => {
    const { room, me, pouch, bandage } = healer();
    pouch.setOpen(false);
    expect(me.treatmentPlanFor({ by: me, offered: null })).toMatchObject({
      ok: false,
      reason: 'remedy-out-of-reach',
    });
    const { ctx, note } = ctxFor(me, room);
    await TestHarnessApi.actAs(ctx.commandGiver, () => makeStuff(() => new TreatController()).execute({}, ctx));
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'remedy-out-of-reach',
        detail: "Your medic's pouch is shut — `open pouch` first.",
      }),
    );
    expect(pouch.isOpen()).toBe(false);
    expect(bandage.getContainer()).toBe(pouch);
    expect((me.getConditions().find((c) => c.kind === 'trauma') as Trauma).dressed).toBeFalsy();
  });
});
