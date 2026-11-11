/**
 * A formation is a document (documents path identity, D6/D7): its data is
 * validated into a frozen policy, the shipped default equals the built-in
 * fallback, every shipped preset reads, and a party's formation is resident
 * with the party.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse } from "yaml";
import { DEFAULT_FORMATION_PATH, DEFAULT_FORMATION_POLICY } from "../Formation";
import { DocumentNotResidentError } from "../../errors";
import { PartyApi } from "../../../api/party";

const DIR = fileURLToPath(
  new URL("../../../../../../content/platform/content/formations/", import.meta.url),
);

describe("Formation — the documents", () => {
  it("rejects out-of-vocabulary tokens and malformed role lists", () => {
    expect(() => PartyApi.formations().parse({ allocation: "scatter" }, "/t/formations/x")).toThrow(/allocation/);
    expect(() => PartyApi.formations().parse({ interceptTrigger: "sometimes" }, "/t/formations/x")).toThrow(/interceptTrigger/);
    expect(() => PartyApi.formations().parse({ coupCall: "anyone" }, "/t/formations/x")).toThrow(/coupCall/);
    expect(() => PartyApi.formations().parse({ roles: ["a", "a"] }, "/t/formations/x")).toThrow(/duplicate/);
    expect(() => PartyApi.formations().parse({ roles: [""] }, "/t/formations/x")).toThrow(/non-empty/);
  });

  it("a policy is frozen, and named by its path's leaf", () => {
    const p = PartyApi.formations().parse({ roles: ["front"] }, "/t/formations/wall");
    expect(p.name).toBe("wall");
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.roles)).toBe(true);
  });

  it("⭐ DEFAULT_POLICY is value-equal to the shipped default preset", () => {
    const data = parse(readFileSync(DIR + "default.yaml", "utf8")) as Record<string, unknown>;
    expect(PartyApi.formations().parse(data, DEFAULT_FORMATION_PATH)).toEqual(DEFAULT_FORMATION_POLICY);
  });

  it("every shipped preset reads into its policy", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".yaml"));
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const file of files) {
      const data = parse(readFileSync(DIR + file, "utf8")) as Record<string, unknown>;
      const p = PartyApi.formations().parse(data, `/platform/formations/${file.slice(0, -5)}`);
      expect(p.allocation).toBe(data.allocation);
      expect(p.roles).toEqual(data.roles ?? []);
    }
  });

  it("a sync read of a formation nothing loaded throws DocumentNotResidentError", () => {
    expect(() => PartyApi.formations().need("/t/formations/never")).toThrow(DocumentNotResidentError);
  });

  it("a captain's word finds a resident formation with no store read", async () => {
    // The test bootstrap keeps the kernel's formations resident, as a party's onCreate would.
    expect(await PartyApi.formations().pathOfWord("vanguard")).toBe("/platform/formations/vanguard");
  });
});
