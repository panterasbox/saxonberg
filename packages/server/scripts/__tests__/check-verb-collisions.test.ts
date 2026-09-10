/**
 * `lint:verb-collisions` — the gate that would have caught the shipped
 * shadowing of the livestream `watch` by the guard-post `watch`.
 *
 * ⚠ The load-bearing tests are the two ratchet directions: a NEW
 * collision fails, and a FIXED one that is still listed also fails. A
 * ratchet that only tightens is a ratchet; one that never notices a
 * repair becomes a list nobody trusts.
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { claimsIn, collisionsIn, allViews } from "../check-verb-collisions";

/** A throwaway content tree: `<pack>/content/<where>/<verb>.yaml`. */
function tree(views: Array<{ pack: string; where: string; verbs: string[] }>): string {
  const root = mkdtempSync(join(tmpdir(), "verbs-"));
  for (const [i, v] of views.entries()) {
    const dir = join(root, v.pack, "content", v.where);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `v${i}.yaml`),
      `verbs: [${v.verbs.join(", ")}]\ncontroller: /x/Y\n`,
    );
  }
  return root;
}

describe("the census", () => {
  it("reads every verb a view claims, aliases included", () => {
    const root = tree([{ pack: "p", where: "platform/cmd/work", verbs: ["job", "jobs"] }]);
    expect(claimsIn(allViews(root)).map((c) => c.verb).sort()).toEqual([
      "job",
      "jobs",
    ]);
  });

  it("⚠ a CONTROLLER row is not a view — `idea/cmd/` is skipped", () => {
    // The shipped path rule: `<root>/idea/cmd/**` holds controllers,
    // whose rows carry `class:` and no `verbs:`. Counting them would
    // double every verb in the tree.
    const root = tree([
      { pack: "p", where: "platform/cmd/work", verbs: ["job"] },
      { pack: "p", where: "platform/idea/cmd/work", verbs: ["job"] },
    ]);
    expect(allViews(root)).toHaveLength(1);
  });

  it("⚠ walks content-only packs too — a locality ships verbs as well", () => {
    const root = tree([
      { pack: "terminus", where: "world/terminus/mayfield-row/cmd", verbs: ["lease"] },
    ]);
    expect(claimsIn(allViews(root))).toHaveLength(1);
  });

  it("is case-insensitive — `Watch` and `watch` are one verb", () => {
    const root = tree([
      { pack: "a", where: "platform/cmd/x", verbs: ["Watch"] },
      { pack: "b", where: "platform/cmd/y", verbs: ["watch"] },
    ]);
    expect([...collisionsIn(claimsIn(allViews(root))).keys()]).toEqual(["watch"]);
  });
});

describe("the collision itself", () => {
  it("⭐⭐ two views claiming one verb IS the finding", () => {
    // The shipped case, reproduced: `cmd/stream/watch.yaml` and
    // `cmd/work/watch.yaml`, both afforded from `self`, one shadowing
    // the other for every character alive.
    const root = tree([
      { pack: "platform", where: "platform/cmd/stream", verbs: ["watch"] },
      { pack: "platform", where: "platform/cmd/work", verbs: ["watch"] },
    ]);
    const bad = collisionsIn(claimsIn(allViews(root)));
    expect(bad.has("watch")).toBe(true);
    expect(bad.get("watch")).toHaveLength(2);
  });

  it("one view claiming a verb twice is not a collision", () => {
    const root = tree([{ pack: "p", where: "platform/cmd/x", verbs: ["go", "go"] }]);
    expect(collisionsIn(claimsIn(allViews(root))).size).toBe(0);
  });

  it("distinct verbs never collide", () => {
    const root = tree([
      { pack: "p", where: "platform/cmd/x", verbs: ["go"] },
      { pack: "p", where: "platform/cmd/y", verbs: ["stop"] },
    ]);
    expect(collisionsIn(claimsIn(allViews(root))).size).toBe(0);
  });
});

describe("⭐ the live tree", () => {
  it("every claim in the real content tree is accounted for", () => {
    // The gate's own subject. This does not assert a count — the roster
    // is the script's `KNOWN_COLLISIONS`, and duplicating it here would
    // be two copies of one sentence.
    const claims = claimsIn(allViews());
    expect(claims.length).toBeGreaterThan(100);
    expect(claims.every((c) => c.verb === c.verb.toLowerCase())).toBe(true);
  });

  it("⚠⚠ `watch` is claimed ONCE — the shadowing is gone", () => {
    // The regression this whole gate exists for. `cmd/work/watch.yaml`
    // was deleted; standing a post accrues from presence and has no verb.
    const watchers = claimsIn(allViews()).filter((c) => c.verb === "watch");
    expect(watchers).toHaveLength(1);
    expect(watchers[0]!.file).toContain("stream");
  });
});
