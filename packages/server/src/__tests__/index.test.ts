import "../test-bootstrap";
import { describe, it, expect, beforeAll } from "vitest";

/**
 * The entry point's export surface.
 *
 * ⚠⚠ **The import is hoisted into `beforeAll` with its own budget, and
 * that is the point of this file's shape.** `await import("..")` stands up
 * the WHOLE server entry graph — ~4.6s on a quiet machine. It used to sit
 * inside the first `it`, so that one test paid the standup against the
 * default 5000ms and the other eleven got a warm cache: a 434ms margin that
 * the suite's own collect pressure eats, and it failed at the
 * agent-coordination sweep (2026-10-01) with `Test timed out in 5000ms` on
 * "should export Server class" while passing alone.
 *
 * ⭐ A timeout on the first `it` would have been the wrong fix twice over:
 * it reads as *asserting an export is slow*, and it leaves the cost on
 * whichever test happens to run first. Each `it` below now asserts exactly
 * what its name says. See docs/testing.md § *A 5s budget on an integration
 * standup reads as assertion failures*.
 */
describe("Server", () => {
  let entry: typeof import("..");

  beforeAll(async () => {
    entry = await import("..");
  }, 60_000);

  it("should export Server class", () => {
    expect(entry.Server).toBeDefined();
  });

  it("should export Application class", () => {
    expect(entry.Application).toBeDefined();
  });

  it("should export Backend class", () => {
    expect(entry.Backend).toBeDefined();
  });

  it("should export PersistenceManager class", () => {
    expect(entry.PersistenceManager).toBeDefined();
  });

  it("should export ConnectionManager class", () => {
    expect(entry.ConnectionManager).toBeDefined();
  });

  it("should export ConnectionApi class", () => {
    expect(entry.ConnectionApi).toBeDefined();
  });

  it("should export MixinApi class", () => {
    expect(entry.MixinApi).toBeDefined();
  });

  it("should export Mixins constants", () => {
    expect(entry.Mixins).toBeDefined();
    expect(entry.Mixins.Named).toBe("NamedMixin");
    expect(entry.Mixins.Gendered).toBe("GenderedMixin");
  });

  it("should export Avatar class", () => {
    expect(entry.Avatar).toBeDefined();
  });

  it("should export Interactive class", () => {
    expect(entry.Interactive).toBeDefined();
  });

  it("should export Agent class", () => {
    expect(entry.Agent).toBeDefined();
  });
});
