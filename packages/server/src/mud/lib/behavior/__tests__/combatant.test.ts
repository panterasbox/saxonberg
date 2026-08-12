/**
 * The `combatant` brain — the default enemy fighter. Verifies it reads the
 * live fight through `CombatApi` and expresses intent through
 * `queueGambit` (it never mutates session state), and that it holds fire
 * when overextended so the engine's defend-and-recover default takes over.
 */

// Import-ORDER, not wiring: this file composes a mixin at module
// scope, and the mixin's own module sits in an import cycle that only
// resolves once the graph is loaded in bootstrap order. The global
// `setupFiles` used to do that incidentally for all 964 files; with it
// gone, the four files relying on it say so. Removing this line fails
// the file at COLLECTION ("MixinName is not a function"), which is why
// it survived unnoticed — see docs/testing.md § The four cycle files.
import "../../../../test-bootstrap";
import { describe, it, expect, vi, afterEach } from "vitest";
import { CombatApi } from "../../../api/combat";
import { PartyApi } from "../../../api/party";
import { brain as combatant } from "../combatant";
import type { BrainContext } from "../brain";

afterEach(() => vi.restoreAllMocks());

function ctxFor(host: object): BrainContext {
  return {
    host: host as never,
    config: {},
    state: {},
    perceived: undefined,
    trigger: { source: "cadence", raw: "combat" },
    say: () => {},
    emote: async () => {},
    emoteFree: () => {},
  };
}

// A minimal N-container mock: `host` plus one live foe. `areAllied` is
// mocked to false, so the foe survives the brain's side filter. The state
// carries a `flags` set (the brain checks `disarmed` for the sidearm draw).
function fakeSession(band: string, host: object, foe: object): unknown {
  return {
    getState: () => ({
      poise: { band: () => band },
      down: false,
      flags: { has: () => false },
    }),
    getCombatants: () => [host, foe],
    opponentState: () => ({}),
  };
}

describe("combatant brain", () => {
  it("presses with a strike when steady", () => {
    const host = {};
    const foe = {};
    vi.spyOn(CombatApi, "sessionFor").mockReturnValue(
      fakeSession("steady", host, foe) as never,
    );
    vi.spyOn(PartyApi, "areAllied").mockReturnValue(false);
    vi.spyOn(CombatApi, "eligibilityFor").mockReturnValue({ ok: false });
    // No reach info → the brain skips the close-the-gap policy and presses.
    vi.spyOn(CombatApi, "rangeStanding").mockReturnValue(null);
    const queue = vi
      .spyOn(CombatApi, "queueGambit")
      .mockReturnValue({ ok: true });

    combatant.act(ctxFor(host));
    expect(queue).toHaveBeenCalledWith(host, "strike");
  });

  it("holds fire when overextended (lets the engine recover)", () => {
    const host = {};
    const foe = {};
    vi.spyOn(CombatApi, "sessionFor").mockReturnValue(
      fakeSession("broken", host, foe) as never,
    );
    vi.spyOn(PartyApi, "areAllied").mockReturnValue(false);
    const queue = vi
      .spyOn(CombatApi, "queueGambit")
      .mockReturnValue({ ok: true });

    combatant.act(ctxFor(host));
    expect(queue).not.toHaveBeenCalled();
  });

  it("does nothing when not in a fight", () => {
    const host = {};
    vi.spyOn(CombatApi, "sessionFor").mockReturnValue(undefined);
    const queue = vi
      .spyOn(CombatApi, "queueGambit")
      .mockReturnValue({ ok: true });
    combatant.act(ctxFor(host));
    expect(queue).not.toHaveBeenCalled();
  });
});
