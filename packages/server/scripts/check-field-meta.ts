/**
 * check-field-meta — the field-metadata shape checker.
 *
 * One file owns all knowledge of the field-metadata shape, in three
 * modes:
 *
 *   --snapshot   Re-derive the record from source and WRITE the golden
 *                master. Run once, on the pre-codemod tree.
 *   --verify     Re-derive the record and DIFF it against the golden
 *                master. This is the mechanical equivalence proof for
 *                the `fieldMeta` codemod: a per-class-body syntactic
 *                assertion that nothing was dropped, reordered or
 *                mangled, independent of the runtime.
 *   --lint       CI gate for what class registration cannot see.
 *                (Lands with the codemod; see docs/plans/
 *                reference-lifetime-plan.md W2.)
 *
 * The point of the single file is that `--snapshot` and `--verify` share
 * ONE extractor. The extractor reads whichever shape a class body
 * carries — the four legacy statics (`persistentFields`,
 * `fieldMarshallers`, `instructionFields`, `globIdentityFields`) or the
 * unified `static fieldMeta` that replaces them — and normalizes both to
 * the same record. That is what lets the golden master captured BEFORE
 * the codemod be diffed against the tree AFTER it.
 *
 * Marshaller values are captured as **source text**, not parsed: they
 * are expressions (`QuantityMarshaller.pathFor('kg')`,
 * `EncryptedStringMarshaller.templatePath`, `VOLUME_MARSHALLER`), and
 * the codemod copies them verbatim rather than re-serializing them.
 * Whitespace is collapsed so the comparison survives reformatting;
 * nothing else is normalized.
 *
 * Field-name values ARE parsed (`.text` off the string literal), so the
 * record is quote-agnostic — this repo's quote style is mixed by area
 * and must stay that way.
 *
 * ## Array order: strict everywhere except marshallers
 *
 * The codemod emits one key sequence per class body — `persistentFields`
 * (declared order) → `instructionFields` → `globIdentityFields` →
 * `fieldMarshallers` keys not already emitted (plan F2). Each array is
 * then read back as a FILTER over that sequence, so a field belonging to
 * two sets is pinned to its first-emitted position and a later array can
 * come back reordered.
 *
 * Measured against the pre-codemod tree, exactly ONE array in `src/mud`
 * shifts: `Weapon.fieldMarshallers`, declared `[mass, length]`, read back
 * `[length, mass]` because `length` is also persistent. `persistentFields`
 * — the one order the docs call load-bearing (`PersistentHydrator` Phase 1
 * applies in that order) — is preserved by construction, since it is
 * emitted first. `instructionFields` and `globIdentityFields` shift
 * nowhere.
 *
 * So marshaller keys are stored SORTED here and compared
 * order-insensitively, and the other three stay order-sensitive. That is
 * sound rather than convenient: `getAllFieldMarshallers` is consumed as a
 * lookup map (`marshallerPaths[field]` in the Hydrator), and
 * `getAllGlobIdentityFields` is unioned into a `Set` — neither has an
 * order to lose. The alternative, blanket-sorting all four, would throw
 * away a real check on the one array that needs it.
 *
 * This is written down because the failure it prevents is subtle: without
 * it `--verify` reds on `Weapon.ts`, the very file plan F2 names as the
 * permanent test case for the merge, and the tempting fix mid-codemod is
 * to edit the golden master — which is how the proof gets lost.
 *
 * Implemented as a standalone script following `check-module-scope.ts`
 * exactly: `tsx` + the TypeScript compiler API + `readdirSync`, no new
 * dependency. It sees real declarations, not regex approximations.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative, sep } from "path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = join(here, "..");
const MUD_ROOT = join(SERVER_ROOT, "src", "mud");
const GOLDEN = join(here, "__fixtures__", "field-meta-golden.json");

/** The four field-keyed statics the codemod folds into `fieldMeta`. */
const ARRAY_STATICS = [
  "persistentFields",
  "instructionFields",
  "globIdentityFields",
] as const;
const OBJECT_STATICS = ["fieldMarshallers"] as const;

type ArrayStatic = (typeof ARRAY_STATICS)[number];

/**
 * One class body's field metadata, in the shape both the legacy statics
 * and `fieldMeta` normalize to.
 *
 * Keyed by `(file, index)` — the ordinal of the class body within its
 * file. NOT by line: the codemod replaces four declarations with one, so
 * every line number below it shifts. The ordinal does not move, because
 * the codemod never adds, removes or reorders a class body.
 */
interface ClassRecord {
  file: string;
  index: number;
  className: string;
  persistentFields: string[];
  fieldMarshallers: Record<string, string>;
  instructionFields: string[];
  globIdentityFields: string[];
}

/** A declaration form the extractor does not understand. Never skipped. */
interface Unhandled {
  file: string;
  line: number;
  className: string;
  staticName: string;
  reason: string;
  text: string;
}

const unhandled: Unhandled[] = [];

/** Files scanned, and a histogram of the declaration forms consumed. */
const census = {
  files: 0,
  classBodies: 0,
  declarations: {
    persistentFields: 0,
    fieldMarshallers: 0,
    instructionFields: 0,
    globIdentityFields: 0,
    fieldMeta: 0,
  } as Record<string, number>,
  emptyArrayInitializers: 0,
};

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (full.endsWith(".ts") && !full.endsWith(".d.ts")) {
      // `__tests__` is IN scope: 42 test files declare these statics on
      // fixture classes and the codemod converts them too.
      out.push(full);
    }
  }
}

/** Repo-relative, posix-separated, so the golden file is portable. */
function relPath(file: string): string {
  return relative(join(SERVER_ROOT, "..", ".."), file).split(sep).join("/");
}

/** Collapse whitespace runs so the diff survives reformatting. */
function normalizeExpr(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Unwrap `as const` / parentheses to reach the literal beneath. */
function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  for (;;) {
    if (ts.isAsExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
    else return e;
  }
}

/** The declared name of a member or property, or null if computed. */
function memberName(n: ts.PropertyName | undefined): string | null {
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isStringLiteral(n)) return n.text;
  return null;
}

function isStatic(m: ts.ClassElement): boolean {
  if (!ts.canHaveModifiers(m)) return false;
  return !!ts
    .getModifiers(m)
    ?.some((mod) => mod.kind === ts.SyntaxKind.StaticKeyword);
}

/**
 * Extract one class body's record, or null when it declares none of the
 * shapes. A class body carrying `static persistentFields = []` DOES get
 * a record (an empty one) — the codemod rewrites it to `= {}`, and the
 * empty record is what proves that stayed empty rather than vanishing.
 */
function extractClass(
  sf: ts.SourceFile,
  source: string,
  node: ts.ClassDeclaration | ts.ClassExpression,
  file: string,
  index: number
): ClassRecord | null {
  const className = node.name?.text ?? "<anonymous>";
  const rec: ClassRecord = {
    file: relPath(file),
    index,
    className,
    persistentFields: [],
    fieldMarshallers: {},
    instructionFields: [],
    globIdentityFields: [],
  };
  let sawAny = false;

  const fail = (m: ts.ClassElement, staticName: string, reason: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(m.getStart(sf));
    unhandled.push({
      file: relPath(file),
      line: line + 1,
      className,
      staticName,
      reason,
      text: normalizeExpr(source.slice(m.getStart(sf), m.getEnd())).slice(0, 160),
    });
  };

  for (const m of node.members) {
    if (!ts.isPropertyDeclaration(m) || !isStatic(m)) continue;
    const name = memberName(m.name);
    if (!name) continue;

    const isArray = (ARRAY_STATICS as readonly string[]).includes(name);
    const isObject = (OBJECT_STATICS as readonly string[]).includes(name);
    if (!isArray && !isObject && name !== "fieldMeta") continue;

    sawAny = true;
    census.declarations[name] = (census.declarations[name] ?? 0) + 1;

    if (!m.initializer) {
      fail(m, name, "static declared with no initializer");
      continue;
    }
    const init = unwrap(m.initializer);

    if (isArray) {
      if (!ts.isArrayLiteralExpression(init)) {
        fail(m, name, `expected an array literal, got ${ts.SyntaxKind[init.kind]}`);
        continue;
      }
      if (init.elements.length === 0) census.emptyArrayInitializers++;
      const out: string[] = [];
      for (const el of init.elements) {
        const e = unwrap(el);
        if (!ts.isStringLiteral(e) && !ts.isNoSubstitutionTemplateLiteral(e)) {
          fail(m, name, `non-literal array element ${ts.SyntaxKind[e.kind]}`);
          continue;
        }
        out.push(e.text);
      }
      rec[name as ArrayStatic] = out;
      continue;
    }

    if (isObject) {
      if (!ts.isObjectLiteralExpression(init)) {
        fail(m, name, `expected an object literal, got ${ts.SyntaxKind[init.kind]}`);
        continue;
      }
      for (const p of init.properties) {
        if (!ts.isPropertyAssignment(p)) {
          fail(m, name, `non-PropertyAssignment member ${ts.SyntaxKind[p.kind]}`);
          continue;
        }
        const key = memberName(p.name);
        if (key === null) {
          fail(m, name, "computed marshaller key");
          continue;
        }
        rec.fieldMarshallers[key] = normalizeExpr(
          source.slice(p.initializer.getStart(sf), p.initializer.getEnd())
        );
      }
      continue;
    }

    // `static fieldMeta` — the post-codemod shape. Reading it here is
    // what makes ONE golden master span both sides of the codemod.
    if (!ts.isObjectLiteralExpression(init)) {
      fail(m, name, `expected an object literal, got ${ts.SyntaxKind[init.kind]}`);
      continue;
    }
    for (const p of init.properties) {
      if (!ts.isPropertyAssignment(p)) {
        fail(m, name, `non-PropertyAssignment fieldMeta entry`);
        continue;
      }
      const field = memberName(p.name);
      if (field === null) {
        fail(m, name, "computed fieldMeta key");
        continue;
      }
      const entry = unwrap(p.initializer);
      if (!ts.isObjectLiteralExpression(entry)) {
        fail(m, name, `fieldMeta entry for '${field}' is not an object literal`);
        continue;
      }
      for (const attr of entry.properties) {
        if (!ts.isPropertyAssignment(attr)) continue;
        const key = memberName(attr.name);
        const val = unwrap(attr.initializer);
        if (key === "persistent" && val.kind === ts.SyntaxKind.TrueKeyword) {
          rec.persistentFields.push(field);
        } else if (key === "instruction" && val.kind === ts.SyntaxKind.TrueKeyword) {
          rec.instructionFields.push(field);
        } else if (key === "globIdentity" && val.kind === ts.SyntaxKind.TrueKeyword) {
          rec.globIdentityFields.push(field);
        } else if (key === "marshaller") {
          rec.fieldMarshallers[field] = normalizeExpr(
            source.slice(attr.initializer.getStart(sf), attr.initializer.getEnd())
          );
        }
      }
    }
  }

  return sawAny ? rec : null;
}

function collect(): ClassRecord[] {
  const files: string[] = [];
  walk(MUD_ROOT, files);
  files.sort();
  census.files = files.length;

  const records: ClassRecord[] = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    // Cheap pre-filter: parsing every file in src/mud is wasteful when
    // only ~250 declare anything.
    if (
      !source.includes("persistentFields") &&
      !source.includes("fieldMarshallers") &&
      !source.includes("instructionFields") &&
      !source.includes("globIdentityFields") &&
      !source.includes("fieldMeta")
    ) {
      continue;
    }
    const sf = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.ES2022,
      /* setParentNodes */ true,
      ts.ScriptKind.TS
    );
    let index = 0;
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
        const rec = extractClass(sf, source, node, file, index++);
        if (rec) {
          census.classBodies++;
          records.push(rec);
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sf, visit);
  }

  records.sort((a, b) =>
    a.file === b.file ? a.index - b.index : a.file < b.file ? -1 : 1
  );
  // Canonical marshaller key order — see the header. Order-insensitive
  // for this map only; the three arrays keep their declared order.
  for (const r of records) {
    const sorted: Record<string, string> = {};
    for (const k of Object.keys(r.fieldMarshallers).sort()) {
      sorted[k] = r.fieldMarshallers[k]!;
    }
    r.fieldMarshallers = sorted;
  }
  return records;
}

function reportCensus(records: ClassRecord[]): void {
  const d = census.declarations;
  console.log(
    `check-field-meta: ${census.files} files scanned, ` +
      `${records.length} class bodies with field metadata.`
  );
  console.log(
    `  declarations consumed: persistentFields=${d.persistentFields} ` +
      `fieldMarshallers=${d.fieldMarshallers} ` +
      `instructionFields=${d.instructionFields} ` +
      `globIdentityFields=${d.globIdentityFields} ` +
      `fieldMeta=${d.fieldMeta}`
  );
  console.log(
    `  empty array initializers (become \`= {}\`): ` +
      `${census.emptyArrayInitializers}`
  );
}

function bail(): void {
  if (unhandled.length === 0) return;
  console.error(
    `\ncheck-field-meta: ${unhandled.length} declaration form(s) the ` +
      `extractor does not understand. A silently skipped declaration is ` +
      `exactly the failure the golden master exists to prevent — teach ` +
      `the extractor the form rather than ignoring it:`
  );
  for (const u of unhandled) {
    console.error(
      `  ${u.file}:${u.line}  ${u.className}.${u.staticName} — ${u.reason}\n` +
        `      ${u.text}`
    );
  }
  process.exit(1);
}

function serialize(records: ClassRecord[]): string {
  return JSON.stringify(records, null, 2) + "\n";
}

const mode = process.argv[2] ?? "--verify";

if (mode === "--snapshot") {
  const records = collect();
  bail();
  reportCensus(records);
  mkdirSync(dirname(GOLDEN), { recursive: true });
  writeFileSync(GOLDEN, serialize(records), "utf8");
  console.log(`  wrote ${relPath(GOLDEN)}`);
} else if (mode === "--verify") {
  const records = collect();
  bail();
  let golden: ClassRecord[];
  try {
    golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as ClassRecord[];
  } catch {
    console.error(
      `check-field-meta --verify: no golden master at ${relPath(GOLDEN)}. ` +
        `Run \`pnpm lint:field-meta --snapshot\` on the pre-codemod tree first.`
    );
    process.exit(1);
  }
  const key = (r: ClassRecord) => `${r.file}#${r.index}`;
  const before = new Map(golden.map((r) => [key(r), r]));
  const after = new Map(records.map((r) => [key(r), r]));
  const diffs: string[] = [];
  for (const [k, r] of before) {
    const now = after.get(k);
    if (!now) {
      diffs.push(`  MISSING  ${k} (${r.className}) — class body no longer declares any field metadata`);
      continue;
    }
    // Strict, className included: the codemod rewrites member
    // declarations and must not rename a class body.
    const a = serialize([r]);
    const b = serialize([now]);
    if (a !== b) {
      diffs.push(`  CHANGED  ${k} (${now.className})\n    before: ${JSON.stringify(r)}\n    after:  ${JSON.stringify(now)}`);
    }
  }
  for (const [k, r] of after) {
    if (!before.has(k)) diffs.push(`  ADDED    ${k} (${r.className})`);
  }
  reportCensus(records);
  if (diffs.length > 0) {
    console.error(
      `\ncheck-field-meta --verify: ${diffs.length} class ` +
        `${diffs.length === 1 ? "body differs" : "bodies differ"} from the golden master:`
    );
    for (const d of diffs) console.error(d);
    process.exit(1);
  }
  console.log(`  --verify clean: ${records.length} class bodies match the golden master.`);
} else {
  console.error(
    `check-field-meta: unknown mode '${mode}'. Expected --snapshot or --verify.\n` +
      `(--lint lands with the codemod; see docs/plans/reference-lifetime-plan.md W2.)`
  );
  process.exit(1);
}
