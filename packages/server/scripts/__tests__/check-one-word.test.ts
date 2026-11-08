/** `lint:one-word` seen to FAIL: each of its three counts FINDS its violation. */

import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  CONTROLLERS_ACROSS_VERBS_CEILING,
  MULTI_WORD_VIEWS_CEILING,
  census,
} from "../check-one-word";

/** `p/content/platform/cmd/x/<name>.yaml` bodies in a throwaway tree. */
function tree(views: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "oneword-"));
  const dir = join(root, "p", "content", "platform", "cmd", "x");
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(views)) writeFileSync(join(dir, `${name}.yaml`), body);
  return root;
}

describe("(a) multi-word views", () => {
  it("FINDS a view answering to two words", () => {
    const r = census(tree({ look: "verbs: [look, l]\ncontroller: /x/Look\n" }));
    expect(r.multiWord).toHaveLength(1);
    expect(r.extraWords).toBe(1);
  });
  it("one word is clean", () => {
    expect(census(tree({ look: "verbs: [look]\ncontroller: /x/Look\n" })).multiWord).toEqual([]);
  });
});

describe("(b) controllers across verbs", () => {
  it("FINDS one controller named by two verbs' views (relative paths resolved)", () => {
    const r = census(
      tree({
        ascend: "verbs: [ascend]\ncontroller: ../../idea/cmd/x/ClimbController\n",
        descend: "verbs: [descend]\ncontroller: /platform/idea/cmd/x/ClimbController\n",
      }),
    );
    expect(r.acrossVerbs).toEqual([expect.stringContaining("/platform/idea/cmd/x/ClimbController")]);
  });
  it("two controllers are clean", () => {
    const r = census(tree({ a: "verbs: [a]\ncontroller: /x/A\n", b: "verbs: [b]\ncontroller: /x/B\n" }));
    expect(r.acrossVerbs).toEqual([]);
  });
});

describe("(c) default aliases", () => {
  it("FINDS a duplicate, a verb-shadowing name and a builtin", () => {
    const r = census(
      tree({
        look: "verbs: [look]\ncontroller: /x/L\ndefaultAliases: [{name: l}, {name: go}, {name: set}]\n",
        list: "verbs: [list]\ncontroller: /x/Li\ndefaultAliases: [{name: l}]\n",
        go: "verbs: [go]\ncontroller: /x/G\n",
      }),
    );
    expect(r.badAliases.some((b) => b.includes("'l' is also declared"))).toBe(true);
    expect(r.badAliases.some((b) => b.includes("'go' is a verb"))).toBe(true);
    expect(r.badAliases.some((b) => b.includes("'set' is a script builtin"))).toBe(true);
  });
  it("one alias, one view, no verb of that name, is clean", () => {
    const r = census(tree({ look: "verbs: [look]\ncontroller: /x/L\ndefaultAliases: [{name: l}]\n" }));
    expect(r.badAliases).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("at or below the ceilings", () => {
    const r = census();
    expect(r.multiWord.length).toBeLessThanOrEqual(MULTI_WORD_VIEWS_CEILING);
    expect(r.acrossVerbs.length).toBeLessThanOrEqual(CONTROLLERS_ACROSS_VERBS_CEILING);
    expect(r.badAliases).toEqual([]);
  });
});
