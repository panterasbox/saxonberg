/** `lint:greedy-object` seen to FAIL: a greedy object arg IS found, at any depth. */

import { describe, expect, it } from "vitest";
import { GREEDY_OBJECT_CEILING, census, greedyObjectArgs } from "../check-greedy-object";

describe("the classifier", () => {
  it("FINDS a greedy object and objects arg, top level and in a subcommand", () => {
    const doc = {
      args: [
        { name: "thing", type: "object", greedy: true },
        { name: "from", type: "object", preposition: "from" },
      ],
      subcommands: { give: { args: [{ name: "items", type: "objects", greedy: true }] } },
    };
    expect(greedyObjectArgs(doc)).toEqual(["thing", "give items"]);
  });

  it("greedy PROSE is not counted", () => {
    expect(greedyObjectArgs({ args: [{ name: "message", type: "string", greedy: true }] })).toEqual([]);
  });

  it("reaches a nested subcommand stanza", () => {
    const doc = { subcommands: { set: { subcommands: { save: { args: [{ name: "x", type: "object", greedy: true }] } } } } };
    expect(greedyObjectArgs(doc)).toEqual(["set save x"]);
  });
});

describe("⭐ the live tree", () => {
  it("at the ceiling", () => {
    expect(census().length).toBe(GREEDY_OBJECT_CEILING);
  });
});
