/**
 * `GroupApi.ensureGroup` / `ensureMember` — the content installer's group
 * seams (content-packs wave 3). `ensureGroup` mints once and FINDS on the
 * second call (adopt-by-name, never re-owned); `ensureMember` is
 * idempotent and fires the provider change; it is refused from any caller
 * outside the installer's chain.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import GroupRegistry from "../../GroupRegistry";
import { GroupApi } from "../../../api/group";
import { StuffApi } from "../../../api/stuff";
import { Group } from "../../../lib/social/Group";
import { SecurityError } from "../../../lib/security/errors";
import { ProxyApi } from "../../../api/proxy";
import { GroupLogic } from "../GroupLogic";
import { ManagedGroupProvider } from "../../../lib/social/providers/ManagedGroupProvider";
import type { Stuff } from "../../../lib/stuff/Stuff";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../../lib/security/__tests__/test-setup";

type Doc = Record<string, unknown> & { _id?: string };

let store: Doc[];

function installStore(): void {
  store = [];
  let seq = 0;
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save: vi.fn(async (_c: string, doc: Doc) => {
      const id = doc._id ?? `g-${++seq}`;
      const i = store.findIndex((d) => d._id === id);
      if (i >= 0) store[i] = { ...doc, _id: id };
      else store.push({ ...doc, _id: id });
      return id;
    }),
    find: vi.fn(async (_c: string, q: Doc) =>
      store.filter((d) => Object.entries(q).every(([k, v]) => d[k] === v)),
    ),
    findById: vi.fn(async (_c: string, id: string) => store.find((d) => d._id === id) ?? null),
    isConnected: () => true,
  } as unknown as PersistenceManager);
}

async function boot(): Promise<GroupRegistry> {
  const reg = makeStuffAtPath(() => new GroupRegistry(), "/obj/GroupRegistry");
  await reg.postRegister();
  return reg;
}

/**
 * The raw (ungated) GroupLogic singleton — the installer-only gate lives
 * on `GroupApi.ensureMember`, so the positive path is exercised on the
 * logic beneath it (the `WikiRegistry.test` `raw()` idiom); the negative
 * path is asserted through the Api.
 */
function rawLogic(): GroupLogic {
  const logic = StuffApi.singletonSync("/obj/api/group", () => new GroupLogic());
  return ProxyApi.unwrap(logic as unknown as Stuff) as unknown as GroupLogic;
}

beforeEach(() => {
  StuffApi.clearAll();
  installStore();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("GroupApi.ensureGroup", () => {
  it("mints once with the given owner, then finds by name without re-owning", async () => {
    await boot();
    const first = await GroupApi.ensureGroup("soul", { kind: "office", office: "prime-minister" });
    expect(first.created).toBe(true);
    expect(first.ref).toMatch(/^managed:/);
    const second = await GroupApi.ensureGroup("soul", { kind: "system" });
    expect(second).toEqual({ ref: first.ref, created: false });
    const rows = await Group.find<Group>({ name: "soul" });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.owner).toEqual({ kind: "office", office: "prime-minister" });
    expect(rows[0]!.memberIds).toEqual([]);
  });

  it("refuses an empty name", async () => {
    await boot();
    await expect(GroupApi.ensureGroup("  ", { kind: "system" })).rejects.toThrow(/needs a name/);
  });
});

describe("GroupApi.ensureMember", () => {
  it("is refused from a non-installer caller", async () => {
    await boot();
    const { ref } = await GroupApi.ensureGroup("duncan-hall", { kind: "system" });
    // The gate throws synchronously at the Api boundary.
    expect(() =>
      GroupApi.ensureMember(ref, "/domain/eternal/duncan-hall/npc/katie", "member"),
    ).toThrow(SecurityError);
  });

  it("adds once, fires the change, and is a no-op the second time", async () => {
    await boot();
    const { ref } = await GroupApi.ensureGroup("duncan-hall", { kind: "system" });
    // The logic's registry ref is module-cached across tests, so spy on
    // the provider class rather than one registry's instance.
    const fire = vi.spyOn(ManagedGroupProvider.prototype, "fireChange");
    const added = await rawLogic().ensureMember(ref, "/domain/eternal/duncan-hall/npc/katie", "member");
    expect(added).toBe(true);
    expect(fire).toHaveBeenCalledTimes(1);
    const again = await rawLogic().ensureMember(ref, "/domain/eternal/duncan-hall/npc/katie", "member");
    expect(again).toBe(false);
    expect(fire).toHaveBeenCalledTimes(1);
    expect(await GroupApi.isMember("/domain/eternal/duncan-hall/npc/katie", ref)).toBe(true);
    expect(await GroupApi.roleOf("/domain/eternal/duncan-hall/npc/katie", ref)).toBe("member");
  });

  it("false for an unknown group; throws for a non-managed ref", async () => {
    await boot();
    expect(await rawLogic().ensureMember("managed:nope", "/x", "member")).toBe(false);
    await expect(rawLogic().ensureMember("adhoc:1", "/x", "member")).rejects.toThrow(/not a managed group/);
  });
});
