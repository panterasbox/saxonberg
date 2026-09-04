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

import "../../../../test-bootstrap";
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
  // `MaterialCatalogue.postRegister` keeps a row by `instanceof Material` — resolving
  // the class wherever it lives (a capability pack's src/ included).
  { site: "platform/idea/MaterialCatalogue.ts::loadClassByPath", classification: "gated-direct" },
  // `MaturationProfileCatalogue.postRegister` keeps a row by
  // `instanceof MaturationProfile` (the MaterialLogic filter, homed on a
  // self-warming catalogue — the boot()-retirement direction).
  { site: "platform/idea/MaturationProfileCatalogue.ts::loadClassByPath", classification: "gated-direct" },
  // `FabricCatalogue.postRegister` keeps a row by `instanceof Fabric` —
  // the same self-warming shape one row up. ⚠ Its predicate carries an
  // extra `cls === Fabric` clause the siblings do not need: those have a
  // `lib/` abstract base plus a thin `platform/` concrete that rows
  // name, so the named class is always a STRICT subclass. `Fabric` is
  // one class rows name directly, and `Fabric.prototype instanceof
  // Fabric` is false — copying the predicate without the precondition
  // would have matched nothing, silently.
  { site: "platform/idea/FabricCatalogue.ts::loadClassByPath", classification: "gated-direct" },
  // The spawn sweep's `isCirculatingClass` (the MaterialLogic precedent):
  // a template row's `class:` (already gate-validated content) is loaded
  // only to ask whether it composes `CirculatingMixin`.
  { site: "platform/idea/api/ResidencyLogic.ts::loadClassByPath", classification: "gated-direct" },
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
    site: "platform/idea/api/CombatLogic.ts::resolveExportSync",
    classification: "gated-direct",
  },
  // Resolves another template's already gate-passed class.
  {
    site: "lib/stuff/Populates.ts::loadClassByPath",
    classification: "transitive-safe",
  },
  // ⭐ Wiki component resolution. The tag name comes from
  // COMMUNITY-AUTHORED ARTICLE MARKUP — the weakest input in this
  // manifest, since any signed-in player can write `<foo/>` in a page
  // body. It is `source-gated` because of what that input can reach,
  // not who supplied it:
  //
  //   1. The path is `/lib/wiki/components/${tag}` with a LITERAL
  //      prefix — an author selects a basename, never a path.
  //   2. `Mml.componentCandidate` admits only `[a-z][a-z0-9-]*`
  //      (api/mml/tags.ts), so `..`, `/` and `.` are unrepresentable
  //      BEFORE the string reaches the resolver rather than sanitised
  //      after.
  //
  // So the resolvable set is exactly the modules a wizard wrote into
  // `lib/wiki/components/` — behind the source-write gate, like the
  // command YAML that classification was written for. An author picks
  // AMONG developer-provided code; they cannot introduce any.
  //
  // ⚠ If either half changes — a computed prefix, or a widened charset
  // rule — this stops being source-gated and becomes a hole. Both are
  // asserted in `mml.longform.test.ts` ("a name that could escape its
  // directory is NOT a candidate").
  {
    site: "platform/idea/WikiRenderer.ts::resolveExport",
    classification: "source-gated",
  },
  // The wiki's `<composition>` panel resolves a template's `class` to
  // read its effective mixin set and field declarations — the
  // `StudioLogic.describeClass` case exactly, and the same argument:
  // the path comes from a `domain` Template row that passed
  // `enforceCodeFieldGate` at save, so only already-trusted code ever
  // resolves. It reads statics and instantiates nothing.
  {
    site: "lib/wiki/components/composition.ts::loadClassByPath",
    classification: "transitive-safe",
  },
  // Brain-path existence pre-check (validateBehaviorPaths) — does not run.
  {
    site: "platform/idea/api/CmsLogic.ts::resolveExport",
    classification: "validation-only",
  },
  // Controller / validator / parser module path from command YAML — a
  // source-tree file behind the wizard source-write gate.
  { site: "platform/idea/api/CommandLogic.ts::import", classification: "source-gated" },
  { site: "platform/idea/api/CommandLogic.ts::import", classification: "source-gated" },
  { site: "platform/idea/api/CommandLogic.ts::import", classification: "source-gated" },
  // The `requires: class:Agent` escape. ⚠ NOT author-reachable in the
  // way the three above are: the module path is not read from YAML at
  // all — the spec supplies a bare NAME, which is looked up in the
  // closed `CLASS_REQUIREMENTS` map, and only the map's own hardcoded
  // path is imported. Deferred to a dynamic import purely to break an
  // import cycle (`Agent` composes command mixins), so the classifier's
  // usual question — can an author steer this string — is answered no
  // by construction.
  { site: "platform/idea/api/CommandLogic.ts::import", classification: "source-gated" },
  // Content-pack class-resolve check (requires-kernel boundary).
  {
    site: "platform/idea/api/PackLogic.ts::loadClassByPath",
    classification: "gated-direct",
  },
  // The blueprint catalogue's two layers (moved in from the retired
  // BlueprintSeeder, content-packs wave 2): the derived skeleton resolves
  // every DISTINCT template `class` (already gate-passed at saveTemplate)
  // to introspect its signature; the curated overlay resolves a pack
  // document's `classPath` for the same introspection; the orphan reap
  // resolves a derived row's `classPath` to see whether it still exists.
  // Introspection only — nothing author-named is executed or minted.
  {
    site: "platform/idea/BlueprintCatalogue.ts::loadClassByPath",
    classification: "validation-only",
  },
  {
    site: "platform/idea/BlueprintCatalogue.ts::loadClassByPath",
    classification: "validation-only",
  },
  {
    site: "platform/idea/BlueprintCatalogue.ts::loadClassByPath",
    classification: "validation-only",
  },
  {
    // Help's collection projector: resolves each schema doc's
    // `ownerModule` to read `fieldMeta` off the owning `Document` class,
    // so a collection's help topic lists the fields the class really
    // declares. Introspection only — nothing is constructed and nothing
    // author-named runs. The path is not author-supplied either: schema
    // docs are repo files, not content, and `pnpm lint:schema` proves
    // every `ownerModule` names the file its class is declared in.
    site: "platform/idea/HelpCatalogue.ts::loadClassByPath",
    classification: "validation-only",
  },
  {
    // Sandbox circle materialization: authored templates under the
    // circle path re-clone only when their class is Location-shaped —
    // the class resolve is the room filter (docs/subsystems/sandbox.md).
    site: "platform/idea/api/SandboxLogic.ts::loadClassByPath",
    classification: "validation-only",
  },
  // Studio describeClass introspection: resolves an already-committed
  // (shipped or gate-passed) class to read its effective mixin set +
  // effective values; author-supplied path, but only already-trusted code
  // ever resolves (no author-named new code).
  {
    site: "platform/idea/api/StudioLogic.ts::loadClassByPath",
    classification: "transitive-safe",
  },
  // Studio describeMixin introspection: resolves an already-registered
  // mixin factory to compose over a bare `Idea` and read the fields it
  // contributes (the inspector card). Only committed mixin code resolves;
  // no author-named new code.
  {
    site: "platform/idea/api/StudioLogic.ts::resolveExport",
    classification: "transitive-safe",
  },
  // The same resolve, on `describeMixinFields`'s DEGRADED path: when a
  // mixin factory will not compose over `Idea` (or its class defaults
  // throw), it composes over a bare base purely to read the `fieldMeta`
  // statics. Same input, same trust argument — an already-registered
  // mixin name from the export scan, never an author-named path — and it
  // instantiates nothing. Replaced the source-scan candidate-name
  // fallback that the `fieldMeta` fold retired.
  {
    site: "platform/idea/api/StudioLogic.ts::resolveExport",
    classification: "transitive-safe",
  },
  // container-target mixin validators (does not instantiate).
  {
    site: "platform/idea/api/TemplateLogic.ts::loadClassByPath",
    classification: "validation-only",
  },
  {
    site: "platform/idea/api/TemplateLogic.ts::loadClassByPath",
    classification: "validation-only",
  },
  // isFolderClass class probe.
  {
    site: "platform/idea/api/ZoneLogic.ts::loadClassByPath",
    classification: "validation-only",
  },
  {
    site: "platform/idea/api/ZoneLogic.ts::loadClassByPath",
    classification: "validation-only",
  },
  // Class-attached dataSchema check.
  {
    site: "platform/idea/cmd/shell/WriteController.ts::loadClassByPath",
    classification: "validation-only",
  },
  // Dialogue responder brain re-resolve.
  {
    site: "platform/idea/cmd/social/TalkController.ts::resolveExportSync",
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
