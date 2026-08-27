/**
 * `AccessApi.canAtPath` (content-packs wave 2, D11): the path-targeted
 * title check the document store gates on. The covering owner comes
 * from `ParcelApi.ownerOf` (rung 1 a parcel, rung 2 the self-home, else
 * untitled → nobody) and the owner's `can()` dispatch decides — no zone step. Null subjects and NPCs fail closed.
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
      path.startsWith("/world/mine/")
        ? ({ kind: "group", name: "mine" } as never)
        : ({ kind: "group", name: "theirs" } as never),
    );
    vi.spyOn(ParcelApi, "resolveOwnerRef").mockImplementation(
      async (o) => `managed:${String((o as { name?: string }).name)}`,
    );
    vi.spyOn(GroupApi, "isMember").mockImplementation(
      async (_key: string, ref: string) => ref === "managed:mine",
    );
    expect(await AccessApi.canAtPath(alice, "write-document", "/world/mine/x")).toBe(true);
    expect(await AccessApi.canAtPath(alice, "write-document", "/world/theirs/x")).toBe(false);
    expect(ParcelApi.ownerOf).toHaveBeenCalledWith("/world/mine/x");
  });

  it("/home/<self>/x → true via rung 2 (the player owner identity match)", async () => {
    await bootRegistry();
    const alice = makeAvatar("alice");
    // The real rung-2 resolution: an untitled /home/<key>/… resolves to the
    // player owner /home/<key>; nothing else is stubbed.
    expect(await AccessApi.canAtPath(alice, "write-document", "/home/alice/scripts/a")).toBe(true);
    expect(await AccessApi.canAtPath(alice, "write-document", "/home/bob/scripts/a")).toBe(false);
  });

  it("an untitled path admits nobody — there is no state default (content-packs wave 3)", async () => {
    await bootRegistry();
    const alice = makeAvatar("alice");
    vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue(null);
    const bob = makeAvatar("bob");
    expect(await AccessApi.canAtPath(alice, "write-document", "/emotes/grin")).toBe(false);
    expect(await AccessApi.canAtPath(bob, "write-document", "/emotes/grin")).toBe(false);
  });

  it("a null subject and an NPC fail closed", async () => {
    await bootRegistry();
    expect(await AccessApi.canAtPath(null, "write-document", "/emotes/grin")).toBe(false);
    const npc = makeStuffAtPath(() => new Idea(), "/obj/NPC/x") as unknown as Stuff;
    expect(await AccessApi.canAtPath(npc, "write-document", "/emotes/grin")).toBe(false);
  });
});
