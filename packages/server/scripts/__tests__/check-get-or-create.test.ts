/**
 * check-get-or-create unit tests — the pure scan in BOTH directions,
 * plus the live-tree self-regression.
 *
 * ⭐⭐ The boundary is the thing under test. The gate's first version
 * exempted "memoized" refs and matched only `if (x) return x;`, and the
 * `??` form grew fifteen sites past it in one build (2026-10-15).
 */

import "../../src/test-bootstrap";
import { describe, expect, it } from "vitest";
import { collectLiveFindings, scanGetOrCreate } from "../check-get-or-create";

const FILE = "src/mud/platform/idea/api/ExampleLogic.ts";

describe("scanGetOrCreate — the antipattern", () => {
  it("flags the bare form, which collapses to one line", () => {
    const source = [
      "async function requireCatalogue(): Promise<C> {",
      "  const cat = StuffApi.findByTemplatePath<C>(CATALOGUE_PATH);",
      "  if (cat) return cat;",
      "  return StuffApi.singleton<C>(CATALOGUE_PATH);",
      "}",
    ].join("\n");
    const findings = scanGetOrCreate(source, FILE);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.path).toBe("CATALOGUE_PATH");
  });

  it("flags it with a swallowing try/catch around the singleton", () => {
    const source = [
      "const resident = StuffApi.findByTemplatePath<D>(path);",
      "if (resident) return resident;",
      "try {",
      "  return await StuffApi.singleton<D>(path);",
      "} catch {",
      "  return null;",
      "}",
    ].join("\n");
    expect(scanGetOrCreate(source, FILE)).toHaveLength(1);
  });

  it("flags it across a wrapped declaration (prettier at 80 columns)", () => {
    const source = [
      "const found =",
      "  StuffApi.findByTemplatePath<BlueprintCatalogue>(CATALOGUE_PATH);",
      "if (found) return found;",
      "return StuffApi.singleton<BlueprintCatalogue>(CATALOGUE_PATH);",
    ].join("\n");
    expect(scanGetOrCreate(source, FILE)).toHaveLength(1);
  });

  it("⭐⭐ flags the `??` form, with or without a tolerant catch", () => {
    const source = [
      "const org =",
      "  StuffApi.findByTemplatePath(record.organizationPath) ??",
      "  // a comment between does not hide it",
      "  (await StuffApi.singleton(record.organizationPath).catch(() => null));",
    ].join("\n");
    expect(scanGetOrCreate(source, FILE)).toHaveLength(1);
  });

  it("flags the let / if-not / try form", () => {
    const source = [
      "let org: Stuff | null = StuffApi.findByTemplatePath(path) ?? null;",
      "if (!org) {",
      "  try {",
      "    org = await StuffApi.singleton(path);",
      "  } catch {",
      "    org = null;",
      "  }",
      "}",
    ].join("\n");
    expect(scanGetOrCreate(source, FILE)).toHaveLength(1);
  });

  it("flags a pre-check in front of singletonOrClone — together they ARE singleton", () => {
    const source =
      "const counter = StuffApi.findByTemplatePath(counterPath) ?? (await StuffApi.singletonOrClone(counterPath));";
    expect(scanGetOrCreate(source, FILE)).toHaveLength(1);
  });

  it("⭐⭐ flags the MEMOIZED ref — singleton reads the same live index", () => {
    const source = [
      "let catalogueRef: C | null = null;",
      "async function requireCatalogue(): Promise<C> {",
      "  const found = StuffApi.findByTemplatePath<C>(CATALOGUE_PATH);",
      "  if (found) {",
      "    catalogueRef = found;",
      "    return found;",
      "  }",
      "  if (catalogueRef) return catalogueRef;",
      "  catalogueRef = await StuffApi.singleton<C>(CATALOGUE_PATH);",
      "  return catalogueRef;",
      "}",
    ].join("\n");
    expect(scanGetOrCreate(source, FILE)).toHaveLength(1);
  });

  it("passes the collapsed form", () => {
    const source = "return StuffApi.singleton<C>(CATALOGUE_PATH);";
    expect(scanGetOrCreate(source, FILE)).toEqual([]);
  });
});

describe("scanGetOrCreate — what it must NOT flag", () => {
  it("⚠ a pre-check on a DIFFERENT path — a different question entirely", () => {
    const source = [
      "const a = StuffApi.findByTemplatePath<C>(FIRST_PATH);",
      "if (a) return a;",
      "return StuffApi.singleton<C>(SECOND_PATH);",
    ].join("\n");
    expect(scanGetOrCreate(source, FILE)).toEqual([]);
  });

  it("⚠ a SYNC accessor beside an async ensure — two call shapes, not one lookup twice", () => {
    // `findByTemplatePath` is synchronous and `singleton` is not, so a
    // class that needs a sync read legitimately keeps both.
    const source = [
      "public subjectsSync(): C | null {",
      "  return StuffApi.findByTemplatePath<C>(SUBJECTS_PATH) ?? null;",
      "}",
      "public async requireSubjects(): Promise<C> {",
      "  return StuffApi.singleton<C>(SUBJECTS_PATH);",
      "}",
    ].join("\n");
    expect(scanGetOrCreate(source, FILE)).toEqual([]);
  });

  it("⚠ does not flag the shape quoted in a docblock", () => {
    const source = [
      "/**",
      " * ⚠ Never write:",
      " *   const cat = StuffApi.findByTemplatePath<C>(P);",
      " *   if (cat) return cat;",
      " *   return StuffApi.singleton<C>(P);",
      " */",
      "return StuffApi.singleton<C>(P);",
    ].join("\n");
    expect(scanGetOrCreate(source, FILE)).toEqual([]);
  });
});

describe("the live tree", () => {
  it("has no resident pre-check in front of singleton() — the ceiling is 0", () => {
    expect(collectLiveFindings()).toEqual([]);
  });
});
