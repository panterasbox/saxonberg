/**
 * requiresTestWorld — the `testharness` verb's own gate: the sync body
 * maps the preloaded test-world boolean to a refusal naming the verb (or
 * pass), and the preload reads `SecurityApi.isTestEnvironment()`.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import requiresTestWorld from "../requiresTestWorld";
import { SecurityApi } from "../../../../api/security";
import type { CommandContext } from "../../../../api/command";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requiresTestWorld", () => {
  it("refuses outside a test world, naming the verb; passes inside one", () => {
    const ctx = { verb: "testharness" } as unknown as CommandContext;
    expect(requiresTestWorld(ctx, false)).toMatch(
      /`testharness` is a test-world verb .*SAXONBERG_TEST_WORLD/,
    );
    expect(requiresTestWorld(ctx, true)).toBeUndefined();
  });

  it("the preload reads SecurityApi.isTestEnvironment()", async () => {
    const ctx = {} as unknown as CommandContext;
    const spy = vi.spyOn(SecurityApi, "isTestEnvironment").mockReturnValue(false);
    await expect(Promise.resolve(requiresTestWorld.preload!(ctx))).resolves.toBe(false);
    expect(spy).toHaveBeenCalled();
  });
});
