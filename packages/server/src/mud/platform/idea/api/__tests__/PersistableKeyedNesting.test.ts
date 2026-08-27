/**
 * Keyed nested hosts (husbandry Wave 2) — the `{ref, key}` extension of
 * the persistence spine, plus `PersistableApi.captureHostOf`.
 *
 * Before this build a nested host was captured as `{ref}` alone and
 * restored through a `findByTemplatePath` dedup — so two instances of one
 * template nested in one host would COLLAPSE into one on restore. The ref
 * entry now carries the nested host's per-instance key when it has one; a
 * keyed ref clones a fresh shell and materializes its `(scope, key)`
 * record. Keyless behaviour — and every record written before the change —
 * is unchanged (backward compatibility is a hard requirement; live data
 * exists). Harness mirrors persistence-spine.test.ts.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PersistableApi } from "../../../../api/persistable";
import { StuffApi } from "../../../../api/stuff";
import { ContainmentApi } from "../../../../api/containment";
import { ParcelApi } from "../../../../api/parcel";
import { MixinApi } from "../../../../api/mixin";
import PersistentHydrator from "../../persistence/PersistentHydrator";
import { PersistableMixin } from "../../../../lib/persistence/Persistable";
import { PersistenceManager } from "../../../../../backend/PersistenceManager";
import { Idea } from "../../../../lib/stuff/Idea";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { PostRegistrationMixin } from "../../../../lib/stuff/PostRegistration";
import { makeStuffAtPath } from "../../../../lib/security/__tests__/test-setup";
import type { FieldMeta } from "../../../../lib/mixin";

/* ─────────────────────────── fixtures ──────────────────────────────── */

// A persistable room-shaped outer host.
class Room extends PersistableMixin(
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

// A nestable persistable host — many instances share this one template,
// each keyed per instance (the plant/pet shape Wave 2 unlocks).
class KeyedChest extends PersistableMixin(
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

// A plain non-host content item.
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

// A plain non-persistable container (transient-space stand-in).
class PlainBox extends ContainerMixin(ContainableMixin(Idea)) {}

/* ─────────────────────────── harness ───────────────────────────────── */

let cloneFactories: Record<string, () => Stuff>;

async function mockClone(path: string): Promise<Stuff> {
  const factory = cloneFactories[path];
  if (!factory) throw new Error(`no clone factory for ${path}`);
  const inst = makeStuffAtPath(factory, path);
  if (MixinApi.isPersistable(inst)) {
    await (
      inst as unknown as { postRegister: () => Promise<void> }
    ).postRegister();
  }
  return inst;
}

let snapshots: Record<string, unknown>[];

beforeEach(() => {
  StuffApi.clearAll();
  snapshots = [];
  cloneFactories = {};

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

  vi.spyOn(StuffApi, "clone").mockImplementation(
    ((path: string) => mockClone(path)) as unknown as typeof StuffApi.clone,
  );

  vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue({
    kind: "group",
    name: "lounge",
  });

  makeStuffAtPath(
    () => new PersistentHydrator(),
    PersistentHydrator.templatePath,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

function evict(host: Stuff): void {
  if (MixinApi.isContainer(host)) {
    for (const item of host.getDeepContents()) StuffApi.unregister(item);
  }
  StuffApi.unregister(host);
}

function snapshotFor(scope: string, owner: string): Record<string, unknown> {
  const doc = snapshots.find((d) => d.scope === scope && d.owner === owner);
  expect(doc, `snapshot (${scope}, ${owner})`).toBeDefined();
  return doc!;
}

/* ─────────────────────────── the tests ─────────────────────────────── */

describe("keyed nested hosts — the collapse this wave prevents", () => {
  it("⭐ two keyed instances of one template restore as two distinct instances", async () => {
    cloneFactories = { "/obj/keyedchest": () => new KeyedChest() };
    const room = makeStuffAtPath(() => new Room(), "/world/room");
    const chestA = makeStuffAtPath(() => new KeyedChest(), "/obj/keyedchest");
    const chestB = makeStuffAtPath(() => new KeyedChest(), "/obj/keyedchest");
    chestA.setLabel("alpha");
    chestB.setLabel("beta");
    ContainmentApi.move(chestA, room);
    ContainmentApi.move(chestB, room);

    await PersistableApi.capture(chestA, "key-a");
    await PersistableApi.capture(chestB, "key-b");
    await PersistableApi.capture(room);

    // The room's slice refs both by (ref, key).
    const rec = snapshotFor("/world/room", "group:lounge");
    const contents = (
      (rec.state as Record<string, unknown>).ContainerMixin as {
        contents: Array<{ ref?: string; key?: string }>;
      }
    ).contents;
    expect(contents.map((e) => e.key).sort()).toEqual(["key-a", "key-b"]);

    evict(room);
    const reborn = makeStuffAtPath(() => new Room(), "/world/room");
    await PersistableApi.materialize(reborn);

    const restored = reborn
      .getContents()
      .filter((i): i is KeyedChest => i instanceof KeyedChest);
    expect(restored).toHaveLength(2); // NOT collapsed into one
    expect(restored.map((c) => c.getLabel()).sort()).toEqual([
      "alpha",
      "beta",
    ]);
    expect(restored.map((c) => c.getPersistenceKey()).sort()).toEqual([
      "key-a",
      "key-b",
    ]);
  });

  it("a keyless ref still resolves to the single live instance (no regression)", async () => {
    cloneFactories = { "/obj/keyedchest": () => new KeyedChest() };
    const room = makeStuffAtPath(() => new Room(), "/world/room");
    const chest = makeStuffAtPath(() => new KeyedChest(), "/obj/keyedchest");
    ContainmentApi.move(chest, room);

    await PersistableApi.capture(room); // chest never keyed → keyless ref

    evict(room);
    // The chest survives elsewhere (the singleton stays live) — re-register
    // it so the keyless walk's dedup has a live instance to find.
    const liveChest = makeStuffAtPath(() => new KeyedChest(), "/obj/keyedchest");
    const reborn = makeStuffAtPath(() => new Room(), "/world/room");
    await PersistableApi.materialize(reborn);

    const restored = reborn.getContents();
    expect(restored).toHaveLength(1);
    expect(restored[0]).toBe(liveChest); // the SAME live instance, not a clone
  });

  it("a record written before the key existed restores unchanged (live data)", async () => {
    cloneFactories = {
      "/obj/keyedchest": () => new KeyedChest(),
      "/obj/trinket": () => new Trinket(),
    };
    const room = makeStuffAtPath(() => new Room(), "/world/room");
    const chest = makeStuffAtPath(() => new KeyedChest(), "/obj/keyedchest");
    const trinket = makeStuffAtPath(() => new Trinket(), "/obj/trinket");
    trinket.setTag("ruby");
    ContainmentApi.move(trinket, chest);
    ContainmentApi.move(chest, room);

    await PersistableApi.capture(chest); // keyless — scope-derived owner
    await PersistableApi.capture(room);

    // The stored ref entry is byte-identical to the pre-key shape: no
    // `key` property at all (not even undefined/null).
    const rec = snapshotFor("/world/room", "group:lounge");
    const entry = (
      (rec.state as Record<string, unknown>).ContainerMixin as {
        contents: Array<Record<string, unknown>>;
      }
    ).contents[0]!;
    expect(entry.ref).toBe("/obj/keyedchest");
    expect("key" in entry).toBe(false);

    evict(room);
    const reborn = makeStuffAtPath(() => new Room(), "/world/room");
    await PersistableApi.materialize(reborn);

    const restoredChest = reborn.getContents()[0] as KeyedChest;
    expect(restoredChest).toBeInstanceOf(KeyedChest);
    const inner = restoredChest.getContents()[0] as Trinket;
    expect(inner.getTag()).toBe("ruby"); // its own record restored keylessly
  });

  it("a nested host's place is null; a top-level host captures its container", async () => {
    const room = makeStuffAtPath(() => new Room(), "/world/room");
    const nested = makeStuffAtPath(() => new KeyedChest(), "/obj/keyedchest");
    ContainmentApi.move(nested, room);
    await PersistableApi.capture(nested, "unit-1");
    expect(snapshotFor("/obj/keyedchest", "unit-1").place).toBeNull();

    // Top-level: the same shape sitting in transient (non-persistable)
    // space captures its own container path.
    const box = makeStuffAtPath(() => new PlainBox(), "/obj/plainbox");
    const roamer = makeStuffAtPath(() => new KeyedChest(), "/obj/roamchest");
    ContainmentApi.move(roamer, box);
    await PersistableApi.capture(roamer, "unit-2");
    expect(snapshotFor("/obj/roamchest", "unit-2").place).toEqual({
      container: "/obj/plainbox",
    });
  });
});

describe("PersistableApi.captureHostOf — the mutating-act capture", () => {
  it("captures a persistable target directly, under its stashed key", async () => {
    const chest = makeStuffAtPath(() => new KeyedChest(), "/obj/keyedchest");
    chest.setPersistenceKey("unit-9");
    chest.setLabel("mine");
    await PersistableApi.captureHostOf(chest);
    const rec = snapshotFor("/obj/keyedchest", "unit-9");
    expect(
      (
        (rec.state as Record<string, unknown>).KeyedChest as {
          fields: Record<string, unknown>;
        }
      ).fields.label,
    ).toBe("mine");
  });

  it("walks a non-persistable item to its nearest persistable ancestor", async () => {
    const chest = makeStuffAtPath(() => new KeyedChest(), "/obj/keyedchest");
    chest.setPersistenceKey("unit-3");
    const box = makeStuffAtPath(() => new PlainBox(), "/obj/plainbox");
    const trinket = makeStuffAtPath(() => new Trinket(), "/obj/trinket");
    ContainmentApi.move(box, chest);
    ContainmentApi.move(trinket, box); // trinket → box → chest (the host)

    await PersistableApi.captureHostOf(trinket);
    const rec = snapshotFor("/obj/keyedchest", "unit-3");
    const contents = (
      (rec.state as Record<string, unknown>).ContainerMixin as {
        contents: unknown[];
      }
    ).contents;
    expect(contents).toHaveLength(1); // the box (with the trinket inside)
  });

  it("no persistable ancestor is a clean no-op, not a throw", async () => {
    const box = makeStuffAtPath(() => new PlainBox(), "/obj/plainbox");
    const trinket = makeStuffAtPath(() => new Trinket(), "/obj/trinket");
    ContainmentApi.move(trinket, box);
    await expect(
      PersistableApi.captureHostOf(trinket),
    ).resolves.toBeUndefined();
    expect(snapshots).toHaveLength(0);
  });

  it("terminates at the hop cap on a pathologically deep chain", async () => {
    // Deeper than the 32-hop cap, no persistable anywhere: must return
    // cleanly (the cycle guard is this same bound).
    const innermost = makeStuffAtPath(() => new Trinket(), "/obj/trinket");
    let cur: Stuff = innermost;
    for (let i = 1; i <= 40; i++) {
      const box = makeStuffAtPath(() => new PlainBox(), `/obj/box-${i}`);
      ContainmentApi.move(
        cur as InstanceType<typeof Trinket> | InstanceType<typeof PlainBox>,
        box,
      );
      cur = box;
    }
    await expect(
      PersistableApi.captureHostOf(innermost),
    ).resolves.toBeUndefined();
    expect(snapshots).toHaveLength(0);
  });
});
