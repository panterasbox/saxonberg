/**
 * MetabolicMixin in-session clock freeze — metabolism reads presence
 * only (no connection-layer work). Linkdead freezes the clock (the body
 * lingers in-world but doesn't tick); reconnect integrates only the
 * post-reconnect span (no "reconnect starving"); a far-past gap
 * (logout/relog, paused server) accrues nothing (the fairness override:
 * real-life absence never starves you). There is no away-recovery.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import { HasInteractiveMixin } from "../../connection/HasInteractive";
import type Interactive from "../../../platform/idea/Interactive";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../platform/idea/WorldClockRegistry";
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import { Postures } from "../../slot/Postured";

class TestBody extends HasInteractiveMixin(Creature) {
  static _mixinName = "TestBody";
}

const SCALE = 12;
let real = 0;

function advance(b: TestBody, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    b.getReserve("endurance"); // force the lazy reconcile
    remaining -= s;
  }
}

const Q = (n: number) => Quantity.of(n, "%");
const sat = (b: TestBody) => b.getReserve("satiation")!.current.rawValue();
const end = (b: TestBody) => b.getReserve("endurance")!.current.rawValue();
const connect = (b: TestBody) =>
  b.addInteractive({} as unknown as Interactive);

describe("MetabolicMixin clock freeze — presence", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("freezes the clock while linkdead (no drain from absence)", () => {
    const b = makeStuff(() => new TestBody()); // no interactive ⇒ linkdead
    expect(b.isLinkdead()).toBe(true);
    sat(b); // seed
    advance(b, 12000); // 200 game-min away
    expect(sat(b)).toBeCloseTo(100, 1); // no drain — clock frozen
  });

  it("on reconnect, integrates only post-reconnect time", () => {
    const b = makeStuff(() => new TestBody());
    sat(b); // seed (linkdead)
    advance(b, 12000); // a long linkdead absence — frozen
    expect(sat(b)).toBeCloseTo(100, 1);

    connect(b);
    advance(b, 600); // 10 game-min of present play
    const drop = 100 - sat(b);
    // Only the 10 post-reconnect minutes drained (~0.02%/min), not the
    // 200 absent minutes.
    expect(drop).toBeGreaterThan(0);
    expect(drop).toBeLessThan(0.5);
  });

  it("a far-past gap (logout/relog) accrues nothing", () => {
    const b = makeStuff(() => new TestBody());
    connect(b); // present
    sat(b); // seed
    // One huge jump with a single read — exceeds MAX_REASONABLE_GAP, so
    // the away-gap is dropped (state round-trips through save/restore;
    // the clock simply didn't tick).
    real += (50000 / SCALE) * 1000; // ~13.9 game-hours > the 4h guard
    expect(sat(b)).toBeCloseTo(100, 1);
  });

  it("no away-recovery: a linkdead body at rest does not rebuild endurance", () => {
    const b = makeStuff(() => new TestBody());
    b.setPosture(Postures.Lie);
    b.adjustReserve("endurance", Q(-50)); // 50
    expect(b.isLinkdead()).toBe(true);
    end(b); // seed
    advance(b, 6000); // 100 game-min "asleep" (logged out / linkdead)
    expect(end(b)).toBeCloseTo(50, 1); // no recovery while absent
  });
});
