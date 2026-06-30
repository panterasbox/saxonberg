/**
 * requiresWizard — the verb-level code-trust gate. Mirrors the
 * `requiresStreamer` / `requiresAuthor` validator-test shape: the sync
 * body maps the preloaded boolean to a denial string (or pass), and the
 * async preload reads `AccessApi.isWizard(giver)`.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import requiresWizard from "../requiresWizard";
import { AccessApi } from "../../../../api/access";
import type { CommandContext } from "../../../../api/command";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requiresWizard", () => {
  it("rejects a non-wizard (allowed=false) and allows a wizard (allowed=true)", () => {
    const ctx = {
      verb: "eval",
      commandGiver: {},
    } as unknown as CommandContext;
    expect(requiresWizard(ctx, false)).toMatch(/permission/);
    expect(requiresWizard(ctx, true)).toBeUndefined();
  });

  it("the preload reads AccessApi.isWizard(giver)", async () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    const spy = vi
      .spyOn(AccessApi, "isWizard")
      .mockResolvedValue(true as never);
    await expect(requiresWizard.preload!(ctx)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith(ctx.commandGiver);
  });
});
