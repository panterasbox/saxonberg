/**
 * ⭐ Hemp through the textile chain (cordage D14): line and tow worked from
 * a hemp sheaf ARE hemp — its material, its name, its words — and flax line
 * stays flax. The retting profiles never both match one straw.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import TextileStock from "../thing/TextileStock";
import Material from "@saxonberg/server/mud/platform/idea/material/Material";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { makeStuff, makeStuffAtPath } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";

let linen: Material;
let hemp: Material;

beforeEach(() => {
  StuffApi.clearAll();
  linen = makeStuffAtPath(() => new Material(), "/test/textile/linen");
  linen.setName("linen");
  hemp = makeStuffAtPath(() => new Material(), "/test/textile/hemp");
  hemp.setName("hemp");
});

afterEach(() => StuffApi.clearAll());

function line(): TextileStock {
  const s = makeStuff(() => new TextileStock());
  s.setMaterial(linen);
  s.setShortDescription("hank of flax line");
  s.setKeywords(["line", "flax", "hank"]);
  return s;
}

describe("hemp line (cordage D14)", () => {
  it("⭐ line worked from hemp is hemp, in its material and its words", () => {
    const s = line();
    s.adoptFibre(hemp);
    expect(s.getMaterial()).toBe(hemp);
    expect(s.getShortDescription()).toBe("hank of hemp line");
    expect(s.getKeywords()).toContain("hemp");
  });

  it("flax line worked from flax stays flax line", () => {
    const s = line();
    s.adoptFibre(linen);
    expect(s.getShortDescription()).toBe("hank of flax line");
  });

  it("⭐ the two retting profiles take two different straws", () => {
    const row = (p: string) => parse(readFileSync(new URL(p, import.meta.url), "utf8")).data;
    const flax = row("../../content/trade/textiles/idea/maturation/retting.yaml");
    const hempProfile = row("../../content/trade/textiles/idea/maturation/retting-hemp.yaml");
    expect(flax.inputCategory).not.toBe(hempProfile.inputCategory);
    expect(hempProfile.productMaterial).toBe("/stuff/idea/material/textile/hemp");
  });
});
