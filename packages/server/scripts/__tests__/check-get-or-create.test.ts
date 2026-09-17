/**
 * check-get-or-create unit tests — the pure scan in BOTH directions,
 * plus the live-tree self-regression.
 *
 * ⭐⭐ The negative cases carry the weight here. This gate's first run
 * flagged eight kernel sites that are **not** defects — memoized module
 * refs whose lookup does real cache-invalidation work — and a gate that
 * cried wolf on those would have been turned off inside a week. The
 * boundary is the thing under test, not the happy path.
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

  it("passes the collapsed form", () => {
    const source = "return StuffApi.singleton<C>(CATALOGUE_PATH);";
    expect(scanGetOrCreate(source, FILE)).toEqual([]);
  });
});

describe("scanGetOrCreate — what it must NOT flag", () => {
  it("⭐⭐ a MEMOIZED ref whose lookup invalidates the cache", () => {
    // The lookup is doing work `singleton` cannot do for the caller:
    // *the live registered instance supersedes my cached handle.* Eight
    // of these exist in the kernel and none is a defect.
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
    expect(scanGetOrCreate(source, FILE)).toEqual([]);
  });

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
