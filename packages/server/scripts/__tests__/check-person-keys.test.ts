/**
 * check-person-keys unit tests — the pure scan (the one literal shape,
 * both key orders, the comment posture) plus the live-tree
 * self-regression: zero findings the moment `StakeController` is fixed,
 * and a failure the moment the shape lands anywhere again.
 */

import { describe, expect, it } from "vitest";
import { collectLiveFindings, scanPersonKeys } from "../check-person-keys";

const FILE = "packages/content/trade-mining/src/idea/cmd/mining/StakeController.ts";

describe("scanPersonKeys", () => {
  it("flags the stake site's owner literal as it was actually written", () => {
    const source = [
      "const record = await ParcelApi.subdivide(",
      "  extent,",
      "  mine,",
      "  { kind: 'player', templatePath: giver.getTemplatePath() ?? '' },",
      "  0,",
      ");",
    ].join("\n");
    const findings = scanPersonKeys(source, FILE);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.line).toBe(4);
  });

  it("flags the same literal with the two keys in the other order", () => {
    const source =
      "owner({ templatePath: person.getTemplatePath() ?? '', kind: 'player' });";
    expect(scanPersonKeys(source, FILE)).toHaveLength(1);
  });

  it("flags it wrapped across lines the way prettier writes it at 80 columns", () => {
    const source = [
      "{",
      "  kind: 'player',",
      "  templatePath: giver.getTemplatePath() ?? '',",
      "}",
    ].join("\n");
    expect(scanPersonKeys(source, FILE)).toHaveLength(1);
  });

  it("passes the fix", () => {
    const source = "{ kind: 'player', templatePath: giver.getIdentityPath() ?? '' }";
    expect(scanPersonKeys(source, FILE)).toEqual([]);
  });

  it("does not flag the kernel's own identity-keyed owner writes", () => {
    const source = [
      "const buyer = giver.getIdentityPath();",
      "await ParcelApi.transfer(extent, { kind: 'player', templatePath: buyer });",
    ].join("\n");
    expect(scanPersonKeys(source, FILE)).toEqual([]);
  });

  it("does not flag a getTemplatePath() that keys something that is not a person", () => {
    const source = [
      "const row = { kind: 'template', templatePath: thing.getTemplatePath() };",
      "const lineage = stuff.getTemplatePath();",
    ].join("\n");
    expect(scanPersonKeys(source, FILE)).toEqual([]);
  });

  it("does not flag the shape quoted in a docblock", () => {
    const source = [
      "/**",
      " * ⚠ Never { kind: 'player', templatePath: giver.getTemplatePath() }.",
      " */",
      "const owner = { kind: 'player', templatePath: giver.getIdentityPath() };",
    ].join("\n");
    expect(scanPersonKeys(source, FILE)).toEqual([]);
  });
});

describe("the live tree", () => {
  it("keys no person on getTemplatePath() — the ceiling is 0", () => {
    expect(collectLiveFindings()).toEqual([]);
  });
});
