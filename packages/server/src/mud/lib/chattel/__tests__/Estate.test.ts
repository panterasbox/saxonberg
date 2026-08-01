/**
 * Owner-based persistence — `place` + the estate slice (wave 2, D1/D3).
 *
 * The second persistence scope: an owned good persists with its OWNER,
 * carrying a `place`, rather than with whatever room it is standing in.
 * Proves the D1/D3 acceptance criteria:
 *
 *   - `place` round-trips on the good, is gated (a direct write is refused),
 *     and a glob cannot carry one;
 *   - the `chattel` row's `place` is written by the SAME call — the by-room
 *     index, which is what `placedIn` reads;
 *   - materialize routes on `place`: `inventory` clones into the owner's own
 *     container, `storage` clones **nothing at all**, and a room identity is
 *     left for that room (D4, wave 4);
 *   - an entry whose good is not live is carried forward verbatim, which is
 *     what makes storage survive a capture the owner cannot see it in.
 *
 * Harness: the `ChattelRegistry.test` shape — a generic in-memory
 * `PersistenceManager` over the real documents, with `StuffApi.clone` mocked
 * to fresh fixtures (the clone-pipeline stand-in).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ChattelRegistry from "../../../obj/ChattelRegistry";
import Thing from "../../stuff/Thing";
import { ChattelApi } from "../../../api/chattel";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { PersistableApi } from "../../../api/persistable";
import { PersistableMixin } from "../../persistence/Persistable";
import { EstateMixin } from "../Estate";
import { ContainerMixin } from "../../spatial/Container";
import { PostRegistrationMixin } from "../../stuff/PostRegistration";
import { Idea } from "../../stuff/Idea";
import PersistentHydrator from "../../persistence/PersistentHydrator";
import { Document } from "../../persistence/Document";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import { ESTATE_INVENTORY, ESTATE_STORAGE } from "../../persistence/PersistenceSlice";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";

const TORCH_PATH = "/obj/test/Torch";
const ALICE_PATH = "/obj/Avatar/alice";
const ROOM_ID = "/domain/test/LivingRoom";

class Torch extends Thing {}

/** An owner: a persistable container that carries an estate (Avatar's shape). */
class Owner extends PersistableMixin(
  EstateMixin(ContainerMixin(PostRegistrationMixin(Idea))),
) {
  static persistentFields: string[] = [];
}

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
      return arr.filter((d) => keys.every((k) => d[k] === query[k]));
    },
  );
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

async function boot(): Promise<void> {
  // Thing composes WetMixin's marshalled Quantity gauge; `clearAll()` drops
  // the marshaller singletons, so a re-boot must stand them back up.
  installV1QuantityMarshallers();
  const reg = makeStuffAtPath(() => new ChattelRegistry(), "/obj/ChattelRegistry");
  await reg.postRegister();
  makeStuffAtPath(() => new PersistentHydrator(), PersistentHydrator.templatePath);
  vi.spyOn(StuffApi, "clone").mockImplementation(
    ((path: string) =>
      Promise.resolve(makeStuffAtPath(() => new Torch(), path))) as unknown as
      typeof StuffApi.clone,
  );
}

function makeTorch(): Torch {
  return makeStuffAtPath(() => new Torch(), TORCH_PATH);
}
function makeOwner(): Owner {
  return makeStuffAtPath(() => new Owner(), ALICE_PATH);
}

beforeEach(async () => {
  StuffApi.clearAll();
  installStore();
  await boot();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("owner-based persistence — place", () => {
  it("defaults to storage, and setPlace writes the field AND the row index", async () => {
    const torch = makeTorch();
    const alice = makeOwner();
    await ChattelApi.stamp(torch, alice);

    // Owned-but-unplaced is the default — no warehouse object, no homeless
    // special case.
    expect(torch.getPlace()).toBe(ESTATE_STORAGE);

    await ChattelApi.setPlace(torch, ROOM_ID);

    // One call, both writes: the good's own field round-trips WITH the good,
    // the row is the by-room index a materializing room reads.
    expect(torch.getPlace()).toBe(ROOM_ID);
    const row = col("chattel").find((d) => d.chattelId === torch.getChattelId());
    expect(row?.place).toBe(ROOM_ID);

    const placed = await ChattelApi.placedIn(ROOM_ID);
    expect(placed.map((p) => p.chattelId)).toEqual([torch.getChattelId()]);
  });

  it("the placement setter is gated — a direct write is refused", () => {
    const torch = makeTorch();
    // `_setPlace` is chattel-logic-only, exactly as the id mint is: a place
    // cannot be forged into someone else's residence.
    expect(() => torch._setPlace(ROOM_ID)).toThrow();
    expect(torch.getPlace()).toBe(ESTATE_STORAGE);
  });

  it("a glob carries no place — a fungible stack has nowhere to be kept", async () => {
    const glob = makeTorch();
    vi.spyOn(MixinApi, "isGlobbable").mockImplementation((o) => o === glob);
    await ChattelApi.setPlace(glob, ROOM_ID);
    expect(glob.getPlace()).toBe(ESTATE_STORAGE);
  });

  it("an unstamped good takes no place — nothing owns it, so nothing keeps it", async () => {
    const torch = makeTorch();
    await ChattelApi.setPlace(torch, ROOM_ID);
    expect(col("chattel").length).toBe(0);
  });
});

describe("owner-based persistence — the estate slice", () => {
  it("place=inventory round-trips into the owner's own container", async () => {
    const alice = makeOwner();
    const torch = makeTorch();
    await ChattelApi.stamp(torch, alice);
    await ChattelApi.setPlace(torch, ESTATE_INVENTORY);
    await PersistableApi.capture(alice);

    StuffApi.clearAll();
    await boot();
    const restored = makeOwner();
    await PersistableApi.materialize(restored);

    const contents = (restored as unknown as Container).getContents();
    expect(contents.length).toBe(1);
    expect(MixinApi.isChattel(contents[0] as Stuff)).toBe(true);
  });

  it("place=storage clones NOTHING — the absence of a placement, not a place", async () => {
    const alice = makeOwner();
    const torch = makeTorch();
    await ChattelApi.stamp(torch, alice);
    await ChattelApi.setPlace(torch, ESTATE_STORAGE);
    const id = torch.getChattelId();
    await PersistableApi.capture(alice);

    StuffApi.clearAll();
    await boot();
    const restored = makeOwner();
    await PersistableApi.materialize(restored);

    // Live in the registry and in the record; no presence in the world.
    expect((restored as unknown as Container).getContents().length).toBe(0);
    expect(restored.getEstateEntry(id)).not.toBeNull();
    expect(col("chattel").some((d) => d.chattelId === id)).toBe(true);
  });

  it("a room-placed good is left for the room — the owner mints nothing", async () => {
    const alice = makeOwner();
    const torch = makeTorch();
    await ChattelApi.stamp(torch, alice);
    await ChattelApi.setPlace(torch, ROOM_ID);
    const id = torch.getChattelId();
    await PersistableApi.capture(alice);

    StuffApi.clearAll();
    await boot();
    const restored = makeOwner();
    await PersistableApi.materialize(restored);

    // "My chair is in my living room while I am at work."
    expect((restored as unknown as Container).getContents().length).toBe(0);
    expect(restored.getEstateEntry(id)?.place).toBe(ROOM_ID);
  });

  it("an entry whose good is not live is carried forward verbatim", async () => {
    const alice = makeOwner();
    const torch = makeTorch();
    await ChattelApi.stamp(torch, alice);
    await ChattelApi.setPlace(torch, ROOM_ID);
    const id = torch.getChattelId();
    await PersistableApi.capture(alice);

    StuffApi.clearAll();
    await boot();
    const restored = makeOwner();
    await PersistableApi.materialize(restored);
    // Capture again with nothing live to re-read: the entry must survive,
    // because the host has nothing newer to say about it. This is the case
    // that would silently drop a stored good if capture guessed instead.
    await PersistableApi.capture(restored);

    StuffApi.clearAll();
    await boot();
    const again = makeOwner();
    await PersistableApi.materialize(again);
    expect(again.getEstateEntry(id)?.place).toBe(ROOM_ID);
  });

  it("an owner with no stamped goods emits an empty estate — the no-op case", async () => {
    const alice = makeOwner();
    await PersistableApi.capture(alice);
    const rec = col("holder_snapshots").find((d) => d.scope === ALICE_PATH);
    const state = rec?.state as Record<string, { entries?: unknown[] }>;
    expect(state?.EstateMixin?.entries).toEqual([]);
  });
});
