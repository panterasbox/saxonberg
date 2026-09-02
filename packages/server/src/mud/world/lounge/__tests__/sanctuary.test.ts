/**
 * The anti-lounge split (the bar-fight build): the lounge is combat-free
 * by mechanism (its member class carries the CombatSanctuary veto), while
 * the Bar and the office are other classes and stay fair game. A
 * class-level unit — the combat engine presence-dispatches
 * `combatSanctuaryRefusal`, so what matters is which classes define it.
 */
import "../../../../test-bootstrap";
import { describe, it, expect } from "vitest";
import { makeStuff } from "../../../lib/security/__tests__/test-setup";
import Lounge from "../location/Lounge";
import Bar from "../location/Bar";

describe("the lounge sanctuary split", () => {
  it("a Lounge room refuses combat with house prose", () => {
    const lounge = makeStuff(() => new Lounge());
    const fn = (lounge as unknown as {
      combatSanctuaryRefusal?: () => string | null;
    }).combatSanctuaryRefusal;
    expect(typeof fn).toBe("function");
    const refusal = fn!.call(lounge);
    expect(refusal).toBeTruthy();
    expect(String(refusal).toLowerCase()).toContain("lounge");
  });

  it("the Bar is NOT a sanctuary (the anti-lounge — fair game)", () => {
    const bar = makeStuff(() => new Bar());
    const fn = (bar as unknown as {
      combatSanctuaryRefusal?: unknown;
    }).combatSanctuaryRefusal;
    expect(typeof fn).not.toBe("function");
  });
});
