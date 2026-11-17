/**
 * `lint:view-keys` seen to FAIL on a key the pin does not name (the retired
 * `readies:` view field is the shape) and to PASS a key the schema dropped.
 * review-questions.md P9.
 */

import { describe, expect, it } from "vitest";
import { PINNED_VIEW_KEYS, diffViewKeys, readSchema, schemaKeys } from "../check-view-keys";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

describe("the pin", () => {
  it("⭐ FAILS a view key the pin does not name (`readies:`)", () => {
    const s = clone(readSchema());
    (s["properties"] as Record<string, unknown>)["readies"] = { type: "string" };
    expect(diffViewKeys(s).added).toEqual([{ surface: "view", key: "readies" }]);
  });

  it("FAILS a new key on an arg, an option and a subcommand alike", () => {
    const s = clone(readSchema());
    const defs = s["$defs"] as Record<string, { properties: Record<string, unknown> }>;
    defs["positional"]!.properties["homes"] = {};
    defs["option"]!.properties["autoDraw"] = {};
    defs["subcommand"]!.properties["readies"] = {};
    expect(diffViewKeys(s).added).toEqual([
      { surface: "subcommand", key: "readies" },
      { surface: "arg", key: "homes" },
      { surface: "option", key: "autoDraw" },
    ]);
  });

  it("PASSES a removed key (the vocabulary shrank) and reports it", () => {
    const s = clone(readSchema());
    delete (s["properties"] as Record<string, unknown>)["async"];
    const d = diffViewKeys(s);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([{ surface: "view", key: "async" }]);
  });

  it("every pinned key states what it does to the command", () => {
    for (const surface of Object.values(PINNED_VIEW_KEYS)) {
      for (const line of Object.values(surface)) expect(line.length).toBeGreaterThan(10);
    }
  });
});

describe("⭐ the live schema", () => {
  it("allows exactly the pinned keys", () => {
    const d = diffViewKeys(readSchema());
    expect(d).toEqual({ added: [], removed: [] });
    expect(Object.keys(schemaKeys(readSchema()))).toEqual(["view", "subcommand", "arg", "option"]);
  });
});
