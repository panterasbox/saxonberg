/**
 * CombatFormation — the authored formation Idea: setter validation, the
 * frozen `policy()` read, and the fallback-honesty pin (the built-in
 * `DEFAULT_POLICY` must stay value-equal to the seeded `default` preset,
 * because the beat consumes the built-in wherever the Idea is not
 * resident and the two must byte-agree).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse } from "yaml";
import { makeStuff } from "../../security/__tests__/test-setup";
import {
  CombatFormation,
  type AllocationKind,
  type InterceptTrigger,
} from "../CombatFormation";

function formation(): CombatFormation {
  return makeStuff(() => new CombatFormation());
}

describe("CombatFormation — authored shape + validation", () => {
  it("carries the authored policy shape through its setters", () => {
    const f = formation();
    f.setName("vanguard");
    f.setRoles(["front", "back"]);
    f.setAllocation("sustain");
    f.setProtectsRoles(["back"]);
    f.setInterceptorRoles(["front"]);
    f.setInterceptTrigger("any");
    f.setCoupRight("engaged");
    f.setCoupCall("engaged");

    const p = f.policy();
    expect(p.name).toBe("vanguard");
    expect(p.roles).toEqual(["front", "back"]);
    expect(p.protectsRoles).toEqual(["back"]);
    expect(p.interceptorRoles).toEqual(["front"]);
    expect(p.interceptTrigger).toBe("any");
  });

  it("rejects out-of-vocabulary tokens and malformed role lists", () => {
    const f = formation();
    expect(() => f.setAllocation("random" as AllocationKind)).toThrow(TypeError);
    expect(() =>
      f.setInterceptTrigger("sometimes" as InterceptTrigger),
    ).toThrow(TypeError);
    expect(() => f.setCoupCall("jury" as never)).toThrow(TypeError);
    expect(() => f.setRoles(["front", "front"])).toThrow(TypeError);
    expect(() => f.setRoles([""])).toThrow(TypeError);
    expect(() => f.setName("")).toThrow(TypeError);
    expect(() => f.setCoupRight("")).toThrow(TypeError);
  });

  it("policy() is frozen and re-derived after a setter (CMS re-hydrate)", () => {
    const f = formation();
    f.setName("test");
    const p1 = f.policy();
    expect(Object.isFrozen(p1)).toBe(true);
    expect(Object.isFrozen(p1.roles)).toBe(true);
    expect(f.policy()).toBe(p1); // memoized
    f.setRoles(["anchor"]);
    const p2 = f.policy();
    expect(p2).not.toBe(p1); // invalidated
    expect(p2.roles).toEqual(["anchor"]);
  });
});

describe("CombatFormation — the fallback-honesty pin", () => {
  it("DEFAULT_POLICY is value-equal to the seeded default preset", () => {
    // The beat falls back to the built-in DEFAULT_POLICY when the Idea is
    // not resident; the seeded default is what a booted world resolves.
    // The two must agree or the degenerate paths diverge from production.
    const seedFile = fileURLToPath(
      new URL(
        "../../../seeds/lib/combat/CombatFormation/default.yaml",
        import.meta.url,
      ),
    );
    const seed = parse(readFileSync(seedFile, "utf8")) as {
      data: Record<string, unknown>;
    };
    const f = formation();
    f.setName(seed.data.name as string);
    f.setRoles(seed.data.roles as string[]);
    f.setAllocation(seed.data.allocation as AllocationKind);
    f.setPrimaryRole(seed.data.primaryRole as string);
    f.setProtectsRoles(seed.data.protectsRoles as string[]);
    f.setInterceptorRoles(seed.data.interceptorRoles as string[]);
    f.setInterceptTrigger(seed.data.interceptTrigger as InterceptTrigger);
    f.setCoupRight(seed.data.coupRight as string);
    f.setCoupCall(seed.data.coupCall as never);
    expect(f.policy()).toEqual(CombatFormation.DEFAULT_POLICY);
  });

  it("a fresh, un-hydrated formation already IS the default policy", () => {
    // Field initializers double as the fallback shape — a bare instance
    // (no seed applied) behaves as the default preset with no name.
    const f = formation();
    const p = f.policy();
    expect(p.allocation).toBe("sustain");
    expect(p.interceptTrigger).toBe("none");
    expect(p.coupRight).toBe("engaged");
    expect(p.coupCall).toBe("engaged");
    expect(p.roles).toEqual([]);
  });
});
