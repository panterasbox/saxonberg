/**
 * Sleep-as-logout — the occupancy round-trip (wave 9, D10).
 *
 * Sleep is this game's logout state, and the shipped rest model does not
 * stop at disconnect: metabolism recovers by `posture × restQuality`,
 * reconciled on read. Log out lying on a good bed and tomorrow's reconcile
 * integrates the elapsed hours at THAT BED'S multiplier.
 *
 * The one piece of real work is here. `PosedMixin` persists the posture,
 * but `getOccupiedHost()` is a **live scan** — so without recording which
 * host was occupied, the bed is gone on restore and `currentRestQuality()`
 * reads 1.0 on the very reconcile that was meant to pay out.
 *
 * The degradations matter as much as the happy path: restoring a player
 * must never fail because their furniture moved.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { StuffApi } from "../../../api/stuff";
import { SlotApi } from "../../../api/slot";
import { MixinApi } from "../../../api/mixin";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import Chair from "../../../obj/Chair";
import { PosedMixin } from "../Posed";
import { SlottableMixin } from "../../slot/Slottable";
import { Postures } from "../../slot/Postured";
import Thing from "../../stuff/Thing";
import type { Stuff } from "../../stuff/Stuff";
import type { Slotted } from "../../slot/Slotted";
import type { Slottable } from "../../slot/Slottable";

const BED_PATH = "/obj/fixture/bed";

/** A body: Posed + Slottable, the Character shape reduced to what matters. */
class Body extends PosedMixin(SlottableMixin(Thing)) {}

function makeBed(restQuality = 2): Chair {
  const bed = makeStuffAtPath(() => new Chair(), BED_PATH);
  bed.setStaticSlots([
    {
      name: "lie:1",
      accepts: "SlottableMixin",
      capacity: 1,
      postures: [Postures.Lie, Postures.Sit],
    },
  ]);
  bed.setRestQuality(restQuality);
  return bed;
}

const makeBody = (): Body => makeStuffAtPath(() => new Body(), "/obj/test/Body");

beforeEach(() => {
  StuffApi.clearAll();
});

describe("recording where a body rests", () => {
  it("occupying a POSTURE-BEARING slot records the host and slot", () => {
    const bed = makeBed();
    const body = makeBody();
    SlotApi.occupyAll(
      bed as unknown as Stuff & Slotted,
      body as unknown as Stuff & Slottable,
      ["lie:1"],
    );
    expect(body.getRestingOnPath()).toBe(BED_PATH);
    expect(body.getRestingSlot()).toBe("lie:1");
  });

  it("a non-posture slot is ignored — this remembers where you rest, not what you carry", () => {
    const rack = makeStuffAtPath(() => new Chair(), "/obj/test/Rack");
    rack.setStaticSlots([
      { name: "hold:1", accepts: "SlottableMixin", capacity: 1 },
    ]);
    const body = makeBody();
    SlotApi.occupyAll(
      rack as unknown as Stuff & Slotted,
      body as unknown as Stuff & Slottable,
      ["hold:1"],
    );
    expect(body.getRestingOnPath()).toBe("");
  });

  it("getting up forgets it — no claiming a bed you are not in", () => {
    const bed = makeBed();
    const body = makeBody();
    SlotApi.occupyAll(
      bed as unknown as Stuff & Slotted,
      body as unknown as Stuff & Slottable,
      ["lie:1"],
    );
    (bed as unknown as Slotted).vacate("lie:1", body as unknown as Stuff & Slottable);
    expect(body.getRestingOnPath()).toBe("");
    expect(body.getRestingSlot()).toBe("");
  });

  it("the recorded host is what metabolism's rest multiplier reads back", () => {
    // The whole point: `currentRestQuality()` resolves through
    // `getOccupiedHost()`, so re-occupancy is what restores the multiplier.
    const bed = makeBed(2.5);
    const body = makeBody();
    SlotApi.occupyAll(
      bed as unknown as Stuff & Slotted,
      body as unknown as Stuff & Slottable,
      ["lie:1"],
    );
    const host = (body as unknown as Slottable).getOccupiedHost();
    expect(host).toBe(bed);
    expect(MixinApi.isPostured(host as Stuff)).toBe(true);
    expect((host as unknown as { getRestQuality(): number }).getRestQuality()).toBe(
      2.5,
    );
  });
});
