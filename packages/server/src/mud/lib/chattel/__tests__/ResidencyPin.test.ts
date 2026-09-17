/**
 * The residency **pin** — the load half of residency (pets build, D22).
 *
 * A good whose class opts in (`pinsResidency`) and that persists itself
 * records `pin: {scope, key}` on its `chattel` row at every `place` write;
 * the `ResidencyWarden` stands every pinned good back up once at boot;
 * an owner arriving stands its own keyed goods up (and finds them already
 * standing when the roll got there first). Proves:
 *
 *   - the pin rides the SAME write as `place`, and only when three things
 *     are true — the class opts in, the good persists itself, it has an
 *     explicit key — and never for a good kept in storage or inventory;
 *   - `ChattelApi.pinned()` is exactly the pinned set (the partial index's
 *     own predicate);
 *   - the roll stands each pin up by `(scope, key)`, counts, and a pin whose
 *     place cannot resolve is logged and skipped rather than fatal;
 *   - ⭐ an owner's login RESOLVES a keyed room-placed entry to the live
 *     instance rather than minting a second one — the two-cats guard from
 *     the owner's side.
 *
 * Harness: the `Estate.test` shape — a generic in-memory store over the
 * real documents, `StuffApi.clone` mocked per path.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ChattelRegistry from "../../../platform/idea/ChattelRegistry";
import Thing from "../../stuff/Thing";
import { ChattelApi } from "../../../api/chattel";
import { ResidencyApi } from "../../../api/residency";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { PersistableApi } from "../../../api/persistable";
import { PersistableMixin } from "../../persistence/Persistable";
import { ChattelMixin } from "../Chattel";
import { EstateMixin } from "../Estate";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { ContainmentApi } from "../../../api/containment";
import { PersistedRecord } from "../../persistence/PersistedRecord";
import { PostRegistrationMixin } from "../../stuff/PostRegistration";
import { Idea } from "../../stuff/Idea";
import PersistentHydrator from "../../../platform/idea/persistence/PersistentHydrator";
import { Document } from "../../persistence/Document";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import {
  ESTATE_INVENTORY,
  ESTATE_STORAGE,
} from "../../persistence/PersistenceSlice";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import type { FieldMeta } from "../../mixin";

const TORCH_PATH = "/obj/test/Torch";
const PET_PATH = "/obj/test/Pet";
const ALICE_PATH = "/platform/agent/Avatar/alice";
const LANE_ID = "/test/world/Lane";

class Torch extends Thing {}

/** A good that persists ITSELF and pins — the named-animal shape. */
class Pet extends PersistableMixin(
  ChattelMixin(ContainableMixin(PostRegistrationMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {};
  public override pinsResidency(): boolean {
    return true;
  }
}

/** A self-persisting good that does NOT opt in. */
class Heirloom extends PersistableMixin(
  ChattelMixin(ContainableMixin(PostRegistrationMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {};
}

/** A room that persists ITSELF — a bedroom, a leased unit. */
class PersistentRoom extends PersistableMixin(
  ContainerMixin(PostRegistrationMixin(Idea)),
) {
  static fieldMeta: FieldMeta = {};
}

/** A room that does not — a public lane. */
class PlainRoom extends ContainerMixin(Idea) {}

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

/** A dotted-path read, enough for `pin.key`. */
function at(doc: Doc, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | null)?.[k], doc);
}

function matches(doc: Doc, key: string, want: unknown): boolean {
  if (
    want !== null &&
    typeof want === "object" &&
    "$exists" in (want as Record<string, unknown>)
  ) {
    const present = at(doc, key) !== undefined && at(doc, key) !== null;
    return present === (want as { $exists: boolean }).$exists;
  }
  return at(doc, key) === want;
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
      return arr.filter((d) => keys.every((k) => matches(d, k, query[k])));
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

const factories: Record<string, () => Stuff> = {
  [TORCH_PATH]: () => new Torch(),
  [PET_PATH]: () => new Pet(),
};

async function boot(): Promise<void> {
  installV1QuantityMarshallers();
  const reg = makeStuffAtPath(
    () => new ChattelRegistry(),
    "/platform/idea/ChattelRegistry",
  );
  await reg.postRegister();
  makeStuffAtPath(() => new PersistentHydrator(), PersistentHydrator.templatePath);
  vi.spyOn(StuffApi, "clone").mockImplementation(((path: string) => {
    const factory = factories[path];
    if (!factory) throw new Error(`no clone factory for ${path}`);
    return Promise.resolve(makeStuffAtPath(factory, path));
  }) as unknown as typeof StuffApi.clone);
}

function makeOwner(): Owner {
  return makeStuffAtPath(() => new Owner(), ALICE_PATH);
}

function rowFor(chattelId: string): Doc | undefined {
  return col("chattel").find((d) => d.chattelId === chattelId);
}

beforeEach(async () => {
  StuffApi.clearAll();
  installStore();
  await boot();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("the pin rides the place write", () => {
  it("a keyed, opted-in good placed in a room is pinned on its row", async () => {
    const alice = makeOwner();
    const pet = makeStuffAtPath(() => new Pet(), PET_PATH);
    await pet.stampChattel(alice);
    pet.setPersistenceKey("k-mouse", true);
    await pet.setChattelPlace(LANE_ID);

    expect(rowFor(pet.getChattelId())?.pin).toEqual({
      scope: PET_PATH,
      key: "k-mouse",
    });
  });

  it("a good carried as state (a torch) is never pinned", async () => {
    const alice = makeOwner();
    const torch = makeStuffAtPath(() => new Torch(), TORCH_PATH);
    await torch.stampChattel(alice);
    await torch.setChattelPlace(LANE_ID);
    expect(rowFor(torch.getChattelId())?.pin).toBeNull();
  });

  it("a self-persisting good that does not opt in is not pinned", async () => {
    const alice = makeOwner();
    const clock = makeStuffAtPath(() => new Heirloom(), "/obj/test/Heirloom");
    await clock.stampChattel(alice);
    clock.setPersistenceKey("k-clock", true);
    await clock.setChattelPlace(LANE_ID);
    expect(rowFor(clock.getChattelId())?.pin).toBeNull();
  });

  it("no explicit key, no pin — there is nothing to stand it up by", async () => {
    const alice = makeOwner();
    const pet = makeStuffAtPath(() => new Pet(), PET_PATH);
    await pet.stampChattel(alice);
    await pet.setChattelPlace(LANE_ID);
    expect(rowFor(pet.getChattelId())?.pin).toBeNull();
  });

  it("storage and inventory clear the pin — the good stands nowhere", async () => {
    const alice = makeOwner();
    const pet = makeStuffAtPath(() => new Pet(), PET_PATH);
    await pet.stampChattel(alice);
    pet.setPersistenceKey("k-mouse", true);
    await pet.setChattelPlace(LANE_ID);
    expect(rowFor(pet.getChattelId())?.pin).not.toBeNull();

    await pet.setChattelPlace(ESTATE_INVENTORY);
    expect(rowFor(pet.getChattelId())?.pin).toBeNull();

    await pet.setChattelPlace(LANE_ID);
    await ChattelApi.evictToStorage("/test/world/");
    expect(rowFor(pet.getChattelId())?.place).toBe(ESTATE_STORAGE);
    expect(rowFor(pet.getChattelId())?.pin).toBeNull();
  });
});

describe("the roll", () => {
  it("`pinned()` is exactly the pinned set", async () => {
    const alice = makeOwner();
    const pet = makeStuffAtPath(() => new Pet(), PET_PATH);
    await pet.stampChattel(alice);
    pet.setPersistenceKey("k-mouse", true);
    await pet.setChattelPlace(LANE_ID);
    const torch = makeStuffAtPath(() => new Torch(), TORCH_PATH);
    await torch.stampChattel(alice);
    await torch.setChattelPlace(LANE_ID);

    const pins = await ChattelApi.pinned();
    expect(pins).toEqual([
      { pin: { scope: PET_PATH, key: "k-mouse" }, place: LANE_ID },
    ]);
  });

  it("stands each pin up by (scope, key); a pin that cannot resolve is counted, not fatal", async () => {
    const alice = makeOwner();
    for (const key of ["k-mouse", "k-lost"]) {
      const pet = makeStuffAtPath(() => new Pet(), PET_PATH);
      await pet.stampChattel(alice);
      pet.setPersistenceKey(key, true);
      await pet.setChattelPlace(LANE_ID);
    }
    const standUp = vi
      .spyOn(PersistableApi, "standUpKeyed")
      .mockImplementation(async (_scope: string, key: string) => {
        if (key === "k-lost") throw new Error("lot deleted");
        return {} as Stuff;
      });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const report = await ResidencyApi.pinNow();

    expect(report).toEqual({ pinned: 2, stoodUp: 1, failed: 1 });
    expect(standUp).toHaveBeenCalledWith(PET_PATH, "k-mouse");
    expect(standUp).toHaveBeenCalledWith(PET_PATH, "k-lost");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("a world with no pins pays nothing", async () => {
    const standUp = vi.spyOn(PersistableApi, "standUpKeyed");
    expect(await ResidencyApi.pinNow()).toEqual({
      pinned: 0,
      stoodUp: 0,
      failed: 0,
    });
    expect(standUp).not.toHaveBeenCalled();
  });
});

describe("⭐ the owner's login is the other ask — and it resolves first", () => {
  it("a keyed room-placed entry resolves to the live instance; nothing is minted", async () => {
    const alice = makeOwner();
    const pet = makeStuffAtPath(() => new Pet(), PET_PATH);
    await pet.stampChattel(alice);
    pet.setPersistenceKey("k-mouse", true);
    await pet.setChattelPlace(LANE_ID);
    const id = pet.getChattelId();
    await PersistableApi.capture(alice);

    // The owner logs out; the pet stays standing (the roll's world).
    StuffApi.unregister(alice);
    const clone = StuffApi.clone as unknown as ReturnType<typeof vi.fn>;
    clone.mockClear();

    const restored = makeOwner();
    await PersistableApi.materialize(restored);

    expect(restored.getEstateEntry(id)?.key).toBe("k-mouse");
    // Resolved — the estate now holds THE standing pet, not a second one.
    expect(restored.getEstateLive(id)).toBe(pet);
    expect(clone).not.toHaveBeenCalledWith(PET_PATH);
    expect(StuffApi.findAllByTemplatePath(PET_PATH).length).toBe(1);
  });

  it("and when nothing is standing, the owner stands it up from its own record", async () => {
    const alice = makeOwner();
    const pet = makeStuffAtPath(() => new Pet(), PET_PATH);
    await pet.stampChattel(alice);
    pet.setPersistenceKey("k-mouse", true);
    await pet.setChattelPlace(LANE_ID);
    await PersistableApi.capture(pet);
    await PersistableApi.capture(alice);

    StuffApi.clearAll();
    await boot();
    const restored = makeOwner();
    await PersistableApi.materialize(restored);

    const live = StuffApi.findAllByTemplatePath<Stuff>(PET_PATH);
    expect(live.length).toBe(1);
    expect(
      MixinApi.isPersistable(live[0]!) && live[0]!.getPersistenceKey(),
    ).toBe("k-mouse");
  });
});

describe("⭐ a pinned good remembers its room even when the ROOM persists itself", () => {
  // `capturePlacement` nulls a nested host's own placement because the
  // ancestor's container slice carries a `{ref, key}` for it — but a
  // chattel is SKIPPED from that slice (it persists with its owner), so
  // nothing refers to it and its own `place` is the only record of where
  // it stands. Without this the pin roll stood a bedroom cat up NOWHERE.
  async function placeOf(room: Stuff): Promise<unknown> {
    const alice = makeOwner();
    const pet = makeStuffAtPath(() => new Pet(), PET_PATH);
    ContainmentApi.move(pet, room as Stuff & Container);
    await pet.stampChattel(alice);
    pet.setPersistenceKey("k-mouse", true);
    await pet.setChattelPlace(PersistableApi.placeIdOf(pet as Stuff));
    await PersistableApi.capture(pet);
    const recs = await PersistedRecord.findByScope(PET_PATH);
    return recs[0]?.getPlace() ?? null;
  }

  it("in a public room: the room's identity", async () => {
    const lane = makeStuffAtPath(() => new PlainRoom(), LANE_ID);
    expect(await placeOf(lane)).toEqual({ container: LANE_ID });
  });

  it("in a self-persisting room: still the room's identity, not null", async () => {
    const bedroom = makeStuffAtPath(
      () => new PersistentRoom(),
      "/test/world/Bedroom",
    );
    expect(await placeOf(bedroom)).toEqual({ container: "/test/world/Bedroom" });
  });

  it("in a KEYED room (a leased unit): scope + key, so restore re-enters the exact unit", async () => {
    const unit = makeStuffAtPath(() => new PersistentRoom(), "/test/world/Unit");
    unit.setPersistenceKey("unit-9", true);
    expect(await placeOf(unit)).toEqual({
      container: "/test/world/Unit",
      containerKey: "unit-9",
    });
  });
});
