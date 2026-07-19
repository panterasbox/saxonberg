/**
 * ChattelRegistry / ChattelApi — the movable-good possession core (the
 * parcel-title twin, one cardinality down). Proves the P0 acceptance
 * criteria **independent of the shop**:
 *
 *   - `ownerOf(item) = stamp ?? authorOf` — a stamp overrides; an unstamped
 *     good resolves to its author; a stamped-then-`transfer`ed good
 *     re-resolves.
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
import { StuffApi } from "../../api/stuff";
import { MixinApi } from "../../api/mixin";
import { ContainmentApi } from "../../api/containment";
import { PersistableApi } from "../../api/persistable";
import { PersistableMixin } from "../../lib/persistence/Persistable";
import { ContainerMixin } from "../../lib/spatial/Container";
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

/* ─────────────────────────── fixtures ─────────────────────────── */

const TORCH_PATH = "/obj/test/Torch";

/** A plain movable good — Chattel identity rides in via `Thing`. */
class Torch extends Thing {}

/** A persistable container host (an Avatar / chest stand-in). */
class Vault extends PersistableMixin(
  ContainerMixin(PostRegistrationMixin(Idea)),
) {
  static persistentFields: string[] = [];
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
    expect(before?.templatePath).toBe("/obj/Avatar/alice");

    await ChattelApi.transfer(torch, bob);
    const after = await ChattelApi.ownerOf(torch);
    expect(after?.templatePath).toBe("/obj/Avatar/bob");

    // chattel_events records a mint then a transfer row (append-only).
    const events = await ChattelEvent.findByChattelId(torch.getChattelId());
    expect(events.map((e) => e.event)).toEqual(["mint", "transfer"]);
    expect(events[1]?.from?.templatePath).toBe("/obj/Avatar/alice");
    expect(events[1]?.to?.templatePath).toBe("/obj/Avatar/bob");
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
    expect(owner?.templatePath).toBe("/obj/Avatar/alice");
  });

  it("ownership survives a persistence round-trip", async () => {
    const torch = makeTorch();
    const alice = makeOwner("alice");
    const vault = makeStuffAtPath(() => new Vault(), "/obj/test/vault");

    await ChattelApi.stamp(torch, alice);
    const id = torch.getChattelId();
    ContainmentApi.move(
      torch as unknown as Stuff & Containable,
      vault as unknown as Stuff & Container,
    );

    // Capture the host + its contents, then reincarnate a fresh host — the
    // capture → evict → materialize round-trip (mirrors logout/reload; the
    // live clones are unregistered, not destructed, exactly as inventory
    // evacuates rather than firing onDestruct).
    await PersistableApi.capture(vault);
    for (const item of (vault as unknown as Stuff & Container).getDeepContents())
      StuffApi.unregister(item);
    StuffApi.unregister(vault);
    const reborn = makeStuffAtPath(() => new Vault(), "/obj/test/vault");
    await PersistableApi.materialize(reborn);

    const contents = ContainmentApi.getContents(
      reborn as unknown as Stuff & Container,
    );
    const restored = contents.find((s) => MixinApi.isChattel(s)) as
      | (Stuff & { getChattelId(): string })
      | undefined;
    expect(restored).toBeDefined();
    expect(restored!.getChattelId()).toBe(id);

    const owner = await ChattelApi.ownerOf(restored as Stuff);
    expect(owner?.templatePath).toBe("/obj/Avatar/alice");
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
