/**
 * Code-naming drift-guard (wizard-authority Phase 3).
 *
 * The code-trust lockdown (TemplateLogic.enforceCodeFieldGate) gates the
 * direct code-naming fields (`CodeNamingFields.FIELDS`) so a non-wizard
 * content write can never name code to run. That guarantee rests on the
 * gate being the *only* place author-supplied content drives a module
 * resolution. This structural test enumerates **every** call site of the
 * **sanctioned module resolvers** under `mud/` (`StuffApi.resolveExport` /
 * `.resolveExportSync` / `.loadClassByPath`, plus dynamic `import()`
 * with a non-string-literal argument) and asserts the set equals a
 * checked-in, classified manifest. It guards the *known* resolver surface,
 * not arbitrary code: a brand-new resolver primitive would also need to be
 * added to the scanner's matcher list below (itself a reviewable change).
 *
 * A NEW, unclassified call site of an existing resolver — e.g. a custom
 * `Hydrator` subclass reading a new instruction field that resolves a
 * module — makes this test FAIL, forcing the author to either join
 * `CodeNamingFields.FIELDS` + the gate, or justify a classification here.
 *
 * Classifications:
 *  - **gated-direct** — fed by a `CodeNamingFields.FIELDS` value (clone
 *    pipeline `class`; `Behaved`/`TalkController` `brain`).
 *  - **transitive-safe** — resolves *another* template's already
 *    gate-passed class.
 *  - **validation-only** — probes/validates a class but does not
 *    instantiate or run author-chosen code.
 *  - **source-gated** — resolves a module path from a source-tree file
 *    (command YAML) already behind the wizard source-write gate.
 *  - **resolver-core** — the dynamic-import engine *implementing* the
 *    resolvers above; the gated set is enforced at its callers.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { join, relative } from "path";

const MUD_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const METHODS =
  /(?:StuffApi|this)\.(resolveExport|resolveExportSync|loadClassByPath)\s*\(/g;

/**
 * Scan one file's content for module-resolving call sites. Returns a
 * list of `relPath::method` keys (`method` ∈ resolveExport,
 * resolveExportSync, loadClassByPath, import). Exported as a pure
 * function so the negative meta-assertion can exercise it on a fixture.
 */
function scanContent(relPath: string, content: string): string[] {
  const found: string[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("*") || trimmed.startsWith("//")) continue;
    let m: RegExpExecArray | null;
    METHODS.lastIndex = 0;
    while ((m = METHODS.exec(line)) !== null) {
      // A backtick before the match means it's inside a string literal
      // (e.g. the resolver's own error message), not a real call.
      if (line.slice(0, m.index).includes("`")) continue;
      found.push(`${relPath}::${m[1]}`);
    }
  }
  // Dynamic import() with a non-string-literal argument.
  const re = /\bimport\s*\(/g;
  let im: RegExpExecArray | null;
  while ((im = re.exec(content)) !== null) {
    let i = im.index + im[0].length;
    while (i < content.length && /\s/.test(content[i] ?? "")) i++;
    const ch = content[i];
    if (ch === "'" || ch === '"' || ch === "`") continue; // string literal
    const lineStart = content.lastIndexOf("\n", im.index) + 1;
    const nl = content.indexOf("\n", im.index);
    const lineText = content.slice(lineStart, nl === -1 ? undefined : nl);
    const t = lineText.trimStart();
    if (t.startsWith("*") || t.startsWith("//")) continue;
    found.push(`${relPath}::import`);
  }
  return found;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "__tests__") continue;
      walk(full, out);
    } else if (/\.ts$/.test(entry) && !/\.test\.ts$/.test(entry)) {
      out.push(full);
    }
  }
}

function scanTree(): string[] {
  const files: string[] = [];
  walk(MUD_ROOT, files);
  const found: string[] = [];
  for (const file of files) {
    const rel = relative(MUD_ROOT, file).split("\\").join("/");
    found.push(...scanContent(rel, readFileSync(file, "utf-8")));
  }
  return found.sort();
}

/**
 * The classified manifest. Every entry is one expected call site
 * (`relPath::method`) with its classification. Duplicates are listed
 * once per occurrence (the scan compares as a multiset).
 */
const MANIFEST: ReadonlyArray<{ site: string; classification: string }> = [
  // The clone pipeline resolves a template's `class` — gate-passed at
  // saveTemplate.
  { site: "api/stuff.ts::loadClassByPath", classification: "gated-direct" },
  // The dynamic-import engines implementing loadClassByPath /
  // resolveExport(Sync). The gated set is enforced at their callers.
  { site: "api/stuff.ts::import", classification: "resolver-core" },
  { site: "api/stuff.ts::import", classification: "resolver-core" },
  // `behaviors[].brain` warm + per-fire re-resolve.
  {
    site: "lib/behavior/Behaved.ts::resolveExport",
    classification: "gated-direct",
  },
  {
    site: "lib/behavior/Behaved.ts::resolveExportSync",
    classification: "gated-direct",
  },
  // Combat session invokes an attached combat brain by path each beat
  // (the Behaved per-fire re-resolve precedent). Author-named path, but a
  // brain is a `lib/behavior/` module behind the wizard source-write gate.
  {
    site: "obj/api/CombatLogic.ts::resolveExportSync",
    classification: "gated-direct",
  },
  // Resolves another template's already gate-passed class.
  {
    site: "lib/stuff/Populates.ts::loadClassByPath",
    classification: "transitive-safe",
  },
  // Brain-path existence pre-check (validateBehaviorPaths) — does not run.
  {
    site: "obj/api/CmsLogic.ts::resolveExport",
    classification: "validation-only",
  },
  // Controller / validator / parser module path from command YAML — a
  // source-tree file behind the wizard source-write gate.
  { site: "obj/api/CommandLogic.ts::import", classification: "source-gated" },
  { site: "obj/api/CommandLogic.ts::import", classification: "source-gated" },
  { site: "obj/api/CommandLogic.ts::import", classification: "source-gated" },
  // Content-pack class-resolve check (requires-kernel boundary).
  {
    site: "obj/api/PackLogic.ts::loadClassByPath",
    classification: "gated-direct",
  },
  {
    // Sandbox circle materialization: authored templates under the
    // circle path re-clone only when their class is Location-shaped —
    // the class resolve is the room filter (docs/subsystems/sandbox.md).
    site: "obj/api/SandboxLogic.ts::loadClassByPath",
    classification: "validation-only",
  },
  // Studio describeClass introspection: resolves an already-committed
  // (shipped or gate-passed) class to read its effective mixin set +
  // effective values; author-supplied path, but only already-trusted code
  // ever resolves (no author-named new code).
  {
    site: "obj/api/StudioLogic.ts::loadClassByPath",
    classification: "transitive-safe",
  },
  // Studio describeMixin introspection: resolves an already-registered
  // mixin factory to compose over a bare `Idea` and read the fields it
  // contributes (the inspector pane). Only committed mixin code resolves;
  // no author-named new code.
  {
    site: "obj/api/StudioLogic.ts::resolveExport",
    classification: "transitive-safe",
  },
  // container-target mixin validators (does not instantiate).
  {
    site: "obj/api/TemplateLogic.ts::loadClassByPath",
    classification: "validation-only",
  },
  {
    site: "obj/api/TemplateLogic.ts::loadClassByPath",
    classification: "validation-only",
  },
  // isFolderClass class probe.
  {
    site: "obj/api/ZoneLogic.ts::loadClassByPath",
    classification: "validation-only",
  },
  {
    site: "obj/api/ZoneLogic.ts::loadClassByPath",
    classification: "validation-only",
  },
  // Class-attached dataSchema check.
  {
    site: "obj/command/shell/WriteController.ts::loadClassByPath",
    classification: "validation-only",
  },
  // Dialogue responder brain re-resolve.
  {
    site: "obj/command/social/TalkController.ts::resolveExportSync",
    classification: "gated-direct",
  },
];

describe("code-naming drift-guard", () => {
  it("the set of module-resolving call sites equals the classified manifest", () => {
    const scanned = scanTree();
    const expected = MANIFEST.map((m) => m.site).sort();
    expect(scanned).toEqual(expected);
  });

  it("the scanner would catch a new, unclassified call site", () => {
    // A would-be new field that resolves a module export.
    const fixture = `
      const handler = await StuffApi.resolveExport(spec.handler, 'go');
      const cls = await StuffApi.loadClassByPath(data.weaponClass);
      const mod = await import(computedPath);
    `;
    const hits = scanContent("fixture/New.ts", fixture);
    expect(hits).toContain("fixture/New.ts::resolveExport");
    expect(hits).toContain("fixture/New.ts::loadClassByPath");
    expect(hits).toContain("fixture/New.ts::import");
  });
});
