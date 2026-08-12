/**
 * check-topic-keys unit tests — the resolver's five call shapes, and
 * the two failure modes that actually bit.
 *
 * ⚠ The live-tree assertion (`lint:topics` over the real corpus) is
 * necessary but not sufficient: it only ever proves the gate is green
 * *today*. The interesting question is whether the gate can be green
 * while WRONG, which is exactly what happened during this build — so
 * these cases pin the two ways it was.
 */

import { afterAll, describe, expect, it } from "vitest";
import {
  buildNameTable,
  resolveArgument,
  stripComments,
} from "../check-topic-keys";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const roots: string[] = [];

function fileWith(source: string): string {
  const dir = mkdtempSync(join(tmpdir(), "topickeys-"));
  roots.push(dir);
  const p = join(dir, "Sample.ts");
  writeFileSync(p, source);
  return p;
}

afterAll(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe("resolveArgument — the five call shapes", () => {
  it("resolves a literal", () => {
    const t = buildNameTable([]);
    expect([...(resolveArgument("'speech.vocal'", t, t) ?? [])]).toEqual([
      "speech.vocal",
    ]);
  });

  it("resolves a module constant, including SCREAMING_CASE", () => {
    const f = fileWith(`const FEED_TOPIC = 'publication.press';\n`);
    const t = buildNameTable([f]);
    expect([...(resolveArgument("FEED_TOPIC", t, t) ?? [])]).toEqual([
      "publication.press",
    ]);
  });

  it("resolves a class field through `this.`", () => {
    const f = fileWith(
      `  protected readonly sceneTopic = 'sense.survey';\n`
    );
    const t = buildNameTable([f]);
    expect([...(resolveArgument("this.sceneTopic", t, t) ?? [])]).toEqual([
      "sense.survey",
    ]);
  });

  it("resolves BOTH arms of a multi-line ternary", () => {
    // The shape that hid `world.narration.movement` / `.teleport`: an
    // earlier revision's right-hand side stopped at the newline, so a
    // wrapped ternary yielded no literals at all and the emitter went
    // unseen.
    const f = fileWith(
      `      const topic = exit\n` +
        `        ? 'act.move'\n` +
        `        : 'act.deed';\n`
    );
    const t = buildNameTable([f]);
    expect([...(resolveArgument("topic", t, t) ?? [])].sort()).toEqual([
      "act.deed",
      "act.move",
    ]);
  });

  it("resolves a forwarded option property", () => {
    const f = fileWith(`  const opts = { topic: 'speech.vocal' };\n`);
    const t = buildNameTable([f]);
    expect([...(resolveArgument("opts.topic", t, t) ?? [])]).toEqual([
      "speech.vocal",
    ]);
  });

  it("returns null for a genuinely unresolvable argument", () => {
    // Rule 3 turns this into an ERROR rather than a skip. A
    // silently-skipped emitter is how 45 unauthored topics stayed
    // hidden.
    const t = buildNameTable([]);
    expect(resolveArgument("someFn()", t, t)).toBeNull();
    expect(resolveArgument("a + b", t, t)).toBeNull();
  });
});

describe("⚠ local declarations beat the tree-wide table", () => {
  it("does not let another file's `topic` answer for this one", () => {
    // THE regression. The first version of this gate resolved names
    // against one tree-wide table, so `Mobile.ts`'s `.topic(topic)`
    // matched an unrelated controller's `topic` default and resolved
    // to a plausible WRONG key. The gate reported green while two
    // emitters kept firing retired topics.
    const mine = fileWith(`      const topic = 'act.move';\n`);
    const other = fileWith(`  topic: string = 'shell.result'\n`);

    const local = buildNameTable([mine]);
    const global = buildNameTable([mine, other]);

    expect([...(resolveArgument("topic", local, global) ?? [])]).toEqual([
      "act.move",
    ]);
  });

  it("still falls back to the tree for an imported constant", () => {
    // Scoping must not break the legitimate case: a constant declared
    // in one module and used in another, and an abstract field whose
    // concrete initializers live in sibling subclasses.
    const declarer = fileWith(
      `export const COMBAT_EXCHANGE_TOPIC = 'act.combat';\n`
    );
    const user = fileWith(`  scene.topic(COMBAT_EXCHANGE_TOPIC);\n`);

    const local = buildNameTable([user]);
    const global = buildNameTable([declarer, user]);

    expect([
      ...(resolveArgument("COMBAT_EXCHANGE_TOPIC", local, global) ?? []),
    ]).toEqual(["act.combat"]);
  });
});

describe("stripComments — prose is not an emitter", () => {
  it("drops a doc comment that mentions a topic call", () => {
    const src =
      ` * Emits via \`MessageApi.scene(...).topic(sense.survey)\`,\n` +
      `const TOPIC = 'act.deed';\n`;
    const out = stripComments(src);
    expect(out).not.toContain("sense.survey");
    expect(out).toContain("act.deed");
  });

  it("does NOT truncate a code line carrying a trailing //", () => {
    // Deliberately conservative: mangling a code line could HIDE an
    // emitter, which is the failure this whole script exists to
    // prevent. A spurious match only gets reported.
    const src = `const TOPIC = 'act.deed'; // the deed topic\n`;
    expect(stripComments(src)).toContain("act.deed");
  });
});
