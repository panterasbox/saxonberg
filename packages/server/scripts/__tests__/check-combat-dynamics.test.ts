/**
 * check-combat-dynamics unit tests — the pure scan (comment/string
 * posture, the physics allowlist) plus the live-tree self-regression
 * (zero findings the moment the migrated engine is clean; fails the
 * moment a dynamics barnacle lands in either scan home).
 */

import { describe, expect, it } from "vitest";
import {
  COMBAT_DYNAMICS_ALLOWLIST,
  collectLiveFindings,
  combatDynamicsScope,
  scanCombatDynamics,
} from "../check-combat-dynamics";

const ENGINE_FILE = "src/mud/platform/idea/api/CombatLogic.ts";
const SUBSTRATE_FILE = "src/mud/lib/combat/CombatNarration.ts";

describe("scanCombatDynamics", () => {
  it("flags a seeded isEnergized branch in the engine home", () => {
    const source = [
      "function commitInflict(weapon: Stuff, target: Stuff): void {",
      "  if (weapon && MixinApi.isEnergized(weapon)) {",
      "    ElectricityApi.shockContact(weapon, target);",
      "  }",
      "}",
    ].join("\n");
    const findings = scanCombatDynamics(source, ENGINE_FILE);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.predicate).toBe("isEnergized");
    expect(findings[0]!.file).toBe(ENGINE_FILE);
    expect(findings[0]!.line).toBe(2);
    expect(findings[0]!.message).toContain(
      "docs/subsystems/combat-hooks.md",
    );
  });

  it("flags the same barnacle in a lib/combat source (the second home)", () => {
    const source = "if (MixinApi.isEnergized(instrument)) narrateSpark();";
    const findings = scanCombatDynamics(source, SUBSTRATE_FILE);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.predicate).toBe("isEnergized");
    expect(findings[0]!.file).toBe(SUBSTRATE_FILE);
  });

  it("passes every allowlisted physics predicate", () => {
    for (const predicate of COMBAT_DYNAMICS_ALLOWLIST) {
      const source = `if (MixinApi.${predicate}(obj)) obj.touch();`;
      expect(scanCombatDynamics(source, ENGINE_FILE)).toEqual([]);
    }
  });

  it("carries the Phase-2 correction and the drain narrowings", () => {
    // coveringGearAt mirrors resolveCoveringStack's item selection.
    expect(COMBAT_DYNAMICS_ALLOWLIST.has("isWearable")).toBe(true);
    // The drain's toxin/reserve/wear consequence arms.
    expect(COMBAT_DYNAMICS_ALLOWLIST.has("isMetabolic")).toBe(true);
    expect(COMBAT_DYNAMICS_ALLOWLIST.has("isReserved")).toBe(true);
    expect(COMBAT_DYNAMICS_ALLOWLIST.has("isDurable")).toBe(true);
    // The retired branch is locked out.
    expect(COMBAT_DYNAMICS_ALLOWLIST.has("isEnergized")).toBe(false);
  });

  it("flags a violation on a line that also holds allowlisted narrowing", () => {
    const source =
      "if (MixinApi.isVitals(t) && MixinApi.isVenomous(a)) envenom(t);";
    const findings = scanCombatDynamics(source, ENGINE_FILE);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.predicate).toBe("isVenomous");
  });

  it("ignores predicates in comments (line, block, and doc prose)", () => {
    // The real tree forces this posture: CombatReactive.ts's doc comment
    // names `MixinApi.isX` as retired prose.
    const source = [
      "// MixinApi.isEnergized(weapon) — the deleted branch",
      "/* MixinApi.isVenomous(actor) */",
      "/**",
      " * duck-typed method-presence checks, no per-dynamic `MixinApi.isX`",
      " */",
      "const beat = 1;",
    ].join("\n");
    expect(scanCombatDynamics(source, ENGINE_FILE)).toEqual([]);
  });

  it("still flags a predicate in a string literal (pragmatic text scan)", () => {
    // Documented posture: string content is scanned as code — none exist
    // in the tree, and a predicate name smuggled into a string is exactly
    // the kind of thing a reviewer should see flagged.
    const source = 'const msg = "MixinApi.isEnergized(weapon)";';
    const findings = scanCombatDynamics(source, ENGINE_FILE);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.predicate).toBe("isEnergized");
  });

  it("does not treat comment markers inside strings as comments", () => {
    const source = [
      'const url = "https://example.test"; // MixinApi.isEnergized(x)',
      "if (MixinApi.isVenomous(a)) bite();",
    ].join("\n");
    const findings = scanCombatDynamics(source, ENGINE_FILE);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.line).toBe(2);
  });
});

describe("the live tree", () => {
  it("scans the engine plus the combat substrate, tests excluded", () => {
    const scope = combatDynamicsScope();
    expect(scope.some((f) => f.endsWith("CombatLogic.ts"))).toBe(true);
    expect(scope.some((f) => f.endsWith("CombatReactive.ts"))).toBe(true);
    expect(scope.some((f) => f.includes("__tests__"))).toBe(false);
  });

  it("holds zero findings — the self-regression", () => {
    expect(collectLiveFindings()).toEqual([]);
  });
});
