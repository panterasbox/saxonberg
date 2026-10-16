/**
 * ChamberedMixin — a host declares its compartments and the mixin mints
 * them (assembly W7, D15: the chambered-vessels slate's HOST half over the
 * fridge-design-pack's `Chamber`).
 *
 *  - the row's `chambers:` reaches the mint through the template applier's
 *    phase 2 (an instruction field — not `onCreate`);
 *  - ⭐ a second application mints nothing new (go-live re-runs phase 2);
 *  - a chamber stands in the host's own container, joining it on the
 *    host's first move when the host was minted standing nowhere;
 *  - destructing the host destructs its chambers (the owned cascade).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChamberedMixin } from '../Chambered';
import Good from '../../stuff/Good';
import Location from '../../stuff/Location';
import type { Stuff } from '../../stuff/Stuff';
import Chamber from '../../../platform/thing/Chamber';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestMill extends ChamberedMixin(Good) {
  static _mixinName: string = 'ChamberedTestMill';
}
class TestYard extends Location {}

const LOFT = '/test/chambered/drying-loft';
const NOT_A_CHAMBER = '/test/chambered/plank';

let minted = 0;
function stubClone(): void {
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    minted += 1;
    if (path === LOFT) return StuffApi.create(() => new Chamber());
    if (path === NOT_A_CHAMBER) return StuffApi.create(() => new Good());
    throw new Error(`no row at ${path}`);
  }) as never);
}

function applier(): TemplateApplier {
  return makeStuff(() => new TemplateApplier());
}

beforeEach(() => {
  StuffApi.clearAll();
  minted = 0;
  stubClone();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('ChamberedMixin', () => {
  it('is detected by MixinApi.isChambered', async () => {
    const mill = await StuffApi.create(() => new TestMill());
    expect(MixinApi.isChambered(mill)).toBe(true);
    const plain = await StuffApi.create(() => new Good());
    expect(MixinApi.isChambered(plain)).toBe(false);
  });

  it('⭐ the row mints its declared chamber through phase 2, keyed', async () => {
    const mill = await StuffApi.create(() => new TestMill());
    await applier().apply(
      mill as never,
      { chambers: [{ key: 'loft', template: LOFT }] },
      { mode: 'mint' },
    );
    expect(minted).toBe(1);
    const loft = mill.getChamber('loft');
    expect(loft).not.toBeNull();
    expect(loft).toBeInstanceOf(Chamber);
    expect(mill.getChambers()).toEqual([loft]);
    expect(mill.getChamber('freezer')).toBeNull();
  });

  it('⭐ a second application mints nothing new — and a new key is added', async () => {
    const mill = await StuffApi.create(() => new TestMill());
    const row = { chambers: [{ key: 'loft', template: LOFT }] };
    await applier().apply(mill as never, row, { mode: 'mint' });
    const first = mill.getChamber('loft');
    await applier().apply(mill as never, row, { mode: 'go-live' });
    expect(minted).toBe(1);
    expect(mill.getChamber('loft')).toBe(first);
    expect(mill.getChambers().length).toBe(1);

    // An author who ADDS a compartment reaches the live host.
    await mill.applyChambers([
      { key: 'loft', template: LOFT },
      { key: 'kiln', template: LOFT },
    ]);
    expect(minted).toBe(2);
    expect(mill.getChambers().length).toBe(2);
    expect(mill.getChamber('loft')).toBe(first);
  });

  it("a chamber stands in the host's container — beside it, not inside it", async () => {
    const yard = makeStuff(() => new TestYard());
    const mill = await StuffApi.create(() => new TestMill());
    ContainmentApi.move(mill, yard);
    await mill.applyChambers([{ key: 'loft', template: LOFT }]);
    const loft = mill.getChamber('loft') as Stuff & Chamber;
    expect(loft.getContainer()).toBe(yard);
  });

  it('⚠ minted standing nowhere (a props cascade), it joins the host on its first move', async () => {
    const mill = await StuffApi.create(() => new TestMill());
    await mill.applyChambers([{ key: 'loft', template: LOFT }]);
    const loft = mill.getChamber('loft') as Stuff & Chamber;
    expect(loft.getContainer()).toBeNull();

    const yard = makeStuff(() => new TestYard());
    ContainmentApi.move(mill, yard);
    expect(loft.getContainer()).toBe(yard);

    const shed = makeStuff(() => new TestYard());
    ContainmentApi.move(mill, shed);
    expect(loft.getContainer()).toBe(shed);
  });

  it('destructing the host destructs its chambers (the owned cascade)', async () => {
    const yard = makeStuff(() => new TestYard());
    const mill = await StuffApi.create(() => new TestMill());
    ContainmentApi.move(mill, yard);
    await mill.applyChambers([
      { key: 'loft', template: LOFT },
      { key: 'kiln', template: LOFT },
    ]);
    const chambers = [...mill.getChambers()];
    expect(chambers.length).toBe(2);
    StuffApi.destruct(mill);
    for (const c of chambers) expect(c.isDestroyed()).toBe(true);
  });

  it('refuses a template that is not a chamber, and leaves nothing behind', async () => {
    const mill = await StuffApi.create(() => new TestMill());
    await expect(
      mill.applyChambers([{ key: 'loft', template: NOT_A_CHAMBER }]),
    ).rejects.toThrow(/not a chamber/);
    expect(mill.getChambers()).toEqual([]);
  });

  it('refuses two chambers under one key', async () => {
    const mill = await StuffApi.create(() => new TestMill());
    await expect(
      mill.applyChambers([
        { key: 'loft', template: LOFT },
        { key: 'loft', template: LOFT },
      ]),
    ).rejects.toThrow(/share `key: loft`/);
  });
});
