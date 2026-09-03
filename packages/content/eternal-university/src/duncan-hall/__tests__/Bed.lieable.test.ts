/**
 * The dorm bed is lieable (the review retrofit).
 *
 * Sleep-as-logout recovers by `posture × restQuality`, and the dorm is the
 * residence every player currently has — so a dorm bed you cannot lie on
 * would have shipped the mechanic somewhere nobody could reach it.
 *
 * `Surfaced` is KEPT, not replaced: the two are orthogonal. `Surfaced` is
 * what rests ON the bed; the posture slot is who rests IN it.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach } from "vitest";
import Bed from "../thing/Bed";
import DormRoom from "../location/DormRoom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { Mixins } from "@saxonberg/server/mud/lib/mixin";
import { makeStuffAtPath } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import { PosedMixin } from "@saxonberg/server/mud/lib/character/Posed";
import { SlottableMixin } from "@saxonberg/server/mud/lib/slot/Slottable";
import Thing from "@saxonberg/server/mud/lib/stuff/Thing";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Slotted } from "@saxonberg/server/mud/lib/slot/Slotted";
import type { Slottable } from "@saxonberg/server/mud/lib/slot/Slottable";

class Body extends PosedMixin(SlottableMixin(Thing)) {}

const BED_PATH = "/world/eternal/duncan-hall/thing/bed";

function makeBed(): Bed {
  const bed = makeStuffAtPath(() => new Bed(), BED_PATH);
  // The shape the seed authors — the capability is on the class, the slot
  // spec is data, which is why the retrofit needed no `class:` change.
  bed.setStaticSlots([
    {
      name: "lie:1",
      accepts: "SlottableMixin",
      capacity: 1,
      postures: ["lie", "sit"],
      userFacingDetail: "mattress",
    },
  ]);
  bed.setRestQuality(1.5);
  return bed;
}

beforeEach(() => {
  StuffApi.clearAll();
});

describe("the dorm bed", () => {
  it("keeps Surfaced AND gains Postured — orthogonal, not a swap", () => {
    expect(MixinApi.hasMixin(Bed, Mixins.Surfaced)).toBe(true);
    expect(MixinApi.hasMixin(Bed, Mixins.Postured)).toBe(true);
    expect(MixinApi.hasMixin(Bed, Mixins.Slotted)).toBe(true);
  });

  it("a body can lie in it, and metabolism reads the multiplier back", () => {
    const bed = makeBed();
    const body = makeStuffAtPath(() => new Body(), "/obj/test/Body");
    (bed as unknown as Stuff & Slotted).occupyAll(body as unknown as Stuff & Slottable,
      ["lie:1"],
    );

    // `currentRestQuality()` resolves through `getOccupiedHost()` — this is
    // the chain that makes an offline night in a dorm worth more than 1.0.
    expect((body as unknown as Slottable).getOccupiedHost()).toBe(bed);
    expect(bed.getRestQuality()).toBe(1.5);
  });

  it("records where the sleeper slept, so they wake in it", () => {
    const bed = makeBed();
    const body = makeStuffAtPath(() => new Body(), "/obj/test/Body");
    (bed as unknown as Stuff & Slotted).occupyAll(body as unknown as Stuff & Slottable,
      ["lie:1"],
    );
    expect(body.getRestingOnPath()).toBe(BED_PATH);
    expect(body.getRestingSlot()).toBe("lie:1");
  });
});

/**
 * The dorm's fixture classes are NOT duplication — each earns its class,
 * and this pins why, so a future "tidy-up" reads the reason first.
 */
describe("the dorm fixtures earn their classes", () => {
  it("Desk is a Surface PLUS an affordance carrier and a theme discriminant", async () => {
    const { default: Desk } = await import("../thing/Desk");
    // 1. It affords `remodel` to the room's occupants. A container does not
    //    afford its own verbs — a co-located sibling does (the
    //    Menu-in-the-room precedent), so the desk is the carrier.
    expect(
      (Desk as unknown as { commandContributions: { peers: string[] } })
        .commandContributions.peers,
    ).toContain("world/eternal/duncan-hall/cmd/remodel.yaml");
    // 2. DormThemes.roleOf discriminates on `instanceof` to pick which
    //    theme prose slot a fixture fills.
    expect(MixinApi.hasMixin(Desk, Mixins.Surfaced)).toBe(true);
  });

  it("the tap has no bespoke class at all — it is a generic water fixture", () => {
    // `/platform/thing/UnboundedReceptacle`, same class the bathroom basin uses. Two
    // rows over one class with different prose IS the archetype pattern;
    // collapsing them would delete content, not duplication.
    const tap = parse(
      readFileSync(
        fileURLToPath(
          new URL(
            "../../../../eternal-university/content/world/eternal/duncan-hall/thing/tap.yaml",
            import.meta.url,
          ),
        ),
        "utf8",
      ),
    ) as { class?: string };
    // `WaterFixture` is still a GENERIC class, not a bespoke dorm one:
    // it is the shared "plumbed water you can work at" (the bar basin,
    // the standpipe, this tap), split off `UnboundedReceptacle` when
    // that class's other row turned out to be a coffee urn.
    expect(tap.class).toBe("/platform/thing/WaterFixture");
  });

  it("DormRoom composes the four layers whose omission is SILENT", () => {
    // The bug that bit FurnishableRoom in review: without Populates a
    // seed's `props:` is inert and no fixture ever lands; without
    // Visible its prose is inert; without Exitable nothing can walk in.
    // Nothing fails loudly. Guarding the dorm against the same class of
    // mistake costs one test.
    for (const layer of [
      Mixins.Populates,
      Mixins.Visible,
      Mixins.Detailed,
      Mixins.Exitable,
    ]) {
      expect(MixinApi.hasMixin(DormRoom, layer)).toBe(true);
    }
  });
});
