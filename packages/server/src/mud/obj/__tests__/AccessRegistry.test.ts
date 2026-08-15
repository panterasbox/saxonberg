/**
 * AccessRegistry — the wizard (code-trust) axis: membership semantics
 * for `isWizard` and the `WIZARD_PLAYER_IDS` boot seed.
 *
 * Harness: an in-memory PersistenceManager (groups + templates share one
 * store, filtered by name/path), a hand-stamped Registry at
 * `/obj/AccessRegistry` whose `postRegister` mints the bootstrap groups,
 * and real `Avatar` instances (the `isWizard` predicate narrows on
 * `instanceof Avatar` + a non-empty playerId).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import AccessRegistry from "../AccessRegistry";
import GroupRegistry from "../GroupRegistry";
import ParcelRegistry from "../ParcelRegistry";
import Avatar from "../Avatar";
import { AccessApi } from "../../api/access";
import { CompactApi } from "../../api/compact";
import { Office } from "../../lib/governance/Office";
import { ParcelApi } from "../../api/parcel";
import { GroupApi } from "../../api/group";
import { StuffApi } from "../../api/stuff";
import { SecurityError } from "../../lib/security/errors";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import { Document } from "../../lib/persistence/Document";
import { makeStuffAtPath } from "../../lib/security/__tests__/test-setup";

interface Doc extends Record<string, unknown> {
  _id?: string;
  path?: string;
  name?: string;
  class?: string;
  data?: Record<string, unknown>;
  extent?: string;
  owner?: unknown;
}

function installInMemoryStore(initial: Doc[] = []): Doc[] {
  const store: Doc[] = initial.map((d, i) => ({ _id: String(i + 1), ...d }));
  const save = vi.fn(async (_collection: string, doc: Doc) => {
    const copy = { ...doc };
    if (copy._id) {
      const idx = store.findIndex((d) => d._id === copy._id);
      if (idx >= 0) store[idx] = copy;
      else store.push(copy);
      return copy._id!;
    }
    copy._id = String(store.length + 1);
    store.push(copy);
    return copy._id;
  });
  const find = vi.fn(
    async (_collection: string, query: Record<string, unknown>) => {
      if (typeof query.name === "string") {
        return store.filter((d) => d.name === query.name);
      }
      if (typeof query.extent === "string") {
        return store.filter((d) => d.extent === query.extent);
      }
      if (typeof query.path === "string") {
        return store.filter((d) => d.path === query.path);
      }
      if (
        typeof query.path === "object" &&
        query.path !== null &&
        "$regex" in (query.path as object)
      ) {
        const r = new RegExp((query.path as { $regex: string }).$regex);
        return store.filter(
          (d) => typeof d.path === "string" && r.test(d.path),
        );
      }
      return store.slice();
    },
  );
  const findById = vi.fn(async (_collection: string, id: string) =>
    store.find((d) => d._id === id) ?? null,
  );
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save,
    find,
    findById,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  return store;
}

async function bootRegistry(): Promise<AccessRegistry> {
  // The AccessRegistry's seeding talks to the GroupRegistry via
  // GroupApi.registry(); stand one up (providers register in its
  // postRegister) before AccessRegistry.postRegister runs.
  if (!StuffApi.findByTemplatePath("/obj/GroupRegistry")) {
    const groups = makeStuffAtPath(
      () => new GroupRegistry(),
      "/obj/GroupRegistry",
    );
    await groups.postRegister();
  }
  const reg = makeStuffAtPath(
    () => new AccessRegistry(),
    "/obj/AccessRegistry",
  );
  await reg.postRegister();
  return reg;
}

/** Stand up the ParcelRegistry (rebuilds its coverage index from the
 *  `parcels` rows in the shared store). Property 0a repointed the author
 *  scope + `can` onto it. */
async function bootParcelRegistry(): Promise<ParcelRegistry> {
  // `ParcelRecord.area` carries a QuantityMarshaller, so warming the
  // coverage index preloads it. No row here declares an area (null skips
  // the marshaller), so a no-op resolver suffices.
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
  const reg = makeStuffAtPath(
    () => new ParcelRegistry(),
    "/obj/ParcelRegistry",
  );
  await reg.postRegister();
  return reg;
}

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(
    () => new Avatar(),
    `/obj/Avatar/${playerId}`,
  );
  av.setPlayerId(playerId);
  return av;
}

const ENV_KEY = "WIZARD_PLAYER_IDS";

describe("AccessRegistry — wizard axis", () => {
  let prevEnv: string | undefined;

  beforeEach(() => {
    prevEnv = process.env[ENV_KEY];
    delete process.env[ENV_KEY];
    AccessApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  afterEach(() => {
    if (prevEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prevEnv;
    vi.restoreAllMocks();
    AccessApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  it("isWizard is true for a wizards member, false otherwise", async () => {
    installInMemoryStore();
    await bootRegistry();

    // Add a member to the freshly-minted (empty) wizards group.
    const reg = await GroupApi.registry();
    const wizards = await reg.managed().findByName("wizards");
    expect(wizards).not.toBeNull();
    wizards!.addMember("/obj/Avatar/alice");
    await wizards!.save();
    if (wizards!._id) reg.managed().fireChange(wizards!._id);

    const alice = makeAvatar("alice");
    const bob = makeAvatar("bob");
    expect(await AccessApi.isWizard(alice)).toBe(true);
    expect(await AccessApi.isWizard(bob)).toBe(false);
  });

  it("seeds members from WIZARD_PLAYER_IDS additively + idempotently", async () => {
    process.env[ENV_KEY] = " p1 , p2 ,, ";
    installInMemoryStore();
    await bootRegistry();

    const reg = await GroupApi.registry();
    let wizards = await reg.managed().findByName("wizards");
    expect(wizards!.memberIds.sort()).toEqual(["/obj/Avatar/p1", "/obj/Avatar/p2"]);

    // A second boot against the already-seeded group is a no-op (no
    // duplicates, members intact).
    AccessApi._resetRegistryRefForReload();
    StuffApi.clearAll();
    await bootRegistry();
    const reg2 = await GroupApi.registry();
    wizards = await reg2.managed().findByName("wizards");
    expect(wizards!.memberIds.sort()).toEqual(["/obj/Avatar/p1", "/obj/Avatar/p2"]);
  });
});

describe("AccessRegistry — developers→wizards migration", () => {
  let prevEnv: string | undefined;

  beforeEach(() => {
    prevEnv = process.env[ENV_KEY];
    delete process.env[ENV_KEY];
    AccessApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  afterEach(() => {
    if (prevEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prevEnv;
    vi.restoreAllMocks();
    AccessApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  it("renames a legacy `developers` group forward, preserving _id + members", async () => {
    const store = installInMemoryStore([
      {
        name: "developers",
        owner: "system",
        memberIds: ["/obj/Avatar/legacy-a", "/obj/Avatar/legacy-b"],
        memberRoles: ["member", "member"],
      },
    ]);
    const legacyId = store[0]!._id;

    await bootRegistry();

    const reg = await GroupApi.registry();
    const wizards = await reg.managed().findByName("wizards");
    expect(wizards).not.toBeNull();
    expect(wizards!._id).toBe(legacyId); // same doc, renamed forward
    expect(wizards!.memberIds.sort()).toEqual(["/obj/Avatar/legacy-a", "/obj/Avatar/legacy-b"]);

    // No `developers` group remains.
    expect(await reg.managed().findByName("developers")).toBeNull();

    // Both legacy members read as wizards.
    const a = makeAvatar("legacy-a");
    const b = makeAvatar("legacy-b");
    expect(await AccessApi.isWizard(a)).toBe(true);
    expect(await AccessApi.isWizard(b)).toBe(true);
  });

  it("is idempotent: a second boot does not duplicate or lose members", async () => {
    installInMemoryStore([
      {
        name: "developers",
        owner: "system",
        memberIds: ["/obj/Avatar/legacy-a"],
        memberRoles: ["member"],
      },
    ]);

    await bootRegistry();
    // Second boot against the already-migrated store.
    AccessApi._resetRegistryRefForReload();
    StuffApi.clearAll();
    await bootRegistry();

    const reg = await GroupApi.registry();
    const wizards = await reg.managed().findByName("wizards");
    expect(wizards!.memberIds).toEqual(["/obj/Avatar/legacy-a"]);
    expect(await reg.managed().findByName("developers")).toBeNull();
  });
});

const ARCH_ENV = "ARCHWIZARD_PLAYER_IDS";

describe("AccessRegistry — archwizard axis + wizard conferral", () => {
  let prevWiz: string | undefined;
  let prevArch: string | undefined;

  beforeEach(() => {
    prevWiz = process.env[ENV_KEY];
    prevArch = process.env[ARCH_ENV];
    delete process.env[ENV_KEY];
    delete process.env[ARCH_ENV];
    AccessApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  afterEach(() => {
    if (prevWiz === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prevWiz;
    if (prevArch === undefined) delete process.env[ARCH_ENV];
    else process.env[ARCH_ENV] = prevArch;
    vi.restoreAllMocks();
    AccessApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  it("isArchwizard is true for an archwizards member, false otherwise", async () => {
    installInMemoryStore();
    await bootRegistry();

    const reg = await GroupApi.registry();
    const arch = await reg.managed().findByName("archwizards");
    expect(arch).not.toBeNull();
    arch!.addMember("/obj/Avatar/boss");
    await arch!.save();
    if (arch!._id) reg.managed().fireChange(arch!._id);

    expect(await AccessApi.isArchwizard(makeAvatar("boss"))).toBe(true);
    expect(await AccessApi.isArchwizard(makeAvatar("rando"))).toBe(false);
  });

  it("seeds archwizards from ARCHWIZARD_PLAYER_IDS", async () => {
    process.env[ARCH_ENV] = "boss1, boss2";
    installInMemoryStore();
    await bootRegistry();

    const reg = await GroupApi.registry();
    const arch = await reg.managed().findByName("archwizards");
    expect(arch!.memberIds.sort()).toEqual(["/obj/Avatar/boss1", "/obj/Avatar/boss2"]);
  });

  it("setWizardMembership is narrow-entry gated (rejects a non-WizardController caller)", () => {
    // The facade carries FromController(WizardController); a call from
    // this test module (not the controller) is denied synchronously.
    expect(() => AccessApi.setWizardMembership("alice", true)).toThrow(
      SecurityError,
    );
  });

  it("a wizards-membership change + fireChange invalidates the cache (next isWizard reflects it)", async () => {
    installInMemoryStore();
    await bootRegistry();

    const alice = makeAvatar("alice");
    expect(await AccessApi.isWizard(alice)).toBe(false); // warms the cache

    // The mechanism setWizardMembership relies on: mutate the group +
    // fireChange → the lazy wizard cache invalidates.
    const reg = await GroupApi.registry();
    const wizards = await reg.managed().findByName("wizards");
    wizards!.addMember("/obj/Avatar/alice");
    await wizards!.save();
    reg.managed().fireChange(wizards!._id!);

    expect(await AccessApi.isWizard(alice)).toBe(true);
  });
});

describe("AccessRegistry — author scope from parcel group owners", () => {
  beforeEach(() => {
    AccessApi._resetRegistryRefForReload();
    ParcelApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    AccessApi._resetRegistryRefForReload();
    ParcelApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  it("folds a parcel's group owner into the author scope (repointed off parcels, not zone data)", async () => {
    // Ownership now lives in the `parcels` collection (property 0a), not on
    // the zone template. A parcel owned by the managed `testarea` group:
    // `ensureAuthorGroups` → `ParcelApi.groupOwnerRefs` mints-or-finds it.
    installInMemoryStore([
      {
        extent: "/lib/testarea",
        zonePath: "/lib/testarea",
        owner: { kind: "group", name: "testarea" },
        parentParcel: null,
      },
    ]);
    await bootRegistry();
    await bootParcelRegistry();

    const player = makeAvatar("dana");
    // First read mints the `testarea` group (empty) and folds it into the
    // author scope; dana isn't a member yet.
    expect(await AccessApi.isAuthor(player)).toBe(false);

    const reg = await GroupApi.registry();
    const group = await reg.managed().findByName("testarea");
    expect(group).not.toBeNull(); // minted by the owner-ref resolution
    group!.addMember("/obj/Avatar/dana");
    await group!.save();

    // Now a member of the resolved owner group is an author of that area.
    expect(await AccessApi.isAuthor(player)).toBe(true);
  });
});

/**
 * ⭐⭐ **The Prime Minister is always a wizard and an archwizard, and it
 * is DERIVED.**
 *
 * The world ships with no wizards and no seeded operator identities.
 * There is exactly one credential anywhere in the system — the
 * founder's provider id, read by `OfficeRegistry` — and all it does is
 * make the founder the default HOLDER of the offices until somebody is
 * seated explicitly. Everything downstream is playerIds.
 *
 * ⚠⚠ Derived rather than stored is the property under test. A stored
 * grant survives the handoff that was supposed to end it: hand the
 * office on and the old holder silently keeps code trust, because a
 * group row outlives the seat.
 */
describe("the Prime Minister backstop", () => {
  beforeEach(() => {
    delete process.env[ENV_KEY];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("⚠ keys on an office that actually exists", () => {
    // The registry names the seat as a string literal. If the
    // governance vocabulary renames it, the backstop would point at
    // nothing and silently confer nothing at all.
    expect(Office.byKey("prime-minister")).toBeTruthy();
  });

  it("makes the office-holder a wizard AND an archwizard", async () => {
    installInMemoryStore();
    await bootRegistry();
    const pm = makeAvatar("pm");
    vi.spyOn(CompactApi, "holdsOffice").mockImplementation(
      async (_subject, key) => key === "prime-minister",
    );

    expect(await AccessApi.isWizard(pm)).toBe(true);
    expect(await AccessApi.isArchwizard(pm)).toBe(true);
  });

  it("⚠⚠ confers nothing on somebody who does not hold it", async () => {
    installInMemoryStore();
    await bootRegistry();
    const other = makeAvatar("other");
    vi.spyOn(CompactApi, "holdsOffice").mockResolvedValue(false);

    expect(await AccessApi.isWizard(other)).toBe(false);
    expect(await AccessApi.isArchwizard(other)).toBe(false);
  });

  it("⭐ follows the seat — asked every time, never stored", async () => {
    /*
     * The whole reason it is derived. A stored grant would leave the
     * old holder with code trust after the office moved on.
     */
    installInMemoryStore();
    await bootRegistry();
    const holder = makeAvatar("holder");
    let seated = true;
    vi.spyOn(CompactApi, "holdsOffice").mockImplementation(async () => seated);

    expect(await AccessApi.isWizard(holder)).toBe(true);
    seated = false; // the seat is handed on
    expect(await AccessApi.isWizard(holder)).toBe(false);
  });

  it("⚠ fails closed when the governance substrate is not up", async () => {
    // A backstop layered on top of the ordinary group answer must not
    // turn a plain "no" into a throw at a security gate.
    installInMemoryStore();
    await bootRegistry();
    const someone = makeAvatar("someone");
    vi.spyOn(CompactApi, "holdsOffice").mockRejectedValue(
      new Error("governance not up"),
    );

    expect(await AccessApi.isWizard(someone)).toBe(false);
  });

  it("⚠ an explicit wizard needs no office read at all", async () => {
    // The group cache is consulted FIRST, so the backstop costs an
    // ordinary wizard nothing.
    installInMemoryStore();
    await bootRegistry();
    const reg = await GroupApi.registry();
    const wizards = await reg.managed().findByName("wizards");
    wizards!.addMember("/obj/Avatar/plain");
    await wizards!.save();
    if (wizards!._id) reg.managed().fireChange(wizards!._id);

    const holdsOffice = vi.spyOn(CompactApi, "holdsOffice");
    const plain = makeAvatar("plain");

    expect(await AccessApi.isWizard(plain)).toBe(true);
    expect(holdsOffice).not.toHaveBeenCalled();
  });
});
