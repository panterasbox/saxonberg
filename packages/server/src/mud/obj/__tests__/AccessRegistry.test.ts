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

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import AccessRegistry from "../AccessRegistry";
import GroupRegistry from "../GroupRegistry";
import Avatar from "../Avatar";
import { AccessApi } from "../../api/access";
import { GroupApi } from "../../api/group";
import { StuffApi } from "../../api/stuff";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../lib/security/__tests__/test-setup";

interface Doc extends Record<string, unknown> {
  _id?: string;
  path?: string;
  name?: string;
  class?: string;
  data?: Record<string, unknown>;
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
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save,
    find,
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
    wizards!.addMember("alice");
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
    expect(wizards!.memberIds.sort()).toEqual(["p1", "p2"]);

    // A second boot against the already-seeded group is a no-op (no
    // duplicates, members intact).
    AccessApi._resetRegistryRefForReload();
    StuffApi.clearAll();
    await bootRegistry();
    const reg2 = await GroupApi.registry();
    wizards = await reg2.managed().findByName("wizards");
    expect(wizards!.memberIds.sort()).toEqual(["p1", "p2"]);
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
        memberIds: ["legacy-a", "legacy-b"],
        memberRoles: ["member", "member"],
      },
    ]);
    const legacyId = store[0]!._id;

    await bootRegistry();

    const reg = await GroupApi.registry();
    const wizards = await reg.managed().findByName("wizards");
    expect(wizards).not.toBeNull();
    expect(wizards!._id).toBe(legacyId); // same doc, renamed forward
    expect(wizards!.memberIds.sort()).toEqual(["legacy-a", "legacy-b"]);

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
        memberIds: ["legacy-a"],
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
    expect(wizards!.memberIds).toEqual(["legacy-a"]);
    expect(await reg.managed().findByName("developers")).toBeNull();
  });
});
