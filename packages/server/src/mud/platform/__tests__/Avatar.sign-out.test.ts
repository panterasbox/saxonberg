/**
 * ⭐⭐ A signed-out body leaves the world; a linkdead one stays where it stands
 * (owner, controllers-are-io D30). Save, then destruct, and every way that
 * order can go wrong: a failed save, a login racing it, a body something is
 * still holding here, several tabs, and the goods it carried.
 */

import "../../../test-bootstrap";
import { describe, it, expect, vi, afterEach } from "vitest";
import Avatar from "../agent/PrimaryAvatar";
import { makeStuff } from "../../lib/security/__tests__/test-setup";
import { StuffApi } from "../../api/stuff";
import { CombatApi } from "../../api/combat";
import { ContainmentApi } from "../../api/containment";
import { BiomeApi } from "../../api/biome";
import { Idea } from "../../lib/stuff/Idea";
import { ContainerMixin } from "../../lib/spatial/Container";
import { ContainableMixin } from "../../lib/spatial/Containable";
import { PersistableApi } from "../../api/persistable";

class Room extends ContainerMixin(Idea) {}
class Goods extends ContainableMixin(Idea) {}

function body(id: string): Avatar {
  const a = makeStuff(() => new Avatar());
  (a as unknown as { playerId: string }).playerId = id;
  vi.spyOn(a, "save").mockResolvedValue(undefined);
  return a;
}
const settle = (): Promise<void> => new Promise((r) => setImmediate(r));
const signOut = async (a: Avatar): Promise<void> => {
  a.setLeaveIntent(true);
  a.onLinkdead();
  await settle();
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("signing out", () => {
  it("saves, THEN destructs", async () => {
    const a = body("so-order");
    const order: string[] = [];
    vi.spyOn(a, "save").mockImplementation(async () => {
      order.push("save");
    });
    const destruct = vi.spyOn(StuffApi, "destruct").mockImplementation(() => {
      order.push("destruct");
    });
    await signOut(a);
    expect(order).toEqual(["save", "destruct"]);
    expect(destruct).toHaveBeenCalledTimes(1);
  });

  it("⚠ a shift ends before the save: the record must not say on-shift, or the return's clock off pays the absence", async () => {
    const a = body("so-shift");
    const order: string[] = [];
    vi.spyOn(a, "leaveShifts").mockImplementation(async () => {
      order.push("leave shifts");
    });
    vi.spyOn(a, "save").mockImplementation(async () => {
      order.push("save");
    });
    vi.spyOn(StuffApi, "destruct").mockImplementation(() => undefined);
    await signOut(a);
    expect(order).toEqual(["leave shifts", "save"]);
  });

  it("a bare drop stays, linkdead, with its session open", async () => {
    const a = body("so-drop");
    (a as unknown as { sessionActive: boolean }).sessionActive = true;
    const destruct = vi.spyOn(StuffApi, "destruct");
    a.onLinkdead();
    await settle();
    expect(destruct).not.toHaveBeenCalled();
    expect(a.hasLiveSession()).toBe(true);
  });

  it("⚠ a failed save leaves the body standing, and tries again", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const a = body("so-fail");
    const save = vi.spyOn(a, "save").mockRejectedValueOnce(new Error("mongo down"));
    const destruct = vi.spyOn(StuffApi, "destruct").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await signOut(a);
    expect(destruct).not.toHaveBeenCalled();
    expect(a.isDestroyed()).toBe(false);
    await vi.advanceTimersByTimeAsync(Avatar.SIGN_OUT_RECHECK_MS + 1);
    await settle();
    expect(save).toHaveBeenCalledTimes(2);
    expect(destruct).toHaveBeenCalledTimes(1);
  });

  it("a login that lands during the save wins", async () => {
    const a = body("so-race");
    let finish: () => void = () => undefined;
    vi.spyOn(a, "save").mockImplementation(
      () => new Promise<void>((r) => { finish = r; }),
    );
    const destruct = vi.spyOn(StuffApi, "destruct");
    a.setLeaveIntent(true);
    a.onLinkdead();
    await settle();
    // The returning login has the body in hand, and has not entered it yet.
    a.claimForLogin();
    finish();
    await settle();
    expect(destruct).not.toHaveBeenCalled();
    expect(a.isDestroyed()).toBe(false);
  });

  it("⚠ mid-fight is no escape: it stays until the fight ends, then goes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const a = body("so-fight");
    const during = vi.spyOn(CombatApi, "sessionFor").mockReturnValue({} as never);
    const destruct = vi.spyOn(StuffApi, "destruct").mockImplementation(() => undefined);
    await signOut(a);
    expect(destruct).not.toHaveBeenCalled();
    during.mockReturnValue(undefined);
    await vi.advanceTimersByTimeAsync(Avatar.SIGN_OUT_RECHECK_MS + 1);
    await settle();
    expect(destruct).toHaveBeenCalledTimes(1);
  });

  it("⚠ dying is no escape", async () => {
    const a = body("so-dying");
    vi.spyOn(a, "isDying").mockReturnValue(true);
    const destruct = vi.spyOn(StuffApi, "destruct");
    await signOut(a);
    expect(destruct).not.toHaveBeenCalled();
    a.onDestruct();
  });

  it("parked keeps its veto: a parked body never starts leaving", async () => {
    const a = body("so-parked");
    a.setParked(true);
    const destruct = vi.spyOn(StuffApi, "destruct");
    await signOut(a);
    expect(destruct).not.toHaveBeenCalled();
    expect(a.isParked()).toBe(true);
    expect(a.canEvict({} as never).ok).toBe(false);
  });

  it("in water, the water holds it", async () => {
    const a = body("so-water");
    const room = makeStuff(() => new Room());
    ContainmentApi.move(a as never, room as never);
    const real = BiomeApi.mediumFor(a);
    vi.spyOn(BiomeApi, "mediumFor").mockReturnValue({ ...real, immersed: true, tag: "water" } as never);
    const destruct = vi.spyOn(StuffApi, "destruct");
    await signOut(a);
    expect(destruct).not.toHaveBeenCalled();
    a.onDestruct();
  });

  it("carried by somebody, it stays: it has no place of its own to come back to", async () => {
    const a = body("so-carried");
    const b = body("so-carrier");
    ContainmentApi.move(a as never, b as never);
    const destruct = vi.spyOn(StuffApi, "destruct");
    await signOut(a);
    expect(destruct).not.toHaveBeenCalled();
    a.onDestruct();
  });

  it("⭐ what it carried does not land on the floor (the record holds it)", async () => {
    vi.spyOn(PersistableApi, "capture").mockResolvedValue(undefined as never);
    const a = body("so-goods");
    const room = makeStuff(() => new Room());
    ContainmentApi.move(a as never, room as never);
    const good = makeStuff(() => new Goods());
    ContainmentApi.move(good as never, a as never);
    StuffApi.destruct(a);
    expect(room.getContents()).toHaveLength(0);
    expect(good.isDestroyed()).toBe(true);
  });

  it("a person it was holding steps out into the room", async () => {
    vi.spyOn(PersistableApi, "capture").mockResolvedValue(undefined as never);
    const a = body("so-holder");
    const b = body("so-held");
    const room = makeStuff(() => new Room());
    ContainmentApi.move(a as never, room as never);
    ContainmentApi.move(b as never, a as never);
    StuffApi.destruct(a);
    expect(room.getContents()).toContain(b);
  });

  it("the roster's unchosen body goes back; a played one does not", async () => {
    const unchosen = body("so-roster");
    const played = body("so-played");
    (played as unknown as { sessionActive: boolean }).sessionActive = true;
    const destruct = vi.spyOn(StuffApi, "destruct").mockImplementation(() => undefined);
    unchosen.retireIfSessionless();
    played.retireIfSessionless();
    await settle();
    expect(destruct).toHaveBeenCalledTimes(1);
    expect(destruct.mock.calls[0]?.[0]).toBe(unchosen);
  });
});
