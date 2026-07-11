/**
 * Coverage-guard audit for the `@authorable` classification (Studio /
 * composition surface, P0).
 *
 * The invariant: every registry mixin's declared persistent + instruction
 * fields carry **exactly one** of `@authorable` / `@runtimeState`, so the
 * author↔runtime-state judgment is made explicitly *where the field lives*
 * and no field is silently unclassified.
 *
 * This audit reads the mixin **source** directly (not the TypeDoc model):
 * TypeDoc does not reflect a mixin factory's instance-field declarations,
 * so the source markers are the classification's source of truth. It
 * cross-references each registry mixin's `persistentFields` /
 * `instructionFields` arrays against the `@authorable` / `@runtimeState`
 * TSDoc markers found on its field declarations.
 *
 * It is **env-gated** (`AUTHORABLE_COVERAGE=1`) so the default suite stays
 * green while the full-registry annotation is in flight — running it emits
 * the complete worklist (grouped by file) and fails until every field is
 * classified. Once coverage is complete this becomes the tripwire that a
 * newly-added-but-unclassified mixin field trips.
 *
 *   AUTHORABLE_COVERAGE=1 pnpm exec vitest run \
 *     scripts/__tests__/authorable-coverage.test.ts
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MUD_ROOT = join(HERE, "..", "..", "src", "mud");

function walkTsFiles(dir: string, acc: string[]): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__") continue;
      walkTsFiles(p, acc);
    } else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) {
      acc.push(p);
    }
  }
  return acc;
}

/** The Mixins-registry name set (the coverage scope). */
function registryMixinNames(): Set<string> {
  const src = readFileSync(join(MUD_ROOT, "lib", "mixin.ts"), "utf8");
  return new Set(
    [...src.matchAll(/:\s*'([A-Za-z]+Mixin)'/g)].map((m) => m[1]!),
  );
}

/** Pull the quoted-string entries of a `static <name> = [ … ]` literal. */
function staticStringArray(src: string, name: string): string[] {
  const re = new RegExp(
    `static\\s+${name}\\s*(?::[^=]+)?=\\s*\\[([\\s\\S]*?)\\]`,
    "g",
  );
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    for (const s of m[1]!.matchAll(/['"]([\w.-]+)['"]/g)) out.push(s[1]!);
  }
  return out;
}

/** Underscore-insensitive candidate names for a declared identifier. */
function candidates(id: string): Set<string> {
  const bare = id.replace(/^_/, "");
  return new Set([id, bare, `_${bare}`]);
}

interface MixinRow {
  file: string;
  mixin: string;
  fields: string[]; // persistent ∪ instruction
  authorable: Set<string>; // candidate names carrying @authorable
  runtime: Set<string>; // candidate names carrying @runtimeState
}

function scan(): MixinRow[] {
  const rows: MixinRow[] = [];
  for (const file of walkTsFiles(MUD_ROOT, [])) {
    const src = readFileSync(file, "utf8");
    const mixinNames = [
      ...src.matchAll(/static\s+_mixinName\s*=\s*['"]([A-Za-z0-9_]+)['"]/g),
    ].map((m) => m[1]!);
    const persistent = staticStringArray(src, "persistentFields");
    const instruction = staticStringArray(src, "instructionFields");
    const fields = [...new Set([...persistent, ...instruction])];
    if (mixinNames.length === 0 || fields.length === 0) continue;

    // Collect (comment → following-declaration identifier) pairs and
    // fold their classification markers onto the identifier candidates.
    const authorable = new Set<string>();
    const runtime = new Set<string>();
    const decl =
      /\/\*\*([\s\S]*?)\*\/\s*(?:public\s+|private\s+|protected\s+|readonly\s+|static\s+|override\s+|async\s+|get\s+|set\s+)*([A-Za-z_]\w*)/g;
    let d: RegExpExecArray | null;
    while ((d = decl.exec(src))) {
      const body = d[1]!;
      const id = d[2]!;
      // A comment classifies its following declaration by identifier. For a
      // pure instruction field with no backing instance declaration, the
      // classification rides its `apply<Field>` applier method (the @hook
      // site) — so `applyWarren` also classifies the field `warren`.
      const targets = new Set(candidates(id));
      const applier = /^apply([A-Z]\w*)$/.exec(id);
      if (applier) {
        const field = applier[1]!.charAt(0).toLowerCase() + applier[1]!.slice(1);
        for (const c of candidates(field)) targets.add(c);
      }
      if (/@authorable\b/.test(body)) {
        for (const c of targets) authorable.add(c);
      }
      if (/@runtimeState\b/.test(body)) {
        for (const c of targets) runtime.add(c);
      }
    }

    for (const mixin of mixinNames) {
      rows.push({
        file: file.slice(file.indexOf("src/mud/") + 8),
        mixin,
        fields,
        authorable,
        runtime,
      });
    }
  }
  return rows;
}

describe("authorable coverage audit", () => {
  const runIt = process.env.AUTHORABLE_COVERAGE === "1" ? it : it.skip;

  runIt(
    "every registry mixin's persistent/instruction fields carry exactly one classification",
    () => {
      const registry = registryMixinNames();
      const rows = scan().filter((r) => registry.has(r.mixin));

      const unclassified: string[] = [];
      const doubleClassified: string[] = [];
      const byFile = new Map<string, string[]>();

      for (const row of rows) {
        for (const field of row.fields) {
          const inA = row.authorable.has(field);
          const inR = row.runtime.has(field);
          const id = `${row.mixin}.${field}`;
          if (inA && inR) doubleClassified.push(id);
          else if (!inA && !inR) {
            unclassified.push(id);
            const list = byFile.get(row.file) ?? [];
            list.push(field);
            byFile.set(row.file, list);
          }
        }
      }

      unclassified.sort();
      doubleClassified.sort();

      // Print the worklist so the (expected) failure is informative and
      // partitionable across follow-up annotation agents.
      if (unclassified.length > 0 || doubleClassified.length > 0) {
        const lines: string[] = [
          `\n@authorable coverage worklist — ${unclassified.length} unclassified` +
            `, ${doubleClassified.length} double-classified field(s):`,
        ];
        for (const [file, fields] of [...byFile.entries()].sort()) {
          lines.push(`  ${file}`);
          for (const f of fields.sort()) lines.push(`      ${f}`);
        }
        if (doubleClassified.length > 0) {
          lines.push(`  DOUBLE-CLASSIFIED: ${doubleClassified.join(", ")}`);
        }
        // eslint-disable-next-line no-console
        console.log(lines.join("\n"));
      }

      expect(doubleClassified).toEqual([]);
      expect(unclassified).toEqual([]);
    },
  );
});
