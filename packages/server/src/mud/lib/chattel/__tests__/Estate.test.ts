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

import "../../../../test-bootstrap";
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
import PersistentHydrator from "../../../obj/persistence/PersistentHydrator";
import { Document } from "../../persistence/Document";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import { ESTATE_INVENTORY, ESTATE_STORAGE } from "../../persistence/PersistenceSlice";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import type { FieldMeta } from "../../mixin";

const TORCH_PATH = "/obj/test/Torch";
const ALICE_PATH = "/obj/Avatar/alice";
const ROOM_ID = "/domain/test/LivingRoom";

class Torch extends Thing {}

/** An owner: a persistable container that carries an estate (Avatar's shape). */
class Owner extends PersistableMixin(
  EstateMixin(ContainerMixin(PostRegistrationMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {};
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

describe("eviction to storage — the lease-end sweep (D9)", () => {
  const UNIT = "/domain/test/unit-4b";

  it("returns every good under the unit to storage, intact and titled", async () => {
    const alice = makeOwner();
    const a = makeTorch();
    const b = makeTorch();
    await ChattelApi.stamp(a, alice);
    await ChattelApi.stamp(b, alice);
    await ChattelApi.setPlace(a, `${UNIT}/bedroom`);
    await ChattelApi.setPlace(b, `${UNIT}/kitchen`);

    const evicted = await ChattelApi.evictToStorage(UNIT);
    expect(evicted).toBe(2);

    // Intact, titled, recoverable — never destructed. A good that is titled
    // to somebody survives the end of their tenancy; moving house is
    // re-placing from storage rather than starting over.
    expect(a.getPlace()).toBe(ESTATE_STORAGE);
    expect(b.getPlace()).toBe(ESTATE_STORAGE);
    expect(a.isDestroyed()).toBe(false);
    expect(await ChattelApi.ownerOf(a)).toEqual({
      kind: "player",
      templatePath: ALICE_PATH,
    });
    // ...and the owner's estate agrees, so the next capture cannot write
    // the old placement straight back over the eviction.
    expect(alice.getEstateEntry(a.getChattelId())?.place).toBe(ESTATE_STORAGE);
  });

  it("leaves goods outside the unit alone", async () => {
    const alice = makeOwner();
    const inside = makeTorch();
    const elsewhere = makeTorch();
    await ChattelApi.stamp(inside, alice);
    await ChattelApi.stamp(elsewhere, alice);
    await ChattelApi.setPlace(inside, `${UNIT}/bedroom`);
    await ChattelApi.setPlace(elsewhere, "/domain/test/other-room");

    expect(await ChattelApi.evictToStorage(UNIT)).toBe(1);
    expect(elsewhere.getPlace()).toBe("/domain/test/other-room");
  });

  it("re-placing from storage furnishes the next address", async () => {
    const alice = makeOwner();
    const t = makeTorch();
    await ChattelApi.stamp(t, alice);
    await ChattelApi.setPlace(t, `${UNIT}/bedroom`);
    await ChattelApi.evictToStorage(UNIT);

    await ChattelApi.setPlace(t, "/domain/test/unit-9c/bedroom");
    expect(t.getPlace()).toBe("/domain/test/unit-9c/bedroom");
    const placed = await ChattelApi.placedIn("/domain/test/unit-9c/bedroom");
    expect(placed.map((p) => p.chattelId)).toEqual([t.getChattelId()]);
  });
});

describe("release drops the owner's estate entry — the resurrection bug", () => {
  /**
   * Releasing a title used to GC the durable row and the index entry and
   * stop there, leaving the owner holding an estate entry for a good that
   * no longer existed. `captureSlice` finds such an entry not-live and
   * carries it forward verbatim (correct for a merely *unloaded* good —
   * see "an entry whose good is not live is carried forward verbatim"
   * above, which is the counter-case this fix must not break), so the dead
   * good landed in the durable slice and `restoreSlice` re-minted it.
   * `Estate._dropEstateEntry` existed for precisely this and had zero
   * callers anywhere in the tree.
   */

  /**
   * `ChattelMixin.onDestruct` releases through a fire-and-forget dynamic
   * `import()`, so `destruct` returns before the title is gone. Two
   * macrotask ticks settle the import + the release chain. (Eventual
   * consistency is fine in production — capture happens far later — but a
   * test that asserts synchronously would just be testing the scheduler.)
   */
  async function flushRelease(): Promise<void> {
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  }

  it("a destroyed good does not come back on the next load", async () => {
    const torch = makeTorch();
    const alice = makeOwner();
    await ChattelApi.stamp(torch, alice);
    await ChattelApi.setPlace(torch, ESTATE_INVENTORY);
    const chattelId = torch.getChattelId();
    expect(alice.getEstateEntry(chattelId)).not.toBeNull();

    // Consume it.
    await StuffApi.destruct(torch);
    await flushRelease();

    // The entry is gone from the live estate...
    expect(alice.getEstateEntry(chattelId)).toBeNull();

    // ...so it cannot reach the durable slice, and nothing re-mints it.
    await PersistableApi.capture(alice);
    StuffApi.clearAll();
    await boot();
    const fresh = makeOwner();
    await PersistableApi.materialize(fresh);
    expect(fresh.getEstateEntry(chattelId)).toBeNull();
    expect(
      (fresh as unknown as Container)
        .getContents()
        .some((c) => (c as Stuff).getTemplatePath() === TORCH_PATH),
    ).toBe(false);
  });

  it("the title row and the estate entry go together, not one or the other", async () => {
    // Both halves of a release. Asserting both keeps a future change that
    // drops only the row from silently re-opening this.
    const torch = makeTorch();
    const alice = makeOwner();
    await ChattelApi.stamp(torch, alice);
    // The estate entry is written by `setPlace`, NOT by `stamp` — without
    // this the estate assertion below passes on a world where the entry
    // never existed, which is how the first draft of this test went green
    // against the unfixed code.
    await ChattelApi.setPlace(torch, ESTATE_INVENTORY);
    const chattelId = torch.getChattelId();
    // Guard the assertions below against being vacuous: both halves must
    // exist before a release can be shown to remove them.
    expect(col("chattel").find((d) => d.chattelId === chattelId)).toBeDefined();
    expect(alice.getEstateEntry(chattelId)).not.toBeNull();

    await StuffApi.destruct(torch);
    await flushRelease();

    expect(col("chattel").find((d) => d.chattelId === chattelId)).toBeUndefined();
    expect(alice.getEstateEntry(chattelId)).toBeNull();
  });
});
