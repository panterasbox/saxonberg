/**
 * What a click types. A name is typed the way a player would type it:
 * MQL's operator characters escaped, everything else as written.
 */

import { describe, expect, it } from "vitest";
import { escapeTarget, lookCommand } from "../clickTarget";

describe("escapeTarget", () => {
  it("⭐ an apostrophe inside a word is a letter — `Dave's Bar` goes as written", () => {
    expect(escapeTarget("Dave's Bar")).toBe("Dave's Bar");
  });

  it("MQL's operator characters are escaped", () => {
    expect(escapeTarget("salt, pepper")).toBe("salt\\, pepper");
    expect(escapeTarget("note: urgent")).toBe("note\\: urgent");
    expect(escapeTarget("Mr. Pip")).toBe("Mr\\. Pip");
    expect(escapeTarget("#5 tram")).toBe("\\#5 tram");
  });

  it("a leading apostrophe is escaped (there it would open a literal)", () => {
    expect(escapeTarget("'allo")).toBe("\\'allo");
  });

  it("lookCommand sends the keyword, escaped", () => {
    expect(lookCommand("x1", "dave's", "words")).toBe("look dave's");
    expect(lookCommand("x1", "a,b", "words")).toBe("look a\\,b");
    expect(lookCommand("x1", "a,b", "ids")).toBe("look #x1");
  });
});
