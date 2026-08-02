/**
 * ChattelRegistry / ChattelApi — the movable-good possession core (the
 * parcel-title twin, one cardinality down). Proves the P0 acceptance
 * criteria **independent of the shop**:
 *
 *   - `ownerOf(item) = stamp ?? parcel-extent ?? authorOf` — three rungs,
 *     total. A stamp overrides; an unstamped good under a parcel extent is
 *     the parcel owner's (D5 — a landlord owns the fixtures in a unit they
 *     let); outside any extent it resolves to its author, unchanged; a
 *     stamped-then-`transfer`ed good re-resolves.
 *   - ownership survives a **container move** and a **persistence
 *     round-trip** (capture → clone → materialize restores the `_chattelId`
 *     and `ownerOf` still resolves).
 *   - `chattel_events` records a `mint` then a `transfer` row.
 *   - a fungible stack (`Globbable`) is **refused** (owned-by-possession).
 *   - GC on destruct releases the current-state row + appends a terminal
 *     `released` event; a fresh clone is unaffected.
 *
 * Harness: a generic multi-collection in-memory `PersistenceManager` (the
 * `ParcelRegistry` test shape) over the real `ChattelRecord` /
 * `ChattelEvent` / `PersistedRecord` documents, the registry stood up via
 * `makeStuffAtPath`, and `StuffApi.clone` mocked to fresh fixtures (the
 * persistence-spine stand-in).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ChattelRegistry from "../ChattelRegistry";
import Thing from "../../lib/stuff/Thing";
import { ChattelApi } from "../../api/chattel";
import { ParcelApi } from "../../api/parcel";
import { StuffApi } from "../../api/stuff";
import { MixinApi } from "../../api/mixin";
import { ContainmentApi } from "../../api/containment";
import { PersistableApi } from "../../api/persistable";
import { PersistableMixin } from "../../lib/persistence/Persistable";
import { ContainerMixin } from "../../lib/spatial/Container";
import { EstateMixin } from "../../lib/chattel/Estate";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { Idea } from "../../lib/stuff/Idea";
import PersistentHydrator from "../../lib/persistence/PersistentHydrator";
import { ChattelEvent } from "../../lib/chattel/ChattelEvent";
import { Document } from "../../lib/persistence/Document";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Container } from "../../lib/spatial/Container";
import type { Containable } from "../../lib/spatial/Containable";
import type { FieldMeta } from "../../lib/mixin";

/* ─────────────────────────── fixtures ─────────────────────────── */

const TORCH_PATH = "/obj/test/Torch";

/** A plain movable good — Chattel identity rides in via `Thing`. */
class Torch extends Thing {}

/** A persistable container host (an Avatar / chest stand-in). */
class Vault extends PersistableMixin(
  ContainerMixin(PostRegistrationMixin(Idea)),
) {
  static fieldMeta: FieldMeta = {};
}

/** An OWNER: the same, plus the estate a stamped good persists into (D1). */
class EstateHolder extends PersistableMixin(
  EstateMixin(ContainerMixin(PostRegistrationMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {};
}

/* ─────────────────────────── PM mock ─────────────────────────── */

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
      return arr.filter((d) =>
        keys.every((k) => {
          const stored = d[k];
          const wanted = query[k];
          if (Array.isArray(stored)) return stored.includes(wanted);
          return stored === wanted;
        }),
      );
    },
  );
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  // Thing composes WetMixin's marshalled Quantity gauge — register the
  // v1 quantity marshallers so the round-trip's restore can resolve it.
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

async function boot(): Promise<void> {
  const reg = makeStuffAtPath(
    () => new ChattelRegistry(),
    "/obj/ChattelRegistry",
  );
  await reg.postRegister();
  makeStuffAtPath(
    () => new PersistentHydrator(),
    PersistentHydrator.templatePath,
  );
  // Item reconstitution → fresh Torch fixtures (the gated clone stand-in).
  vi.spyOn(StuffApi, "clone").mockImplementation(
    ((path: string) =>
      Promise.resolve(
        makeStuffAtPath(() => new Torch(), path),
      )) as unknown as typeof StuffApi.clone,
  );
}

function makeTorch(): Torch {
  return makeStuffAtPath(() => new Torch(), TORCH_PATH);
}

function makeOwner(id: string): Stuff {
  // A minimal owner principal — only its templatePath is read.
  return makeStuffAtPath(() => new Idea(), `/obj/Avatar/${id}`);
}

beforeEach(async () => {
  StuffApi.clearAll();
  installStore();
  await boot();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ─────────────────────────── tests ─────────────────────────── */

describe("chattel possession core", () => {
  it("stamp establishes ownership; ownerOf resolves to the stamp", async () => {
    const torch = makeTorch();
    const alice = makeOwner("alice");

    const result = await ChattelApi.stamp(torch, alice);
    expect(result.ok).toBe(true);
    expect(torch.getChattelId()).not.toBe("");

    const owner = await ChattelApi.ownerOf(torch);
    expect(owner).toEqual({ kind: "player", templatePath: "/obj/Avatar/alice" });
  });

  it("transfer re-stamps; ownerOf follows the new owner", async () => {
    const torch = makeTorch();
    const alice = makeOwner("alice");
    const bob = makeOwner("bob");

    await ChattelApi.stamp(torch, alice);
    const before = await ChattelApi.ownerOf(torch);
    expect(before).toEqual({ kind: "player", templatePath: "/obj/Avatar/alice" });

    await ChattelApi.transfer(torch, bob);
    const after = await ChattelApi.ownerOf(torch);
    expect(after).toEqual({ kind: "player", templatePath: "/obj/Avatar/bob" });

    // chattel_events records a mint then a transfer row (append-only).
    const events = await ChattelEvent.findByChattelId(torch.getChattelId());
    expect(events.map((e) => e.event)).toEqual(["mint", "transfer"]);
    expect(events[1]?.from).toEqual({ kind: "player", templatePath: "/obj/Avatar/alice" });
    expect(events[1]?.to).toEqual({ kind: "player", templatePath: "/obj/Avatar/bob" });
  });

  it("ownership is unchanged by a container move (custody ≠ ownership)", async () => {
    const torch = makeTorch();
    const alice = makeOwner("alice");
    const box = makeStuffAtPath(() => new Vault(), "/obj/test/box");

    await ChattelApi.stamp(torch, alice);
    ContainmentApi.move(
      torch as unknown as Stuff & Containable,
      box as unknown as Stuff & Container,
    );

    const owner = await ChattelApi.ownerOf(torch);
    expect(owner).toEqual({ kind: "player", templatePath: "/obj/Avatar/alice" });
  });

  it("ownership survives a persistence round-trip — now OWNER-side", async () => {
    // D2 changed which record carries a stamped good: a foreign container
    // (this vault) no longer persists it, because someone else holds title.
    // It rides that owner's ESTATE instead, and the identity + title that
    // this test has always guarded survive the round-trip unchanged — which
    // is the criterion, independent of which scope stores it.
    const torch = makeTorch();
    const alice = makeStuffAtPath(() => new EstateHolder(), "/obj/Avatar/alice");
    const vault = makeStuffAtPath(() => new Vault(), "/obj/test/vault");

    await ChattelApi.stamp(torch, alice);
    const id = torch.getChattelId();
    ContainmentApi.move(
      torch as unknown as Stuff & Containable,
      vault as unknown as Stuff & Container,
    );
    await ChattelApi.setPlace(torch, "inventory");

    // The vault captures WITHOUT the torch (the skip rule), and the flush
    // hands it to Alice; then Alice round-trips, carrying it.
    await PersistableApi.capture(vault);
    await PersistableApi.capture(alice);
    for (const item of (vault as unknown as Stuff & Container).getDeepContents())
      StuffApi.unregister(item);
    StuffApi.unregister(vault);
    StuffApi.unregister(alice);

    const reborn = makeStuffAtPath(() => new EstateHolder(), "/obj/Avatar/alice");
    await PersistableApi.materialize(reborn);

    const contents = (reborn as unknown as Stuff & Container).getContents();
    const restored = contents.find((s) => MixinApi.isChattel(s)) as
      | (Stuff & { getChattelId(): string })
      | undefined;
    expect(restored).toBeDefined();
    expect(restored!.getChattelId()).toBe(id);

    const owner = await ChattelApi.ownerOf(restored as Stuff);
    expect(owner).toEqual({ kind: "player", templatePath: "/obj/Avatar/alice" });
  });

  it("an unstamped good resolves to its author (stamp ?? authorOf)", async () => {
    const torch = makeTorch();
    // Seed the authorship ledger for the torch's template path.
    col("authoring_events").push({
      _id: "ae1",
      path: TORCH_PATH,
      author: "/obj/Avatar/carol",
      kind: "save",
      at: 100,
      realAt: 100,
    });

    expect(torch.getChattelId()).toBe("");
    const owner = await ChattelApi.ownerOf(torch);
    expect(owner).toEqual({ kind: "player", templatePath: "/obj/Avatar/carol" });
  });

  // ── rung 2: the parcel extent (D5) ──────────────────────────────────
  //
  // `ownerOf` is three rungs and total: `stamp ?? parcel-extent ??
  // authorOf`. The rung is inserted ABOVE the author fallback so that a
  // good outside any extent resolves exactly as it did before it existed
  // (the test above is that regression, and it passes unchanged because
  // `coveringParcelOf` returns null with no covering parcel).
  //
  // `coveringParcelOf` is the seam here, NOT `ParcelApi.ownerOf` — the
  // latter is *total* (it falls back to the state, `{kind:'group',
  // name:'core'}`), so building the rung on it would make the author rung
  // unreachable and silently retitle every authored good in the world.
  // That is exactly what this pair of tests pins.

  it("rung 2: an unstamped good under a parcel extent is the parcel owner's", async () => {
    const torch = makeTorch();
    col("authoring_events").push({
      _id: "ae2",
      path: TORCH_PATH,
      author: "/obj/Avatar/carol",
      kind: "save",
      at: 100,
      realAt: 100,
    });
    vi.spyOn(ParcelApi, "coveringParcelOf").mockResolvedValue({
      getOwner: () => ({ kind: "player", templatePath: "/obj/Avatar/landlord" }),
    } as unknown as Awaited<ReturnType<typeof ParcelApi.coveringParcelOf>>);

    // The landlord, NOT carol the author — a tenancy needs a landlord who
    // is a person in the fiction, and the parcel is exactly that person.
    expect(await ChattelApi.ownerOf(torch)).toEqual({
      kind: "player",
      templatePath: "/obj/Avatar/landlord",
    });
  });

  it("rung 2 resolves a GROUP-held parcel — the read-side widening", async () => {
    const torch = makeTorch();
    vi.spyOn(ParcelApi, "coveringParcelOf").mockResolvedValue({
      getOwner: () => ({ kind: "group", name: "core" }),
    } as unknown as Awaited<ReturnType<typeof ParcelApi.coveringParcelOf>>);

    // `ChattelOwner`'s group arm exists only so a group-held parcel is
    // expressible as a RESOLVED answer. Nothing stamps it: the `chattel`
    // collection stays empty here, so the persisted schema is untouched.
    expect(await ChattelApi.ownerOf(torch)).toEqual({
      kind: "group",
      name: "core",
    });
    expect(col("chattel").length).toBe(0);
  });

  it("rung 1 still wins over rung 2 — a stamp beats the extent", async () => {
    const torch = makeTorch();
    const alice = makeOwner("alice");
    await ChattelApi.stamp(torch, alice);
    vi.spyOn(ParcelApi, "coveringParcelOf").mockResolvedValue({
      getOwner: () => ({ kind: "player", templatePath: "/obj/Avatar/landlord" }),
    } as unknown as Awaited<ReturnType<typeof ParcelApi.coveringParcelOf>>);

    // Only an explicit stamp transfers a fixture. A good that has changed
    // hands inside a let unit stays the holder's.
    expect(await ChattelApi.ownerOf(torch)).toEqual({
      kind: "player",
      templatePath: "/obj/Avatar/alice",
    });
  });

  it("refuses a fungible stack — owned by possession, never stamped", async () => {
    const glob = makeTorch();
    const alice = makeOwner("alice");
    vi.spyOn(MixinApi, "isGlobbable").mockImplementation((o) => o === glob);

    const stamp = await ChattelApi.stamp(glob, alice);
    expect(stamp.ok).toBe(false);
    if (!stamp.ok) expect(stamp.reason).toMatch(/possession/);

    // ownerOf of a glob is null (not asked; owned-by-possession).
    expect(await ChattelApi.ownerOf(glob)).toBeNull();
    expect(glob.getChattelId()).toBe("");
  });

  it("GC on destruct releases the current-state row + logs a terminal event", async () => {
    const torch = makeTorch();
    const alice = makeOwner("alice");
    await ChattelApi.stamp(torch, alice);
    const id = torch.getChattelId();
    expect(col("chattel").some((d) => d.chattelId === id)).toBe(true);

    StuffApi.destruct(torch);
    // onDestruct fires a fire-and-forget async release; let it settle.
    await new Promise((r) => setImmediate(r));

    expect(col("chattel").some((d) => d.chattelId === id)).toBe(false);
    const events = await ChattelEvent.findByChattelId(id);
    expect(events.at(-1)?.event).toBe("released");

    // A fresh, unrelated clone is unaffected — resolves via author fallback.
    const fresh = makeTorch();
    expect(await ChattelApi.ownerOf(fresh)).toBeNull();
  });
});
