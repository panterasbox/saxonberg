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

/** A throwaway tree of full view bodies: `<pack>/content/platform/cmd/x/v<i>.yaml`. */
function shapes(bodies: string[]): string {
  const root = mkdtempSync(join(tmpdir(), "shapes-"));
  const dir = join(root, "p", "content", "platform", "cmd", "x");
  mkdirSync(dir, { recursive: true });
  for (const [i, body] of bodies.entries()) writeFileSync(join(dir, `v${i}.yaml`), body);
  return root;
}

const THROW = `verbs: [throw]
controller: /x/Throw
args:
  - { name: item, type: object, required: true }
`;
const THROW_TO = `verbs: [throw]
controller: /x/ThrowTo
args:
  - { name: item, type: object, required: true }
  - { name: to, type: object, required: true, prepositions: [to], prepositionRequired: true }
`;
const THROW_AT = `verbs: [throw]
controller: /x/ThrowAt
args:
  - { name: item, type: object, required: true }
  - { name: at, type: object, required: true, prepositions: [at], prepositionRequired: true }
`;

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

  it("⭐ a view claiming a SCRIPTING BUILTIN collides with the interpreter — `set` never reaches dispatch", () => {
    // The fishing build shipped `set <trap>`; `set x y` is the shell's
    // variable binding and the interpreter takes the line first. Typed,
    // it answered with silence. One view, one verb — and a collision.
    const root = tree([{ pack: "p", where: "trade/fishing/cmd/fishing/set", verbs: ["set"] }]);
    const bad = collisionsIn(claimsIn(allViews(root)));
    expect([...bad.keys()]).toEqual(["set"]);
    expect(bad.get("set")!.some((f) => f.includes("builtins"))).toBe(true);
  });

  it("distinct verbs never collide", () => {
    const root = tree([
      { pack: "p", where: "platform/cmd/x", verbs: ["go"] },
      { pack: "p", where: "platform/cmd/y", verbs: ["stop"] },
    ]);
    expect(collisionsIn(claimsIn(allViews(root))).size).toBe(0);
  });
});

describe("⭐⭐ D17 — disjoint shapes are not a collision", () => {
  it("`throw X` · `throw X to Y` · `throw X at Y` — three views, one word, PASS", () => {
    const bad = collisionsIn(claimsIn(allViews(shapes([THROW, THROW_TO, THROW_AT]))));
    expect(bad.has("throw")).toBe(false);
  });

  it("⚠ the same two-slot shapes WITHOUT prepositionRequired collide", () => {
    // Remove the violation's proof and the gate must fire: `throw ball ann`
    // binds both two-slot views when neither preposition is required.
    const loose = (body: string): string => body.replace(", prepositionRequired: true", "");
    const bad = collisionsIn(claimsIn(allViews(shapes([THROW, loose(THROW_TO), loose(THROW_AT)]))));
    expect(bad.has("throw")).toBe(true);
  });

  it("⚠ intersecting required prepositions are not disjoint", () => {
    const both = THROW_AT.replace("prepositions: [at]", "prepositions: [at, to]");
    const bad = collisionsIn(claimsIn(allViews(shapes([THROW_TO, both]))));
    expect(bad.has("throw")).toBe(true);
  });

  it("⚠ differing REQUIRED counts with overlapping ranges collide (`pour`)", () => {
    // One required + an optional slot binds two words just as a
    // two-required view does: `pour gin into glass` binds both.
    const one = `verbs: [pour]
controller: /x/A
args:
  - { name: spirit, type: object, required: true }
  - { name: vessel, type: object, required: false, prepositions: [into] }
`;
    const two = `verbs: [pour]
controller: /x/B
args:
  - { name: source, type: object, required: true }
  - { name: target, type: object, required: true, prepositions: [into] }
`;
    expect(collisionsIn(claimsIn(allViews(shapes([one, two])))).has("pour")).toBe(true);
  });

  it("a view with subcommands is never proved disjoint", () => {
    const subs = `verbs: [throw]
controller: /x/S
subcommands:
  far: { args: [] }
`;
    expect(collisionsIn(claimsIn(allViews(shapes([THROW_TO, subs])))).has("throw")).toBe(true);
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
