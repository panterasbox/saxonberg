/**
 * requiresArchwizard — the wizard-conferral gate. Mirrors
 * requiresWizard.test.ts: the sync body maps the preloaded boolean to a
 * denial string (or pass), and the async preload reads
 * `AccessApi.isArchwizard(giver)`.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import requiresArchwizard from "../requiresArchwizard";
import { AccessApi } from "../../../../api/access";
import type { CommandContext } from "../../../../api/command";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requiresArchwizard", () => {
  it("rejects a non-archwizard (allowed=false) and allows an archwizard (allowed=true)", () => {
    const ctx = {
      verb: "wizard",
      commandGiver: {},
    } as unknown as CommandContext;
    expect(requiresArchwizard(ctx, false)).toMatch(/permission/);
    expect(requiresArchwizard(ctx, true)).toBeUndefined();
  });

  it("the preload reads AccessApi.isArchwizard(giver)", async () => {
    const ctx = { commandGiver: {} } as unknown as CommandContext;
    const spy = vi
      .spyOn(AccessApi, "isArchwizard")
      .mockResolvedValue(true as never);
    await expect(requiresArchwizard.preload!(ctx)).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith(ctx.commandGiver);
  });
});
