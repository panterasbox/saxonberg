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
import PersistentHydrator from "../PersistentHydrator";
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
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "./quantity-marshaller-test-helpers";
import { Quantity } from "../../quantity";
import { QuantityMarshaller } from "../QuantityMarshaller";

/* ─────────────────────────── test fixtures ─────────────────────────── */

// A persistable room host: Persistable ⊕ Populates ⊕ Container, with one
// own persistent field. Composed outermost-Persistable.
class RoomHost extends PersistableMixin(
  PopulatesMixin(ContainerMixin(PostRegistrationMixin(Idea))),
) {
  static persistentFields = ["label"];
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
  static persistentFields = ["label"];
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
  static persistentFields = ["tag"];
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
  static persistentFields = ["label"];
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
  static persistentFields = ["label"];
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

// A Slotted host (worn-gear demo) + a Slottable garment.
class Wearer extends SlottedMixin(ContainerMixin(PostRegistrationMixin(Idea))) {}
class Garment extends SlottableMixin(ContainableMixin(Idea)) {
  static persistentFields = ["tag"];
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
  // A cloned persistable HOST self-materializes its own records via
  // postRegister (the real clone pipeline runs it) — this drives the
  // reference walk. `makeStuffAtPath` skips postRegister, so fire it here.
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
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    room.setLabel("Dave's Bar");

    await PersistableApi.capture(room);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]!.scope).toBe("/domain/room");

    // A fresh shell (as if re-cloned after eviction) restores the label.
    const reborn = await evictAndMaterialize(
      room,
      "/domain/room",
      () => new RoomHost(),
    );
    expect(reborn.getLabel()).toBe("Dave's Bar");
  });
});

describe("per-mixin composition (AC: Container + Graded + Propertied)", () => {
  it("captures and restores each mixin slice independently", async () => {
    cloneFactories = {
      "/domain/gadget": () => new GadgetChest(),
      "/domain/trinket": () => new Trinket(),
    };
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    const gadget = makeStuffAtPath(() => new GadgetChest(), "/domain/gadget");
    gadget.setGradeBand("fine");
    gadget.initProp(Property.of<number>("charge"), { transient: false });
    gadget.setProp(Property.of<number>("charge"), 42);
    const trinket = makeStuffAtPath(() => new Trinket(), "/domain/trinket");
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
      "/domain/room",
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
      "/domain/chest": () => new ContentChest(),
      "/domain/trinket": () => new Trinket(),
    };
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    const chest = makeStuffAtPath(() => new ContentChest(), "/domain/chest");
    chest.setLabel("oak chest");
    const trinket = makeStuffAtPath(() => new Trinket(), "/domain/trinket");
    trinket.setTag("locket");
    ContainmentApi.move(trinket, chest);
    ContainmentApi.move(chest, room);

    await PersistableApi.capture(room);

    const reborn = await evictAndMaterialize(
      room,
      "/domain/room",
      () => new RoomHost(),
    );
    const rChest = reborn.getContents()[0] as ContentChest;
    expect(rChest.getLabel()).toBe("oak chest");
    expect((rChest.getContents()[0] as Trinket).getTag()).toBe("locket");
  });
});

describe("identical content chests differentiate by position (AC #5)", () => {
  it("two chests from one template restore distinct state onto distinct clones", async () => {
    cloneFactories = { "/domain/chest": () => new ContentChest() };
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    const a = makeStuffAtPath(() => new ContentChest(), "/domain/chest");
    const b = makeStuffAtPath(() => new ContentChest(), "/domain/chest");
    a.setLabel("first");
    b.setLabel("second");
    ContainmentApi.move(a, room);
    ContainmentApi.move(b, room);

    await PersistableApi.capture(room);

    const reborn = await evictAndMaterialize(
      room,
      "/domain/room",
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
      "/domain/hostchest": () => new HostChest(),
      "/domain/trinket": () => new Trinket(),
    };
    // The chest host is a player-owned title.
    (ParcelApi.ownerOf as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (p: string) =>
        p === "/domain/hostchest"
          ? { kind: "player", templatePath: "/obj/Avatar/alice" }
          : { kind: "group", name: "lounge" },
    );
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    const chest = makeStuffAtPath(() => new HostChest(), "/domain/hostchest");
    chest.setLabel("strongbox");
    const trinket = makeStuffAtPath(() => new Trinket(), "/domain/trinket");
    trinket.setTag("deed");
    ContainmentApi.move(trinket, chest);
    ContainmentApi.move(chest, room);

    await PersistableApi.capture(chest); // chest persists itself
    await PersistableApi.capture(room); // room references it

    const roomRec = snapshots.find((s) => s.scope === "/domain/room")!;
    expect(containerContents(roomRec)[0]).toEqual({
      ref: "/domain/hostchest",
      placement: {},
    });
    // The chest's OWN record holds its contents, keyed to the chest, owner=alice.
    const chestRec = snapshots.find((s) => s.scope === "/domain/hostchest")!;
    expect(chestRec.owner).toBe("/obj/Avatar/alice");
    expect(
      (containerContents(chestRec)[0] as { templatePath: string }).templatePath,
    ).toBe("/domain/trinket");

    // Move the chest to a new host and re-capture: the chest's record stays
    // keyed to the chest; only the new referrer changes.
    const room2 = makeStuffAtPath(() => new RoomHost(), "/domain/room-b");
    ContainmentApi.move(chest, room2);
    await PersistableApi.capture(room2);
    const room2Rec = snapshots.find((s) => s.scope === "/domain/room-b")!;
    expect(containerContents(room2Rec)[0]).toEqual({
      ref: "/domain/hostchest",
      placement: {},
    });
    // Chest's own record untouched (still keyed to the chest).
    expect(snapshots.find((s) => s.scope === "/domain/hostchest")!.owner).toBe(
      "/obj/Avatar/alice",
    );
  });

  it("materialize reconstructs the tree by following the reference", async () => {
    cloneFactories = {
      "/domain/hostchest": () => new HostChest(),
      "/domain/trinket": () => new Trinket(),
    };
    (ParcelApi.ownerOf as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (p: string) =>
        p === "/domain/hostchest"
          ? { kind: "player", templatePath: "/obj/Avatar/alice" }
          : { kind: "group", name: "lounge" },
    );
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    const chest = makeStuffAtPath(() => new HostChest(), "/domain/hostchest");
    chest.setLabel("strongbox");
    const trinket = makeStuffAtPath(() => new Trinket(), "/domain/trinket");
    trinket.setTag("deed");
    ContainmentApi.move(trinket, chest);
    ContainmentApi.move(chest, room);
    await PersistableApi.capture(chest);
    await PersistableApi.capture(room);

    // Evict everything; re-clone the room shell and materialize — the ref
    // walk clones the chest host (which self-materializes its own trinket).
    evict(room);
    StuffApi.unregister(chest);
    const reborn = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    await PersistableApi.materialize(reborn);

    const rChest = reborn.getContents()[0] as HostChest;
    expect(rChest.getLabel()).toBe("strongbox");
    expect((rChest.getContents()[0] as Trinket).getTag()).toBe("deed");
  });
});

describe("room decomposes by owner (AC #7)", () => {
  it("each principal's nested host-chest restores as its own owner", async () => {
    cloneFactories = { "/domain/chestA": () => new HostChest() };
    (ParcelApi.ownerOf as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (p: string) => {
        if (p === "/domain/chestA")
          return { kind: "player", templatePath: "/obj/Avatar/alice" };
        if (p === "/domain/chestB")
          return { kind: "player", templatePath: "/obj/Avatar/bob" };
        return { kind: "group", name: "lounge" };
      },
    );
    const chestA = makeStuffAtPath(() => new HostChest(), "/domain/chestA");
    const chestB = makeStuffAtPath(() => new HostChest(), "/domain/chestB");
    await PersistableApi.capture(chestA);
    await PersistableApi.capture(chestB);

    const owners = snapshots.map((s) => s.owner).sort();
    expect(owners).toEqual(["/obj/Avatar/alice", "/obj/Avatar/bob"]);
  });
});

describe("security (AC #8)", () => {
  it("a forged record cannot inject class/hydratorClass/brain or undeclared keys", async () => {
    cloneFactories = { "/domain/chest": () => new ContentChest() };
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    await PersistableApi.capture(room);
    // Forge: a content entry whose fields try to set executable-code fields.
    const forged = snapshots.find((s) => s.scope === "/domain/room")!;
    (forged.state as Record<string, { contents: unknown[] }>).ContainerMixin = {
      contents: [
        {
          templatePath: "/domain/chest",
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
      "/domain/room",
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
    cloneFactories = { "/domain/gadget": () => new GadgetChest() };
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    await PersistableApi.capture(room);
    const forged = snapshots.find((s) => s.scope === "/domain/room")!;
    (forged.state as Record<string, { contents: unknown[] }>).ContainerMixin = {
      contents: [
        {
          templatePath: "/domain/gadget",
          state: { GradedMixin: { fields: { gradeBand: "not-a-real-band" } } },
          placement: {},
        },
      ],
    };
    // The invariant setter throws → the record's restore aborts (atomic).
    evict(room);
    const reborn = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    await expect(PersistableApi.materialize(reborn)).rejects.toThrow();
  });

  it("the record store has no player-facing write surface on PersistableApi", () => {
    const surface = Object.getOwnPropertyNames(PersistableApi).filter(
      (n) => typeof (PersistableApi as unknown as Record<string, unknown>)[n] === "function",
    );
    // Only capture/materialize/hasRecord/deleteAllFor — no raw write/save.
    expect(surface.sort()).toEqual(
      ["capture", "deleteAllFor", "hasRecord", "materialize"].sort(),
    );
  });
});

describe("eviction seam (AC #9)", () => {
  it("a persistable host with contents does NOT veto; a non-persistable one does", () => {
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    const chest = makeStuffAtPath(() => new ContentChest(), "/domain/chest");
    ContainmentApi.move(chest, room);
    // Persistable host with contents → falls through (evicts after capture).
    expect(room.canEvict({ idleMs: 10, reason: "idle" }).ok).toBe(true);

    // Plain (non-persistable) container with contents → still vetoes.
    const plain = makeStuffAtPath(() => new ContentChest(), "/domain/plain");
    const inner = makeStuffAtPath(() => new Trinket(), "/domain/trinket");
    ContainmentApi.move(inner, plain);
    expect(plain.canEvict({ idleMs: 10, reason: "idle" }).ok).toBe(false);
  });
});

describe("seed-then-persist (AC #10)", () => {
  it("with NO record, applyPopulates delegates to the real seed path", async () => {
    cloneFactories = {};
    // No record for this scope → the gate delegates to PopulatesMixin, which
    // resolves the (unmocked) template and throws — proving the seed ran
    // rather than being skipped.
    const fresh = makeStuffAtPath(() => new RoomHost(), "/domain/fresh");
    await expect(fresh.applyPopulates(["/domain/chest"])).rejects.toThrow(
      /no template/,
    );
  });

  it("with a record present, applyPopulates SKIPS the seed (no duplication)", async () => {
    cloneFactories = { "/domain/chest": () => new ContentChest() };
    // Simulate a first materialization: seed manually, then capture — a
    // record now exists for the scope.
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    const chest = makeStuffAtPath(() => new ContentChest(), "/domain/chest");
    ContainmentApi.move(chest, room);
    await PersistableApi.capture(room);
    expect(await PersistableApi.hasRecord("/domain/room")).toBe(true);

    // Re-clone the shell at the same scope; applyPopulates finds the record
    // and returns early WITHOUT re-seeding.
    evict(room);
    const reborn = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    await reborn.applyPopulates(["/domain/chest"]);
    expect(reborn.getContents()).toHaveLength(0); // seed did not re-run
  });
});

describe("marshalled value round-trip (pre-build note #5 landmine)", () => {
  it("a rich marshalled property (a Quantity) survives capture → restore", async () => {
    installV1QuantityMarshallers();
    cloneFactories = { "/domain/gadget": () => new GadgetChest() };
    const room = makeStuffAtPath(() => new RoomHost(), "/domain/room");
    const gadget = makeStuffAtPath(() => new GadgetChest(), "/domain/gadget");
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
      "/domain/room",
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
    const room = makeStuffAtPath(() => new ContentChest(), "/domain/room-c");
    const mover = makeStuffAtPath(() => new MovableHost(), "/domain/mover");
    mover.setLabel("wanderer");
    ContainmentApi.move(mover, room);

    await PersistableApi.capture(mover);
    // The record carries the host's own placement.
    const rec = snapshots.find((s) => s.scope === "/domain/mover")!;
    expect(rec.place).toEqual({ container: "/domain/room-c" });

    // Evict just the mover (room stays registered); re-clone + materialize
    // → it re-homes into the room via the captured placement.
    StuffApi.unregister(mover);
    const reborn = makeStuffAtPath(() => new MovableHost(), "/domain/mover");
    await PersistableApi.materialize(reborn);
    expect(reborn.getLabel()).toBe("wanderer");
    expect(reborn.getContainer()).toBe(room);
  });
});

describe("persistence opt-out (guest skip)", () => {
  it("a host whose shouldPersist() is false writes and restores nothing", async () => {
    cloneFactories = {};
    const guest = makeStuffAtPath(() => new GuestLikeHost(), "/domain/guest");
    await PersistableApi.capture(guest);
    expect(snapshots).toHaveLength(0);
    expect(await PersistableApi.hasRecord("/domain/guest")).toBe(false);
    // materialize is a no-op (and never throws).
    await PersistableApi.materialize(guest);
  });
});

describe("account deletion cascade (AC #11)", () => {
  it("a keyed delete removes every record with owner = <player>", async () => {
    cloneFactories = {};
    (ParcelApi.ownerOf as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (p: string) => {
        if (p === "/domain/a")
          return { kind: "player", templatePath: "/obj/Avatar/alice" };
        if (p === "/domain/b")
          return { kind: "player", templatePath: "/obj/Avatar/alice" };
        return { kind: "player", templatePath: "/obj/Avatar/bob" };
      },
    );
    const a = makeStuffAtPath(() => new HostChest(), "/domain/a");
    const b = makeStuffAtPath(() => new HostChest(), "/domain/b");
    const c = makeStuffAtPath(() => new HostChest(), "/domain/c");
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
    cloneFactories = { "/domain/garment": () => new Garment() };
    const wearer = makeStuffAtPath(() => new Wearer(), "/domain/wearer");
    wearer.setStaticSlots([{ name: "torso", accepts: "SlottableMixin" }]);
    const garment = makeStuffAtPath(() => new Garment(), "/domain/garment");
    garment.setTag("cloak");
    ContainmentApi.move(garment, wearer); // in inventory
    SlotApi.occupyAll(wearer, garment, ["torso"]); // worn

    await PersistableApi.capture(wearer);
    const state = snapshots[0]!.state as Record<string, unknown>;
    expect((state.SlottedMixin as { worn: unknown[] }).worn).toEqual([
      { index: 0, slots: ["torso"] },
    ]);

    evict(wearer);
    const reborn = makeStuffAtPath(() => new Wearer(), "/domain/wearer");
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
