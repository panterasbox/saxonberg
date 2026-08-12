/**
 * MetabolicMixin antidote = accelerated clearance. An antidote acts on
 * the burden — crashing it under the condition's lowest band far faster
 * than natural (slow) clearance would, so the banded condition clears.
 * Routed through the vitals `ResolutionSpec` seam (the toxin condition
 * authors `resolution.by: <antidote-token>`); `applyAntidote` is the
 * minimal consumer this build ships.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import Condition from "../../../obj/Condition";
import type { ToxinBehavior } from "../Metabolic";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../obj/WorldClockRegistry";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

const SCALE = 12;
let real = 0;
function advance(c: Creature, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    c.getReserve("endurance");
    remaining -= s;
  }
}

// A slow-clearing toxin — natural clearance is the long path the
// antidote short-circuits.
const ACHE: ToxinBehavior = {
  toxinType: "ache",
  absorptionRate: 4,
  clearanceRate: 0.01,
  potency: 1,
  bands: [
    { threshold: 2, severity: 1 },
    { threshold: 6, severity: 2 },
  ],
};
const PATH = "/obj/Condition/metabolism/ache";

/**
 * ⚠ **This fabricates what production's `ConditionApi.boot` stands up.**
 * A hand-built fixture at a hard-coded path passes whether or not boot
 * works — which is exactly how the inert-Condition bug survived: every
 * toxin suite was green while `findByTemplatePath` answered `null` in a
 * running world and no toxin ever cleared.
 *
 * The path is pinned against the real seed roster by
 * `obj/api/__tests__/ConditionLogic.boot.test.ts`, so a seed rename
 * breaks there rather than silently un-testing this file.
 */
function ensureAche(): void {
  if (StuffApi.findByTemplatePath(PATH)) return;
  makeStuffAtPath(() => {
    const c = new Condition();
    c.setName("ache");
    c.setResolution({ by: "antidote" });
    c.setToxinBehavior(ACHE);
    return c;
  }, PATH);
}

const burden = (c: Creature) => c.toxinBurdens.ache ?? 0;
const afflicted = (c: Creature) =>
  c.getConditions().some(
    (x) => x.kind === "affliction" && x.templatePath === PATH,
  );

describe("MetabolicMixin — antidote (accelerated clearance)", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    ensureAche();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("the ResolutionSpec seam is authored + callable", () => {
    const cond = StuffApi.findByTemplatePath<Condition>(PATH)!;
    expect(cond.getResolution()).toEqual({ by: "antidote" });
  });

  it("an antidote crashes the burden below threshold and clears the condition", () => {
    const c = makeStuff(() => new Creature());
    c.setToxinBurdens({ ache: 8 });
    c.getReserve("endurance"); // seed
    advance(c, 60); // spawn the condition
    expect(afflicted(c)).toBe(true);

    c.applyAntidote("ache"); // accelerated clearance — crash the burden
    expect(burden(c)).toBeLessThan(2); // below the lowest band
    advance(c, 60); // reconcile clears the now-sub-threshold condition
    expect(afflicted(c)).toBe(false);
  });

  it("without the antidote, natural clearance leaves the harm window open", () => {
    const c = makeStuff(() => new Creature());
    c.setToxinBurdens({ ache: 8 });
    c.getReserve("endurance");
    advance(c, 60);
    expect(afflicted(c)).toBe(true);

    // The same elapsed time the antidote needed — natural clearance
    // (0.01/min) has barely touched the burden.
    advance(c, 1200); // 20 game-min
    expect(burden(c)).toBeGreaterThan(7); // still high
    expect(afflicted(c)).toBe(true); // condition persists
  });
});
