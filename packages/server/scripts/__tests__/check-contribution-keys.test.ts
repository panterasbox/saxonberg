/** `lint:contribution-keys` seen to FAIL: a key naming no view is FOUND. */

import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { census, contributionKeysIn, type ContributionKey } from "../check-contribution-keys";

/** A content tree with one platform view and one pack src module. */
function tree(module: string): { content: string; mud: string } {
  const root = mkdtempSync(join(tmpdir(), "contrib-"));
  const views = join(root, "content", "platform", "content", "platform", "cmd", "x");
  mkdirSync(views, { recursive: true });
  writeFileSync(join(views, "look.yaml"), "verbs: [look]\ncontroller: /x/Look\n");
  const mud = join(root, "mud");
  mkdirSync(mud, { recursive: true });
  writeFileSync(join(mud, "Thing.ts"), module);
  return { content: join(root, "content"), mud };
}

describe("contribution keys", () => {
  it("a key naming a shipped view is clean", () => {
    const t = tree(
      "class A { static commandContributions = { peers: ['platform/cmd/x/look.yaml'] }; }",
    );
    const r = census(t.content, t.mud);
    expect(r.keys).toHaveLength(1);
    expect(r.dangling).toEqual([]);
  });

  it("FINDS a key naming no view", () => {
    const t = tree(
      "class A { static commandContributions = {\n  environment: ['platform/cmd/x/scrub.yaml'],\n}; }",
    );
    const r = census(t.content, t.mud);
    expect(r.dangling.map((d) => [d.bucket, d.key, d.line])).toEqual([
      ["environment", "platform/cmd/x/scrub.yaml", 2],
    ]);
  });

  it("FINDS a dangling key held in a same-file const, bare or spread", () => {
    const t = tree(
      "const HELD = ['platform/cmd/x/gone.yaml'] as const;\n" +
        "class A { static commandContributions = { environment: HELD, peers: [...HELD, 'platform/cmd/x/look.yaml'] }; }",
    );
    const r = census(t.content, t.mud);
    expect(r.dangling.map((d) => d.bucket).sort()).toEqual(["environment", "peers"]);
  });

  it("FINDS a list it cannot read (an imported const) as unresolved", () => {
    const unresolved: ContributionKey[] = [];
    contributionKeysIn("f.ts", "class A { static commandContributions = { peers: IMPORTED }; }", unresolved);
    expect(unresolved.map((u) => u.key)).toEqual(["IMPORTED"]);
  });

  it("a declaration shown in a comment, and another class's spread, are not keys", () => {
    const keys = contributionKeysIn(
      "f.ts",
      "/** static commandContributions = { peers: ['nope.yaml'] } */\n" +
        "class A { static commandContributions = { peers: [...(B.commandContributions.peers ?? [])] }; }",
    );
    expect(keys).toEqual([]);
  });
});
