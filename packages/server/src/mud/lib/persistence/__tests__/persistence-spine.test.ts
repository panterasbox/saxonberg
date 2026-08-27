/**
 * Persistence spine — the universal self-persistence substrate.
 *
 * Proves the acceptance criteria of the persistence-spine requirements
 * against generic persistable fixtures (Avatar's gear round-trip is proven
 * in the Avatar migration): round-trip through capture → store → restore;
 * per-mixin composition (Container recursion + Slotted custom slice);
 * identical content chests differentiating by position; two persistable
 * hosts composing via reference; room decomposition by owner; the security
 * drift-guard + invariant gate; the eviction seam; seed-then-persist; and
 * the account-deletion cascade — with non-persistable behavior unchanged.
 *
 * Item reconstitution's gated `StuffApi.clone` is mocked to fresh base
 * fixtures (the class/hydrator resolution is exercised elsewhere); the
 * substrate logic — compose/decompose, drift guard, placement, ref-walk —
 * is what these tests cover. The record store is the real `PersistedRecord`
 * over a mocked `PersistenceManager`.
 */

import "../../../../test-bootstrap";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { PersistableApi } from "../../../api/persistable";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { SlotApi } from "../../../api/slot";
import { ParcelApi } from "../../../api/parcel";
import { MixinApi } from "../../../api/mixin";
import PersistentHydrator from "../../../obj/persistence/PersistentHydrator";
import { PersistableMixin } from "../Persistable";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { Idea } from "../../stuff/Idea";
import type { Stuff } from "../../stuff/Stuff";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { PopulatesMixin } from "../../stuff/Populates";
import { PostRegistrationMixin } from "../../stuff/PostRegistration";
import { GradedMixin } from "../../craft/Graded";
import { PropertiedMixin, Property } from "../../stuff/Propertied";
import { SlottedMixin } from "../../slot/Slotted";
import { SlottableMixin } from "../../slot/Slottable";
import { HasInteractiveMixin } from "../../connection/HasInteractive";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "./quantity-marshaller-test-helpers";
import { Quantity } from "../../quantity";
import { QuantityMarshaller } from "../../../obj/persistence/QuantityMarshaller";
import type { FieldMeta } from "../../mixin";

/* ─────────────────────────── test fixtures ─────────────────────────── */

// A persistable room host: Persistable ⊕ Populates ⊕ Container, with one
// own persistent field. Composed outermost-Persistable.
class RoomHost extends PersistableMixin(
  PopulatesMixin(ContainerMixin(PostRegistrationMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {
    label: { persistent: true },
  };
  label = "";
  getLabel(): string {
    return this.label;
  }
  setLabel(v: string): void {
    this.label = v;
  }
}

// A multi-instance persistable host (D1): many live instances share this one
// templatePath, each keyed by an explicit per-instance key (a leased dorm
// room keyed on its unit parcel). No marker — the `(scope, key)` identity is
// uniform; distinct keys simply never collide.
class MultiRoom extends PersistableMixin(
  ContainerMixin(PostRegistrationMixin(Idea)),
) {
  static fieldMeta: FieldMeta = {
    label: { persistent: true },
  };
  label = "";
  getLabel(): string {
    return this.label;
  }
  setLabel(v: string): void {
    this.label = v;
  }
}

// A generic (non-host) content chest: Container ⊕ Containable, carrying
// per-instance state. NOT persistable — nests in a host's record.
class ContentChest extends ContainerMixin(ContainableMixin(Idea)) {
  static fieldMeta: FieldMeta = {
    label: { persistent: true },
  };
  label = "";
  getLabel(): string {
    return this.label;
  }
  setLabel(v: string): void {
    this.label = v;
  }
}

// The AC#2 multi-mixin object: Container + Graded + Propertied, three
// independent slices.
class GadgetChest extends GradedMixin(
  PropertiedMixin(ContainerMixin(ContainableMixin(Idea))),
) {}

// A trinket — Containable leaf with one field. Rests inside chests.
class Trinket extends ContainableMixin(Idea) {
  static fieldMeta: FieldMeta = {
    tag: { persistent: true },
  };
  tag = "";
  getTag(): string {
    return this.tag;
  }
  setTag(v: string): void {
    this.tag = v;
  }
}

// A persistable HOST chest — its own record, keyed by templatePath. Exercises
// the host-reference boundary.
class HostChest extends PersistableMixin(
  ContainerMixin(ContainableMixin(PostRegistrationMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {
    label: { persistent: true },
  };
  label = "";
  getLabel(): string {
    return this.label;
  }
  setLabel(v: string): void {
    this.label = v;
  }
}

// A Containable persistable host (an avatar-shaped stand-in) — captures its
// OWN durable location into its record.
class MovableHost extends PersistableMixin(
  ContainerMixin(ContainableMixin(PostRegistrationMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {
    label: { persistent: true },
  };
  label = "";
  getLabel(): string {
    return this.label;
  }
  setLabel(v: string): void {
    this.label = v;
  }
}

// An opted-out host (a guest stand-in) — shouldPersist() is false, so it
// writes and restores nothing.
class GuestLikeHost extends PersistableMixin(
  ContainerMixin(PostRegistrationMixin(Idea)),
) {
  override shouldPersist(): boolean {
    return false;
  }
}

// An avatar-shaped host: HasInteractive + Container + Slotted + Containable,
// persistable. Proves the Avatar-migration behaviors — owner = self, skipped
// as another host's content, and a fields + inventory + gear + placement
// round trip — without the full Avatar clone pipeline.
class AvatarLike extends PersistableMixin(
  HasInteractiveMixin(
    SlottedMixin(ContainerMixin(ContainableMixin(PostRegistrationMixin(Idea)))),
  ),
) {
  static fieldMeta: FieldMeta = {
    callsign: { persistent: true },
  };
  callsign = "";
  getCallsign(): string {
    return this.callsign;
  }
  setCallsign(v: string): void {
    this.callsign = v;
  }
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

// A Slotted host (worn-gear demo) + a Slottable garment.
class Wearer extends SlottedMixin(ContainerMixin(PostRegistrationMixin(Idea))) {}
class Garment extends SlottableMixin(ContainableMixin(Idea)) {
  static fieldMeta: FieldMeta = {
    tag: { persistent: true },
  };
  tag = "";
  getTag(): string {
    return this.tag;
  }
  setTag(v: string): void {
    this.tag = v;
  }
}

/* ─────────────────────────── clone registry ────────────────────────── */

// Map templatePath → base fixture factory. `StuffApi.clone` is mocked to
// mint a fresh, default instance at the path (the gated clone contract:
// the record names a templatePath + declared slices; it can never inject a
// class the principal couldn't legitimately clone).
let cloneFactories: Record<string, () => Stuff>;

async function mockClone(path: string): Promise<Stuff> {
  const factory = cloneFactories[path];
  if (!factory) throw new Error(`no clone factory for ${path}`);
  const inst = makeStuffAtPath(factory, path);
  // The real clone pipeline runs postRegister (which, post-D1, no longer
  // auto-materializes); fire it to faithfully simulate the pipeline. The
  // nested-host `{ref}` restore is driven by the spine's `cloneHost` (a
  // keyless materialize on the fresh clone), not by postRegister.
  if (MixinApi.isPersistable(inst)) {
    await (inst as unknown as { postRegister: () => Promise<void> }).postRegister();
  }
  return inst;
}

/* ─────────────────────────── PM mock ───────────────────────────────── */

let snapshots: Record<string, unknown>[];

beforeEach(() => {
  StuffApi.clearAll(); // isolate the Stuff registry between tests
  snapshots = [];

  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col !== "holder_snapshots") return [];
    return snapshots.filter((d) =>
      Object.entries(query).every(([k, v]) => d[k] === v),
    );
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col !== "holder_snapshots") return "id";
    const i = snapshots.findIndex(
      (d) => d.scope === doc.scope && d.owner === doc.owner,
    );
    if (i >= 0) {
      snapshots[i] = { ...doc, _id: snapshots[i]!._id };
      return snapshots[i]!._id as string;
    }
    const _id = String(snapshots.length + 1);
    snapshots.push({ ...doc, _id });
    return _id;
  });
  const del = vi.fn(async (col: string, id: string) => {
    if (col !== "holder_snapshots") return;
    const i = snapshots.findIndex((d) => d._id === id);
    if (i >= 0) snapshots.splice(i, 1);
  });
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: del,
  } as unknown as PersistenceManager);

  // Item reconstitution → fresh base fixtures (the gated clone stand-in).
  vi.spyOn(StuffApi, "clone").mockImplementation(
    ((path: string) => mockClone(path)) as unknown as typeof StuffApi.clone,
  );

  // Default title owner — a group. Individual scopes override per test.
  vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue({
    kind: "group",
    name: "lounge",
  });

  // The standard hydrator singleton (restore's set<Field> dispatch).
  makeStuffAtPath(
    () => new PersistentHydrator(),
    PersistentHydrator.templatePath,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ─────────────────────────── the tests ─────────────────────────────── */

describe("round-trip (AC: capture → store → restore)", () => {
  it("restores a host's declared field state onto a fresh shell", async () => {
    cloneFactories = {};
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    room.setLabel("Dave's Bar");

    await PersistableApi.capture(room);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.scope).toBe("/world/room");

    // A fresh shell (as if re-cloned after eviction) restores the label.
    const reborn = await evictAndMaterialize(
      room,
      "/world/room",
      () => new RoomHost(),
    );
    expect(reborn.getLabel()).toBe("Dave's Bar");
  });
});

describe("per-mixin composition (AC: Container + Graded + Propertied)", () => {
  it("captures and restores each mixin slice independently", async () => {
    cloneFactories = {
      "/world/gadget": () => new GadgetChest(),
      "/world/trinket": () => new Trinket(),
    };
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    const gadget = makeStuffAtPath(() => new GadgetChest(), "/world/gadget");
    gadget.setGradeBand("fine");
    gadget.initProp(Property.of<number>("charge"), { transient: false });
    gadget.setProp(Property.of<number>("charge"), 42);
    const trinket = makeStuffAtPath(() => new Trinket(), "/world/trinket");
    trinket.setTag("ruby");
    ContainmentApi.move(trinket, gadget); // nested inside the gadget
    ContainmentApi.move(gadget, room);

    await PersistableApi.capture(room);

    // Three independent slices under the gadget's content entry.
    const rec = snapshots[0]!.state as Record<string, unknown>;
    const contents = (rec.ContainerMixin as { contents: unknown[] }).contents;
    const gadgetEntry = contents[0] as {
      state: Record<string, { fields?: Record<string, unknown> }>;
    };
    expect(gadgetEntry.state.GradedMixin).toBeDefined();
    expect(gadgetEntry.state.PropertiedMixin).toBeDefined();
    expect(gadgetEntry.state.ContainerMixin).toBeDefined();

    // Restore reassembles each slice.
    const reborn = await evictAndMaterialize(
      room,
      "/world/room",
      () => new RoomHost(),
    );
    const rGadget = reborn.getContents()[0] as GadgetChest;
    expect(rGadget.getGradeBand()).toBe("fine");
    expect(rGadget.getProp(Property.of<number>("charge"))).toBe(42);
    const rTrinket = (rGadget as unknown as GadgetChest).getContents()[0] as Trinket;
    expect(rTrinket.getTag()).toBe("ruby");
  });
});

describe("room + nested content chest (AC #4)", () => {
  it("contents incl. nested survive and reassemble; shell re-clones", async () => {
    cloneFactories = {
      "/world/chest": () => new ContentChest(),
      "/world/trinket": () => new Trinket(),
    };
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    const chest = makeStuffAtPath(() => new ContentChest(), "/world/chest");
    chest.setLabel("oak chest");
    const trinket = makeStuffAtPath(() => new Trinket(), "/world/trinket");
    trinket.setTag("locket");
    ContainmentApi.move(trinket, chest);
    ContainmentApi.move(chest, room);

    await PersistableApi.capture(room);

    const reborn = await evictAndMaterialize(
      room,
      "/world/room",
      () => new RoomHost(),
    );
    const rChest = reborn.getContents()[0] as ContentChest;
    expect(rChest.getLabel()).toBe("oak chest");
    expect((rChest.getContents()[0] as Trinket).getTag()).toBe("locket");
  });
});

describe("identical content chests differentiate by position (AC #5)", () => {
  it("two chests from one template restore distinct state onto distinct clones", async () => {
    cloneFactories = { "/world/chest": () => new ContentChest() };
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    const a = makeStuffAtPath(() => new ContentChest(), "/world/chest");
    const b = makeStuffAtPath(() => new ContentChest(), "/world/chest");
    a.setLabel("first");
    b.setLabel("second");
    ContainmentApi.move(a, room);
    ContainmentApi.move(b, room);

    await PersistableApi.capture(room);

    const reborn = await evictAndMaterialize(
      room,
      "/world/room",
      () => new RoomHost(),
    );
    const labels = reborn.getContents().map((c) => (c as ContentChest).getLabel());
    expect(labels).toEqual(["first", "second"]);
    // Distinct instances (no shared identity).
    expect(reborn.getContents()[0]!.stuffId).not.toBe(
      reborn.getContents()[1]!.stuffId,
    );
  });
});

describe("two persistable hosts compose (AC #6)", () => {
  it("room records a {ref}; the chest holds its own contents; move re-keys the referrer", async () => {
    cloneFactories = {
      "/world/hostchest": () => new HostChest(),
      "/world/trinket": () => new Trinket(),
    };
    // The chest host is a player-owned title.
    (ParcelApi.ownerOf as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (p: string) =>
        p === "/world/hostchest"
          ? { kind: "player", templatePath: "/obj/Avatar/alice" }
          : { kind: "group", name: "lounge" },
    );
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    const chest = makeStuffAtPath(() => new HostChest(), "/world/hostchest");
    chest.setLabel("strongbox");
    const trinket = makeStuffAtPath(() => new Trinket(), "/world/trinket");
    trinket.setTag("deed");
    ContainmentApi.move(trinket, chest);
    ContainmentApi.move(chest, room);

    await PersistableApi.capture(chest); // chest persists itself
    await PersistableApi.capture(room); // room references it

    const roomRec = snapshots.find((s) => s.scope === "/world/room")!;
    expect(containerContents(roomRec)[0]).toEqual({
      ref: "/world/hostchest",
      placement: {},
    });
    // The chest's OWN record holds its contents, keyed to the chest, owner=alice.
    const chestRec = snapshots.find((s) => s.scope === "/world/hostchest")!;
    expect(chestRec.owner).toBe("/obj/Avatar/alice");
    expect(
      (containerContents(chestRec)[0] as { templatePath: string }).templatePath,
    ).toBe("/world/trinket");

    // Move the chest to a new host and re-capture: the chest's record stays
    // keyed to the chest; only the new referrer changes.
    const room2 = makeStuffAtPath(() => new RoomHost(), "/world/room-b");
    ContainmentApi.move(chest, room2);
    await PersistableApi.capture(room2);
    const room2Rec = snapshots.find((s) => s.scope === "/world/room-b")!;
    expect(containerContents(room2Rec)[0]).toEqual({
      ref: "/world/hostchest",
      placement: {},
    });
    // Chest's own record untouched (still keyed to the chest).
    expect(snapshots.find((s) => s.scope === "/world/hostchest")!.owner).toBe(
      "/obj/Avatar/alice",
    );
  });

  it("materialize reconstructs the tree by following the reference", async () => {
    cloneFactories = {
      "/world/hostchest": () => new HostChest(),
      "/world/trinket": () => new Trinket(),
    };
    (ParcelApi.ownerOf as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (p: string) =>
        p === "/world/hostchest"
          ? { kind: "player", templatePath: "/obj/Avatar/alice" }
          : { kind: "group", name: "lounge" },
    );
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    const chest = makeStuffAtPath(() => new HostChest(), "/world/hostchest");
    chest.setLabel("strongbox");
    const trinket = makeStuffAtPath(() => new Trinket(), "/world/trinket");
    trinket.setTag("deed");
    ContainmentApi.move(trinket, chest);
    ContainmentApi.move(chest, room);
    await PersistableApi.capture(chest);
    await PersistableApi.capture(room);

    // Evict everything; re-clone the room shell and materialize — the ref
    // walk clones the chest host (which self-materializes its own trinket).
    evict(room);
    StuffApi.unregister(chest);
    const reborn = makeStuffAtPath(() => new RoomHost(), "/world/room");
    await PersistableApi.materialize(reborn);

    const rChest = reborn.getContents()[0] as HostChest;
    expect(rChest.getLabel()).toBe("strongbox");
    expect((rChest.getContents()[0] as Trinket).getTag()).toBe("deed");
  });
});

describe("room decomposes by owner (AC #7)", () => {
  it("each principal's nested host-chest restores as its own owner", async () => {
    cloneFactories = { "/world/chestA": () => new HostChest() };
    (ParcelApi.ownerOf as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (p: string) => {
        if (p === "/world/chestA")
          return { kind: "player", templatePath: "/obj/Avatar/alice" };
        if (p === "/world/chestB")
          return { kind: "player", templatePath: "/obj/Avatar/bob" };
        return { kind: "group", name: "lounge" };
      },
    );
    const chestA = makeStuffAtPath(() => new HostChest(), "/world/chestA");
    const chestB = makeStuffAtPath(() => new HostChest(), "/world/chestB");
    await PersistableApi.capture(chestA);
    await PersistableApi.capture(chestB);

    const owners = snapshots.map((s) => s.owner).sort();
    expect(owners).toEqual(["/obj/Avatar/alice", "/obj/Avatar/bob"]);
  });
});

describe("security (AC #8)", () => {
  it("a forged record cannot inject class/hydratorClass/brain or undeclared keys", async () => {
    cloneFactories = { "/world/chest": () => new ContentChest() };
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    await PersistableApi.capture(room);
    // Forge: a content entry whose fields try to set executable-code fields.
    const forged = snapshots.find((s) => s.scope === "/world/room")!;
    (forged.state as Record<string, { contents: unknown[] }>).ContainerMixin = {
      contents: [
        {
          templatePath: "/world/chest",
          state: {
            ContentChest: {
              fields: {
                label: "legit",
                class: "/obj/evil/Backdoor",
                hydratorClass: "/obj/evil/Hydrator",
                brain: "/lib/behavior/pwn",
                bogusUndeclared: "x",
              },
            },
          },
          placement: {},
        },
      ],
    };
    const reborn = await evictAndMaterialize(
      room,
      "/world/room",
      () => new RoomHost(),
    );
    const chest = reborn.getContents()[0] as ContentChest;
    // The declared field applied; the code-trust + undeclared keys dropped.
    expect(chest.getLabel()).toBe("legit");
    expect((chest as unknown as Record<string, unknown>).class).toBeUndefined();
    expect(
      (chest as unknown as Record<string, unknown>).brain,
    ).toBeUndefined();
    expect(
      (chest as unknown as Record<string, unknown>).bogusUndeclared,
    ).toBeUndefined();
  });

  it("a forged value that violates a setter invariant aborts the record's restore", async () => {
    cloneFactories = { "/world/gadget": () => new GadgetChest() };
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    await PersistableApi.capture(room);
    const forged = snapshots.find((s) => s.scope === "/world/room")!;
    (forged.state as Record<string, { contents: unknown[] }>).ContainerMixin = {
      contents: [
        {
          templatePath: "/world/gadget",
          state: { GradedMixin: { fields: { gradeBand: "not-a-real-band" } } },
          placement: {},
        },
      ],
    };
    // The invariant setter throws → the record's restore aborts (atomic).
    evict(room);
    const reborn = makeStuffAtPath(() => new RoomHost(), "/world/room");
    await expect(PersistableApi.materialize(reborn)).rejects.toThrow();
  });

  it("the record store has no player-facing write surface on PersistableApi", () => {
    const surface = Object.getOwnPropertyNames(PersistableApi).filter(
      (n) => typeof (PersistableApi as unknown as Record<string, unknown>)[n] === "function",
    );
    // Only capture/captureHostOf/materialize/restoreOrSeed/hasRecord/
    // deleteAllFor — no raw write/save. (`captureHostOf` is a capture,
    // host-resolving: it reaches the same gated writer through the same
    // principal. `restoreOrSeed` is a keyed materialize-or-capture: it
    // writes only through `capture`, on the no-record branch.)
    //
    // The fork protocol (sandbox build) is RUNTIME state movement, not a
    // record-store write path: forkRuntimeState/mergeRuntimeState never
    // touch `holder_snapshots`.
    //
    // captureDetached/restoreDetached (furnishing build) are the
    // owner-based-persistence seams: they capture/reconstitute ONE non-host
    // good's composed state, the shape an estate entry carries. Neither
    // reads or writes a record — the estate they serve is a slice inside
    // the owner's record, written by the same gated `capture` as everything
    // else. So the invariant this test guards (no raw record write on the
    // Api) is unchanged.
    expect(surface.sort()).toEqual(
      [
        "capture",
        "captureHostOf",
        "captureDetached",
        "restoreDetached",
        "placeIdOf",
        "deleteAllFor",
        "hasRecord",
        "materialize",
        "restoreOrSeed",
        "forkRuntimeState",
        "mergeRuntimeState",
      ].sort(),
    );
  });
});

describe("eviction seam (AC #9)", () => {
  it("a persistable host with contents does NOT veto; a non-persistable one does", () => {
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    const chest = makeStuffAtPath(() => new ContentChest(), "/world/chest");
    ContainmentApi.move(chest, room);
    // Persistable host with contents → falls through (evicts after capture).
    expect(room.canEvict({ idleMs: 10, reason: "idle" }).ok).toBe(true);

    // Plain (non-persistable) container with contents → still vetoes.
    const plain = makeStuffAtPath(() => new ContentChest(), "/world/plain");
    const inner = makeStuffAtPath(() => new Trinket(), "/world/trinket");
    ContainmentApi.move(inner, plain);
    expect(plain.canEvict({ idleMs: 10, reason: "idle" }).ok).toBe(false);
  });
});

describe("seed-then-persist (AC #10)", () => {
  it("applyPopulates RETAINS the declared specs but does not seed at hydration", async () => {
    cloneFactories = { "/world/chest": () => new ContentChest() };
    // A persistable host is a bare shell at hydration (its key isn't set yet,
    // so a hasRecord gate can't tell seed from restore). The `populates` hook
    // therefore only retains the specs — it seeds NOTHING here, even with a
    // clone factory available. The keyed holder lays them down later.
    const fresh = makeStuffAtPath(() => new RoomHost(), "/world/fresh");
    await fresh.applyPopulates(["/world/chest"]); // retains; does NOT seed now
    expect(fresh.getContents()).toHaveLength(0);
  });

  // The positive path — seedBornWith → the real PopulatesMixin applier →
  // clone-into-self — needs a Template store, so it's covered end-to-end by
  // the dorm integration tests (DormResidence "move-in seals the style; it
  // survives reap" seeds bed/desk/footlocker via `populates:` and asserts they
  // land + persist; DormWarren likewise). This suite's stub can't reach the
  // applier, so it covers the retain / no-op / no-double-seed invariants here.

  it("seedBornWith is a no-op when no populates were declared", async () => {
    cloneFactories = {};
    // A persistable host with no `populates:` (an Avatar, whose loadout is
    // seeded imperatively) seeds nothing — no PopulatesMixin need be composed.
    const fresh = makeStuffAtPath(() => new RoomHost(), "/world/fresh");
    await fresh.seedBornWith(); // empty specs → no-op, no throw
    expect(fresh.getContents()).toHaveLength(0);
  });

  it("never double-seeds on restore — the holder restores instead of calling seedBornWith", async () => {
    cloneFactories = { "/world/chest": () => new ContentChest() };
    // Seed a room, capture, evict, re-clone: on the has-record branch the
    // holder restores (never calls seedBornWith), and the reborn shell's
    // retained specs sit unused — no duplication.
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    const chest = makeStuffAtPath(() => new ContentChest(), "/world/chest");
    ContainmentApi.move(chest, room);
    await PersistableApi.capture(room);
    expect(await PersistableApi.hasRecord("/world/room")).toBe(true);

    evict(room);
    const reborn = makeStuffAtPath(() => new RoomHost(), "/world/room");
    await reborn.applyPopulates(["/world/chest"]); // retained, but NOT seeded
    expect(reborn.getContents()).toHaveLength(0); // restore branch: no re-seed
  });
});

describe("marshalled value round-trip (pre-build note #5 landmine)", () => {
  it("a rich marshalled property (a Quantity) survives capture → restore", async () => {
    installV1QuantityMarshallers();
    cloneFactories = { "/world/gadget": () => new GadgetChest() };
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    const gadget = makeStuffAtPath(() => new GadgetChest(), "/world/gadget");
    const mass = Property.of<Quantity<"kg">>("mass");
    gadget.initProp(mass, {
      transient: false,
      marshaller: QuantityMarshaller.pathFor("kg"),
    });
    gadget.setProp(mass, Quantity.of(2.5, "kg"));
    ContainmentApi.move(gadget, room);

    await PersistableApi.capture(room);
    const reborn = await evictAndMaterialize(
      room,
      "/world/room",
      () => new RoomHost(),
    );
    const rGadget = reborn.getContents()[0] as GadgetChest;
    const restored = rGadget.getProp(mass);
    expect(restored).not.toBeNull();
    expect(restored).toBeInstanceOf(Quantity);
    expect(restored!.value).toBe(2.5);
    expect(restored!.unit).toBe("kg");
  });
});

describe("host self-placement (Avatar-migration substrate)", () => {
  it("captures a Containable host's own location and re-places it on restore", async () => {
    cloneFactories = {};
    const room = makeStuffAtPath(() => new ContentChest(), "/world/room-c");
    const mover = makeStuffAtPath(() => new MovableHost(), "/world/mover");
    mover.setLabel("wanderer");
    ContainmentApi.move(mover, room);

    await PersistableApi.capture(mover);
    // The record carries the host's own placement.
    const rec = snapshots.find((s) => s.scope === "/world/mover")!;
    expect(rec.place).toEqual({ container: "/world/room-c" });

    // Evict just the mover (room stays registered); re-clone + materialize
    // → it re-homes into the room via the captured placement.
    StuffApi.unregister(mover);
    const reborn = makeStuffAtPath(() => new MovableHost(), "/world/mover");
    await PersistableApi.materialize(reborn);
    expect(reborn.getLabel()).toBe("wanderer");
    expect(reborn.getContainer()).toBe(room);
  });
});

describe("avatar-shaped host (Avatar migration end-to-end)", () => {
  it("round-trips fields + inventory + worn gear + own location, owner = self", async () => {
    cloneFactories = {
      "/world/pack": () => new ContentChest(),
      "/world/coat": () => new Garment(),
    };
    const room = makeStuffAtPath(() => new ContentChest(), "/world/lounge");
    const av = makeStuffAtPath(() => new AvatarLike(), "/obj/Avatar/p1");
    av.setStaticSlots([{ name: "torso", accepts: "SlottableMixin" }]);
    av.setCallsign("Mallow");
    const pack = makeStuffAtPath(() => new ContentChest(), "/world/pack");
    pack.setLabel("backpack");
    const coat = makeStuffAtPath(() => new Garment(), "/world/coat");
    coat.setTag("greatcoat");
    ContainmentApi.move(pack, av); // carried
    ContainmentApi.move(coat, av); // carried...
    SlotApi.occupyAll(av, coat, ["torso"]); // ...and worn
    ContainmentApi.move(av, room); // standing in the lounge

    await PersistableApi.capture(av);
    const rec = snapshots.find((s) => s.scope === "/obj/Avatar/p1")!;
    expect(rec.owner).toBe("/obj/Avatar/p1"); // self-owned
    expect(rec.place).toEqual({ container: "/world/lounge" });

    // A fresh clone (relogin) restores everything.
    StuffApi.unregister(av);
    for (const c of [pack, coat]) StuffApi.unregister(c);
    const reborn = makeStuffAtPath(() => new AvatarLike(), "/obj/Avatar/p1");
    reborn.setStaticSlots([{ name: "torso", accepts: "SlottableMixin" }]);
    await PersistableApi.materialize(reborn);

    expect(reborn.getCallsign()).toBe("Mallow");
    expect(reborn.getContainer()).toBe(room); // re-homed to the lounge
    const labels = reborn.getContents().map((c) => {
      const g = c as { getLabel?: () => string; getTag?: () => string };
      return g.getLabel?.() ?? g.getTag?.();
    });
    expect(labels.sort()).toEqual(["backpack", "greatcoat"]);
    const worn = reborn.getOccupant("torso") as Garment;
    expect(worn.getTag()).toBe("greatcoat"); // re-worn
  });

  it("is skipped from another host's captured contents (never content)", async () => {
    cloneFactories = {};
    const room = makeStuffAtPath(() => new RoomHost(), "/world/room");
    const av = makeStuffAtPath(() => new AvatarLike(), "/obj/Avatar/p2");
    ContainmentApi.move(av, room);
    await PersistableApi.capture(room);
    // The room records no content entry for the live avatar occupant.
    expect(containerContents(snapshots.find((s) => s.scope === "/world/room")!)).toEqual([]);
  });
});

describe("the (scope, key) uniqueness invariant (no two clones stepping on each other)", () => {
  it("throws when a second live instance would write the SAME (scope, key)", async () => {
    cloneFactories = {};
    const a = makeStuffAtPath(() => new MovableHost(), "/world/dup");
    const b = makeStuffAtPath(() => new MovableHost(), "/world/dup");
    // Both derive the SAME scope-owner (a MovableHost is a singleton shape) —
    // the footgun. The guard is precise: `a` captures fine (no sibling has
    // claimed the key yet); `b`'s capture, which would clobber `a`'s record,
    // throws.
    await PersistableApi.capture(a);
    await expect(PersistableApi.capture(b)).rejects.toThrow(
      /both keyed .* clobber one record/,
    );
  });
});

describe("multi-instance hosts (D1: explicit-key persistence)", () => {
  it("two instances of one scope with DISTINCT keys → distinct records; no collision", async () => {
    cloneFactories = {};
    const k1 = "/world/dorms/f1-r1";
    const k2 = "/world/dorms/f1-r2";
    // Two LIVE instances at the same templatePath — a collision only if they
    // share a key; distinct keys never collide (no marker, no relaxation).
    const a = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    const b = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    a.setLabel("alice's room");
    b.setLabel("bob's room");

    // Capture does NOT throw — distinct keys, distinct records.
    await PersistableApi.capture(a, k1);
    await PersistableApi.capture(b, k2);

    // Two distinct records, one scope, distinct owners (the keys).
    expect(snapshots).toHaveLength(2);
    const owners = snapshots.map((s) => s.owner).sort();
    expect(owners).toEqual([k1, k2]);
    expect(snapshots.every((s) => s.scope === "/world/dormroom")).toBe(true);
  });

  it("materialize(host, key) restores that key's record only", async () => {
    cloneFactories = {};
    const k1 = "/world/dorms/f1-r1";
    const k2 = "/world/dorms/f1-r2";
    // Two records under ONE scope, distinct keys + distinct content, written
    // by re-capturing a single instance under each key.
    const src = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    src.setLabel("alice's room");
    await PersistableApi.capture(src, k1);
    src.setLabel("bob's room");
    await PersistableApi.capture(src, k2);
    expect(snapshots).toHaveLength(2);
    StuffApi.unregister(src);

    // A fresh shell keyed on k1 restores alice; keyed on k2 restores bob.
    const r1 = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    await PersistableApi.materialize(r1, k1);
    expect(r1.getLabel()).toBe("alice's room");
    StuffApi.unregister(r1);
    const r2 = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    await PersistableApi.materialize(r2, k2);
    expect(r2.getLabel()).toBe("bob's room");
  });

  it("keyed materialize with no matching record is a clean no-op", async () => {
    cloneFactories = {};
    const reborn = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    await PersistableApi.materialize(reborn, "/world/dorms/f9-r9"); // no throw
    expect(reborn.getLabel()).toBe("");
  });

  it("hasRecord(scope, key) tests the single keyed record", async () => {
    cloneFactories = {};
    const k1 = "/world/dorms/f1-r1";
    const a = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    await PersistableApi.capture(a, k1);
    expect(await PersistableApi.hasRecord("/world/dormroom", k1)).toBe(true);
    expect(
      await PersistableApi.hasRecord("/world/dormroom", "/world/dorms/f1-r2"),
    ).toBe(false);
  });

  it("stashed-key reuse: keyed materialize then keyless capture writes the same record", async () => {
    cloneFactories = {};
    const k1 = "/world/dorms/f1-r1";
    const seed = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    seed.setLabel("original");
    await PersistableApi.capture(seed, k1);
    StuffApi.unregister(seed);

    // Materialize with the key (stashes it), mutate, then capture with NO key.
    const live = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    await PersistableApi.materialize(live, k1);
    expect(live.getLabel()).toBe("original");
    live.setLabel("edited");
    await PersistableApi.capture(live); // keyless — reuses the stashed key

    // Still ONE record (same (scope, k1)), now updated.
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.owner).toBe(k1);
    expect(
      (snapshots[0]!.state as Record<string, { fields: { label: string } }>)
        .MultiRoom!.fields.label,
    ).toBe("edited");
  });

  it("applyPopulates is a no-op (the context drives seed vs restore with the key)", async () => {
    cloneFactories = { "/world/chest": () => new ContentChest() };
    const room = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    // Even with NO record, a keyed host seeds nothing here (context-driven).
    await room.applyPopulates(["/world/chest"]);
    expect(room.getContents()).toHaveLength(0);
  });
});

describe("restoreOrSeed — the keyed-holder ground pattern", () => {
  it("SEEDS on the no-record branch, then captures, and reports false", async () => {
    cloneFactories = {};
    const key = "/world/dorms/f1-r1";
    const room = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");

    const restored = await PersistableApi.restoreOrSeed(room, key);

    expect(restored).toBe(false); // first provision
    // …and the capture happened, keyed, so the next standup restores.
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.scope).toBe("/world/dormroom");
    expect(snapshots[0]!.owner).toBe(key);
  });

  it("MATERIALIZES on the has-record branch, and reports true", async () => {
    cloneFactories = {};
    const key = "/world/dorms/f1-r1";
    const seed = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    seed.setLabel("alice's room");
    await PersistableApi.capture(seed, key);
    StuffApi.unregister(seed);

    const reborn = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    const restored = await PersistableApi.restoreOrSeed(reborn, key);

    expect(restored).toBe(true); // re-entry, not a first provision
    expect(reborn.getLabel()).toBe("alice's room");
    expect(snapshots).toHaveLength(1); // restored, did not write a second
  });

  it("⭐ born-with populates run exactly ONCE across two standups", async () => {
    // The branch this extraction exists to get right. Stand a host up
    // twice through restoreOrSeed: the first seeds, the second restores.
    // Seeding twice would duplicate every fixture in the room.
    cloneFactories = { "/world/chest": () => new ContentChest() };
    const key = "/world/dorms/f2-r7";

    const first = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    let seedCalls = 0;
    const realSeed = first.seedBornWith.bind(first);
    (first as unknown as { seedBornWith: () => Promise<void> }).seedBornWith =
      async () => {
        seedCalls++;
        return realSeed();
      };
    expect(await PersistableApi.restoreOrSeed(first, key)).toBe(false);
    expect(seedCalls).toBe(1);
    StuffApi.unregister(first);

    const second = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    let secondSeedCalls = 0;
    const realSeed2 = second.seedBornWith.bind(second);
    (second as unknown as { seedBornWith: () => Promise<void> }).seedBornWith =
      async () => {
        secondSeedCalls++;
        return realSeed2();
      };
    expect(await PersistableApi.restoreOrSeed(second, key)).toBe(true);
    expect(secondSeedCalls).toBe(0); // restored — never re-seeded
  });

  it("stashes the key, so a later KEYLESS capture writes the same record", async () => {
    cloneFactories = {};
    const key = "/world/dorms/f1-r1";
    const room = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    await PersistableApi.restoreOrSeed(room, key);

    room.setLabel("edited after provisioning");
    await PersistableApi.capture(room); // keyless — must reuse the stash

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.owner).toBe(key);
    expect(
      (snapshots[0]!.state as Record<string, { fields: { label: string } }>)
        .MultiRoom!.fields.label,
    ).toBe("edited after provisioning");
  });

  it("keeps two keys under one scope independent", async () => {
    cloneFactories = {};
    const a = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    const b = makeStuffAtPath(() => new MultiRoom(), "/world/dormroom");
    expect(await PersistableApi.restoreOrSeed(a, "/lot/1")).toBe(false);
    expect(await PersistableApi.restoreOrSeed(b, "/lot/2")).toBe(false);
    a.setLabel("first lot");
    b.setLabel("second lot");
    await PersistableApi.capture(a);
    await PersistableApi.capture(b);

    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((s) => s.owner).sort()).toEqual(["/lot/1", "/lot/2"]);
  });

  it("throws on a host that does not compose PersistableMixin", async () => {
    cloneFactories = {};
    // A programming error at the call site, not a user-reachable path —
    // so it is loud rather than a silent no-op.
    const notAHost = makeStuffAtPath(() => new ContentChest(), "/world/chest");
    await expect(
      PersistableApi.restoreOrSeed(notAHost as unknown as Stuff, "/lot/1"),
    ).rejects.toThrow(/PersistableMixin/);
  });
});

describe("persistence opt-out (guest skip)", () => {
  it("a host whose shouldPersist() is false writes and restores nothing", async () => {
    cloneFactories = {};
    const guest = makeStuffAtPath(() => new GuestLikeHost(), "/world/guest");
    await PersistableApi.capture(guest);
    expect(snapshots).toHaveLength(0);
    expect(await PersistableApi.hasRecord("/world/guest")).toBe(false);
    // materialize is a no-op (and never throws).
    await PersistableApi.materialize(guest);
  });
});

describe("account deletion cascade (AC #11)", () => {
  it("a keyed delete removes every record with owner = <player>", async () => {
    cloneFactories = {};
    (ParcelApi.ownerOf as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (p: string) => {
        if (p === "/world/a")
          return { kind: "player", templatePath: "/obj/Avatar/alice" };
        if (p === "/world/b")
          return { kind: "player", templatePath: "/obj/Avatar/alice" };
        return { kind: "player", templatePath: "/obj/Avatar/bob" };
      },
    );
    const a = makeStuffAtPath(() => new HostChest(), "/world/a");
    const b = makeStuffAtPath(() => new HostChest(), "/world/b");
    const c = makeStuffAtPath(() => new HostChest(), "/world/c");
    await PersistableApi.capture(a);
    await PersistableApi.capture(b);
    await PersistableApi.capture(c);
    expect(snapshots).toHaveLength(3);

    const removed = await PersistableApi.deleteAllFor("/obj/Avatar/alice");
    expect(removed).toBe(2);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.owner).toBe("/obj/Avatar/bob");
  });
});

describe("worn gear — Slotted custom slice (AC #2 / #3 substrate)", () => {
  it("captures worn occupancy by position and re-wears on restore", async () => {
    cloneFactories = { "/world/garment": () => new Garment() };
    const wearer = makeStuffAtPath(() => new Wearer(), "/world/wearer");
    wearer.setStaticSlots([{ name: "torso", accepts: "SlottableMixin" }]);
    const garment = makeStuffAtPath(() => new Garment(), "/world/garment");
    garment.setTag("cloak");
    ContainmentApi.move(garment, wearer); // in inventory
    SlotApi.occupyAll(wearer, garment, ["torso"]); // worn

    await PersistableApi.capture(wearer);
    const state = snapshots[0]!.state as Record<string, unknown>;
    expect((state.SlottedMixin as { worn: unknown[] }).worn).toEqual([
      { index: 0, slots: ["torso"] },
    ]);

    evict(wearer);
    const reborn = makeStuffAtPath(() => new Wearer(), "/world/wearer");
    reborn.setStaticSlots([{ name: "torso", accepts: "SlottableMixin" }]);
    await PersistableApi.materialize(reborn);
    const rGarment = reborn.getContents()[0] as Garment;
    expect(rGarment.getTag()).toBe("cloak");
    // Re-worn into the same slot.
    expect(reborn.getOccupant("torso")).toBe(rGarment);
  });
});

/* ─────────────────────────── helpers ───────────────────────────────── */

// The container slice's entries from a stored snapshot record.
function containerContents(rec: Record<string, unknown>): unknown[] {
  const state = rec.state as Record<string, { contents?: unknown[] }>;
  return state.ContainerMixin?.contents ?? [];
}

// Simulate a residency cull: unregister the host and its live deep contents
// so a fresh shell can re-clone at the same scope (identity = templatePath).
function evict(host: Stuff): void {
  if (MixinApi.isContainer(host)) {
    for (const item of host.getDeepContents()) StuffApi.unregister(item);
  }
  StuffApi.unregister(host);
}

// Evict `original`, re-clone a fresh shell at the same `scope`, and
// materialize its captured records — the capture → evict → materialize →
// restore round trip the eviction/logout/reload path exercises.
async function evictAndMaterialize<T extends Stuff>(
  original: Stuff,
  scope: string,
  factory: () => T,
): Promise<T> {
  evict(original);
  const reborn = makeStuffAtPath(factory, scope);
  await PersistableApi.materialize(reborn);
  return reborn;
}
