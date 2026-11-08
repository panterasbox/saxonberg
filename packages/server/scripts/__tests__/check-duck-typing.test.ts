/**
 * `lint:duck-typing` seen to FAIL (docs/lint-family.md § Four ways a
 * census lies, 3): each probe shape is FOUND, and the same code with the
 * probe replaced by a predicate is not.
 */

import { describe, expect, it } from "vitest";
import { parseTs } from "../pack-roots";
import { DUCK_PROBE_CEILING, UNDEFINED_PROBE_CEILING, census, scanModule } from "../check-duck-typing";

const scan = (src: string) => scanModule(parseTs("/x.ts", src), "x.ts");

describe("the three probe shapes", () => {
  it("FINDS typeof x.m === 'function' (either side, !== too)", () => {
    const r = scan(`if (typeof t.getHandling === "function") {}\nif ("function" !== typeof t.foo) {}`);
    expect(r.probes.map((p) => [p.kind, p.name])).toEqual([
      ["typeof", "getHandling"],
      ["typeof", "foo"],
    ]);
  });

  it("FINDS an optional call x.m?.()", () => {
    expect(scan(`t.beforeRestore?.(room);`).probes).toEqual([
      expect.objectContaining({ kind: "optional-call", name: "beforeRestore" }),
    ]);
  });

  it("FINDS 'name' in x", () => {
    expect(scan(`if ("organization" in thing) {}`).probes[0]).toMatchObject({ kind: "in", name: "organization" });
  });

  it("the same code asking a predicate finds nothing", () => {
    expect(scan(`if (MixinApi.isHandled(t)) t.getHandling();\nt?.foo();`).probes).toEqual([]);
  });

  it("⚠ the thenable idiom is the language's protocol, not a probe", () => {
    expect(scan(`if (typeof r.then === "function") {}`).probes).toEqual([]);
  });

  it("collects what the module DEFINES (class members, object-literal members), not interfaces", () => {
    const r = scan(`class A { m() {} f = 1 }\nconst o = { g: 1, h() {} };\ninterface I { never(): void }`);
    expect([...r.defines].sort()).toEqual(["f", "g", "h", "m"]);
  });
});

describe("⭐ the live tree — the ratchet's invariant, not its number", () => {
  const r = census();
  it("probes: at or below the ceiling, above zero", () => {
    expect(r.probes.length).toBeGreaterThan(0);
    expect(r.probes.length).toBeLessThanOrEqual(DUCK_PROBE_CEILING);
  });
  it("probes on a name nobody defines: at or below the ceiling", () => {
    expect(r.undefinedProbes.length).toBeLessThanOrEqual(UNDEFINED_PROBE_CEILING);
  });
});
