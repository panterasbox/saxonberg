/**
 * The commuting-cast fix (farming Wave A1) — cast is CAST, never content.
 *
 * A `Behaved` NPC commutes between persistable rooms (its floor and the
 * counter it consigns at), so before the third capture skip BOTH rooms'
 * records could carry it and the next boot restored it twice: `expected
 * singleton, found 2` — boot dead. Verified live before the fix. Three
 * halves, each proven here:
 *
 *   1. **Capture skips the cast** — a Behaved occupant never enters a
 *      container slice; ordinary content still does.
 *   2. **Restore skips a legacy cast entry** — a record written before
 *      the rule restores without re-minting the NPC.
 *   3. **`reseedTransientCast` re-seeds exactly once** — a restored room
 *      whose `populates:` declares cast gets its troupe back, and a live
 *      instance ANYWHERE (mid-commute at the counter) suppresses the
 *      re-mint: the cast is conserved.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PersistableApi } from "../../../api/persistable";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { ParcelApi } from "../../../api/parcel";
import { MixinApi } from "../../../api/mixin";
import PersistentHydrator from "../../../platform/idea/persistence/PersistentHydrator";
import { PersistableMixin } from "../Persistable";
import { Template } from "../../stuff/Template";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { Idea } from "../../stuff/Idea";
import type { Stuff } from "../../stuff/Stuff";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { PopulatesMixin } from "../../stuff/Populates";
import { PostRegistrationMixin } from "../../stuff/PostRegistration";
import { BehavedMixin } from "../../behavior/Behaved";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";

/* ─────────────────────────── fixtures ──────────────────────────────── */

// A persistable room that declares born-with cast via `populates:`.
class CastRoom extends PersistableMixin(
  PopulatesMixin(ContainerMixin(PostRegistrationMixin(Idea))),
) {}

// The cast — a Behaved containable (the hand that commutes).
class Hand extends BehavedMixin(ContainableMixin(Idea)) {}

// Ordinary content — persists in the room's record as ever.
class Trinket extends ContainableMixin(Idea) {}

const FLOOR = "/world/cast/floor";
const COUNTER = "/world/cast/counter";
const HAND = "/world/cast/agent/hand";
const HAND_CLASS = "/platform/agent/NPC";
const TRINKET = "/world/cast/thing/trinket";

/* ─────────────────────────── PM + clone mocks ──────────────────────── */

let snapshots: Record<string, unknown>[];

const factories: Record<string, () => Stuff> = {
  [HAND]: () => new Hand(),
  [TRINKET]: () => new Trinket(),
};

async function mockClone(path: string): Promise<Stuff> {
  const factory = factories[path];
  if (!factory) throw new Error(`no clone factory for ${path}`);
  return makeStuffAtPath(factory, path);
}

beforeEach(() => {
  StuffApi.clearAll();
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
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);

  vi.spyOn(StuffApi, "clone").mockImplementation(
    ((path: string) => mockClone(path)) as unknown as typeof StuffApi.clone,
  );

  // The cast template resolves to the Behaved class; the trinket to none
  // (an ordinary row the real store would resolve — the restore-skip
  // helper answers `false` for it either way).
  vi.spyOn(Template, "findByPath").mockImplementation((async (path: string) =>
    path === HAND
      ? ({ class: HAND_CLASS } as unknown as Template)
      : null) as unknown as typeof Template.findByPath);
  vi.spyOn(StuffApi, "loadClassByPath").mockImplementation((async (
    classPath: string,
  ) => {
    if (classPath === HAND_CLASS) return Hand;
    throw new Error(`no blueprint at ${classPath}`);
  }) as unknown as typeof StuffApi.loadClassByPath);

  vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue({
    kind: "group",
    name: "cast-test",
  });

  makeStuffAtPath(
    () => new PersistentHydrator(),
    PersistentHydrator.templatePath,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ─────────────────────────── helpers ───────────────────────────────── */

function evict(host: Stuff): void {
  if (MixinApi.isContainer(host)) {
    for (const item of host.getDeepContents()) StuffApi.unregister(item);
  }
  StuffApi.unregister(host);
}

/** The container slice of the one stored snapshot for `scope`. */
function containerSliceOf(scope: string): { contents: unknown[] } {
  const rec = snapshots.find((d) => d.scope === scope);
  expect(rec).toBeDefined();
  const state = rec!.state as Record<string, unknown>;
  const slice = Object.values(state).find(
    (s) => s !== null && typeof s === "object" && "contents" in (s as object),
  );
  expect(slice).toBeDefined();
  return slice as { contents: unknown[] };
}

/* ─────────────────────────── the tests ─────────────────────────────── */

describe("capture: the third skip", () => {
  it("⭐ a Behaved occupant never enters the container slice", async () => {
    const floor = makeStuffAtPath(() => new CastRoom(), FLOOR);
    const hand = makeStuffAtPath(() => new Hand(), HAND);
    const trinket = makeStuffAtPath(() => new Trinket(), TRINKET);
    ContainmentApi.move(hand, floor);
    ContainmentApi.move(trinket, floor);

    await PersistableApi.capture(floor);

    const slice = containerSliceOf(FLOOR);
    expect(slice.contents).toHaveLength(1);
    expect(
      (slice.contents[0] as { templatePath?: string }).templatePath,
    ).toBe(TRINKET);
    // The skip is a skip, not a destruct — the live hand still stands.
    expect(hand.isDestroyed()).toBe(false);
    expect(hand.getContainer()).toBe(floor);
  });
});

describe("restore: the symmetric skip", () => {
  it("a legacy record's cast entry restores NOTHING (and reseed replaces it)", async () => {
    const floor = makeStuffAtPath(() => new CastRoom(), FLOOR);
    const trinket = makeStuffAtPath(() => new Trinket(), TRINKET);
    ContainmentApi.move(trinket, floor);
    await PersistableApi.capture(floor);

    // Forge the pre-rule shape: the record carries the hand as CONTENT.
    containerSliceOf(FLOOR).contents.push({
      templatePath: HAND,
      state: {},
      placement: {},
    });

    evict(floor);
    const reborn = makeStuffAtPath(() => new CastRoom(), FLOOR);
    await reborn.applyPopulates([HAND]); // the retained born-with spec
    await PersistableApi.materialize(reborn);

    // ONE hand: the legacy entry was skipped, the reseed minted it.
    const hands = StuffApi.findAllByTemplatePath(HAND);
    expect(hands).toHaveLength(1);
    expect(hands[0]!.getContainer()).toBe(reborn);
    // The trinket restored as ordinary content beside it.
    expect(
      reborn.getContents().filter((s) => s instanceof Trinket),
    ).toHaveLength(1);
  });
});

describe("reseedTransientCast", () => {
  it("⭐ mints once — a second materialize does not double the troupe", async () => {
    const floor = makeStuffAtPath(() => new CastRoom(), FLOOR);
    await PersistableApi.capture(floor);

    evict(floor);
    const reborn = makeStuffAtPath(() => new CastRoom(), FLOOR);
    await reborn.applyPopulates([HAND]);
    await PersistableApi.materialize(reborn);
    expect(StuffApi.findAllByTemplatePath(HAND)).toHaveLength(1);

    // Reseed again on the live room: the live hand suppresses the mint.
    await reborn.reseedTransientCast();
    expect(StuffApi.findAllByTemplatePath(HAND)).toHaveLength(1);
  });

  it("⭐ live cast is CONSERVED — a hand mid-commute suppresses the re-mint", async () => {
    const floor = makeStuffAtPath(() => new CastRoom(), FLOOR);
    const counter = makeStuffAtPath(() => new CastRoom(), COUNTER);
    const hand = makeStuffAtPath(() => new Hand(), HAND);
    ContainmentApi.move(hand, counter); // commuted — standing at the counter
    await PersistableApi.capture(floor);

    evict(floor);
    const reborn = makeStuffAtPath(() => new CastRoom(), FLOOR);
    await reborn.applyPopulates([HAND]);
    await PersistableApi.materialize(reborn);

    // No second hand: the one at the counter is THE hand.
    expect(StuffApi.findAllByTemplatePath(HAND)).toHaveLength(1);
    expect(hand.getContainer()).toBe(counter);
  });

  it("a non-Behaved born-with spec is left to the record", async () => {
    const floor = makeStuffAtPath(() => new CastRoom(), FLOOR);
    await PersistableApi.capture(floor);
    evict(floor);
    const reborn = makeStuffAtPath(() => new CastRoom(), FLOOR);
    await reborn.applyPopulates([TRINKET]);
    await PersistableApi.materialize(reborn);
    // Not re-seeded: the trinket is ordinary content, the record owns it
    // (and this record has none — the room was captured empty).
    expect(StuffApi.findAllByTemplatePath(TRINKET)).toHaveLength(0);
  });
});
