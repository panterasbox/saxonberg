/**
 * The `combatant` brain — the default enemy fighter. Verifies it reads the
 * live fight through `CombatApi` and expresses intent through
 * `queueGambit` (it never mutates session state), and that it holds fire
 * when overextended so the engine's defend-and-recover default takes over.
 */

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
// mocked to false, so the foe survives the brain's side filter.
function fakeSession(band: string, host: object, foe: object): unknown {
  return {
    getState: () => ({ poise: { band: () => band }, down: false }),
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
