/** `lint:subcommand-words` seen to FAIL: a different-act pair and a builtin word ARE found. */

import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { BUILTIN_SUBCOMMANDS_CEILING, DIFFERENT_ACT_PAIRS_CEILING, census } from "../check-subcommand-words";

function tree(views: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "subwords-"));
  const dir = join(root, "p", "content", "platform", "cmd", "x");
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(views)) writeFileSync(join(dir, `${name}.yaml`), body);
  return root;
}

const FIGHT = (defendController?: string) =>
  `verbs: [fight]\ncontroller: /x/Fight\nsubcommands:\n  defend: {${defendController ? ` controller: ${defendController}` : ""} }\n  set: {}\n`;

describe("the two lines", () => {
  it("FINDS a subcommand word that is a flat verb with a different controller", () => {
    const r = census(tree({ fight: FIGHT(), defend: "verbs: [defend]\ncontroller: /x/Defend\n" }));
    expect(r.differentAct).toEqual([expect.stringContaining("fight defend")]);
  });

  it("⭐ the same-act route (the subcommand routes to the flat verb's controller) is clean", () => {
    const r = census(tree({ fight: FIGHT("/x/Defend"), defend: "verbs: [defend]\ncontroller: /x/Defend\n" }));
    expect(r.differentAct).toEqual([]);
  });

  it("⛔ FINDS a subcommand word equal to a script builtin", () => {
    const r = census(tree({ fight: FIGHT() }));
    expect(r.builtin).toEqual([expect.stringContaining("fight set")]);
  });
});

describe("⭐ the live tree", () => {
  it("at or below both ceilings, above zero", () => {
    const r = census();
    expect(r.differentAct.length).toBeGreaterThan(0);
    expect(r.differentAct.length).toBeLessThanOrEqual(DIFFERENT_ACT_PAIRS_CEILING);
    expect(r.builtin.length).toBeLessThanOrEqual(BUILTIN_SUBCOMMANDS_CEILING);
  });
});
