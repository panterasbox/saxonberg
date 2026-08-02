/**
 * codemod-field-meta — fold the four field-keyed statics into one
 * `static fieldMeta`.
 *
 *   persistentFields    → { persistent: true }
 *   fieldMarshallers    → { marshaller: <expr> }
 *   instructionFields   → { instruction: true }
 *   globIdentityFields  → { globIdentity: true }
 *
 * Lives on the branch so a reviewer can re-run it against the parent
 * commit and diff the result; deleted at the pre-merge sweep.
 *
 * ## Rules it holds to
 *
 * **Key order is load-bearing.** Emitted per class body as
 * `persistentFields` (declared order) → `instructionFields` →
 * `globIdentityFields` → `fieldMarshallers` keys not already emitted.
 * `getAllFieldMeta` collects keys in first-seen order, so
 * `Object.keys(meta).filter(k => meta[k].persistent)` reproduces
 * `getAllPersistentFields` exactly — including the order
 * `PersistentHydrator` Phase 1 applies fields in.
 *
 * **Marshaller values are copied as SOURCE TEXT**, never re-serialized:
 * they are expressions (`QuantityMarshaller.pathFor('kg')`,
 * `EncryptedStringMarshaller.templatePath`, a bare const), and
 * re-printing them would rewrite quote style in a repo that is
 * hand-formatted and mixed by area.
 *
 * **Field names are emitted as bare identifiers.** Every field name in
 * the tree is a valid identifier (checked), so this sidesteps the quote
 * question for keys entirely rather than picking a style.
 *
 * **No formatter runs afterwards.** There is no prettier config in this
 * repo and no `format` script; running one would rewrap and requote 245
 * files inside the one commit whose whole value is being mechanically
 * verifiable.
 *
 * **JSDoc is preserved, not dropped.** Where a class body declares
 * several of the four, each with its own doc comment, the comment bodies
 * are merged into a single block above the emitted declaration. That
 * prose (Tangible's kg-marshaller note, Avatar's persistence commentary)
 * is the expensive part of these files.
 *
 * Pure AST → text-range edits, applied back-to-front, no state. Running
 * it twice is a no-op: a class body that already carries `fieldMeta` and
 * none of the four legacy statics is skipped.
 *
 * Verified by `check-field-meta.ts --verify`, which re-derives the
 * per-class-body record from the POST-codemod AST and diffs it against
 * the golden master taken before. That diff, not this script, is the
 * proof.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative, sep } from "path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = join(here, "..");
const MUD_ROOT = join(SERVER_ROOT, "src", "mud");
const MIXIN_MODULE = join(MUD_ROOT, "lib", "mixin");

const ARRAY_STATICS = [
  "persistentFields",
  "instructionFields",
  "globIdentityFields",
] as const;
const ALL_STATICS = [...ARRAY_STATICS, "fieldMarshallers"] as const;

/** Which fieldMeta property each legacy static contributes. */
const FLAG_FOR: Record<string, string> = {
  persistentFields: "persistent",
  instructionFields: "instruction",
  globIdentityFields: "globIdentity",
};

interface Edit {
  start: number;
  end: number;
  text: string;
}

const census = {
  filesChanged: 0,
  classBodies: 0,
  consumed: {
    persistentFields: 0,
    fieldMarshallers: 0,
    instructionFields: 0,
    globIdentityFields: 0,
  } as Record<string, number>,
  emptyRecords: 0,
  importsAdded: 0,
  importsExtended: 0,
  jsdocMerged: 0,
  alreadyConverted: 0,
};

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".ts") && !full.endsWith(".d.ts")) out.push(full);
  }
}

function isStatic(m: ts.ClassElement): boolean {
  if (!ts.canHaveModifiers(m)) return false;
  return !!ts
    .getModifiers(m)
    ?.some((mod) => mod.kind === ts.SyntaxKind.StaticKeyword);
}

function memberName(n: ts.PropertyName | undefined): string | null {
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isStringLiteral(n)) return n.text;
  return null;
}

function unwrap(e: ts.Expression): ts.Expression {
  let x = e;
  for (;;) {
    if (ts.isAsExpression(x) || ts.isParenthesizedExpression(x)) x = x.expression;
    else return x;
  }
}

/** The whole leading-comment run for a node, or null. */
function leadingComments(
  source: string,
  node: ts.Node
): { pos: number; end: number } | null {
  const ranges = ts.getLeadingCommentRanges(source, node.getFullStart());
  if (!ranges || ranges.length === 0) return null;
  return { pos: ranges[0]!.pos, end: ranges[ranges.length - 1]!.end };
}

/** Strip `/** … *\/` framing down to its content lines. */
function jsdocBody(text: string): string[] {
  if (!text.startsWith("/*")) return text.split("\n");
  const inner = text.replace(/^\/\*\*?/, "").replace(/\*\/$/, "");
  return inner
    .split("\n")
    .map((l) => l.replace(/^\s*\* ?/, "").trimEnd())
    .filter((l, i, a) => !(i === 0 && l === "") && !(i === a.length - 1 && l === ""));
}

/** The indentation of the line `pos` sits on. */
function indentAt(source: string, pos: number): string {
  const lineStart = source.lastIndexOf("\n", pos - 1) + 1;
  const m = /^[ \t]*/.exec(source.slice(lineStart, pos));
  return m ? m[0] : "";
}

/** Expand a range to swallow its own line's indentation and trailing newline. */
function expandToWholeLines(
  source: string,
  start: number,
  end: number
): { start: number; end: number } {
  let s = start;
  const lineStart = source.lastIndexOf("\n", s - 1) + 1;
  if (/^[ \t]*$/.test(source.slice(lineStart, s))) s = lineStart;
  let e = end;
  while (e < source.length && (source[e] === " " || source[e] === "\t")) e++;
  if (source[e] === "\r") e++;
  if (source[e] === "\n") e++;
  return { start: s, end: e };
}

interface Collected {
  node: ts.PropertyDeclaration;
  name: string;
  fields: string[];
  marshallers: Array<[string, string]>;
}

function transformFile(file: string): boolean {
  const source = readFileSync(file, "utf8");
  if (!ALL_STATICS.some((s) => source.includes(s))) return false;

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );

  const edits: Edit[] = [];
  let touchedAny = false;

  const visitClass = (node: ts.ClassDeclaration | ts.ClassExpression): void => {
    const collected: Collected[] = [];
    let hasFieldMeta = false;

    for (const m of node.members) {
      if (!ts.isPropertyDeclaration(m) || !isStatic(m)) continue;
      const name = memberName(m.name);
      if (name === "fieldMeta") hasFieldMeta = true;
      if (!name || !(ALL_STATICS as readonly string[]).includes(name)) continue;
      if (!m.initializer) {
        throw new Error(`${file}: static ${name} has no initializer`);
      }
      const init = unwrap(m.initializer);
      const entry: Collected = { node: m, name, fields: [], marshallers: [] };

      if (name === "fieldMarshallers") {
        if (!ts.isObjectLiteralExpression(init)) {
          throw new Error(`${file}: ${name} is not an object literal`);
        }
        for (const p of init.properties) {
          if (!ts.isPropertyAssignment(p)) {
            throw new Error(`${file}: ${name} has a non-assignment member`);
          }
          const key = memberName(p.name);
          if (key === null) throw new Error(`${file}: computed ${name} key`);
          entry.marshallers.push([
            key,
            source.slice(p.initializer.getStart(sf), p.initializer.getEnd()),
          ]);
        }
      } else {
        if (!ts.isArrayLiteralExpression(init)) {
          throw new Error(`${file}: ${name} is not an array literal`);
        }
        for (const el of init.elements) {
          const e = unwrap(el);
          if (!ts.isStringLiteral(e) && !ts.isNoSubstitutionTemplateLiteral(e)) {
            throw new Error(`${file}: ${name} has a non-literal element`);
          }
          entry.fields.push(e.text);
        }
      }
      collected.push(entry);
    }

    if (collected.length === 0) {
      if (hasFieldMeta) census.alreadyConverted++;
      return;
    }
    if (hasFieldMeta) {
      throw new Error(
        `${file}: class already declares fieldMeta AND a legacy static — ` +
          `refusing to merge into an ambiguous state`
      );
    }

    for (const c of collected) census.consumed[c.name] = (census.consumed[c.name] ?? 0) + 1;
    census.classBodies++;
    touchedAny = true;

    // ── Build the merged entries, in the load-bearing key order ──
    const entries = new Map<string, string[]>();
    const add = (field: string, prop: string) => {
      const cur = entries.get(field);
      if (cur) {
        if (!cur.includes(prop)) cur.push(prop);
      } else entries.set(field, [prop]);
    };
    for (const staticName of ARRAY_STATICS) {
      const c = collected.find((x) => x.name === staticName);
      if (!c) continue;
      for (const f of c.fields) add(f, `${FLAG_FOR[staticName]}: true`);
    }
    const marsh = collected.find((x) => x.name === "fieldMarshallers");
    if (marsh) {
      for (const [field, expr] of marsh.marshallers) {
        add(field, `marshaller: ${expr}`);
      }
    }

    // ── Render ──
    const first = collected[0]!;
    const indent = indentAt(source, first.node.getStart(sf));
    const inner = indent + "  ";
    let decl: string;
    if (entries.size === 0) {
      census.emptyRecords++;
      decl = `${indent}static fieldMeta: FieldMeta = {};`;
    } else {
      const lines: string[] = [`${indent}static fieldMeta: FieldMeta = {`];
      for (const [field, props] of entries) {
        lines.push(`${inner}${field}: { ${props.join(", ")} },`);
      }
      lines.push(`${indent}};`);
      decl = lines.join("\n");
    }

    // ── Comments: merge every replaced node's doc block into one ──
    const commentTexts: string[] = [];
    for (const c of collected) {
      const range = leadingComments(source, c.node);
      if (range) commentTexts.push(source.slice(range.pos, range.end));
    }
    let commentBlock = "";
    if (commentTexts.length === 1) {
      commentBlock = commentTexts[0]! + "\n" + indent;
    } else if (commentTexts.length > 1) {
      census.jsdocMerged++;
      const bodies = commentTexts.map(jsdocBody);
      const merged: string[] = [];
      bodies.forEach((b, i) => {
        if (i > 0) merged.push("");
        merged.push(...b);
      });
      commentBlock =
        `/**\n` +
        merged.map((l) => (l ? `${indent} * ${l}` : `${indent} *`)).join("\n") +
        `\n${indent} */\n${indent}`;
    }

    // Replace the first node (and its comments) with the merged form.
    const firstRange = leadingComments(source, first.node);
    const replaceStart = firstRange ? firstRange.pos : first.node.getStart(sf);
    edits.push({
      start: replaceStart,
      end: first.node.getEnd(),
      text: commentBlock + decl.slice(indent.length),
    });

    // Delete the rest, comments and all.
    for (const c of collected.slice(1)) {
      const r = leadingComments(source, c.node);
      const s = r ? r.pos : c.node.getStart(sf);
      const span = expandToWholeLines(source, s, c.node.getEnd());
      edits.push({ start: span.start, end: span.end, text: "" });
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      visitClass(node);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);

  if (!touchedAny) return false;

  // ── The `FieldMeta` type import ──
  const relDir = relative(dirname(file), MIXIN_MODULE).split(sep).join("/");
  const spec = relDir.startsWith(".") ? relDir : "./" + relDir;

  let importHandled = false;
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const resolved = join(dirname(file), stmt.moduleSpecifier.text);
    if (resolved !== MIXIN_MODULE) continue;
    const clause = stmt.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) {
      continue;
    }
    const already = clause.namedBindings.elements.some(
      (e) => e.name.text === "FieldMeta"
    );
    if (already) {
      importHandled = true;
      break;
    }
    const last = clause.namedBindings.elements[
      clause.namedBindings.elements.length - 1
    ]!;
    // `import type {…}` takes a bare name; a value import takes the
    // inline `type` modifier so no runtime binding is created.
    const insert = clause.isTypeOnly ? ", FieldMeta" : ", type FieldMeta";
    edits.push({ start: last.getEnd(), end: last.getEnd(), text: insert });
    census.importsExtended++;
    importHandled = true;
    break;
  }

  if (!importHandled) {
    const imports = sf.statements.filter(ts.isImportDeclaration);
    const anchor = imports[imports.length - 1];
    const line = `import type { FieldMeta } from "${spec}";`;
    if (anchor) {
      edits.push({
        start: anchor.getEnd(),
        end: anchor.getEnd(),
        text: "\n" + quoteMatched(line, source),
      });
    } else {
      const pos = sf.statements[0]?.getStart(sf) ?? 0;
      edits.push({
        start: pos,
        end: pos,
        text: quoteMatched(line, source) + "\n",
      });
    }
    census.importsAdded++;
  }

  // Apply back-to-front so earlier offsets stay valid.
  edits.sort((a, b) => b.start - a.start);
  let out = source;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }

  writeFileSync(file, out, "utf8");
  census.filesChanged++;
  return true;
}

/**
 * Match the file's dominant import quote style. The repo is
 * hand-formatted and mixed by area; a codemod that imposes one would
 * churn every file it touches.
 */
function quoteMatched(line: string, source: string): string {
  const single = (source.match(/^import .* from '/gm) ?? []).length;
  const double = (source.match(/^import .* from "/gm) ?? []).length;
  return single > double ? line.replace(/"/g, "'") : line;
}

const files: string[] = [];
walk(MUD_ROOT, files);
files.sort();

const dry = process.argv.includes("--check");
let changed = 0;
for (const f of files) {
  if (dry) continue;
  if (transformFile(f)) changed++;
}

if (dry) {
  console.log("codemod-field-meta: --check does not write; run without it.");
  process.exit(0);
}

const c = census.consumed;
console.log(
  `codemod-field-meta: ${changed} files rewritten, ` +
    `${census.classBodies} class bodies converted.`
);
console.log(
  `  consumed: persistentFields=${c.persistentFields} ` +
    `fieldMarshallers=${c.fieldMarshallers} ` +
    `instructionFields=${c.instructionFields} ` +
    `globIdentityFields=${c.globIdentityFields}`
);
console.log(
  `  empty records: ${census.emptyRecords} · ` +
    `jsdoc blocks merged: ${census.jsdocMerged} · ` +
    `imports added: ${census.importsAdded}, extended: ${census.importsExtended}` +
    (census.alreadyConverted
      ? ` · already converted (re-run no-op): ${census.alreadyConverted}`
      : "")
);
