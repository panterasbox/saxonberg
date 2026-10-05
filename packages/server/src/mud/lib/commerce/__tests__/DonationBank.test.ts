/**
 * DonationBankMixin (blood build D2) — a civic bank read BY LOT over a
 * configured store. Covers: lots derive from the vault's own contents
 * EVEN WHEN THE VAULT IS CLOSED (D1 — the registrar knows her own fridge);
 * `shortLots`; `takeUnit` moves a holder out and records custody; a gift
 * moves in; `takeCompatibleUnitFor` empties the oldest compatible holder.
 *
 * Mongo is faked in-memory for the custody-deed reads (the chronicle
 * harness), keyed by collection.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DonationBankMixin } from '../DonationBank';
import Tariff from '../../../platform/thing/Tariff';
import Chest from '../../../platform/thing/Chest';
import Receptacle from '../../../platform/thing/Receptacle';
import Material from '../../material/Material';
import { Creature } from '../../creature/Creature';
import { ContainmentApi } from '../../../api/containment';
import { BulkableApi } from '../../../api/bulk';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuff,
  stampTemplatePathForTest,
  withRootContext,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { BloodUnit } from '../../vitals/Blood';
import type { Stuff } from '../../stuff/Stuff';
import type { Containable } from '../../spatial/Containable';
import type { Container } from '../../spatial/Container';

class TestWindow extends DonationBankMixin(Tariff) {
  static override _mixinName = 'TestWindow';
}

let seq = 0;
let store: Map<string, Record<string, unknown>>;
let idc = 0;
const BLOOD_MATERIAL = '/stuff/idea/material/tissue/blood';

function seedBloodMaterial(): Material {
  const existing = StuffApi.findByTemplatePath<Material>(BLOOD_MATERIAL);
  if (existing) return existing;
  const m = makeStuff(() => new Material());
  m.setTags(['tissue', 'blood', 'liquid', 'organic']);
  stampTemplatePathForTest(m, BLOOD_MATERIAL);
  return m;
}

function bag(type: BloodUnit['type'], litres = 0.45): Stuff & Containable {
  const b = makeStuff(() => new Receptacle());
  (b as unknown as { interiorBulk: boolean }).interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(0.5, 'L'));
  const slot = BulkableApi.slotFor(b, undefined)!;
  slot.setMaterial(seedBloodMaterial());
  slot.setAmount(Quantity.of(litres, 'L'));
  slot.setPayload({
    blood: {
      speciesPath: '',
      system: '',
      type,
      labelled: true,
      donorIdentityPath: `/who/${type}-${seq++}`,
    },
  });
  return b as unknown as Stuff & Containable;
}

function window(vault: Stuff): TestWindow {
  const w = makeStuff(() => new TestWindow());
  stampTemplatePathForTest(w, `/test/blood/window-${seq++}`);
  w.setVaultPaths([vault.getTemplatePath()!]);
  return w;
}

function chest(): Stuff & Container {
  const c = makeStuff(() => new Chest());
  stampTemplatePathForTest(c, `/test/blood/vault-${seq++}`);
  return c as unknown as Stuff & Container;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  seq = 0;
  store = new Map();
  idc = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) =>
      [...store.values()].filter(
        (d) => d.__col === col &&
          Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idc++}`;
      store.set(`${col}:${id}`, { ...doc, _id: id, __col: col });
      return id;
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('DonationBankMixin — reading the vault', () => {
  it('⭐ derives lots from the vault even when it is CLOSED (D1)', () => {
    const vault = chest();
    const w = window(vault);
    ContainmentApi.move(bag('O'), vault);
    ContainmentApi.move(bag('O'), vault);
    ContainmentApi.move(bag('A'), vault);
    // Shut the door — the perception sheet would now read empty, the bank
    // must not.
    (vault as unknown as { setOpen(v: boolean): void }).setOpen(false);
    const lots = w.getLots();
    expect(lots.get('O')?.units).toBe(2);
    expect(lots.get('A')?.units).toBe(1);
    expect(lots.get('O')?.litres).toBeCloseTo(0.9, 5);
  });

  it('shortLots names the ABO lots with no unit', () => {
    const vault = chest();
    const w = window(vault);
    ContainmentApi.move(bag('O'), vault);
    expect(w.shortLots().sort()).toEqual(['A', 'AB', 'B']);
  });
});

describe('DonationBankMixin — taking and receiving', () => {
  it('takeUnit moves a holder to the recipient and drops the lot', async () => {
    const vault = chest();
    const w = window(vault);
    ContainmentApi.move(bag('O'), vault);
    ContainmentApi.move(bag('O'), vault);
    const recipient = makeStuff(() => new Creature());
    stampTemplatePathForTest(recipient, '/platform/agent/Avatar/recip');
    const moved = await withRootContext(w as unknown as Stuff, 'issue', () =>
      w.takeUnit('O', recipient as unknown as Stuff, null),
    );
    expect(moved).not.toBeNull();
    expect(w.getLots().get('O')?.units).toBe(1);
    // The holder now sits with the recipient.
    expect(
      [...(recipient as unknown as { getContents(): Iterable<unknown> }).getContents()],
    ).toContain(moved);
  });

  it('takeCompatibleUnitFor empties the holder (the house transfuses you)', async () => {
    const vault = chest();
    const w = window(vault);
    ContainmentApi.move(bag('O'), vault);
    const recipient = makeStuff(() => new Creature());
    stampTemplatePathForTest(recipient, '/platform/agent/Avatar/recip2');
    const unit = await withRootContext(w as unknown as Stuff, 'issue', () =>
      w.takeCompatibleUnitFor(recipient as unknown as Stuff, null),
    );
    expect(unit).not.toBeNull();
    expect(unit!.type).toBe('O');
    // The lot is now empty — the holder was drained in place.
    expect(w.getLots().get('O')?.units ?? 0).toBe(0);
  });

  it('transfuseInto gives a compatible unit (reaction 0) and drains the lot', async () => {
    const vault = chest();
    const w = window(vault);
    ContainmentApi.move(bag('O'), vault);
    const recipient = makeStuff(() => new Creature()); // bare body: type O
    stampTemplatePathForTest(recipient, '/platform/agent/Avatar/recip3');
    const out = await withRootContext(w as unknown as Stuff, 'issue', () =>
      w.transfuseInto(recipient as unknown as Stuff, null),
    );
    expect(out).not.toBeNull();
    expect(out!.reaction).toBe(0);
    // The shelf is spent — the house transfused them.
    expect(w.getLots().get('O')?.units ?? 0).toBe(0);
  });

  it('transfuseInto returns null when nothing on the shelf matches', async () => {
    const vault = chest();
    const w = window(vault); // empty vault
    const recipient = makeStuff(() => new Creature());
    stampTemplatePathForTest(recipient, '/platform/agent/Avatar/recip4');
    const out = await withRootContext(w as unknown as Stuff, 'issue', () =>
      w.transfuseInto(recipient as unknown as Stuff, null),
    );
    expect(out).toBeNull();
  });

  it('receiveGift moves a bag into the vault', async () => {
    const vault = chest();
    const w = window(vault);
    const gift = bag('B');
    await withRootContext(w as unknown as Stuff, 'gift', () =>
      w.receiveGift(gift, null),
    );
    expect(w.getLots().get('B')?.units).toBe(1);
  });
});
