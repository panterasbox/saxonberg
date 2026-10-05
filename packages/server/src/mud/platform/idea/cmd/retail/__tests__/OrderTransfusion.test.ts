/**
 * `order transfusion` costs the patient body-time (the time-as-expense
 * pass). Paying the window must NOT buy out of the duration the direct
 * `transfuse` verb charges: the service runs as a durative engaged step on
 * the CUSTOMER (it is their body), and the take + fee land only at
 * completion. This proves the branch chooses the durative path for an
 * engageable body and does not transfuse synchronously.
 *
 * (The take/give mechanics are proven on the mixin in `DonationBank.test`;
 * this isolates the controller's timing decision, spying the scheduler so
 * no real step runs.)
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OrderController from '../OrderController';
import Tariff from '../../../../thing/Tariff';
import Chest from '../../../../thing/Chest';
import Receptacle from '../../../../thing/Receptacle';
import Material from '../../../../../lib/material/Material';
import { Character } from '../../../../../lib/character/Character';
import { DonationBankMixin } from '../../../../../lib/commerce/DonationBank';
import { BulkableApi } from '../../../../../api/bulk';
import { ContainmentApi } from '../../../../../api/containment';
import { SchedulerApi } from '../../../../../api/scheduler';
import { MessageApi } from '../../../../../api/message';
import { StuffApi } from '../../../../../api/stuff';
import { MixinApi } from '../../../../../api/mixin';
import { Quantity } from '../../../../../lib/quantity';
import { BLOOD_DEFAULTS } from '../../../../../lib/vitals/Blood';
import { ManualBuildStep } from '../../../../../lib/craft/ManualBuildStep';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type { Containable } from '../../../../../lib/spatial/Containable';
import type { Container } from '../../../../../lib/spatial/Container';

class TestWindow extends DonationBankMixin(Tariff) {
  static override _mixinName = 'TestWindow';
}
class TestCharacter extends Character {}

const BLOOD_MATERIAL = '/stuff/idea/material/tissue/blood';
let seq = 0;
let note: ReturnType<typeof vi.fn>;
let selfLines: string[];

function silence(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (m: unknown) => {
      selfLines.push(String(m));
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

const ctxFor = (actor: unknown): CommandContext =>
  ({ commandGiver: actor, location: null, note } as unknown as CommandContext);

function seedBloodMaterial(): Material {
  const existing = StuffApi.findByTemplatePath<Material>(BLOOD_MATERIAL);
  if (existing) return existing;
  const m = makeStuff(() => new Material());
  m.setTags(['tissue', 'blood', 'liquid', 'organic']);
  stampTemplatePathForTest(m, BLOOD_MATERIAL);
  return m;
}

/** A bag holding one O unit in the empty (bare-body) system. */
function bag(): Stuff & Containable {
  const b = makeStuff(() => new Receptacle());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(0.5, 'L'));
  const slot = BulkableApi.slotFor(b, undefined)!;
  slot.setMaterial(seedBloodMaterial());
  slot.setAmount(Quantity.of(0.45, 'L'));
  slot.setPayload({
    blood: { speciesPath: '', system: '', type: 'O', labelled: false, donorIdentityPath: '' },
  });
  return b as unknown as Stuff & Containable;
}

function vaultWithUnit(): Stuff & Container {
  const c = makeStuff(() => new Chest());
  stampTemplatePathForTest(c, `/test/order/vault-${seq++}`);
  const v = c as unknown as Stuff & Container;
  ContainmentApi.move(bag(), v);
  return v;
}

function window(vault: Stuff): TestWindow {
  const w = makeStuff(() => new TestWindow());
  stampTemplatePathForTest(w, `/test/order/window-${seq++}`);
  w.services = { transfusion: 'transfusion' };
  w.setVaultPaths([vault.getTemplatePath()!]);
  return w;
}

/** An engageable, vitals body (type O, system '') — the customer. */
function customer(): Character {
  const c = makeStuff(() => new TestCharacter());
  stampTemplatePathForTest(c, `/platform/agent/Avatar/order-${seq++}`);
  return c;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  seq = 0;
  note = vi.fn();
  selfLines = [];
  silence();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('order transfusion — the body-time cost', () => {
  it('⭐ engages a durative step for the TRANSFUSE_DURATION, not an instant transfusion', async () => {
    const vault = vaultWithUnit();
    const win = window(vault);
    const giver = customer();
    // The giver must be an engageable body, else the branch runs inline.
    expect(MixinApi.isEngaged(giver as unknown as Stuff)).toBe(true);

    let startedStep: ManualBuildStep | null = null;
    const start = vi.spyOn(SchedulerApi, 'start').mockImplementation((step) => {
      startedStep = step as ManualBuildStep;
      return { ok: true, status: 'started', note: { kind: 'activity-updated' } } as never;
    });

    await makeStuff(() => new OrderController()).execute(
      {
        counter: { stuff: win } as unknown as MqlOneResult,
        menu: undefined,
        cocktail: 'transfusion',
        brand: undefined,
      } as never,
      ctxFor(giver),
    );

    // A durative step was started for the honest duration…
    expect(start).toHaveBeenCalledTimes(1);
    expect((startedStep as unknown as { duration: number }).duration).toBe(
      BLOOD_DEFAULTS.TRANSFUSE_DURATION_S * 1000,
    );
    // …and the unit is STILL on the shelf — the take lands at completion,
    // which the spied scheduler never fired.
    expect(win.getLots().get('O')?.units ?? 0).toBe(1);
    // The patient is told they are settling in, not that it is already done.
    expect(selfLines.join(' ').toLowerCase()).toMatch(/settle in|hold still/);
  });
});
