/**
 * codemod-field-tags — pass 2: fold the `@authorable` / `@runtimeState`
 * TSDoc markers into `static fieldMeta`, and strip the tags.
 *
 *   `@authorable`            → { authorable: true }
 *   `@authorable ref:<Type>` → { authorable: true, authorPicker: '<Type>' }
 *   `@runtimeState`          → { runtimeState: true }
 *
 * `authorPicker`, not a nested `ref`, so it cannot be confused with the
 * reference axis.
 *
 * ## Why this is a fold and not a rewrite
 *
 * `StudioLogic.scanClassification` reads these markers by walking the
 * source tree as TEXT: a regex pairs each doc comment with the next
 * identifier and then GUESSES which field it belongs to, expanding
 * underscore-insensitive candidates (`_foo` marks `foo`, `foo` marks
 * `_foo`) and mapping `apply<Field>` back to `field`. It cannot tell
 * which field a comment is actually attached to, so it marks all of
 * them and lets the consumer intersect with the real field list.
 *
 * That guessing is why the fold matters: a declaration says exactly
 * which field is authorable. Where the scan and the declaration
 * disagree, **the declaration is right**.
 *
 * The binding rule here is therefore deliberately narrow: a tag found in
 * a file marks a `fieldMeta` key in that same file only when one of the
 * scan's own candidates for that key was tagged. Candidates that match
 * no declared field are dropped — they were never real fields, only
 * artifacts of the guess. The count is reported.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, sep } from "path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const MUD_ROOT = join(here, "..", "src", "mud");

const census = {
  filesChanged: 0,
  entriesMarkedAuthorable: 0,
  entriesMarkedRuntime: 0,
  entriesGivenPicker: 0,
  tagsStripped: 0,
  candidatesDropped: new Set<string>(),
};

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (
      full.endsWith(".ts") &&
      !full.endsWith(".d.ts") &&
      !full.endsWith(".test.ts")
    ) {
      out.push(full);
    }
  }
}

function candidatesOf(id: string): Set<string> {
  const bare = id.replace(/^_/, "");
  return new Set([id, bare, `_${bare}`]);
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

/** The file's tag sets, resolved exactly as `scanClassification` does. */
function scanFile(src: string): {
  authorable: Set<string>;
  runtime: Set<string>;
  refs: Map<string, string>;
} {
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
  return { authorable, runtime, refs };
}

/** Remove the tag text from a doc comment, leaving the prose. */
function stripTags(source: string): { text: string; removed: number } {
  let removed = 0;
  let out = source;
  // A whole line that is nothing but the marker.
  out = out.replace(/^[ \t]*\*[ \t]*@authorable(?:[ \t]+ref:\w+)?[ \t]*\r?\n/gm, () => {
    removed++;
    return "";
  });
  out = out.replace(/^[ \t]*\*[ \t]*@runtimeState[ \t]*\r?\n/gm, () => {
    removed++;
    return "";
  });
  // A one-line doc comment that is nothing but the marker.
  out = out.replace(
    /^[ \t]*\/\*\*[ \t]*@(?:authorable(?:[ \t]+ref:\w+)?|runtimeState)[ \t]*\*\/[ \t]*\r?\n/gm,
    () => {
      removed++;
      return "";
    }
  );
  // Trailing marker after prose on the same line.
  out = out.replace(/[ \t]*@authorable(?:[ \t]+ref:\w+)?(?=[ \t]*(\r?\n|\*\/))/g, () => {
    removed++;
    return "";
  });
  out = out.replace(/[ \t]*@runtimeState(?=[ \t]*(\r?\n|\*\/))/g, () => {
    removed++;
    return "";
  });
  // `/** @authorable Some prose. */` — marker first, prose after. The
  // lookbehind spares backticked prose mentions (`@authorable`), which
  // name the concept rather than marking a field.
  out = out.replace(/(?<![`\w])@authorable(?:[ \t]+ref:\w+)?[ \t]+(?=\S)/g, () => {
    removed++;
    return "";
  });
  out = out.replace(/(?<![`\w])@runtimeState[ \t]+(?=\S)/g, () => {
    removed++;
    return "";
  });
  // Stripping a tag can leave the doc comment ending on a bare `*`
  // line. That is the codemod's own litter, so it cleans it up.
  out = out.replace(/(\r?\n)[ \t]*\*[ \t]*(\r?\n[ \t]*\*\/)/g, "$2");
  return { text: out, removed };
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

function transform(file: string): boolean {
  const source = readFileSync(file, "utf8");
  if (!source.includes("@authorable") && !source.includes("@runtimeState")) {
    return false;
  }
  const tags = scanFile(source);
  if (
    tags.authorable.size === 0 &&
    tags.runtime.size === 0 &&
    tags.refs.size === 0
  ) {
    return false;
  }

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );
  const edits: Edit[] = [];
  const matchedCandidates = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      for (const m of node.members) {
        if (!ts.isPropertyDeclaration(m) || !isStatic(m)) continue;
        if (memberName(m.name) !== "fieldMeta" || !m.initializer) continue;
        const init = m.initializer;
        if (!ts.isObjectLiteralExpression(init)) continue;
        for (const p of init.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          const field = memberName(p.name);
          const entry = p.initializer;
          if (!field || !ts.isObjectLiteralExpression(entry)) continue;

          const cands = candidatesOf(field);
          const already = (k: string) =>
            entry.properties.some(
              (a) => ts.isPropertyAssignment(a) && memberName(a.name) === k
            );
          const add: string[] = [];
          if (!already("authorable") && [...cands].some((c) => tags.authorable.has(c))) {
            add.push("authorable: true");
            census.entriesMarkedAuthorable++;
            for (const c of cands) if (tags.authorable.has(c)) matchedCandidates.add(c);
          }
          let picker: string | undefined;
          for (const c of cands) {
            const t = tags.refs.get(c);
            if (t) {
              picker = t;
              break;
            }
          }
          if (picker && !already("authorPicker")) {
            add.push(`authorPicker: '${picker}'`);
            census.entriesGivenPicker++;
          }
          if (!already("runtimeState") && [...cands].some((c) => tags.runtime.has(c))) {
            add.push("runtimeState: true");
            census.entriesMarkedRuntime++;
            for (const c of cands) if (tags.runtime.has(c)) matchedCandidates.add(c);
          }
          if (add.length === 0) continue;

          // Insert after the last real character inside the braces, not
          // immediately before `}` — the entry is written `{ x: true }`,
          // so anchoring on the brace would leave `{ x: true , y: true }`.
          let at = entry.getEnd() - 1;
          while (at > 0 && /\s/.test(source[at - 1]!)) at--;
          const prefix = source[at - 1] === "," ? " " : ", ";
          edits.push({ start: at, end: at, text: prefix + add.join(", ") });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);

  for (const c of [...tags.authorable, ...tags.runtime]) {
    if (!matchedCandidates.has(c)) census.candidatesDropped.add(`${file}:${c}`);
  }

  edits.sort((a, b) => b.start - a.start);
  let out = source;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  const stripped = stripTags(out);
  census.tagsStripped += stripped.removed;
  out = stripped.text;

  if (out === source) return false;
  writeFileSync(file, out, "utf8");
  census.filesChanged++;
  return true;
}

const files: string[] = [];
walk(MUD_ROOT, files);
files.sort();
for (const f of files) transform(f);

console.log(
  `codemod-field-tags: ${census.filesChanged} files rewritten.\n` +
    `  entries marked: authorable=${census.entriesMarkedAuthorable} ` +
    `runtimeState=${census.entriesMarkedRuntime} ` +
    `authorPicker=${census.entriesGivenPicker}\n` +
    `  tag markers stripped: ${census.tagsStripped}\n` +
    `  scan candidates matching no declared field (dropped — the scan was ` +
    `guessing): ${census.candidatesDropped.size}`
);
for (const c of [...census.candidatesDropped].sort().slice(0, 40)) {
  console.log(`    ${c.replace(MUD_ROOT + sep, "")}`);
}
