/**
 * ParcelRegistry / ParcelApi — the real-property title substrate
 * (property phase 0a). Covers the `ownerOf` resolution chain (title →
 * self-home → state), the sparse hierarchy (longest-prefix coverage),
 * `subdivide` / `transfer` with the append-only chain-of-title log, the
 * owner-ref mint-or-find, the narrow-entry gate, and the load-bearing
 * `can` / `canMutateZone` regression over a group-owned parcel (the
 * lounge/Terminus shape).
 *
 * Harness: a multi-collection in-memory PersistenceManager (parcels /
 * parcel_events / groups share a keyed store), the three registries
 * (Group → Parcel → Access) stood up in dependency order, and real
 * `Avatar` / `FolderZone` instances.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ParcelRegistry from "../ParcelRegistry";
import GroupRegistry from "../GroupRegistry";
import AccessRegistry from "../AccessRegistry";
import Avatar from "../Avatar";
import FolderZone from "../FolderZone";
import { ParcelApi } from "../../api/parcel";
import { AccessApi } from "../../api/access";
import { GroupApi } from "../../api/group";
import { StuffApi } from "../../api/stuff";
import { ExecutionContextApi } from "../../api/execution-context";
import { SecurityError } from "../../lib/security/errors";
import { ParcelRecord, type ParcelOwner } from "../../lib/parcel/ParcelRecord";
import { LandUses, type LandUse } from "../../lib/parcel/LandUse";
import { Quantity } from "../../lib/quantity";
import { ParcelEvent } from "../../lib/parcel/ParcelEvent";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import { Document } from "../../lib/persistence/Document";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../lib/security/__tests__/test-setup";

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
  const save = vi.fn(async (collection: string, doc: Doc) => {
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
  });
  const findById = vi.fn(
    async (collection: string, id: string) =>
      col(collection).find((d) => d._id === id) ?? null,
  );
  const del = vi.fn(async (collection: string, id: string) => {
    const arr = col(collection);
    const idx = arr.findIndex((d) => d._id === id);
    if (idx >= 0) arr.splice(idx, 1);
  });
  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      const arr = col(collection);
      const keys = Object.keys(query);
      if (keys.length === 0) return arr.slice();
      return arr.filter((d) =>
        keys.every((k) => {
          const stored = d[k];
          const wanted = query[k];
          if (Array.isArray(stored)) return stored.includes(wanted);
          return stored === wanted;
        }),
      );
    },
  );
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);

}

function seedParcel(entry: {
  extent: string;
  zonePath?: string;
  owner: ParcelOwner;
  parentParcel?: string | null;
  landUse?: LandUse | null;
  areaM2?: number;
}): void {
  col("parcels").push({
    _id: `seed-${++idCounter}`,
    extent: entry.extent,
    zonePath: entry.zonePath ?? entry.extent,
    owner: entry.owner,
    parentParcel: entry.parentParcel ?? null,
    grants: [],
    allowance: null,
    landUse: entry.landUse ?? null,
    area: entry.areaM2 ?? 0,
  });
}

/**
 * Seed a row the way a record written BEFORE land use existed looks: no
 * `landUse` / `area` keys at all. There is live parcel data, so the
 * backward-compatible load is a real requirement, not a hypothetical.
 */
function seedLegacyParcel(entry: {
  extent: string;
  owner: ParcelOwner;
  parentParcel?: string | null;
}): void {
  col("parcels").push({
    _id: `seed-${++idCounter}`,
    extent: entry.extent,
    zonePath: entry.extent,
    owner: entry.owner,
    parentParcel: entry.parentParcel ?? null,
    grants: [],
    allowance: null,
  });
}

async function boot(): Promise<void> {
  if (!StuffApi.findByTemplatePath("/obj/GroupRegistry")) {
    const groups = makeStuffAtPath(
      () => new GroupRegistry(),
      "/obj/GroupRegistry",
    );
    await groups.postRegister();
  }
  const parcels = makeStuffAtPath(
    () => new ParcelRegistry(),
    "/obj/ParcelRegistry",
  );
  await parcels.postRegister();
}

async function bootWithAccess(): Promise<void> {
  await boot();
  const access = makeStuffAtPath(
    () => new AccessRegistry(),
    "/obj/AccessRegistry",
  );
  await access.postRegister();
}

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

/** Add a member (with a role) to a managed group by name, minting if absent. */
async function addGroupMember(
  name: string,
  playerId: string,
  role: "owner" | "admin" | "member" = "member",
): Promise<void> {
  const reg = await GroupApi.registry();
  const provider = reg.managed();
  let group = await provider.findByName(name);
  if (!group) {
    // Force the group into existence via the owner-ref resolution.
    await ParcelApi.resolveOwnerRef({ kind: "group", name });
    group = await provider.findByName(name);
  }
  // Membership keys on the member's templatePath (a player as
  // `/obj/Avatar/<playerId>`), matching how `makeAvatar` places the avatar.
  group!.addMember(`/obj/Avatar/${playerId}`, role);
  await group!.save();
  if (group!._id) provider.fireChange(group!._id);
}

function reset(): void {
  vi.restoreAllMocks();
  ParcelApi._resetRegistryRefForReload();
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
}

describe("ParcelApi.ownerOf — the resolution chain", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("rung 1 — an explicit parcel title (covering, longest-prefix)", async () => {
    seedParcel({ extent: "/domain/lounge", owner: { kind: "group", name: "lounge" } });
    await boot();
    const owner = await ParcelApi.ownerOf("/domain/lounge/bar/stool");
    expect(owner).toEqual({ kind: "group", name: "lounge" });
  });

  it("rung 2 — self-home identity, with NO parcels row", async () => {
    await boot();
    const owner = await ParcelApi.ownerOf("/home/iris/scripts/wave");
    expect(owner).toEqual({ kind: "player", templatePath: "/home/iris" });
    // No row was created for the self-home resolution.
    expect(await ParcelRecord.findByExtent("/home/iris")).toBeNull();
    expect(col("parcels").length).toBe(0);
  });

  it("rung 3 — the state (public default) for untitled content", async () => {
    await boot();
    const owner = await ParcelApi.ownerOf("/domain/nowhere/thing");
    expect(owner).toEqual({ kind: "group", name: "core" });
  });

  it("an explicit title overrides self-home (title wins)", async () => {
    seedParcel({ extent: "/home/shared", owner: { kind: "group", name: "commons" } });
    await boot();
    const owner = await ParcelApi.ownerOf("/home/shared/room");
    expect(owner).toEqual({ kind: "group", name: "commons" });
  });

  it("is total — resolves the empty path to the state", async () => {
    await boot();
    expect(await ParcelApi.ownerOf("")).toEqual({ kind: "group", name: "core" });
  });
});

describe("ParcelApi — the sparse hierarchy (coverage)", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("resolves a nested path to the closest parcel-bearing ancestor", async () => {
    seedParcel({ extent: "/a", owner: { kind: "group", name: "g1" } });
    seedParcel({ extent: "/a/b/c", owner: { kind: "group", name: "g2" } });
    await boot();

    // Deep under the inner carve-out → the inner parcel.
    const inner = await ParcelApi.coveringParcelOf("/a/b/c/d/e");
    expect(inner?.getExtent()).toBe("/a/b/c");
    // Under the outer parcel but outside the carve-out → the outer parcel.
    const outer = await ParcelApi.coveringParcelOf("/a/x/y");
    expect(outer?.getExtent()).toBe("/a");
  });

  it("a zone with no row inherits its governing parcel's owner", async () => {
    seedParcel({ extent: "/a", owner: { kind: "group", name: "g1" } });
    await boot();
    // /a/deep has no row of its own → inherits /a.
    expect(await ParcelApi.ownerOf("/a/deep/room")).toEqual({
      kind: "group",
      name: "g1",
    });
  });
});

describe("ParcelApi.subdivide", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("mints a child row (inherited owner + parentParcel) and a genesis event", async () => {
    seedParcel({ extent: "/domain/lounge", owner: { kind: "group", name: "lounge" } });
    await boot();

    const actor = makeAvatar("dave");
    await withRootContext(null, "test", () => {
      ExecutionContextApi.tagActingAuthor(actor);
      return ParcelApi.subdivide("/domain/lounge/east-wing", "/domain/lounge", {
        kind: "group",
        name: "lounge",
      });
    });

    const child = await ParcelApi.coveringParcelOf("/domain/lounge/east-wing/x");
    expect(child?.getExtent()).toBe("/domain/lounge/east-wing");
    expect(child?.getParentParcel()).toBe("/domain/lounge");
    expect(child?.getOwner()).toEqual({ kind: "group", name: "lounge" });

    const events = await ParcelEvent.findByExtent("/domain/lounge/east-wing");
    expect(events).toHaveLength(1);
    expect(events[0]!.event).toBe("subdivide");
    expect(events[0]!.actor).toBe("/obj/Avatar/dave");
  });
});

describe("ParcelApi.transfer — chain of title", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("moves the title, logs the handoff, and keeps the prior owner recoverable", async () => {
    seedParcel({ extent: "/plot/17", owner: { kind: "group", name: "lounge" } });
    await boot();

    const actor = makeAvatar("dave");
    const updated = await withRootContext(null, "test", () => {
      ExecutionContextApi.tagActingAuthor(actor);
      return ParcelApi.transfer("/plot/17", {
        kind: "player",
        templatePath: "/obj/Avatar/alice",
      });
    });

    // Current state reflects the new owner.
    expect(updated?.getOwner()).toEqual({
      kind: "player",
      templatePath: "/obj/Avatar/alice",
    });
    expect(await ParcelApi.ownerOf("/plot/17")).toEqual({
      kind: "player",
      templatePath: "/obj/Avatar/alice",
    });

    // The append-only log preserves the lineage — never a destructive
    // overwrite: the prior owner (the lounge group) is still on the record.
    const events = await ParcelEvent.findByExtent("/plot/17");
    expect(events).toHaveLength(1);
    expect(events[0]!.event).toBe("transfer");
    expect(events[0]!.from).toEqual({ kind: "group", name: "lounge" });
    expect(events[0]!.to).toEqual({
      kind: "player",
      templatePath: "/obj/Avatar/alice",
    });
    expect(events[0]!.actor).toBe("/obj/Avatar/dave");
  });

  it("returns null when no parcel claims the extent", async () => {
    await boot();
    expect(
      await ParcelApi.transfer("/nope", { kind: "group", name: "core" }),
    ).toBeNull();
  });
});

describe("ParcelApi.resolveOwnerRef — mint-or-find", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("mints-or-finds a managed group by name and caches the ref", async () => {
    await boot();
    const ref = await ParcelApi.resolveOwnerRef({ kind: "group", name: "lounge" });
    expect(ref).toMatch(/^managed:/);
    // A second resolve returns the same ref (cached; no duplicate group).
    expect(await ParcelApi.resolveOwnerRef({ kind: "group", name: "lounge" })).toBe(ref);
    expect(col("groups").filter((g) => g.name === "lounge")).toHaveLength(1);
  });

  it("passes an explicit ref through and returns null for a player owner", async () => {
    await boot();
    expect(
      await ParcelApi.resolveOwnerRef({ kind: "group", ref: "managed:xyz" }),
    ).toBe("managed:xyz");
    expect(
      await ParcelApi.resolveOwnerRef({ kind: "player", templatePath: "/home/iris" }),
    ).toBeNull();
  });
});

describe("ParcelRegistry — the narrow-entry gate", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("denies a caller outside the parcel subsystem", async () => {
    await boot();
    const reg = StuffApi.findByTemplatePath<ParcelRegistry>("/obj/ParcelRegistry");
    expect(reg).not.toBeNull();
    // A direct call from this test module (not ParcelApi) is denied.
    expect(() => reg!.coveringParcelOf("/x")).toThrow(SecurityError);
  });
});

describe("ParcelApi — the lease (use-grant) surface", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("grant → hasUseGrant true; heldUnitOf returns it; another holder false", async () => {
    seedParcel({
      extent: "/dorms/f1-r1",
      owner: { kind: "group", name: "duncan" },
      parentParcel: "/dorms",
    });
    await boot();

    expect(await ParcelApi.grantUse("/dorms/f1-r1", "/obj/Avatar/iris", null)).toBe(true);
    expect(await ParcelApi.hasUseGrant("/dorms/f1-r1", "/obj/Avatar/iris")).toBe(true);
    expect(await ParcelApi.hasUseGrant("/dorms/f1-r1", "/obj/Avatar/bob")).toBe(false);

    const held = await ParcelApi.heldUnitOf("/obj/Avatar/iris");
    expect(held?.getExtent()).toBe("/dorms/f1-r1");
    expect(await ParcelApi.heldUnitOf("/obj/Avatar/bob")).toBeNull();
  });

  it("a past-expiry grant is inactive; revoke clears it", async () => {
    seedParcel({
      extent: "/dorms/f1-r2",
      owner: { kind: "group", name: "duncan" },
      parentParcel: "/dorms",
    });
    await boot();

    await ParcelApi.grantUse("/dorms/f1-r2", "/obj/Avatar/iris", Date.now() - 1000);
    expect(await ParcelApi.hasUseGrant("/dorms/f1-r2", "/obj/Avatar/iris")).toBe(false);

    // A fresh indefinite grant, then revoke.
    await ParcelApi.grantUse("/dorms/f1-r2", "/obj/Avatar/iris", null);
    expect(await ParcelApi.hasUseGrant("/dorms/f1-r2", "/obj/Avatar/iris")).toBe(true);
    expect(await ParcelApi.revokeUse("/dorms/f1-r2", "/obj/Avatar/iris")).toBe(true);
    expect(await ParcelApi.hasUseGrant("/dorms/f1-r2", "/obj/Avatar/iris")).toBe(false);
  });

  it("grant persists through save / findByExtent", async () => {
    seedParcel({
      extent: "/dorms/f1-r3",
      owner: { kind: "group", name: "duncan" },
      parentParcel: "/dorms",
    });
    await boot();
    await ParcelApi.grantUse("/dorms/f1-r3", "/obj/Avatar/iris", null);

    const row = await ParcelRecord.findByExtent("/dorms/f1-r3");
    expect(row?.getGrants()).toHaveLength(1);
    expect(row?.getGrants()[0]?.holder).toBe("/obj/Avatar/iris");
    expect(row?.getGrants()[0]?.kind).toBe("lease");
  });

  it("grantUse returns false when no parcel claims the extent", async () => {
    await boot();
    expect(await ParcelApi.grantUse("/nope", "/obj/Avatar/iris", null)).toBe(false);
  });
});

describe("ParcelApi — child enumeration + retire (unit provisioning)", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("childParcelsOf returns exactly the minted unit rows; retire frees a slot", async () => {
    seedParcel({ extent: "/dorms", owner: { kind: "group", name: "duncan" } });
    seedParcel({
      extent: "/dorms/f1-r1",
      owner: { kind: "group", name: "duncan" },
      parentParcel: "/dorms",
    });
    seedParcel({
      extent: "/dorms/f1-r2",
      owner: { kind: "group", name: "duncan" },
      parentParcel: "/dorms",
    });
    await boot();

    const kids = await ParcelApi.childParcelsOf("/dorms");
    expect(kids.map((k) => k.getExtent()).sort()).toEqual([
      "/dorms/f1-r1",
      "/dorms/f1-r2",
    ]);

    await ParcelApi.retire("/dorms/f1-r1");
    const after = await ParcelApi.childParcelsOf("/dorms");
    expect(after.map((k) => k.getExtent())).toEqual(["/dorms/f1-r2"]);
    // The freed extent can be re-minted (a fresh subdivide reuses the gap).
    expect(await ParcelRecord.findByExtent("/dorms/f1-r1")).toBeNull();
  });
});

describe("ParcelRecord — slot helpers (pure)", () => {
  it("round-trips (floor, pos) through the extent encoding", () => {
    const extent = ParcelRecord.extentForSlot("/dorms", 2, 7);
    expect(extent).toBe("/dorms/f2-r7");
    expect(ParcelRecord.slotOfExtent(extent)).toEqual({ floor: 2, pos: 7 });
  });

  it("slotOfExtent returns null for a non-slot leaf", () => {
    expect(ParcelRecord.slotOfExtent("/dorms/lobby")).toBeNull();
    expect(ParcelRecord.slotOfExtent("/dorms")).toBeNull();
  });

  it("activeGrantFor / hasActiveGrant honor expiry", () => {
    const rec = new ParcelRecord();
    rec.grants = [
      { kind: "lease", holder: "a", grantedAt: 0, expiresAt: null },
      { kind: "lease", holder: "b", grantedAt: 0, expiresAt: 100 },
    ];
    expect(ParcelRecord.hasActiveGrant(rec, "a", 999)).toBe(true);
    expect(ParcelRecord.hasActiveGrant(rec, "b", 50)).toBe(true);
    expect(ParcelRecord.hasActiveGrant(rec, "b", 150)).toBe(false);
    expect(ParcelRecord.hasActiveGrant(rec, "c", 0)).toBe(false);
  });
});

describe("AccessApi — can / canMutateZone over a parcel-owned slice (regression)", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  /** A FolderZone resource at a templatePath (the access `resource`). */
  function zoneAt(path: string): FolderZone {
    return makeStuffAtPath(() => new FolderZone(), path);
  }

  it("can(): a group-owner member is permitted; a non-member is denied", async () => {
    seedParcel({ extent: "/domain/lounge", owner: { kind: "group", name: "lounge" } });
    await bootWithAccess();
    await addGroupMember("lounge", "member1", "member");

    const resource = zoneAt("/domain/lounge");
    expect(await AccessApi.can(makeAvatar("member1"), "write", resource)).toBe(true);
    expect(await AccessApi.can(makeAvatar("stranger"), "write", resource)).toBe(false);
    expect(await AccessApi.can(null, "write", resource)).toBe(false);
  });

  it("canMutateZone(): only the 'owner' role passes (byte-identical role gate)", async () => {
    seedParcel({ extent: "/domain/lounge", owner: { kind: "group", name: "lounge" } });
    await bootWithAccess();
    await addGroupMember("lounge", "boss", "owner");
    await addGroupMember("lounge", "hand", "member");

    const zone = zoneAt("/domain/lounge");
    expect(await AccessApi.canMutateZone(makeAvatar("boss"), zone)).toBe(true);
    expect(await AccessApi.canMutateZone(makeAvatar("hand"), zone)).toBe(false);
    expect(await AccessApi.canMutateZone(makeAvatar("stranger"), zone)).toBe(false);
  });

  it("a player-owned parcel authorizes exactly that individual (transferred title)", async () => {
    seedParcel({
      extent: "/plot/17",
      owner: { kind: "player", templatePath: "/obj/Avatar/alice" },
    });
    await bootWithAccess();

    const zone = zoneAt("/plot/17");
    expect(await AccessApi.can(makeAvatar("alice"), "write", zone)).toBe(true);
    expect(await AccessApi.canMutateZone(makeAvatar("alice"), zone)).toBe(true);
    expect(await AccessApi.can(makeAvatar("bob"), "write", zone)).toBe(false);
  });

  it("untitled content resolves to the state (core), preserving today's core gate", async () => {
    await bootWithAccess();
    await addGroupMember("core", "coreowner", "owner");

    const zone = zoneAt("/domain/unowned");
    // core member with 'owner' role can mutate; a stranger cannot.
    expect(await AccessApi.canMutateZone(makeAvatar("coreowner"), zone)).toBe(true);
    expect(await AccessApi.canMutateZone(makeAvatar("stranger"), zone)).toBe(false);
    // and content-access falls to core membership.
    expect(await AccessApi.can(makeAvatar("coreowner"), "write", zone)).toBe(true);
  });
});

describe("ParcelApi.landUseOf — longest-prefix zoning", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("answers a parcel's own declared use", async () => {
    seedParcel({
      extent: "/domain/terminus/registry",
      owner: { kind: "group", name: "terminus" },
      landUse: "civic",
    });
    await boot();

    expect(ParcelApi.landUseOf("/domain/terminus/registry")).toBe("civic");
  });

  it("inherits a covering parcel's use for ground inside it", async () => {
    seedParcel({
      extent: "/domain/terminus/registry",
      owner: { kind: "group", name: "terminus" },
      landUse: "civic",
    });
    await boot();

    // No row of its own — the coverage trie's longest prefix answers.
    expect(ParcelApi.landUseOf("/domain/terminus/registry/office")).toBe(
      "civic",
    );
  });

  it("⭐ walks parentParcel upward when the nearest row declares nothing", async () => {
    seedParcel({
      extent: "/domain/hills",
      owner: { kind: "group", name: "core" },
      landUse: "residential",
    });
    seedParcel({
      extent: "/domain/hills/lot-1",
      owner: { kind: "player", templatePath: "/obj/Avatar/alice" },
      parentParcel: "/domain/hills",
      landUse: null, // explicit "inherit"
    });
    await boot();

    expect(ParcelApi.landUseOf("/domain/hills/lot-1")).toBe("residential");
  });

  it("an explicit child use OVERRIDES its parent's", async () => {
    seedParcel({
      extent: "/domain/hills",
      owner: { kind: "group", name: "core" },
      landUse: "residential",
    });
    seedParcel({
      extent: "/domain/hills/back-forty",
      owner: { kind: "group", name: "core" },
      parentParcel: "/domain/hills",
      landUse: "agricultural",
    });
    await boot();

    expect(ParcelApi.landUseOf("/domain/hills/back-forty")).toBe("agricultural");
    expect(ParcelApi.landUseOf("/domain/hills")).toBe("residential");
  });

  it("unclaimed ground answers wild", async () => {
    await boot();
    expect(ParcelApi.landUseOf("/domain/nowhere")).toBe("wild");
  });

  it("⭐ a path-branch row with no use answers wild — so cultivation is refused", async () => {
    // /studio and /obj/lounge are titles over the TEMPLATE TREE, not
    // ground. They must not read as cultivable merely because nobody
    // thought to zone them. This is the fail-closed default in situ.
    seedParcel({ extent: "/studio", owner: { kind: "group", name: "core" } });
    seedParcel({
      extent: "/obj/lounge",
      owner: { kind: "group", name: "lounge" },
    });
    await boot();

    expect(ParcelApi.landUseOf("/studio")).toBe("wild");
    expect(ParcelApi.landUseOf("/studio/some-group")).toBe("wild");
    expect(ParcelApi.landUseOf("/obj/lounge")).toBe("wild");
    expect(ParcelApi.cultivationScaleAt("/studio")).toBe("none");
    expect(ParcelApi.cultivationScaleAt("/obj/lounge")).toBe("none");
  });

  it("reports the cultivation scale for zoned ground", async () => {
    seedParcel({
      extent: "/domain/hills",
      owner: { kind: "group", name: "core" },
      landUse: "residential",
    });
    seedParcel({
      extent: "/domain/farmland",
      owner: { kind: "group", name: "core" },
      landUse: "agricultural",
    });
    await boot();

    expect(ParcelApi.cultivationScaleAt("/domain/hills/yard")).toBe("bed");
    expect(ParcelApi.cultivationScaleAt("/domain/farmland")).toBe("field");
  });

  it("⭐ a record written before land use existed loads and inherits", async () => {
    // There IS live parcel data. A row with no `landUse` key at all must
    // load cleanly and answer by inheritance, not throw or read as junk.
    seedParcel({
      extent: "/domain/terminus",
      owner: { kind: "group", name: "terminus" },
      landUse: "commercial",
    });
    seedLegacyParcel({
      extent: "/domain/terminus/general-store",
      owner: { kind: "group", name: "terminus" },
      parentParcel: "/domain/terminus",
    });
    await boot();

    const record = await ParcelApi.coveringParcelOf(
      "/domain/terminus/general-store",
    );
    expect(record?.getLandUse()).toBeNull();
    expect(record?.getArea()).toBe(0);
    expect(ParcelApi.landUseOf("/domain/terminus/general-store")).toBe(
      "commercial",
    );
  });
});

describe("ParcelRecord — land use and area on the row", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it("refuses an unknown land use on the setter path, naming it", () => {
    const record = new ParcelRecord();
    expect(() => record.setLandUse("recreational")).toThrow(/recreational/);
    expect(record.getLandUse()).toBeNull();
  });

  it("accepts null to restore inheritance", () => {
    const record = new ParcelRecord();
    record.setLandUse("civic");
    expect(record.getLandUse()).toBe("civic");
    record.setLandUse(null);
    expect(record.getLandUse()).toBeNull();
  });

  it("⭐ area round-trips, and bands for display", async () => {
    seedParcel({
      extent: "/domain/hills/lot-1",
      owner: { kind: "group", name: "core" },
      landUse: "residential",
      areaM2: 1_200,
    });
    await boot();

    const record = await ParcelApi.coveringParcelOf("/domain/hills/lot-1");
    const area = record?.getArea();
    expect(area).toBe(1_200);
    // …and it bands for display rather than showing the raw figure.
    expect(Quantity.of(area!, "m²").tag("lot")).toBe("a quarter-acre lot");
  });
});

describe("ParcelApi.subdivide — zoning constrains the lot", () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  async function subdivide(
    childPath: string,
    parentExtent: string,
    opts?: { landUse?: LandUse | null; areaM2?: number },
  ) {
    const actor = makeAvatar("dave");
    return withRootContext(null, "test", () => {
      ExecutionContextApi.tagActingAuthor(actor);
      return ParcelApi.subdivide(
        childPath,
        parentExtent,
        { kind: "group", name: "core" },
        opts?.areaM2 ?? 0,
        1,
        opts?.landUse ?? null,
      );
    });
  }

  it("stamps the declared use and area on the child row", async () => {
    seedParcel({
      extent: "/domain/hills",
      owner: { kind: "group", name: "core" },
      landUse: "residential",
    });
    await boot();

    await subdivide("/domain/hills/lot-1", "/domain/hills", {
      landUse: "residential",
      areaM2: 1_200,
    });

    const child = await ParcelApi.coveringParcelOf("/domain/hills/lot-1");
    expect(child?.getLandUse()).toBe("residential");
    expect(child?.getArea()).toBe(1_200);
  });

  it("⭐ refuses a lot outside its use's area band, naming both", async () => {
    seedParcel({
      extent: "/domain/hills",
      owner: { kind: "group", name: "core" },
      landUse: "residential",
    });
    await boot();

    const band = LandUses.areaBandOf("residential");
    await expect(
      subdivide("/domain/hills/absurd", "/domain/hills", {
        landUse: "residential",
        areaM2: band.max + 1,
      }),
    ).rejects.toThrow(/residential/);

    // …and NOTHING was written — a refusal leaves no row behind.
    expect(await ParcelApi.coveringParcelOf("/domain/hills/absurd")).toBe(
      (await ParcelApi.coveringParcelOf("/domain/hills")),
    );
  });

  it("checks the band against the INHERITED use when none is declared", async () => {
    seedParcel({
      extent: "/domain/farmland",
      owner: { kind: "group", name: "core" },
      landUse: "agricultural",
    });
    await boot();

    // 3 m² is fine for a civic bench and absurd for a farm; the child
    // declares no use, so agricultural's band is the one that applies.
    await expect(
      subdivide("/domain/farmland/sliver", "/domain/farmland", { areaM2: 3 }),
    ).rejects.toThrow(/agricultural/);
  });

  it("leaves use and area untouched when opts is omitted (existing callers)", async () => {
    seedParcel({
      extent: "/domain/lounge",
      owner: { kind: "group", name: "lounge" },
    });
    await boot();

    await subdivide("/domain/lounge/east-wing", "/domain/lounge");

    const child = await ParcelApi.coveringParcelOf("/domain/lounge/east-wing");
    expect(child?.getLandUse()).toBeNull();
    expect(child?.getArea()).toBe(0);
    // …and it still inherits, so the walk is unaffected.
    expect(ParcelApi.landUseOf("/domain/lounge/east-wing")).toBe("wild");
  });

  it("⭐ nothing reconciles area against rooms", async () => {
    // The guard against someone later 'helpfully' deriving parcel area
    // from room geometry. A parcel's area is a DECLARED land-tenure fact;
    // Location.getSizeScale() is a photometric denominator. Adding,
    // removing or resizing rooms inside a parcel must not move it.
    seedParcel({
      extent: "/domain/hills",
      owner: { kind: "group", name: "core" },
      landUse: "residential",
      areaM2: 1_200,
    });
    await boot();

    const before = (await ParcelApi.coveringParcelOf("/domain/hills"))!;
    expect(before.getArea()).toBe(1_200);

    // Stand up zones inside the parcel — the closest thing to "adding
    // rooms" the title layer can even observe.
    makeStuffAtPath(() => new FolderZone(), "/domain/hills/yard");
    makeStuffAtPath(() => new FolderZone(), "/domain/hills/shed");

    const after = (await ParcelApi.coveringParcelOf("/domain/hills"))!;
    expect(after.getArea()).toBe(1_200);
  });
});
