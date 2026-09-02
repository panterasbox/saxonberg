/**
 * check-object-verbs — the OO-conventions census (the Api OO sweep's
 * burn-down meter, then its ratchet).
 *
 * Counts every public STATIC method on an exported `*Api` class under
 * `src/mud/api/` whose FIRST parameter is typed as a world object — a
 * type that mentions `Stuff` or a class imported from `lib/**` /
 * `platform/**`. Doctrine: a verb whose subject is a typed world
 * object lives ON the object (`docs/antipatterns.md` § Thin Api
 * Wrappers; the OO calling conventions agreement); the Api tier keeps
 * only the four mandates — (a) subjectless services, (b) framework
 * lifecycle around a least-trusted host, (c) the import/exterior
 * boundary, (d) subjectless cross-cutting dispatch.
 *
 * Two enumerated lists live HERE so a widening is a visible diff (the
 * `lint:boundary` precedent):
 *   - `EXEMPT_APIS` — the doctrine-exempt orchestrators + framework
 *     Apis (copied from the requirements' census exclusions).
 *   - `NON_SUBJECT_TYPES` — context plumbing, not world objects
 *     (without this `CardApi.open(context, …)` false-positives).
 *
 * `Interactive` IS a subject type — Phase E is measured by the same
 * instrument.
 *
 * Advisory by default (exit 0, print the count); `--gate` makes a
 * non-zero census a failure (flipped on in Phase G, wired into CI
 * beside `lint:thin-forwarder`).
 *
 * Standalone script (the `check-gate-strings` precedent — ESLint 8
 * legacy config can't load a local rule without `--rulesdir`).
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, "..", "src");
const API_ROOT = join(SERVER_SRC, "mud", "api");

/**
 * Doctrine-exempt Apis (requirements § Non-goals): the orchestrators
 * whose subject-first methods ARE the mandate (movement/lifecycle/
 * cross-object dispatch), the framework tier, MixinApi's narrowing
 * predicates, and crafting's request-object shape. Widening this list
 * is a deliberate, reviewable diff — F5/G adjudications land here
 * with the MR note.
 */
const EXEMPT_APIS = new Set<string>([
  // the doctrine-exempt orchestrators
  "ContainmentApi",
  "LocomotionApi",
  "ConditionApi",
  "SchedulerApi",
  "PersistableApi",
  "ShadowApi",
  "StuffApi",
  "SandboxApi",
  "PromptApi", // the resolver-map machinery (the Interactive-first tier moved in Phase E)
  "BiomeApi", // the resolve family
  // the framework tier (bootstrap-special + call-security machinery)
  "SecurityApi",
  "ProxyApi",
  "ExecutionContextApi",
  "ModuleApi",
  // the sanctioned narrowing surface
  "MixinApi",
  // the request-object shape, left undisturbed by decision
  "CraftingApi",
]);

/**
 * First-parameter types that are context plumbing, not world objects.
 * A method whose subject is the RUNNING COMMAND or an execution frame
 * is not a verb on a thing.
 */
const NON_SUBJECT_TYPES = new Set<string>([
  // Documents are DATA ROWS, not objects with behavior — the OO
  // convention ("verbs on the objects") applies to Stuff; a Document's
  // behavior lives in its catalogue behind the Api (F2 decision:
  // Subject/Board/Entry stay catalogue-operated).
  "Subject",
  "Board",
  "Entry",
  // context plumbing
  "CommandContext",
  "ExecutionContext",
  "DispatchResponseEnvelope",
  "MessageFrame",
  "CommandFrame",
  "RawToken",
  // value objects / vocabulary (not Stuff — a verb on a value is fine)
  "Quantity",
  "Money",
  "CelestialProfile",
  "WeatherType",
  "Light",
  "CommandDefinition",
  "Script",
  "CombatSession", // a lib value class, not Stuff — session lifecycle is mandate (b)
  // typed strings
  "GroupRef",
  // Documents (persistence rows, not Stuff — the key-based ledgers'
  // kin; a Document-first method is not an object verb)
  "User",
  "TitleClaim",
  "Entry",
  "Board",
  "Thread",
  "Post",
  "RenownEvent",
  "StoredDocument",
]);

/**
 * Type-name suffixes that mark a call-shape/data type, not a world
 * object (`InflictSpec`, `RenownEventFields`, `CardOpenOptions`, …).
 */
const NON_SUBJECT_SUFFIX = /(?:Fields|Spec|Opts|Options|Config|Payload|Snapshot|Result|Params|Init|Request|Profile|Descriptor|Report)$/;

interface Census {
  api: string;
  file: string;
  method: string;
  line: number;
  firstParamType: string;
}

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(full, out);
    } else if (
      full.endsWith(".ts") &&
      !full.endsWith(".test.ts") &&
      !full.endsWith(".d.ts")
    ) {
      out.push(full);
    }
  }
}

/** Module specifiers that make an imported name a world-object type. */
function isSubjectModule(spec: string): boolean {
  return /(^|\/)(lib|platform)\//.test(spec);
}

/**
 * Scan one api file: exported `*Api` classes' public statics whose
 * first parameter's type names `Stuff` or a `lib/**`/`platform/**`
 * import (minus `NON_SUBJECT_TYPES`). Pure — exported for the test.
 */
export function scanSource(file: string, source: string): Census[] {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );

  // imported name → module specifier (value + type imports alike)
  const importOrigin = new Map<string, string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.importClause) continue;
    const spec = ts.isStringLiteral(stmt.moduleSpecifier)
      ? stmt.moduleSpecifier.text
      : "";
    const clause = stmt.importClause;
    if (clause.name) importOrigin.set(clause.name.text, spec);
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) {
        importOrigin.set(el.name.text, spec);
      }
    }
  }

  const out: Census[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isClassDeclaration(node) &&
      node.name &&
      /Api$/.test(node.name.text) &&
      !EXEMPT_APIS.has(node.name.text)
    ) {
      const api = node.name.text;
      for (const member of node.members) {
        if (!ts.isMethodDeclaration(member)) continue;
        const mods = member.modifiers ?? [];
        const isStatic = mods.some(
          (m) => m.kind === ts.SyntaxKind.StaticKeyword
        );
        const isPrivate = mods.some(
          (m) =>
            m.kind === ts.SyntaxKind.PrivateKeyword ||
            m.kind === ts.SyntaxKind.ProtectedKeyword
        );
        if (!isStatic || isPrivate) continue;
        const name =
          member.name && ts.isIdentifier(member.name)
            ? member.name.text
            : null;
        if (!name || name.startsWith("_")) continue; // test seams
        const first = member.parameters[0];
        if (!first || !first.type) continue;
        const typeText = first.type.getText(sf);
        if (!mentionsSubject(first.type, importOrigin, sf)) continue;
        const { line } = sf.getLineAndCharacterOfPosition(
          member.getStart(sf)
        );
        out.push({
          api,
          file,
          method: name,
          line: line + 1,
          firstParamType: typeText,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * Does a type node mention a world-object type? True when any
 * identifier inside it is `Stuff`, `Interactive`, or a name imported
 * from `lib/**` / `platform/**` — minus the `NON_SUBJECT_TYPES`
 * plumbing. (An intersection like `Stuff & Containable` matches on
 * its `Stuff` arm; a plumbing type that INTERSECTS a subject still
 * counts, because the subject arm is what the method acts on.)
 */
function mentionsSubject(
  typeNode: ts.TypeNode,
  importOrigin: ReadonlyMap<string, string>,
  sf: ts.SourceFile
): boolean {
  let found = false;
  const look = (n: ts.Node): void => {
    if (found) return;
    if (ts.isIdentifier(n)) {
      const t = n.text;
      if (NON_SUBJECT_TYPES.has(t) || NON_SUBJECT_SUFFIX.test(t)) {
        // plumbing / value / data name — not itself a subject; keep looking
      } else if (t === "Stuff" || t === "Interactive") {
        found = true;
        return;
      } else {
        const origin = importOrigin.get(t);
        if (origin && isSubjectModule(origin)) {
          found = true;
          return;
        }
      }
    }
    ts.forEachChild(n, look);
  };
  look(typeNode);
  return found;
}

function main(): void {
  const gate = process.argv.includes("--gate");
  const files: string[] = [];
  walk(API_ROOT, files);

  const census: Census[] = [];
  for (const file of files) {
    census.push(...scanSource(file, readFileSync(file, "utf8")));
  }

  const byApi = new Map<string, Census[]>();
  for (const c of census) {
    const list = byApi.get(c.api) ?? [];
    list.push(c);
    byApi.set(c.api, list);
  }

  const sorted = [...byApi.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [api, rows] of sorted) {
    console.log(`  ${api}: ${rows.length}`);
    for (const r of rows) {
      console.log(
        `    ${relative(SERVER_SRC, r.file)}:${r.line}  ` +
          `${r.method}(${r.firstParamType.replace(/\s+/g, " ")}, …)`
      );
    }
  }
  console.log(
    `check-object-verbs: ${census.length} subject-first Api static(s) ` +
      `outside the four mandates across ${byApi.size} Api(s) ` +
      `(${files.length} api/ files scanned; exemptions: ${EXEMPT_APIS.size}).`
  );
  if (gate && census.length > 0) {
    console.error(
      "check-object-verbs: --gate set and the census is non-zero — a verb " +
        "whose subject is a typed world object lives ON the object."
    );
    process.exit(1);
  }
}

if (process.argv[1] && /check-object-verbs\.ts$/.test(process.argv[1])) {
  main();
}
