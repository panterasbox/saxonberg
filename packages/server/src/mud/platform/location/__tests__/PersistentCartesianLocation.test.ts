/**
 * PersistentCartesianLocation — the durable singleton coordinate room.
 *
 * Two things are worth pinning: the STACK (persistable + singleton +
 * populates + coordinates, each omission silent), and that
 * `StuffApi.singleton` establishes it exactly as it does any keyless
 * persistable singleton (restore-or-seed — the venue-room seam, proven
 * generically in `api/__tests__/stuff-singleton-establishes.test.ts`
 * and re-pinned here against THIS class so a stack regression fails
 * loudly).
 */
import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import PersistentCartesianLocation from "../PersistentCartesianLocation";
import { StuffApi } from "../../../api/stuff";
import { PersistableApi } from "../../../api/persistable";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../../lib/mixin";
import { makeStuff } from "../../../lib/security/__tests__/test-setup";

const ROOM_PATH = "/platform/location/PersistentCartesianLocation";

describe("PersistentCartesianLocation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("composes the durable-singleton-coordinate stack", () => {
    for (const m of [
      Mixins.Persistable,
      Mixins.Singleton,
      Mixins.Populates,
      Mixins.Container,
      Mixins.Exitable,
    ]) {
      expect(
        MixinApi.hasMixin(PersistentCartesianLocation, m),
        String(m),
      ).toBe(true);
    }
  });

  describe("StuffApi.singleton is its establishing context", () => {
    let room: PersistentCartesianLocation;
    let seed: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      StuffApi.clearAll();
      room = makeStuff(
        () => new PersistentCartesianLocation(),
      ) as PersistentCartesianLocation;
      seed = vi.fn(async () => undefined);
      (room as unknown as { seedBornWith: () => Promise<void> }).seedBornWith =
        seed;
      vi.spyOn(StuffApi, "clone").mockImplementation((async () =>
        room) as unknown as typeof StuffApi.clone);
      vi.spyOn(PersistableApi, "capture").mockResolvedValue(undefined);
      vi.spyOn(PersistableApi, "materialize").mockResolvedValue(undefined);
    });

    it("seeds born-with props and captures the first record when none exists", async () => {
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
  });
});
