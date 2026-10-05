/**
 * check-identity-mints unit tests — the pure scan (a marked site, an
 * unmarked site, a word outside the closed vocabulary, the comment
 * posture) plus the live-tree census: the shipped count, and the
 * unjustified meter sitting exactly on its ceiling.
 */

import "../../src/test-bootstrap";
import { describe, expect, it } from "vitest";
import {
  KEYED_BY_WORDS,
  UNJUSTIFIED_CEILING,
  collectMintSites,
  scanIdentityMints,
} from "../check-identity-mints";

const FILE = "src/mud/platform/idea/api/SomeLogic.ts";

describe("scanIdentityMints", () => {
  it("reads the marker above a mint and keeps its prose", () => {
    const source = [
      "const party = await StuffApi.clone<Party>(",
      "  '/platform/idea/Party',",
      "  undefined,",
      "  // identity-keyed-by: own-record — PartyRecord.path IS this string",
      "  { asIdentityPath: rec.path },",
      ");",
    ].join("\n");
    const sites = scanIdentityMints(source, FILE);
    expect(sites).toHaveLength(1);
    expect(sites[0]!.keyedBy).toBe("own-record");
    expect(sites[0]!.reason).toMatch(/PartyRecord\.path/);
  });

  it("⚠ an UNMARKED mint is reported with no word — the error case", () => {
    const source = "await StuffApi.clone(row, undefined, { asIdentityPath: p });";
    const sites = scanIdentityMints(source, FILE);
    expect(sites).toHaveLength(1);
    expect(sites[0]!.keyedBy).toBeNull();
    expect(sites[0]!.badWord).toBeUndefined();
  });

  it("⭐ `probe` is NOT in the vocabulary — a mint cannot justify itself", () => {
    // The corpse mints an ordinal by asking whether its own candidate
    // identity is free. That is circular, so the word does not exist.
    expect(KEYED_BY_WORDS).not.toContain("probe");
    const source = [
      "// identity-keyed-by: probe — the ordinal scan finds it free",
      "await StuffApi.clone(row, undefined, { asIdentityPath: p });",
    ].join("\n");
    const sites = scanIdentityMints(source, FILE);
    expect(sites[0]!.keyedBy).toBeNull();
    expect(sites[0]!.badWord).toBe("probe");
  });

  it("finds a marker across a prettier-wrapped gap", () => {
    const source = [
      "      // identity-keyed-by: referenced — a parked character's",
      "      // snapshot records this node as its container",
      "      room = await StuffApi.clone<MemberStuff>(template, undefined, {",
      "        asIdentityPath: plan.nodeIdentityOf(nodeId, extent),",
      "      });",
    ].join("\n");
    const sites = scanIdentityMints(source, FILE);
    expect(sites).toHaveLength(1);
    expect(sites[0]!.keyedBy).toBe("referenced");
  });

  it("an optional TYPE declaration is not a mint site", () => {
    // The clone pipeline's own signature must not read as a mint.
    const source =
      "opts?: { dataOverlay?: Record<string, unknown>; asIdentityPath?: string }";
    expect(scanIdentityMints(source, FILE)).toEqual([]);
  });

  it("a mention in prose is not a mint site", () => {
    const source = [
      "/**",
      " * The guest path is minted via `asIdentityPath` — no template row.",
      " */",
      "const x = 1;",
    ].join("\n");
    expect(scanIdentityMints(source, FILE)).toEqual([]);
  });

  it("reading the option without assigning it is not a mint site", () => {
    const source = [
      "const identityPath = opts?.asIdentityPath ?? templatePath;",
      "if (opts?.asIdentityPath) Stuff._stampIdentityPath(obj, opts.asIdentityPath);",
    ].join("\n");
    expect(scanIdentityMints(source, FILE)).toEqual([]);
  });
});

describe("the live census", () => {
  it("every shipped mint site carries a marker in the vocabulary", () => {
    const sites = collectMintSites();
    const unanswered = sites.filter((s) => s.keyedBy === null);
    expect(unanswered).toEqual([]);
  });

  it("⭐ the unjustified meter sits on its ceiling and may only fall", () => {
    const unjustified = collectMintSites().filter((s) => s.keyedBy === "none");
    expect(unjustified.length).toBeLessThanOrEqual(UNJUSTIFIED_CEILING);
    // The two are named non-goals: the anonymous guest and the corpse.
    expect(unjustified.map((s) => s.file).sort()).toEqual([
      "src/mud/platform/idea/Login.ts",
      "src/mud/platform/idea/api/ConditionLogic.ts",
    ]);
  });
});
