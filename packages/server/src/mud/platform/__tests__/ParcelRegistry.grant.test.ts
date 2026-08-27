/**
 * `ParcelApi.grant` — the content installer's title seam (content-packs
 * wave 3): a fresh extent is written with a `grant` event and indexed; the
 * same holder is `kept` with no event; a foreign holder is a `conflict`
 * with the row untouched; a `core`-held row (the retired state default) is
 * a row held by anyone else — the retired state default included — is a
 * `conflict` (no migration branch, wave 4a); a malformed landUse throws.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ParcelRegistry from "../idea/ParcelRegistry";
import GroupRegistry from "../idea/GroupRegistry";
import { ParcelApi } from "../../api/parcel";
import { AccessApi } from "../../api/access";
import { StuffApi } from "../../api/stuff";
import { ParcelRecord, type ParcelOwner } from "../../lib/parcel/ParcelRecord";
import { ParcelEvent } from "../../lib/parcel/ParcelEvent";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../lib/security/__tests__/test-setup";

interface Doc extends Record<string, unknown> {
  _id?: string;
}

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(collection: string): Doc[] {
  let arr = store.get(collection);
  if (!arr) {
    arr = [];
    store.set(collection, arr);
  }
  return arr;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save: vi.fn(async (collection: string, doc: Doc) => {
      const arr = col(collection);
      if (doc._id) {
        const idx = arr.findIndex((d) => d._id === doc._id);
        if (idx >= 0) arr[idx] = { ...doc };
        else arr.push({ ...doc });
        return doc._id;
      }
      const id = String(++idCounter);
      arr.push({ ...doc, _id: id });
      return id;
    }),
    find: vi.fn(async (collection: string, query: Record<string, unknown>) => {
      const arr = col(collection);
      const keys = Object.keys(query);
      if (keys.length === 0) return arr.slice();
      return arr.filter((d) => keys.every((k) => d[k] === query[k]));
    }),
    findById: vi.fn(
      async (collection: string, id: string) =>
        col(collection).find((d) => d._id === id) ?? null,
    ),
    delete: vi.fn(async () => undefined),
    isConnected: () => true,
  } as unknown as PersistenceManager);
}

function seedParcel(extent: string, owner: ParcelOwner): void {
  col("parcels").push({
    _id: `seed-${++idCounter}`,
    extent,
    zonePath: extent,
    owner,
    parentParcel: null,
    grants: [],
    allowance: null,
    landUse: null,
    area: 0,
  });
}

async function boot(): Promise<void> {
  const groups = makeStuffAtPath(() => new GroupRegistry(), "/platform/idea/GroupRegistry");
  await groups.postRegister();
  const parcels = makeStuffAtPath(() => new ParcelRegistry(), "/platform/idea/ParcelRegistry");
  await parcels.postRegister();
}

function reset(): void {
  vi.restoreAllMocks();
  ParcelApi._resetRegistryRefForReload();
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
}

const EXECUTIVE: ParcelOwner = { kind: "organization", templatePath: "/compact/executive" };

describe("ParcelApi.grant", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("a fresh extent → granted: row + `grant` event + indexed", async () => {
    await boot();
    const r = await ParcelApi.grant({ extent: "/stuff", holder: EXECUTIVE });
    expect(r).toEqual({ outcome: "granted", holder: EXECUTIVE });
    const row = await ParcelRecord.findByExtent("/stuff");
    expect(row?.getOwner()).toEqual(EXECUTIVE);
    expect(row?.getZonePath()).toBe("/stuff");
    const events = await ParcelEvent.findByExtent("/stuff");
    expect(events).toHaveLength(1);
    expect(events[0]!.event).toBe("grant");
    expect(events[0]!.from).toBeNull();
    expect(events[0]!.to).toEqual(EXECUTIVE);
    // Indexed: the covering lookup sees it without a rebuild.
    expect(await ParcelApi.ownerOf("/stuff/thing/gear/hat")).toEqual(EXECUTIVE);
  });

  it("carries landUse / areaM2 / parentParcel through", async () => {
    await boot();
    await ParcelApi.grant({ extent: "/studio/hills", holder: { kind: "group", name: "hills" }, landUse: "residential", areaM2: 240000 });
    const r = await ParcelApi.grant({ extent: "/studio/hills/lot-1", holder: { kind: "group", name: "hills" }, parentParcel: "/studio/hills", landUse: "residential", areaM2: 1000 });
    expect(r.outcome).toBe("granted");
    const lot = await ParcelRecord.findByExtent("/studio/hills/lot-1");
    expect(lot?.getParentParcel()).toBe("/studio/hills");
    expect(lot?.getLandUse()).toBe("residential");
    expect(lot?.getArea()).toBe(1000);
  });

  it("the same holder → kept: no write, no event", async () => {
    seedParcel("/wiki", { kind: "group", name: "wiki-editors" });
    await boot();
    const r = await ParcelApi.grant({ extent: "/wiki", holder: { kind: "group", name: "wiki-editors" } });
    expect(r.outcome).toBe("kept");
    expect(await ParcelEvent.findByExtent("/wiki")).toHaveLength(0);
    expect(col("parcels")).toHaveLength(1);
  });

  it("the same organization holder → kept", async () => {
    seedParcel("/stuff", EXECUTIVE);
    await boot();
    expect((await ParcelApi.grant({ extent: "/stuff", holder: EXECUTIVE })).outcome).toBe("kept");
  });

  it("a foreign holder → conflict: row untouched, no event, the current holder reported", async () => {
    seedParcel("/studio/lounge", { kind: "group", name: "lounge" });
    await boot();
    const r = await ParcelApi.grant({ extent: "/studio/lounge", holder: { kind: "group", name: "terminus" } });
    expect(r).toEqual({ outcome: "conflict", holder: { kind: "group", name: "lounge" } });
    expect(await ParcelApi.ownerOf("/studio/lounge/bar")).toEqual({ kind: "group", name: "lounge" });
    expect(await ParcelEvent.findByExtent("/studio/lounge")).toHaveLength(0);
  });

  it("a row held by a different group — a retired board, the old state default — is a conflict: no write, no event (no migration branch)", async () => {
    seedParcel("/corpo/goodkin", { kind: "group", name: "goodkin" });
    seedParcel("/studio", { kind: "group", name: "somebody" });
    await boot();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const GOODKIN: ParcelOwner = { kind: "organization", templatePath: "/corpo/goodkin" };
    expect(await ParcelApi.grant({ extent: "/corpo/goodkin", holder: GOODKIN })).toEqual({
      outcome: "conflict",
      holder: { kind: "group", name: "goodkin" },
    });
    expect(await ParcelApi.grant({ extent: "/studio", holder: EXECUTIVE })).toEqual({
      outcome: "conflict",
      holder: { kind: "group", name: "somebody" },
    });
    expect(await ParcelApi.ownerOf("/corpo/goodkin/x")).toEqual({ kind: "group", name: "goodkin" });
    expect(await ParcelApi.ownerOf("/studio/x")).toEqual({ kind: "group", name: "somebody" });
    expect(await ParcelEvent.findByExtent("/corpo/goodkin")).toHaveLength(0);
    expect(await ParcelEvent.findByExtent("/studio")).toHaveLength(0);
    expect(info).not.toHaveBeenCalledWith(expect.stringMatching(/migrated/));
  });

  it("malformed claims throw: unknown landUse, non-positive area, no holder key", async () => {
    await boot();
    await expect(
      ParcelApi.grant({ extent: "/x", holder: { kind: "group", name: "g" }, landUse: "spaceport" as never }),
    ).rejects.toThrow(/unknown landUse/);
    await expect(
      ParcelApi.grant({ extent: "/x", holder: { kind: "group", name: "g" }, areaM2: 0 }),
    ).rejects.toThrow(/non-positive/);
    await expect(
      ParcelApi.grant({ extent: "/x", holder: { kind: "group" } }),
    ).rejects.toThrow(/needs a name or ref/);
    expect(col("parcels")).toHaveLength(0);
  });

  it("mints the registry when none is resident (the grant path mints)", async () => {
    const groups = makeStuffAtPath(() => new GroupRegistry(), "/platform/idea/GroupRegistry");
    await groups.postRegister();
    // No ParcelRegistry mounted; a template-backed singleton clone is not
    // available in this harness, so the mint path is exercised through the
    // StuffApi.singleton seam.
    const mint = vi.spyOn(StuffApi, "singleton").mockImplementation(async () => {
      const reg = makeStuffAtPath(() => new ParcelRegistry(), "/platform/idea/ParcelRegistry");
      await reg.postRegister();
      return reg as never;
    });
    const r = await ParcelApi.grant({ extent: "/stuff", holder: EXECUTIVE });
    expect(r.outcome).toBe("granted");
    expect(mint).toHaveBeenCalledWith("/platform/idea/ParcelRegistry");
    expect(StuffApi.findByTemplatePath("/platform/idea/ParcelRegistry")).not.toBeNull();
  });
});
