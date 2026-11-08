/** `lint:controller-functions` seen to FAIL: a module-level function IS found. */

import { describe, expect, it } from "vitest";
import { parseTs, controllerFiles } from "../pack-roots";
import { CONTROLLER_FUNCTIONS_CEILING, census, moduleFunctions } from "../check-controller-functions";

describe("the classifier", () => {
  it("FINDS a top-level function declaration and a top-level arrow const", () => {
    const sf = parseTs("/x.ts", `function hidden() {}\nconst alsoHidden = (a: number) => a;\nclass XController {}`);
    expect(moduleFunctions(sf).map((f) => f.name)).toEqual(["hidden", "alsoHidden"]);
  });

  it("a method on the class and a non-function const are not counted", () => {
    const sf = parseTs("/x.ts", `const K = 3;\nclass XController { helper() { const inner = () => 1; } }`);
    expect(moduleFunctions(sf)).toEqual([]);
  });
});

describe("⭐ the shared enumerator", () => {
  it("reaches the domain-local controllers and the pack bases", () => {
    const rels = controllerFiles().map((c) => c.rel);
    expect(rels.some((r) => /src\/[a-z-]+\/idea\/cmd\//.test(r) && !r.includes("/src/idea/"))).toBe(true);
    expect(rels.some((r) => /content\/[^/]+\/src\/lib\/\w+Controller\.ts$/.test(r))).toBe(true);
    expect(rels.some((r) => r.endsWith("lib/command/CommandController.ts"))).toBe(true);
  });
});

describe("⭐ the live tree", () => {
  it("at or below the ceiling, above zero", () => {
    const n = census().length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(CONTROLLER_FUNCTIONS_CEILING);
  });
});
