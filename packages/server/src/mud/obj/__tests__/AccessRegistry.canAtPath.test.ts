/**
 * `AccessApi.canAtPath` (content-packs wave 2, D11): the path-targeted
 * title check the document store gates on. The covering owner comes
 * from `ParcelApi.ownerOf` (rung 1 a parcel, rung 2 the self-home, rung
 * 3 the state) and the owner's `can()` dispatch decides — no zone step,
 * no `core` literal. Null subjects and NPCs fail closed.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import AccessRegistry from "../AccessRegistry";
import GroupRegistry from "../GroupRegistry";
import Avatar from "../Avatar";
import { Idea } from "../../lib/stuff/Idea";
import { AccessApi } from "../../api/access";
import { ParcelApi } from "../../api/parcel";
import { GroupApi } from "../../api/group";
import { StuffApi } from "../../api/stuff";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../lib/security/__tests__/test-setup";
import type { Stuff } from "../../lib/stuff/Stuff";

type Doc = Record<string, unknown> & { _id?: string };

function installInMemoryStore(): void {
  const store: Doc[] = [];
  let seq = 0;
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save: vi.fn(async (_c: string, doc: Doc) => {
      const id = doc._id ?? `id-${++seq}`;
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

async function bootRegistry(): Promise<AccessRegistry> {
  const groups = makeStuffAtPath(() => new GroupRegistry(), "/obj/GroupRegistry");
  await groups.postRegister();
  const reg = makeStuffAtPath(() => new AccessRegistry(), "/obj/AccessRegistry");
  await reg.postRegister();
  return reg;
}

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

beforeEach(() => {
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
  installInMemoryStore();
});
afterEach(() => {
  vi.restoreAllMocks();
  AccessApi._resetRegistryRefForReload();
  StuffApi.clearAll();
});

describe("AccessApi.canAtPath", () => {
  it("a path under a parcel the actor's group holds → true; another group's → false", async () => {
    await bootRegistry();
    const alice = makeAvatar("alice");
    vi.spyOn(ParcelApi, "ownerOf").mockImplementation(async (path: string) =>
      path.startsWith("/domain/mine/")
        ? ({ kind: "group", name: "mine" } as never)
        : ({ kind: "group", name: "theirs" } as never),
    );
    vi.spyOn(ParcelApi, "resolveOwnerRef").mockImplementation(
      async (o) => `managed:${String((o as { name?: string }).name)}`,
    );
    vi.spyOn(GroupApi, "isMember").mockImplementation(
      async (_key: string, ref: string) => ref === "managed:mine",
    );
    expect(await AccessApi.canAtPath(alice, "write-document", "/domain/mine/x")).toBe(true);
    expect(await AccessApi.canAtPath(alice, "write-document", "/domain/theirs/x")).toBe(false);
    expect(ParcelApi.ownerOf).toHaveBeenCalledWith("/domain/mine/x");
  });

  it("/home/<self>/x → true via rung 2 (the player owner identity match)", async () => {
    await bootRegistry();
    const alice = makeAvatar("alice");
    // The real rung-2 resolution: an untitled /home/<key>/… resolves to the
    // player owner /home/<key>; nothing else is stubbed.
    expect(await AccessApi.canAtPath(alice, "write-document", "/home/alice/scripts/a")).toBe(true);
    expect(await AccessApi.canAtPath(alice, "write-document", "/home/bob/scripts/a")).toBe(false);
  });

  it("an untitled path → the state group's membership decides", async () => {
    await bootRegistry();
    const alice = makeAvatar("alice");
    const groups = await GroupApi.registry();
    const core = await groups.managed().findByName("core");
    core!.addMember("/obj/Avatar/alice");
    await core!.save();
    if (core!._id) groups.managed().fireChange(core!._id);
    // Rung 3 of the title chain (no ParcelRegistry stood up here): the
    // state owner, resolved to the real core group's ref.
    vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue({ kind: "group", name: "core" } as never);
    vi.spyOn(ParcelApi, "resolveOwnerRef").mockResolvedValue(`managed:${core!._id}` as never);
    const bob = makeAvatar("bob");
    expect(await AccessApi.canAtPath(alice, "write-document", "/emotes/grin")).toBe(true);
    expect(await AccessApi.canAtPath(bob, "write-document", "/emotes/grin")).toBe(false);
  });

  it("a null subject and an NPC fail closed", async () => {
    await bootRegistry();
    expect(await AccessApi.canAtPath(null, "write-document", "/emotes/grin")).toBe(false);
    const npc = makeStuffAtPath(() => new Idea(), "/obj/NPC/x") as unknown as Stuff;
    expect(await AccessApi.canAtPath(npc, "write-document", "/emotes/grin")).toBe(false);
  });
});
