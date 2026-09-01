/**
 * `StuffApi.singleton` is a persistable singleton's establishing context.
 *
 * A `FurnishableRoom` (a venue reached by an exit, or booted by a pack) and
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
import FurnishableRoom from "../../platform/location/FurnishableRoom";
import { StuffApi } from "../stuff";
import { PersistableApi } from "../persistable";
import { makeStuff } from "../../lib/security/__tests__/test-setup";

const ROOM_PATH = "/platform/location/FurnishableRoom";

describe("StuffApi.singleton establishes a persistable singleton", () => {
  let room: FurnishableRoom;
  let seed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    StuffApi.clearAll();
    // Registered with NO template-path stamp, so `singleton()` has to mint.
    room = makeStuff(() => new FurnishableRoom()) as FurnishableRoom;
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
