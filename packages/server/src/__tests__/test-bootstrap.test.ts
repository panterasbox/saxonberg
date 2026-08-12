/**
 * The wiring-on-import contract, asserted.
 *
 * ~750 test files import `test-bootstrap`, and many of them import a
 * fixture that imports it too. If a second import re-ran
 * `installFrameworkWiring()` — re-registering registry classes and
 * boundary-exempt bases over a live, mutated registry — the failure
 * would be intermittent and attributed to anything but this.
 *
 * So idempotency is a tested guarantee, not a property the module
 * system happens to give us.
 */

import "../test-bootstrap";
import { describe, expect, it, vi } from "vitest";

import { BootstrapManager } from "../backend/BootstrapManager";
import { SchedulerApi } from "../mud/api/scheduler";
import { ensureFrameworkWiring } from "../test-bootstrap";

describe("test-bootstrap", () => {
  it("installs the wiring at import time", () => {
    // Importing the module above already ran it, so this call finds the
    // work done. `false` IS the assertion: it means the tail call fired.
    expect(ensureFrameworkWiring()).toBe(false);
  });

  it("actually wired the registries", () => {
    // Registry-backed and otherwise cheap: unwired, `resolveRegistry`
    // throws "SchedulerRegistry ... class is not registered".
    expect(() => SchedulerApi.getEngagementById("no-such-id")).not.toThrow();
  });

  it("does not re-install on repeated calls", () => {
    const spy = vi.spyOn(BootstrapManager, "installFrameworkWiring");
    try {
      for (let i = 0; i < 5; i++) {
        expect(ensureFrameworkWiring()).toBe(false);
      }
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("does not re-install on repeated import", async () => {
    const spy = vi.spyOn(BootstrapManager, "installFrameworkWiring");
    try {
      const again = await import("../test-bootstrap");
      expect(again.ensureFrameworkWiring()).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
