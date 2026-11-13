/** `lint:lineage-keys` seen to FAIL: a person keyed on lineage IS found, under any person-word name. */

import { describe, expect, it } from "vitest";
import { parseTs } from "../pack-roots";
import { LINEAGE_KEYS_CEILING, census, isPersonName, scanLineageKeys } from "../check-lineage-keys";

const found = (src: string): string[] => scanLineageKeys(parseTs("/x.ts", src)).map((f) => f.name);

describe("the person-word names", () => {
  it("the whole name, or its first or last camelCase word", () => {
    expect(["maker", "makerPath", "memberKey", "ownerTemplatePath", "by"].every(isPersonName)).toBe(true);
    expect(["path", "byte", "template", "memberships", "nearby"].some(isPersonName)).toBe(false);
  });
});

describe("the classifier", () => {
  it("FINDS a property, a variable and an assignment fed from getTemplatePath()", () => {
    const src = [
      "const stamp = { maker: maker.getTemplatePath() ?? '' };",
      "const receiverPath = receiver.getTemplatePath();",
      "doc.owner = actor.getTemplatePath() ?? '';",
    ].join("\n");
    expect(found(src)).toEqual(["maker", "receiverPath", "owner"]);
  });

  it("FINDS a comparison with a person-word name", () => {
    expect(found("members.some((m) => m.getTemplatePath() === memberKey);")).toEqual(["memberKey"]);
  });

  it("an identity-first fallback is the sanctioned form", () => {
    expect(found("const makerPath = a.getIdentityPath() ?? a.getTemplatePath() ?? '';")).toEqual([]);
  });

  it("a template path passed INTO a lookup is a key, not the value", () => {
    expect(found("const owner = await ParcelApi.ownerOf(zone.getTemplatePath() ?? '');")).toEqual([]);
  });

  it("a static `getTemplatePath(id)` with an argument is not a lineage read", () => {
    expect(found("const memberKey = Avatar.getTemplatePath(id);")).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("at the ceiling", () => {
    expect(census().length).toBe(LINEAGE_KEYS_CEILING);
  });
});
