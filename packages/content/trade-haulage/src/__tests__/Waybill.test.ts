/**
 * **The paper** — the bill of lading, the warehouse receipt, and the
 * two claims that make them load-bearing rather than decorative.
 *
 *  1. ⭐⭐ **The bill is what makes a fungible shipment nameable.** The
 *     gig substrate refuses `Globbable` outright, so a gig for "twenty
 *     bottles" is unpostable — the consignment is a discrete crate and
 *     the bill says what is in it.
 *  2. ⭐ **A depot's records cover exactly what it handled and no
 *     others** (AC17), *structurally*: bills are path-keyed under the
 *     filing business's own branch, so coverage IS market share and
 *     nobody can read across.
 *
 * Plus AC10 (the six fields), AC11 (the filed receipt), and AC16a
 * (edge traffic derived from the paper, with **no counter stored
 * anywhere**).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import WaybillRegistry from '../idea/WaybillRegistry';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import {
  CARRIER,
  DEPOT,
  business,
  clerk,
  installStore,
  waybills,
} from './haulage-fixtures';

/**
 * ⚠ Here rather than in the fixtures: tagging a call frame is refused
 * from anywhere but the framework and a `*.test.ts` file.
 */
async function asClerk<T>(fn: () => Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'haulage.test', () => {
    ExecutionContextApi.tagActingAuthor(clerk());
    return fn();
  }) as Promise<T>;
}

const TERMINUS = '/world/terminus/estuary/lower-towpath';
const CROSSROADS = '/world/terminus/delight-road/crossroads';
const YARD = '/world/rejection/location/pithead-yard';

const bill = (over: Record<string, unknown> = {}) => ({
  what: 'a crate of gin',
  goodsPath: '/stuff/thing/vessel/crate',
  howMuch: '1',
  from: TERMINUS,
  to: YARD,
  shipper: '/platform/agent/Avatar/merchant',
  declaredValueMinor: 120,
  legs: WaybillRegistry.legsOf([TERMINUS, CROSSROADS, YARD]),
  via: 'ship' as const,
  ...over,
});

beforeEach(() => {
  StuffApi.clearAll();
  installStore();
  vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(10_000, 's'));
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the bill of lading', () => {
  it('⭐ AC10 — records what, how much, from, to, whose and declared value', async () => {
    const carrier = business(CARRIER);
    const reg = waybills();
    await asClerk(() => reg.file(carrier, bill()));

    const filed = await reg.freightOf(carrier);
    expect(filed).toHaveLength(1);
    const b = filed[0]!;
    expect(b.what).toBe('a crate of gin');
    expect(b.howMuch).toBe('1');
    expect(b.from).toBe(TERMINUS);
    expect(b.to).toBe(YARD);
    expect(b.shipper).toBe('/platform/agent/Avatar/merchant');
    expect(b.declaredValueMinor).toBe(120);
    // …and who took it, which is the half the carrier needs.
    expect(b.carrier).toBe(CARRIER);
  });

  it('refuses a bill that does not say one of the six things', async () => {
    const carrier = business(CARRIER);
    const reg = waybills();
    for (const missing of ['what', 'howMuch', 'from', 'to', 'shipper']) {
      await expect(
        asClerk(() => reg.file(carrier, bill({ [missing]: '' }))),
      ).rejects.toThrow(/refusing a bill/);
    }
    // A malformed bill is a programming error at the caller; a silent
    // `false` is how a shipment goes missing.
    expect(await reg.freightOf(carrier)).toHaveLength(0);
  });

  it('⭐ AC17 — a depot reads exactly its own paper, and cannot read across', async () => {
    const carrier = business(CARRIER);
    const depot = business(DEPOT);
    const reg = waybills();
    await asClerk(async () => {
      await reg.file(carrier, bill({ what: 'the carrier’s crate' }));
      await reg.file(depot, bill({ what: 'the depot’s crate' }));
    });

    expect((await reg.freightOf(carrier)).map((b) => b.what)).toEqual([
      'the carrier’s crate',
    ]);
    expect((await reg.freightOf(depot)).map((b) => b.what)).toEqual([
      'the depot’s crate',
    ]);
    // ⭐ Which is the honest consequence of shipping without customs:
    // PRIVATE BOOKS DO NOT AGGREGATE. Nobody sees the realm's trade,
    // only their own — and the first institution that can see across is
    // not the state, it is the depot whose coverage IS its market share.
  });

  it('narrows by from / to / since', async () => {
    const carrier = business(CARRIER);
    const reg = waybills();
    await asClerk(async () => {
      await reg.file(carrier, bill({ to: YARD }));
      await reg.file(carrier, bill({ to: CROSSROADS }));
    });
    expect(await reg.freightOf(carrier, { to: YARD })).toHaveLength(1);
    expect(await reg.freightOf(carrier, { from: TERMINUS })).toHaveLength(2);
    expect(await reg.freightOf(carrier, { sinceS: 99_999 })).toHaveLength(0);
  });

  it('⭐⭐ AC16a — edge traffic is DERIVED from the paper, ranked, with no counter stored', async () => {
    const carrier = business(CARRIER);
    const reg = waybills();
    await asClerk(async () => {
      // Three loads down the whole spine…
      for (let i = 0; i < 3; i += 1) await reg.file(carrier, bill());
      // …and one that only went as far as the crossroads.
      await reg.file(
        carrier,
        bill({ to: CROSSROADS, legs: WaybillRegistry.legsOf([TERMINUS, CROSSROADS]) }),
      );
    });

    const traffic = await reg.trafficOf(carrier);
    // The busiest edge is the one everything crosses. Nobody authored
    // that: it is busy because the goods go down it, and if the mine
    // closed it would stop being busy on its own.
    expect(traffic[0]).toEqual({ from: TERMINUS, to: CROSSROADS, crossings: 4 });
    expect(traffic[1]).toEqual({ from: CROSSROADS, to: YARD, crossings: 3 });

    // ⚠ And the count is arithmetic over documents — there is no
    // traffic counter anywhere in the realm to go stale.
    expect(traffic).toHaveLength(2);
  });

  it('every carriage path files the SAME paper', async () => {
    const carrier = business(CARRIER);
    const reg = waybills();
    await asClerk(async () => {
      await reg.file(carrier, bill({ via: 'ship' }));
      await reg.file(carrier, bill({ via: 'gig' }));
      await reg.file(carrier, bill({ via: 'brain' }));
    });
    const filed = await reg.freightOf(carrier);
    expect(filed).toHaveLength(3);
    // ⭐ A spine blind to any one of these would be blind to most
    // freight in the realm: D16 makes the GIG the dominant path.
    expect(new Set(filed.map((b) => b.via))).toEqual(
      new Set(['ship', 'gig', 'brain']),
    );
    // …and they are indistinguishable in kind — same fields, same shape.
    for (const b of filed) expect(b.legs).toHaveLength(2);
  });
});

describe('the warehouse receipt', () => {
  it('acknowledges what is held, and for whom', async () => {
    const depot = business(DEPOT);
    const reg = waybills();
    await asClerk(() =>
      reg.issueReceipt(depot, {
        what: 'six bags of malt',
        goodsPath: '/stuff/thing/vessel/sack',
        depositor: '/platform/agent/Avatar/brewer',
      }),
    );
    const held = await reg.receiptsOf(depot);
    expect(held).toHaveLength(1);
    expect(held[0]!.depositor).toBe('/platform/agent/Avatar/brewer');
    expect(held[0]!.bailee).toBe(DEPOT);
  });

  it('refuses a receipt nobody can redeem', async () => {
    const depot = business(DEPOT);
    await expect(
      asClerk(() =>
        waybills().issueReceipt(depot, {
          what: 'a lot',
          goodsPath: '/x',
          depositor: '',
          }),
      ),
    ).rejects.toThrow(/no depositor/);
  });
});
