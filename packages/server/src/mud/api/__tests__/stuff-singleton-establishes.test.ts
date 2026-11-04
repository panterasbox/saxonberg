/**
 * `StuffApi.singleton` is a persistable singleton's establishing context.
 *
 * A `PersistentLocation` (a venue reached by an exit, or booted by a pack) and
 * a `Stock` counter (placed by a room's `props:`) are persistable
 * hosts with ONE instance per template path. On a persistable host
 * `applyProps` only retains the specs; something has to decide
 * restore-vs-seed, and for a keyed multi-instance host that is its
 * provisioner (`DormWarren.admit`). For a singleton nothing did — the
 * libations live drive walked into a bare cash-and-carry, a bare sports
 * booth. Now the mint through `singleton()` restores when a record exists
 * under the scope, else seeds the born-with fixtures and captures the
 * first record. A host that already carries a key is left to its
 * provisioner.
 */
import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import PersistentLocation from "../../platform/location/PersistentLocation";
import { StuffApi } from "../stuff";
import { PersistableApi } from "../persistable";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../lib/security/__tests__/test-setup";

const ROOM_PATH = "/platform/location/PersistentLocation";

describe("StuffApi.singleton establishes a persistable singleton", () => {
  let room: PersistentLocation;
  let seed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    StuffApi.clearAll();
    // Registered with NO template-path stamp, so `singleton()` has to mint.
    room = makeStuff(() => new PersistentLocation()) as PersistentLocation;
    seed = vi.fn(async () => undefined);
    (room as unknown as { seedBornWith: () => Promise<void> }).seedBornWith =
      seed;
    vi.spyOn(StuffApi, "clone").mockImplementation((async () =>
      room) as unknown as typeof StuffApi.clone);
    vi.spyOn(PersistableApi, "capture").mockResolvedValue(undefined);
    vi.spyOn(PersistableApi, "materialize").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("seeds the born-with fixtures and captures the first record when none exists", async () => {
    vi.spyOn(PersistableApi, "hasRecord").mockResolvedValue(false);
    const got = await StuffApi.singleton(ROOM_PATH);
    expect(got).toBe(room);
    expect(seed).toHaveBeenCalledTimes(1);
    expect(PersistableApi.capture).toHaveBeenCalledWith(room);
    expect(PersistableApi.materialize).not.toHaveBeenCalled();
  });

  it("restores instead of seeding when the scope already has a record", async () => {
    vi.spyOn(PersistableApi, "hasRecord").mockResolvedValue(true);
    await StuffApi.singleton(ROOM_PATH);
    expect(seed).not.toHaveBeenCalled();
    expect(PersistableApi.materialize).toHaveBeenCalledWith(room);
    expect(PersistableApi.capture).not.toHaveBeenCalled();
  });

  it("leaves a host that already carries a key to its provisioner", async () => {
    vi.spyOn(PersistableApi, "hasRecord").mockResolvedValue(false);
    room.setPersistenceKey("unit-7");
    await StuffApi.singleton(ROOM_PATH);
    expect(seed).not.toHaveBeenCalled();
    expect(PersistableApi.capture).not.toHaveBeenCalled();
  });
});

/**
 * ⭐ `singletonOrClone` on a `Persistable` that is NOT `Singleton` (a
 * `Compartment`, a `PersistentLocation`): a landing by its bare path is the
 * row's one record — get-or-create through `singleton()`, never a second
 * bare clone (the harbors drive: every landing on the Hesper's deck by path
 * minted another, empty, deck). A row whose live instances are keyed is
 * named by its handle, so the bare row throws.
 */
describe("StuffApi.singletonOrClone on a persistable, non-singleton class", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    vi.spyOn(StuffApi, "classForRef").mockResolvedValue(
      PersistentLocation as never,
    );
    vi.spyOn(PersistableApi, "hasRecord").mockResolvedValue(false);
    vi.spyOn(PersistableApi, "capture").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes through singleton() — the second landing gets the first room", async () => {
    const room = makeStuff(() => new PersistentLocation()) as PersistentLocation;
    const single = vi
      .spyOn(StuffApi, "singleton")
      .mockResolvedValue(room as never);
    const clone = vi.spyOn(StuffApi, "clone");
    expect(await StuffApi.singletonOrClone(ROOM_PATH)).toBe(room);
    expect(await StuffApi.singletonOrClone(ROOM_PATH)).toBe(room);
    expect(single).toHaveBeenCalledTimes(2);
    expect(clone).not.toHaveBeenCalled();
  });

  it("reuses a singleton whose first capture stashed its scope-derived owner", async () => {
    const room = makeStuffAtPath(
      () => new PersistentLocation(),
      ROOM_PATH,
    ) as PersistentLocation;
    room.setPersistenceKey("group:terminus", false);
    expect(await StuffApi.singletonOrClone(ROOM_PATH)).toBe(room);
  });

  it("throws on a bare row whose live instances are keyed", async () => {
    const unit = makeStuffAtPath(
      () => new PersistentLocation(),
      ROOM_PATH,
    ) as PersistentLocation;
    unit.setPersistenceKey("unit-7");
    await expect(StuffApi.singletonOrClone(ROOM_PATH)).rejects.toThrow(
      /keyed/,
    );
  });
});


/**
 * ⭐ A `WarrenMember` room that keeps no record (an authored ship's deck, a
 * plain `Compartment` since harbors review 2) is the same case: a landing
 * by its row's path gets the one standing room. The harbors drive
 * (2026-11-03) found eleven Corrigan decks — one per founder login on her
 * deck — and her `watchRoom` read none of them.
 */
describe("StuffApi.singletonOrClone on a warren member that keeps no record", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes through singleton(), never a second clone", async () => {
    StuffApi.clearAll();
    const { default: Compartment } = await import(
      "../../platform/location/Compartment"
    );
    vi.spyOn(StuffApi, "classForRef").mockResolvedValue(Compartment as never);
    const room = makeStuff(() => new Compartment());
    const single = vi
      .spyOn(StuffApi, "singleton")
      .mockResolvedValue(room as never);
    const clone = vi.spyOn(StuffApi, "clone");
    expect(await StuffApi.singletonOrClone("/test/ship/deck")).toBe(room);
    expect(await StuffApi.singletonOrClone("/test/ship/deck")).toBe(room);
    expect(single).toHaveBeenCalledTimes(2);
    expect(clone).not.toHaveBeenCalled();
  });
});
