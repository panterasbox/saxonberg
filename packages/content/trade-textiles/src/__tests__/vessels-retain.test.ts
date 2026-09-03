/**
 * ⚠⚠ **Every vessel in the chain must RETAIN what is poured into it.**
 *
 * This test exists because a live drive found the whole textile chain
 * unrunnable at its first stage. `pour sheaf into pit` answered
 *
 *     The liquid runs straight through a retting pit and pools on the
 *     floor.
 *
 * and destroyed the straw. The cause was one word in three constructors:
 * the retting pit, the bleaching green and the dyehouse's copper each
 * authored `closure: 'open'` on the reasoning "it has no lid".
 *
 * ⭐ **`closure` is the RETENTION axis, not the lid axis.**
 * `BulkableLogic.requiredClosureFor` returns `liquidTight` for every
 * material there is ("v1 has only liquid"), so an `open` interior
 * drains everything straight through to the floor. The lid is
 * `Sealable`'s `open`/`closed` — a different field, on a different
 * mixin, which is what the unsealed ferment and the over-ret actually
 * read.
 *
 * ⚠ Nothing caught this: the pack's other tests construct a vessel's
 * contents directly rather than pouring into one, so the transfer path
 * — the only path a player has — was never exercised. Hence a test
 * that asserts the property rather than the behaviour: a vessel whose
 * job is holding liquid must be at least `liquidTight`.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect } from "vitest";
import { CLOSURE_ORDER } from "@saxonberg/server/mud/lib/bulk/Bulkable";
import { makeStuff } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import RettingPit from "../thing/RettingPit";
import BleachingGreen from "../thing/BleachingGreen";

describe("the chain's vessels retain what is poured into them", () => {
  const cases: Array<[string, () => { getClosure(): string; isOpen(): boolean }]> =
    [
      ["the retting pit", () => makeStuff(() => new RettingPit()) as never],
      ["the bleaching green", () => makeStuff(() => new BleachingGreen()) as never],
    ];

  for (const [label, build] of cases) {
    it(`⭐ ${label} is at least liquidTight — an open interior drains to the floor`, () => {
      const v = build();
      expect(CLOSURE_ORDER[v.getClosure() as keyof typeof CLOSURE_ORDER]).toBeGreaterThanOrEqual(
        CLOSURE_ORDER.liquidTight,
      );
    });

    it(`${label} still has no lid — retention is not sealing`, () => {
      const v = build();
      expect(v.isOpen()).toBe(true);
    });
  }
});
