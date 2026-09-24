/**
 * ⭐⭐ **The town funds a service, and finds out it is short when the
 * streets go dark** (envelope D7).
 *
 * The civic half of street lighting. What this file is actually about:
 *
 *  - **The order is written in ADVANCE.** Streets are lit by
 *    `seniority`, recorded on each street's own row. Nobody is judged
 *    at the moment of refusal, because the decision was made before
 *    anybody knew there would be a shortfall — the watershed's rule for
 *    a quota, applied to a service.
 *  - **`n` is computed from the balance FIRST**, so the refusal is the
 *    exception rather than the path.
 *  - **One appropriation leg per night**, through the SHIPPED
 *    `BankingApi.appropriate`. No new banking primitive and no new gate
 *    on the money subsystem: `appropriation` is already the correct
 *    accounting name for public lighting, the call already refuses when
 *    short, and its source is already the treasury.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Locality from '../idea/Locality';
import CartesianLocation from '../../lib/location/CartesianLocation';
import CartesianZone from '../idea/location/CartesianZone';
import { BankingApi } from '../../api/banking';
import { StuffApi } from '../../api/stuff';
import { Money } from '../../lib/banking/Money';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

const CITY = '/platform/idea/Locality/_civic/town';
const SUPPLIER = '/world/_civic/oil-merchant';
const A = '/world/_civic/high-street';
const B = '/world/_civic/back-lane';
const C = '/world/_civic/the-cut';

type Street = CartesianLocation & { publicLighting: unknown };

let city: Locality;
let appropriations: Array<{ to: string; amount: Money }>;

/**
 * The queue the address tier hands in — every street this extent
 * covers, already sorted by the seniority its row records.
 *
 * ⚠ The extent does NOT look these up. Finding them is a registry-wide
 * read, gated by name to the address tier, because *being handed a
 * slice of the world has to be asked for*. What lives on the extent is
 * the order, the money, and the record — which is what this file tests.
 */
const QUEUE: readonly string[] = [A, B, C];

/** Stand a street up with a declared service and a place in the queue. */
function street(path: string, seniority: number): Street {
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(3);
  const s = makeStuffAtPath(
    () => new CartesianLocation(),
    path,
  ) as unknown as Street;
  zone.addLocation(s as unknown as CartesianLocation, 0, 0, 0);
  s.publicLighting = { flux: 400, detail: 'lamps', seniority };
  (s as unknown as { _lightingLocalityPath: string })._lightingLocalityPath =
    CITY;
  return s;
}

/** Put `minor` in the treasury, and record every appropriation posted. */
function treasuryHolding(minor: number): void {
  vi.spyOn(BankingApi, 'treasuryAccountId').mockResolvedValue('treasury:test');
  vi.spyOn(BankingApi, 'balanceOf').mockReturnValue(Money.of(minor, 'credit'));
  vi.spyOn(BankingApi, 'appropriate').mockImplementation(
    async (to: string, amount: Money) => {
      appropriations.push({ to, amount });
      return 'txn:test';
    },
  );
}

beforeEach(() => {
  installV1QuantityMarshallers();
  appropriations = [];
  city = makeStuffAtPath(() => new Locality(), CITY) as unknown as Locality;
  (city as unknown as { _publicLighting: unknown })._publicLighting = {
    fuelPerStreetNight: 4,
    supplier: SUPPLIER,
  };
  street(A, 1);
  street(B, 2);
  street(C, 3);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a funded night', () => {
  it('lights every street it can afford, and posts ONE leg for all of them', async () => {
    treasuryHolding(1000);
    await city.settleStreetLighting(0, QUEUE);

    expect([...city.getLitStreets()]).toEqual([A, B, C]);
    expect(appropriations).toHaveLength(1);
    expect(appropriations[0]!.to).toBe(SUPPLIER);
    expect(appropriations[0]!.amount.minor).toBe(12); // 3 × 4
  });

  it('⭐ short: lights the SENIOR streets and pays only for those', async () => {
    treasuryHolding(9); // two street-nights and change
    await city.settleStreetLighting(0, QUEUE);

    expect([...city.getLitStreets()]).toEqual([A, B]);
    expect(city.isStreetLitTonight(C)).toBe(false);
    expect(appropriations[0]!.amount.minor).toBe(8); // 2 × 4, not 12
  });

  it('⚠ broke: lights NOTHING and posts nothing — the failure mode, and the point', async () => {
    treasuryHolding(3); // under one street-night
    await city.settleStreetLighting(0, QUEUE);

    expect([...city.getLitStreets()]).toEqual([]);
    expect(appropriations).toHaveLength(0);
  });

  it('⚠ does not double-settle: a second call the same night is a no-op', async () => {
    treasuryHolding(1000);
    await city.settleStreetLighting(0, QUEUE);
    await city.settleStreetLighting(3600, QUEUE); // same night
    expect(appropriations).toHaveLength(1);

    // Tomorrow is a new bill.
    await city.settleStreetLighting(86_400 + 3600, QUEUE);
    expect(appropriations).toHaveLength(2);
  });

  it('⭐ the treasury refusing mid-post leaves every street dark', async () => {
    // `appropriate` refuses when short. `n` is computed from the balance
    // first so this is the EXCEPTION rather than the path — but when it
    // happens, nothing is recorded as lit and `look at the lamps` says
    // they stand cold.
    treasuryHolding(1000);
    vi.spyOn(BankingApi, 'appropriate').mockRejectedValue(
      new Error('the treasury holds less than that'),
    );
    await city.settleStreetLighting(0, QUEUE);
    expect([...city.getLitStreets()]).toEqual([]);
  });
});

describe('an extent that funds nothing', () => {
  it('settles nothing and pays nothing', async () => {
    (city as unknown as { _publicLighting: unknown })._publicLighting = null;
    treasuryHolding(1000);
    await city.settleStreetLighting(0, QUEUE);
    expect([...city.getLitStreets()]).toEqual([]);
    expect(appropriations).toHaveLength(0);
  });
});
