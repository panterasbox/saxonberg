/**
 * Acreage — buildings consume ground, interiors consume floors (wave 6,
 * D17).
 *
 * The finding this exists for: **multi-storey breaks area conservation.**
 * A single-storey house never surfaces it, so build-2's `gross − footprint`
 * is complete for them; an apartment building is not. A 300 m² footprint at
 * four storeys offers ~1200 m² of interior, and a rule written against
 * ground area alone refuses apartments at `subdivide` on the second floor.
 *
 * Two ledgers, one new field:
 *
 *   - **ground** — `workable = area − Σ children.area`, DERIVED, never
 *     stored. Any child consumes ground whether it is a building or a
 *     sub-lot, so there is no structure/non-structure distinction, and a
 *     building's footprint needs no field: it IS its parcel's `area`.
 *   - **floor** — `storeys`, default 1. Children conserve against
 *     `area × storeys`.
 *
 * The regression that matters most is the last one: a parcel that declares
 * nothing behaves exactly as it did before any of this existed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ParcelRegistry from "../../../obj/ParcelRegistry";
import { ParcelApi } from "../../../api/parcel";
import { StuffApi } from "../../../api/stuff";
import { Document } from "../../persistence/Document";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import type { ParcelOwner } from "../ParcelRecord";

const LANDLORD: ParcelOwner = { kind: "player", templatePath: "/obj/Avatar/lord" };
const LOT = "/domain/test/lot";
const BUILDING = "/domain/test/lot/building";

interface Doc extends Record<string, unknown> {
  _id?: string;
}
let store: Map<string, Doc[]>;
let idCounter = 0;

function col(c: string): Doc[] {
  let arr = store.get(c);
  if (!arr) {
    arr = [];
    store.set(c, arr);
  }
  return arr;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save: vi.fn(async (c: string, doc: Doc) => {
      const arr = col(c);
      if (doc._id) {
        const i = arr.findIndex((d) => d._id === doc._id);
        if (i >= 0) arr[i] = { ...doc };
        else arr.push({ ...doc });
        return doc._id;
      }
      const id = String(++idCounter);
      arr.push({ ...doc, _id: id });
      return id;
    }),
    find: vi.fn(async (c: string, q: Record<string, unknown>) => {
      const arr = col(c);
      const keys = Object.keys(q);
      if (keys.length === 0) return arr.slice();
      return arr.filter((d) => keys.every((k) => d[k] === q[k]));
    }),
    findById: vi.fn(
      async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null,
    ),
    delete: vi.fn(async (c: string, id: string) => {
      const arr = col(c);
      const i = arr.findIndex((d) => d._id === id);
      if (i >= 0) arr.splice(i, 1);
    }),
    isConnected: () => true,
  } as unknown as PersistenceManager);
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

async function boot(): Promise<void> {
  const reg = makeStuffAtPath(() => new ParcelRegistry(), "/obj/ParcelRegistry");
  await reg.postRegister();
}

beforeEach(async () => {
  StuffApi.clearAll();
  installStore();
  await boot();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("the ground ledger", () => {
  it("workable derives and never drifts — adding a structure reduces it with no write", async () => {
    await ParcelApi.subdivide(LOT, "", LANDLORD, 1000);
    expect(await ParcelApi.workableAreaOf(LOT)).toBe(1000);

    // A building is a sub-parcel of its lot, and its area IS its footprint
    // — which is why no footprint field exists anywhere.
    await ParcelApi.subdivide(BUILDING, LOT, LANDLORD, 300);
    expect(await ParcelApi.workableAreaOf(LOT)).toBe(700);

    // Nothing stored it: the number came off the children, on read.
    const lotRow = col("parcels").find((d) => d.extent === LOT);
    expect(lotRow?.workable).toBeUndefined();
  });

  it("any child consumes ground — a sub-lot counts exactly like a building", async () => {
    await ParcelApi.subdivide(LOT, "", LANDLORD, 1000);
    await ParcelApi.subdivide(`${LOT}/north`, LOT, LANDLORD, 400);
    await ParcelApi.subdivide(`${LOT}/south`, LOT, LANDLORD, 250);
    expect(await ParcelApi.workableAreaOf(LOT)).toBe(350);
  });
});

describe("the floor ledger — storeys", () => {
  it("a four-storey building lets FOUR TIMES its footprint", async () => {
    await ParcelApi.subdivide(LOT, "", LANDLORD, 1000);
    await ParcelApi.subdivide(BUILDING, LOT, LANDLORD, 300, 4);

    // 1200 m² of interior out of a 300 m² footprint. Units summing to 1100
    // are fine — this is the case a rule written against ground area alone
    // would have refused on the second floor.
    await ParcelApi.subdivide(`${BUILDING}/f1-r1`, BUILDING, LANDLORD, 600);
    await ParcelApi.subdivide(`${BUILDING}/f2-r1`, BUILDING, LANDLORD, 500);
    const units = col("parcels").filter((d) => d.parentParcel === BUILDING);
    expect(units.length).toBe(2);
  });

  it("...and the same sum against a single-storey lot is refused", async () => {
    await ParcelApi.subdivide(LOT, "", LANDLORD, 300);
    await ParcelApi.subdivide(`${LOT}/a`, LOT, LANDLORD, 200);
    await expect(
      ParcelApi.subdivide(`${LOT}/b`, LOT, LANDLORD, 200),
    ).rejects.toThrow(/would take 400/);
  });

  it("re-subdividing an existing child does not double-count it", async () => {
    await ParcelApi.subdivide(LOT, "", LANDLORD, 500);
    await ParcelApi.subdivide(`${LOT}/a`, LOT, LANDLORD, 500);
    // Same child, same area — an idempotent re-provision must not trip the
    // ceiling against itself.
    await expect(
      ParcelApi.subdivide(`${LOT}/a`, LOT, LANDLORD, 500),
    ).resolves.toBeTruthy();
  });
});

describe("the named regression — unmeasured land is untouched", () => {
  it("a parcel that declares no area behaves exactly as it did before", async () => {
    // Every parcel predating these fields: no area, no storeys, no ceiling,
    // no refusal. `storeys` defaults to 1 and the ceiling is not policed.
    await ParcelApi.subdivide(LOT, "", LANDLORD);
    const a = await ParcelApi.subdivide(`${LOT}/a`, LOT, LANDLORD);
    const b = await ParcelApi.subdivide(`${LOT}/b`, LOT, LANDLORD);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(await ParcelApi.workableAreaOf(LOT)).toBe(0);
  });

  it("storeys defaults to 1 — a ground parcel is behaviourally identical", async () => {
    await ParcelApi.subdivide(LOT, "", LANDLORD, 800);
    const row = col("parcels").find((d) => d.extent === LOT);
    expect(row?.storeys).toBe(1);
  });
});
