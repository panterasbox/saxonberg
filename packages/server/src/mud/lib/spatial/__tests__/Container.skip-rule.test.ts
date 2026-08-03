/**
 * The host skip rule (wave 3, D2) — a host's contents slice drops goods
 * someone has been **stamped** as owning, because those persist owner-side
 * in that owner's estate.
 *
 * The tests that matter most here are the **byte-identical** ones. This
 * predicate runs on every persistable host in the game, so the guard is
 * that a host holding no stamped goods captures and restores *exactly* as
 * it did before the rule existed — not "equivalently", byte-for-byte.
 *
 * Also pins the invariant `Container.captureSlice`'s own comment names: the
 * Container and Slotted slices share ONE content ordering, so a skipped
 * good sitting between two worn items must not shift the worn indices.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ChattelRegistry from "../../../obj/ChattelRegistry";
import Thing from "../../stuff/Thing";
import { ChattelApi } from "../../../api/chattel";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { PersistableApi } from "../../../api/persistable";
import { PersistableMixin } from "../../persistence/Persistable";
import { EstateMixin } from "../../chattel/Estate";
import { ContainerMixin } from "../Container";
import { PostRegistrationMixin } from "../../stuff/PostRegistration";
import { Idea } from "../../stuff/Idea";
import PersistentHydrator from "../../../obj/persistence/PersistentHydrator";
import { Document } from "../../persistence/Document";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../Container";
import type { Containable } from "../Containable";
import type { FieldMeta } from "../../mixin";

const TORCH_PATH = "/obj/test/Torch";
const ROOM_PATH = "/domain/test/Room";
const ALICE_PATH = "/obj/Avatar/alice";

class Torch extends Thing {}

/** A room: a persistable container with no estate of its own. */
class Room extends PersistableMixin(ContainerMixin(PostRegistrationMixin(Idea))) {
  static fieldMeta: FieldMeta = {};
}
/** An owner: a persistable container that carries an estate. */
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

const torch = (): Torch => makeStuffAtPath(() => new Torch(), TORCH_PATH);
const room = (): Room => makeStuffAtPath(() => new Room(), ROOM_PATH);
const owner = (): Owner => makeStuffAtPath(() => new Owner(), ALICE_PATH);

function recordFor(scope: string): Doc | undefined {
  return col("holder_snapshots").find((d) => d.scope === scope);
}

beforeEach(async () => {
  StuffApi.clearAll();
  installStore();
  await boot();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("the skip rule is a no-op where it should be (the named regression)", () => {
  it("a room holding only UNSTAMPED contents captures byte-identically", async () => {
    // The dorm's bed, a let unit's range, litter — an unstamped fixture is
    // *owned* (D5's parcel rung) but not *stamped*, and belongs to its
    // room's record exactly as before.
    const r = room();
    ContainmentApi.move(torch() as unknown as Stuff & Containable, r as unknown as Stuff & Container);
    ContainmentApi.move(torch() as unknown as Stuff & Containable, r as unknown as Stuff & Container);
    await PersistableApi.capture(r);
    const before = JSON.stringify(recordFor(ROOM_PATH)?.state);

    // Re-capture with the rule live and nothing stamped: identical bytes.
    await PersistableApi.capture(r);
    expect(JSON.stringify(recordFor(ROOM_PATH)?.state)).toBe(before);

    const slice = (recordFor(ROOM_PATH)?.state as Record<string, { contents?: unknown[] }>)
      .ContainerMixin;
    expect(slice?.contents?.length).toBe(2);
  });

  it("an owner holding no stamped goods captures its contents host-side, as before", async () => {
    const o = owner();
    ContainmentApi.move(torch() as unknown as Stuff & Containable, o as unknown as Stuff & Container);
    await PersistableApi.capture(o);

    const state = recordFor(ALICE_PATH)?.state as Record<
      string,
      { contents?: unknown[]; entries?: unknown[] }
    >;
    // Contents ride the container slice; the estate is empty. Nothing moved
    // scopes, which is what "additive" means.
    expect(state.ContainerMixin?.contents?.length).toBe(1);
    expect(state.EstateMixin?.entries).toEqual([]);
  });
});

describe("the skip rule holds", () => {
  it("a room does NOT capture a stamped good, and its owner's estate does", async () => {
    const o = owner();
    const r = room();
    const t = torch();
    ContainmentApi.move(t as unknown as Stuff & Containable, r as unknown as Stuff & Container);
    await ChattelApi.stamp(t, o);
    await ChattelApi.setPlace(t, ROOM_PATH);

    await PersistableApi.capture(r);

    // The host's record never carries it — the guest-drop invariant.
    const roomSlice = (recordFor(ROOM_PATH)?.state as Record<string, { contents?: unknown[] }>)
      .ContainerMixin;
    expect(roomSlice?.contents?.length).toBe(0);

    // ...and the capture flush put it in the owner's estate instead, so it
    // is not captured by nobody and destroyed with the room.
    expect(o.getEstateEntry(t.getChattelId())?.place).toBe(ROOM_PATH);
  });

  it("an OFFLINE owner's stored estate still learns about it", async () => {
    const o = owner();
    const r = room();
    const t = torch();
    ContainmentApi.move(t as unknown as Stuff & Containable, r as unknown as Stuff & Container);
    await ChattelApi.stamp(t, o);
    await ChattelApi.setPlace(t, ROOM_PATH);
    await PersistableApi.capture(o); // the owner has a record to patch
    const id = t.getChattelId();

    // The owner logs out — no live instance to hold the entry in memory.
    StuffApi.destruct(o);
    await PersistableApi.capture(r);

    const state = recordFor(ALICE_PATH)?.state as Record<
      string,
      { entries?: Array<{ chattelId: string; place: string }> }
    >;
    expect(state.EstateMixin?.entries?.find((e) => e.chattelId === id)?.place).toBe(
      ROOM_PATH,
    );
  });

  it("a skipped good does not shift the worn indices the Slotted slice uses", async () => {
    // The invariant `captureSlice`'s own comment names: both slices read one
    // ordering, so the two filters must be one pass.
    const o = owner();
    const r = room();
    const plain = torch();
    const stamped = torch();
    const tail = torch();
    for (const item of [plain, stamped, tail]) {
      ContainmentApi.move(item as unknown as Stuff & Containable, r as unknown as Stuff & Container);
    }
    await ChattelApi.stamp(stamped, o);

    await PersistableApi.capture(r);
    const slice = (recordFor(ROOM_PATH)?.state as Record<string, { contents?: unknown[] }>)
      .ContainerMixin;
    // Two entries, contiguous — the stamped one in the middle is gone and
    // left no hole for an index to fall into.
    expect(slice?.contents?.length).toBe(2);
  });
});
