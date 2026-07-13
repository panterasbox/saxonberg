/**
 * The `combatant` brain — the default enemy fighter. Verifies it reads the
 * live fight through `CombatApi` and expresses intent through
 * `queueGambit` (it never mutates session state), and that it holds fire
 * when overextended so the engine's defend-and-recover default takes over.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { CombatApi } from "../../../api/combat";
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

function fakeSession(band: string): unknown {
  return {
    getState: () => ({ poise: { band: () => band }, down: false }),
    opponentState: () => ({}),
  };
}

describe("combatant brain", () => {
  it("presses with a strike when steady", () => {
    const host = {};
    vi.spyOn(CombatApi, "sessionFor").mockReturnValue(
      fakeSession("steady") as never,
    );
    vi.spyOn(CombatApi, "eligibilityFor").mockReturnValue({ ok: false });
    const queue = vi
      .spyOn(CombatApi, "queueGambit")
      .mockReturnValue({ ok: true });

    combatant.act(ctxFor(host));
    expect(queue).toHaveBeenCalledWith(host, "strike");
  });

  it("holds fire when overextended (lets the engine recover)", () => {
    const host = {};
    vi.spyOn(CombatApi, "sessionFor").mockReturnValue(
      fakeSession("broken") as never,
    );
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
