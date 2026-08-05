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
 *   --lint       CI gate for what neither class registration nor the
 *                golden master can see: a legacy static coming back, and
 *                any malformed or self-contradictory `fieldMeta` entry.
 *                Registration only validates classes it actually loads;
 *                this sees the whole tree.
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
const TAGS_GOLDEN = join(here, "__fixtures__", "field-tags-golden.json");

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

// ─────────────────────────────────────────────────────────────────────
// The TSDoc field tags (W2c)
// ─────────────────────────────────────────────────────────────────────

/**
 * `@authorable` / `@runtimeState` as `StudioLogic.scanClassification`
 * resolves them TODAY — regex over source text, underscore-insensitive
 * candidate expansion, `apply<Field>` → field mapping, folded onto every
 * `_mixinName` declared in the same file.
 *
 * Replicated here rather than imported because the fold deletes the
 * original. The golden master must capture the CURRENT resolution,
 * quirks and all, or the post-fold diff cannot prove equivalence — and
 * the quirks are the point: the scan *guesses* field names, so where it
 * and the declaration disagree, the declaration is right and the
 * difference is a finding to record.
 */
interface TagRecord {
  authorable: string[];
  runtime: string[];
  refs: Record<string, string>;
}

function candidatesOf(id: string): Set<string> {
  const bare = id.replace(/^_/, "");
  return new Set([id, bare, `_${bare}`]);
}

function scanTags(): Record<string, TagRecord> {
  const byMixin = new Map<
    string,
    { authorable: Set<string>; runtime: Set<string>; refs: Map<string, string> }
  >();
  const files: string[] = [];
  walk(MUD_ROOT, files);
  for (const file of files.sort()) {
    // scanClassification skips __tests__ and .test.ts.
    if (file.includes(`${sep}__tests__${sep}`) || file.endsWith(".test.ts")) {
      continue;
    }
    const src = readFileSync(file, "utf8");
    const mixinNames = [
      ...src.matchAll(/static\s+_mixinName\s*=\s*['"]([A-Za-z0-9_]+)['"]/g),
    ].map((m) => m[1]!);
    if (mixinNames.length === 0) continue;

    const authorable = new Set<string>();
    const runtime = new Set<string>();
    const refs = new Map<string, string>();
    const decl =
      /\/\*\*([\s\S]*?)\*\/\s*(?:public\s+|private\s+|protected\s+|readonly\s+|static\s+|override\s+|async\s+|get\s+|set\s+)*([A-Za-z_]\w*)/g;
    let d: RegExpExecArray | null;
    while ((d = decl.exec(src))) {
      const body = d[1]!;
      const id = d[2]!;
      const targets = new Set(candidatesOf(id));
      const applier = /^apply([A-Z]\w*)$/.exec(id);
      if (applier) {
        const field = applier[1]!.charAt(0).toLowerCase() + applier[1]!.slice(1);
        for (const c of candidatesOf(field)) targets.add(c);
      }
      if (/@authorable\b/.test(body)) {
        for (const c of targets) authorable.add(c);
        const refMatch = /@authorable\s+ref:([A-Za-z_]\w*)/.exec(body);
        if (refMatch) for (const c of targets) refs.set(c, refMatch[1]!);
      }
      if (/@runtimeState\b/.test(body)) for (const c of targets) runtime.add(c);
    }

    for (const mixin of mixinNames) {
      const existing = byMixin.get(mixin);
      if (existing) {
        for (const c of authorable) existing.authorable.add(c);
        for (const c of runtime) existing.runtime.add(c);
        for (const [c, t] of refs) existing.refs.set(c, t);
      } else {
        byMixin.set(mixin, {
          authorable: new Set(authorable),
          runtime: new Set(runtime),
          refs: new Map(refs),
        });
      }
    }
  }

  const out: Record<string, TagRecord> = {};
  for (const key of [...byMixin.keys()].sort()) {
    const v = byMixin.get(key)!;
    out[key] = {
      authorable: [...v.authorable].sort(),
      runtime: [...v.runtime].sort(),
      refs: Object.fromEntries([...v.refs.entries()].sort()),
    };
  }
  return out;
}

/** The property names a `fieldMeta` entry may carry (mirrors FieldMetaEntry). */
const KNOWN_PROPS = new Set([
  "persistent",
  "marshaller",
  "instruction",
  "globIdentity",
  "ref",
  "lifetime",
  "inverse",
  "authorable",
  "authorPicker",
  "runtimeState",
  "spoiler",
  "spoilerName",
]);
const TRUE_ONLY = new Set([
  "persistent",
  "instruction",
  "globIdentity",
  "authorable",
  "runtimeState",
]);
const STRING_PROPS = new Set(["marshaller", "inverse", "authorPicker"]);
const REF_VALUES = new Set(["identity", "instance"]);
const LIFETIME_VALUES = new Set(["weak", "symmetric", "owned"]);
/**
 * The NUMERIC properties — reveal levels (0 open … 3 wizard-only).
 * `spoiler` is the level of the field's VALUE; `spoilerName` the level
 * at which its NAME (its existence) is revealed, defaulting to
 * `spoiler`. Both are checked against the vocabulary rather than
 * merely "is a number", because an out-of-range level is silently
 * clamped at read time and the author would never learn their
 * `spoiler: 5` became a 3.
 */
const NUMERIC_PROPS = new Set(["spoiler", "spoilerName"]);
const SPOILER_VALUES = new Set(["0", "1", "2", "3"]);

/**
 * The CI gate — what neither class registration nor the golden master
 * can see.
 *
 * Registration validates a class it actually loads; this sees the whole
 * tree statically, including classes no test ever constructs. The golden
 * master proves the codemod preserved meaning; this proves the shape
 * stays legal afterwards.
 */
function lint(): void {
  const files: string[] = [];
  walk(MUD_ROOT, files);
  files.sort();
  const problems: string[] = [];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (
      !source.includes("fieldMeta") &&
      !ARRAY_STATICS.some((s) => source.includes(s)) &&
      !OBJECT_STATICS.some((s) => source.includes(s))
    ) {
      continue;
    }
    const sf = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );
    const inTests =
      file.includes(`${sep}__tests__${sep}`) || file.endsWith(".test.ts");
    const at = (n: ts.Node) =>
      `${relPath(file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;

    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
        for (const m of node.members) {
          if (!ts.isPropertyDeclaration(m) || !isStatic(m)) continue;
          const name = memberName(m.name);
          if (!name) continue;

          // 1. A legacy static came back.
          if (
            (ARRAY_STATICS as readonly string[]).includes(name) ||
            (OBJECT_STATICS as readonly string[]).includes(name)
          ) {
            problems.push(
              `${at(m)}  legacy static \`${name}\` — folded into ` +
                `\`static fieldMeta\`; see docs/ref-shapes.md`
            );
            continue;
          }
          if (name !== "fieldMeta" || !m.initializer) continue;

          const init = unwrap(m.initializer);
          if (!ts.isObjectLiteralExpression(init)) continue;
          for (const p of init.properties) {
            if (!ts.isPropertyAssignment(p)) continue;
            const field = memberName(p.name);
            const entry = unwrap(p.initializer);
            if (!field || !ts.isObjectLiteralExpression(entry)) continue;

            const seen = new Map<string, ts.Expression>();
            for (const attr of entry.properties) {
              if (!ts.isPropertyAssignment(attr)) continue;
              const key = memberName(attr.name);
              if (!key) continue;
              const val = unwrap(attr.initializer);
              seen.set(key, val);

              // 2. Unknown property.
              if (!KNOWN_PROPS.has(key)) {
                problems.push(
                  `${at(attr)}  \`${field}.${key}\` is not a FieldMetaEntry ` +
                    `property`
                );
                continue;
              }
              // 3. Value shapes.
              if (
                TRUE_ONLY.has(key) &&
                val.kind !== ts.SyntaxKind.TrueKeyword
              ) {
                problems.push(
                  `${at(attr)}  \`${field}.${key}\` must be \`true\` ` +
                    `(absence is how you say false)`
                );
              }
              if (STRING_PROPS.has(key) && !ts.isStringLiteral(val)) {
                // A marshaller is an expression by design; only
                // `inverse` / `authorPicker` must be literals.
                if (key !== "marshaller") {
                  problems.push(
                    `${at(attr)}  \`${field}.${key}\` must be a string literal`
                  );
                }
              }
              if (
                NUMERIC_PROPS.has(key) &&
                (!ts.isNumericLiteral(val) || !SPOILER_VALUES.has(val.text))
              ) {
                problems.push(
                  `${at(attr)}  \`${field}.${key}\` must be a numeric ` +
                    `literal 0-3 (the reveal-level vocabulary)`
                );
              }
              if (
                key === "ref" &&
                (!ts.isStringLiteral(val) || !REF_VALUES.has(val.text))
              ) {
                problems.push(
                  `${at(attr)}  \`${field}.ref\` must be 'identity' or 'instance'`
                );
              }
              if (
                key === "lifetime" &&
                (!ts.isStringLiteral(val) || !LIFETIME_VALUES.has(val.text))
              ) {
                problems.push(
                  `${at(attr)}  \`${field}.lifetime\` must be 'weak', ` +
                    `'symmetric' or 'owned'`
                );
              }
            }

            // 4. The axis rules (R7), statically checkable per entry.
            //
            // Skipped under `__tests__`: the validator's own tests must
            // be able to WRITE a contradiction in order to prove
            // registration rejects it. The rules above — unknown
            // property, malformed value, a legacy static coming back —
            // still apply everywhere, because no test needs those.
            if (inTests) continue;
            const refVal = seen.get("ref");
            const refText =
              refVal && ts.isStringLiteral(refVal) ? refVal.text : null;
            if (refText === "instance" && seen.has("persistent")) {
              problems.push(
                `${at(p)}  \`${field}\` is both \`ref: 'instance'\` and ` +
                  `\`persistent\` — a stuffId does not survive a reboot, so ` +
                  `there is nothing durable to write down. See ` +
                  `docs/ref-shapes.md`
              );
            }
            if (refText === "identity" && seen.has("lifetime")) {
              problems.push(
                `${at(p)}  \`${field}\` is \`ref: 'identity'\` with a ` +
                  `\`lifetime\` — an identity ref re-resolves on read and ` +
                  `cannot dangle. See docs/ref-shapes.md`
              );
            }
            const lifeVal = seen.get("lifetime");
            const lifeText =
              lifeVal && ts.isStringLiteral(lifeVal) ? lifeVal.text : null;
            // Deliberately NOT checked here: "lifetime requires ref" and
            // "symmetric requires inverse". Both are properties of the
            // MERGED entry, and the merge is property-level across the
            // prototype chain — a base may declare `ref: 'instance'`
            // while a subclass sharpens it with a `lifetime`, which is
            // legal and which this per-class-body scan would flag as a
            // false positive. Those belong to the registration
            // validator, which holds the constructor and can therefore
            // see the whole chain. The checks kept above are the ones
            // that are wrong no matter what any other layer says.
            void lifeText;
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sf, visit);
  }

  if (problems.length > 0) {
    console.error(
      `check-field-meta --lint: ${problems.length} problem` +
        `${problems.length === 1 ? "" : "s"}:`
    );
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(
    `check-field-meta --lint: clean (${files.length} files scanned; no ` +
      `legacy statics, every fieldMeta entry well-formed).`
  );
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
  // An ADDED record is reported but not fatal, and the asymmetry is
  // principled rather than convenient. The golden master's claim is
  // "nothing was LOST or ALTERED" — a class body appearing where there
  // was none can only mean new code arrived (W1's own test fixtures are
  // the first case). A codemod that duplicated a body would still be
  // caught: every record after the duplicate shifts index, so the
  // className comparison fails as CHANGED.
  const added: string[] = [];
  for (const [k, r] of after) {
    if (!before.has(k)) added.push(`  ADDED    ${k} (${r.className})`);
  }
  reportCensus(records);
  if (added.length > 0) {
    console.log(
      `\n  ${added.length} class ${added.length === 1 ? "body" : "bodies"} ` +
        `added since the golden master (not a failure — new code):`
    );
    for (const a of added) console.log(a);
  }
  if (diffs.length > 0) {
    console.error(
      `\ncheck-field-meta --verify: ${diffs.length} class ` +
        `${diffs.length === 1 ? "body differs" : "bodies differ"} from the golden master:`
    );
    for (const d of diffs) console.error(d);
    process.exit(1);
  }
  console.log(`  --verify clean: ${records.length} class bodies match the golden master.`);
} else if (mode === "--snapshot-tags") {
  mkdirSync(dirname(TAGS_GOLDEN), { recursive: true });
  const tags = scanTags();
  writeFileSync(TAGS_GOLDEN, JSON.stringify(tags, null, 2) + "\n", "utf8");
  console.log(
    `check-field-meta --snapshot-tags: ${Object.keys(tags).length} mixins ` +
      `recorded to ${relPath(TAGS_GOLDEN)}`
  );
} else if (mode === "--verify-tags") {
  // Equivalence proof for the tag fold. The golden holds the scan's
  // per-mixin sets; here we re-derive them from the declarations and
  // compare. A candidate the scan produced that matches no declared
  // field is expected to be absent — that is the guess being dropped —
  // and is reported rather than failed.
  const golden = JSON.parse(readFileSync(TAGS_GOLDEN, "utf8")) as Record<
    string,
    { authorable: string[]; runtime: string[]; refs: Record<string, string> }
  >;
  const files: string[] = [];
  walk(MUD_ROOT, files);
  const mismatches: string[] = [];
  const dropped: string[] = [];
  const seenMixins = new Set<string>();

  for (const file of files.sort()) {
    if (file.includes(`${sep}__tests__${sep}`) || file.endsWith(".test.ts")) {
      continue;
    }
    const source = readFileSync(file, "utf8");
    if (!source.includes("_mixinName") || !source.includes("fieldMeta")) continue;
    const sf = ts.createSourceFile(
      file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS
    );
    const mixinNames = [
      ...source.matchAll(/static\s+_mixinName\s*=\s*['"]([A-Za-z0-9_]+)['"]/g),
    ].map((m) => m[1]!);
    if (mixinNames.length === 0) continue;

    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
        for (const m of node.members) {
          if (!ts.isPropertyDeclaration(m) || !isStatic(m)) continue;
          if (memberName(m.name) !== "fieldMeta" || !m.initializer) continue;
          const init = unwrap(m.initializer);
          if (!ts.isObjectLiteralExpression(init)) continue;
          for (const p of init.properties) {
            if (!ts.isPropertyAssignment(p)) continue;
            const field = memberName(p.name);
            const entry = unwrap(p.initializer);
            if (!field || !ts.isObjectLiteralExpression(entry)) continue;
            const has = (k: string) =>
              entry.properties.some(
                (a) => ts.isPropertyAssignment(a) && memberName(a.name) === k
              );
            // Reference fields are out of scope for this proof. The
            // tag golden was taken at fold time; the reference waves
            // then ADDED entries for fields that had no `fieldMeta` key
            // at all (`Containable.environment` is the case). A field
            // that did not exist here when the golden was taken cannot
            // have lost a marker — and a reference field is never
            // persistent, so `runtimeState` on it would be meaningless
            // anyway (`runtimeState` is a subset of `persistent`).
            for (const mixin of mixinNames) seenMixins.add(mixin);
            if (has("ref")) continue;
            const bare = field.replace(/^_/, "");
            const cands = [field, bare, `_${bare}`];
            for (const mixin of mixinNames) {
              seenMixins.add(mixin);
              const g = golden[mixin];
              if (!g) continue;
              const wantAuthorable = cands.some((c) => g.authorable.includes(c));
              const wantRuntime = cands.some((c) => g.runtime.includes(c));
              if (wantAuthorable !== has("authorable")) {
                mismatches.push(
                  `  ${relPath(file)} ${mixin}.${field}: authorable ` +
                    `scan=${wantAuthorable} declared=${has("authorable")}`
                );
              }
              if (wantRuntime !== has("runtimeState")) {
                mismatches.push(
                  `  ${relPath(file)} ${mixin}.${field}: runtimeState ` +
                    `scan=${wantRuntime} declared=${has("runtimeState")}`
                );
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sf, visit);
  }

  for (const [mixin, g] of Object.entries(golden)) {
    if (!seenMixins.has(mixin)) {
      const n = g.authorable.length + g.runtime.length;
      if (n > 0) dropped.push(`  ${mixin}: ${n} tagged candidate(s), no fieldMeta`);
    }
  }

  console.log(
    `check-field-meta --verify-tags: ${Object.keys(golden).length} mixins in ` +
      `the golden, ${seenMixins.size} carry a fieldMeta.`
  );
  if (dropped.length > 0) {
    console.log(
      `\n  ${dropped.length} mixin(s) whose tagged candidates match no ` +
        `declared field — the scan's guess, dropped by the fold:`
    );
    for (const d of dropped) console.log(d);
  }
  if (mismatches.length > 0) {
    console.error(`\n  ${mismatches.length} MISMATCH(es):`);
    for (const m of mismatches) console.error(m);
    process.exit(1);
  }
  console.log(`  clean: every declared field agrees with the scan.`);
} else if (mode === "--lint") {
  lint();
} else {
  console.error(
    `check-field-meta: unknown mode '${mode}'. ` +
      `Expected --snapshot, --verify or --lint.`
  );
  process.exit(1);
}
