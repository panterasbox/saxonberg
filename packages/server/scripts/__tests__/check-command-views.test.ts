/**
 * `lint:command-views` — the schema gate, seen to FAIL
 * (docs/lint-family.md § Four ways a census lies, 3).
 *
 * Every assertion is a POSITIVE: a malformed view IS found, and the same
 * view with its violation removed is not.
 */

import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { CATEGORY_REQUIRED, run, schemaTrail } from "../check-command-views";

/** `<pack>/content/<where>/<name>.yaml` bodies in a throwaway tree. */
function tree(views: Array<{ where: string; name: string; body: string }>): string {
  const root = mkdtempSync(join(tmpdir(), "views-"));
  for (const v of views) {
    const dir = join(root, "p", "content", v.where);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${v.name}.yaml`), v.body);
  }
  return root;
}

const GOOD = "verbs: [look]\ndescription: Look around.\ncontroller: /x/Look\n";

describe("the schema half (hard)", () => {
  it("⭐ FINDS a view with a key the schema does not know", () => {
    const r = run(tree([{ where: "platform/cmd/perception", name: "look", body: GOOD + "colour: red\n" }]));
    expect(r.schema).toHaveLength(1);
    expect(r.schema[0]!.detail).toContain("additional properties");
  });

  it("FINDS a view missing a required key", () => {
    const r = run(tree([{ where: "platform/cmd/perception", name: "look", body: "verbs: [look]\n" }]));
    expect(r.schema).toHaveLength(1);
  });

  it("FINDS an opens_card that is not a card (the validator's hand-written rule)", () => {
    expect(schemaTrail({ verbs: ["x"], description: "x", opens_card: "no-such-card" })).toContain(
      "is not a card",
    );
  });

  it("the same view with the violation removed is clean", () => {
    const r = run(tree([{ where: "platform/cmd/perception", name: "look", body: GOOD }]));
    expect(r.schema).toHaveLength(0);
  });

  it("a controller row under idea/cmd/ is not a view", () => {
    const r = run(tree([{ where: "platform/idea/cmd/perception", name: "LookController", body: "class: /x\n" }]));
    expect(r.views).toBe(0);
  });
});

describe("the category half (warning until W6)", () => {
  it("FINDS a view with no category:, naming the directory it should agree with", () => {
    const r = run(tree([{ where: "platform/cmd/perception", name: "look", body: GOOD }]));
    expect(r.category).toHaveLength(1);
    expect(r.category[0]!.detail).toContain("'perception'");
  });

  it("reports a domain-local view in no category directory on its own line", () => {
    const r = run(tree([{ where: "world/a/b/cmd", name: "lease", body: GOOD }]));
    expect(r.noCategoryDir).toHaveLength(1);
    expect(r.category).toHaveLength(0);
  });

  it("is a warning today — the one constant W6 flips", () => {
    expect(typeof CATEGORY_REQUIRED).toBe("boolean");
  });
});

describe("⛔ the depth half (hard, zero — controller-liquidity W16)", () => {
  const NESTED =
    "verbs: [cockpit]\ncategory: shell\ndescription: d\ncontroller: /x/C\n" +
    "subcommands:\n  layout:\n    subcommands:\n      save: { controller: /x/S }\n";
  it("⭐ FINDS a subcommand stanza that nests another level, by name", () => {
    const r = run(tree([{ where: "platform/cmd/shell", name: "cockpit", body: NESTED }]));
    expect(r.nested).toHaveLength(1);
    expect(r.nested[0]!.detail).toContain("'layout'");
    // The schema refuses the key as well — two readers, one rule.
    expect(r.schema).toHaveLength(1);
  });

  it("a one-level verb (hyphenated compound name included) is clean", () => {
    const body =
      "verbs: [client-layout]\ncategory: shell\ndescription: d\ncontroller: /x/C\n" +
      "subcommands:\n  save: { controller: /x/S }\n";
    const r = run(tree([{ where: "platform/cmd/shell", name: "client-layout", body }]));
    expect(r.nested).toEqual([]);
    expect(r.schema).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("every shipped view conforms to the command schema", () => {
    const r = run();
    expect(r.views).toBeGreaterThan(300);
    expect(r.schema).toEqual([]);
  });

  it("⛔ no shipped view nests a subcommand", () => {
    expect(run().nested).toEqual([]);
  });
});
