/**
 * WizardController — maps `wizard grant/revoke <player>` onto the
 * narrow-entry `AccessApi.setWizardMembership` (never the registry).
 * `AccessApi.setWizardMembership` + `PlayerApi.isAvatarStuff` are stubbed
 * (no Mongo, no live AccessRegistry); the scene transport is a no-op
 * chainable. Authorization (archwizard-only) is the validator's job and
 * is covered by requiresArchwizard.test.ts.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { MockInstance } from "vitest";
import WizardController from "../WizardController";
import { AccessApi } from "../../../../api/access";
import { PlayerApi } from "../../../../api/player";
import { MessageApi } from "../../../../api/message";
import { makeStuff } from "../../../../lib/security/__tests__/test-setup";
import type { CommandContext } from "../../../../api/command";

type WizardModel = Record<string, unknown>;

function fakeTarget(playerId: string, name = "Alice") {
  return {
    stuff: {
      getPlayerId: () => playerId,
      getPresentation: () => name,
    },
  };
}

describe("WizardController", () => {
  let ctrl: WizardController;
  let ctx: CommandContext;
  let note: ReturnType<typeof vi.fn>;
  let setMembership: MockInstance<(...args: never[]) => unknown>;

  beforeEach(() => {
    vi.restoreAllMocks();
    setMembership = vi
      .spyOn(AccessApi, "setWizardMembership")
      .mockResolvedValue(true as never) as unknown as MockInstance<
      (...args: never[]) => unknown
    >;
    vi.spyOn(PlayerApi, "isAvatarStuff").mockReturnValue(true as never);
    vi.spyOn(MessageApi, "scene").mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = () => b;
      b.send = () => {};
      return b as never;
    });
    ctrl = makeStuff(() => new WizardController());
    note = vi.fn();
    ctx = { commandGiver: {} as never, note } as unknown as CommandContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function run(model: WizardModel) {
    return ctrl.execute(model as never, ctx);
  }

  it("grant adds the target to wizards (makeWizard=true)", async () => {
    await run({ subcommand: "grant", target: fakeTarget("p-alice") });
    expect(setMembership).toHaveBeenCalledTimes(1);
    expect(setMembership).toHaveBeenCalledWith("p-alice", true);
    expect(note).not.toHaveBeenCalled();
  });

  it("revoke removes the target from wizards (makeWizard=false)", async () => {
    await run({ subcommand: "revoke", target: fakeTarget("p-bob", "Bob") });
    expect(setMembership).toHaveBeenCalledWith("p-bob", false);
    expect(note).not.toHaveBeenCalled();
  });

  it("reports no-change when membership did not move", async () => {
    setMembership.mockResolvedValue(false as never);
    await run({ subcommand: "grant", target: fakeTarget("p-alice") });
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "controller-rejected", reason: "no-change" }),
    );
  });

  it("rejects an unknown subcommand without touching membership", async () => {
    await run({ subcommand: undefined, target: fakeTarget("p-alice") });
    expect(setMembership).not.toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "unknown-subcommand" }),
    );
  });

  it("rejects a missing target", async () => {
    await run({ subcommand: "grant" });
    expect(setMembership).not.toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "no-target" }),
    );
  });
});
