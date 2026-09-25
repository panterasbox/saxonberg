/**
 * pack-roots — the lint family's shared reader of the capability packs.
 *
 * Which shipped packs carry a `src/`, and which class-namespace roots
 * that `src/` backs (the manifest `root` plus every `requires.title`
 * claim — the installer's `namespaceRootsOf`, mirrored minimally, the
 * same license `check-untitled-paths` already takes for the content
 * walk: a script does not import the mudlib). `classFileOf` is the
 * scripts' twin of `StuffApi.resolveClassFile`: a class path under a
 * pack root resolves into that pack's `src/` and nowhere else; anything
 * else is the kernel tree's.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SERVER_SRC = join(HERE, "..", "src");
export const MUD = join(SERVER_SRC, "mud");
export const CONTENT = join(HERE, "..", "..", "content");

export interface PackSource {
  /** The pack id (`arcana`). */
  id: string;
  /** Absolute pack dir. */
  packDir: string;
  /** Absolute `src/` dir. */
  srcDir: string;
  /** The class-namespace roots this `src/` backs (`/arcana`, plus claims). */
  roots: string[];
}

interface Manifest {
  id: string;
  root?: string;
  requires?: { title?: Array<{ extent: string }> };
}

/** Every shipped pack that ships a `src/`, with the roots it backs. */
export function packSources(contentDir: string = CONTENT): PackSource[] {
  if (!existsSync(contentDir)) return [];
  const out: PackSource[] = [];
  for (const pack of readdirSync(contentDir).sort()) {
    const packDir = join(contentDir, pack);
    const manifestFile = join(packDir, "pack.yaml");
    const srcDir = join(packDir, "src");
    if (!existsSync(manifestFile) || !existsSync(srcDir) || !statSync(srcDir).isDirectory()) continue;
    const m = YAML.parse(readFileSync(manifestFile, "utf8")) as Manifest;
    const all = new Set<string>([m.root ?? `/${m.id}`]);
    for (const t of m.requires?.title ?? []) all.add(t.extent);
    // Descendant roots are dropped — one src/, one covering root — the
    // installer's namespaceRootsOf, mirrored (a locality pack claims
    // extents inside its own root, and a descendant root would misdirect
    // longest-prefix class resolution into the wrong src/ subpath).
    const roots = [...all].filter(
      (r) => ![...all].some((o) => o !== r && (r === o || r.startsWith(o + "/"))),
    );
    out.push({ id: m.id, packDir, srcDir, roots });
  }
  return out;
}

/** The pack whose namespace root is the longest prefix of `classPath`, or null. */
export function packOfClassPath(
  classPath: string,
  sources: readonly PackSource[],
): { pack: PackSource; root: string } | null {
  let best: { pack: PackSource; root: string } | null = null;
  for (const pack of sources) {
    for (const root of pack.roots) {
      if (classPath === root || classPath.startsWith(root + "/")) {
        if (!best || root.length > best.root.length) best = { pack, root };
      }
    }
  }
  return best;
}

/**
 * The file a class path names: `<srcDir>/<rel>.ts` inside the owning
 * pack, else `<mud>/<path>.ts` in the kernel tree. A pack-namespace
 * path never falls back to the kernel.
 */
export function classFileOf(
  classPath: string,
  sources: readonly PackSource[],
  mudDir: string = MUD,
): string {
  const hit = packOfClassPath(classPath, sources);
  if (hit) return join(hit.pack.srcDir, classPath.slice(hit.root.length + 1) + ".ts");
  return join(mudDir, classPath.slice(1) + ".ts");
}

/**
 * Whether the class at `classPath` composes `mixin`, transitively through
 * its bases — text over each `extends` expression in the file, then each
 * identifier in it resolved through that file's own imports.
 *
 * ⭐ The point is that a combination written tomorrow
 * (`CastMixin(MakerMixin(NPC))`) is covered without any gate being told
 * about it. An enumerated list of "the Cast classes" is exactly the
 * shape that rotted into `lint:family` being derived in the first place.
 *
 * ⚠ It matches EVERY `class X extends …` in the file, not only an
 * exported one: `/platform/idea/Business` resolves to a bare
 * `class BusinessEntity` that the module exports as its default further
 * down (the `Bank`→`BankCounter` naming convention). Anchoring on
 * `export` silently read that file as composing nothing.
 *
 * ⚠⚠ It also follows a **same-file `const XBase = …` binding**, which is
 * how every deep stack in the tree is actually written: `Creature`,
 * `Character`, `NPC`, `Avatar` and pets' `KeptAnimal` all read
 * `const XBase = AMixin(BMixin(Base)); class X extends XBase {}`. Until
 * 2026-09-10 the `extends` text was `XBase` alone and the identifier
 * resolved through imports only, so **every one of them composed
 * nothing** as far as this reader was concerned — `lint:identity` passed
 * because its Cast rows happen to name their mixin inline, not because
 * it was looking. A gate that answers `no` to every question is the
 * failure class the derived family exists to prevent.
 */
export function composesMixin(
  classPath: string,
  mixin: string,
  sources: readonly PackSource[],
  cache: Map<string, boolean> = new Map(),
  seen: Set<string> = new Set(),
): boolean {
  const key = `${mixin}|${classPath}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  if (seen.has(key)) return false;
  seen.add(key);

  const file = classFileOf(classPath, sources);
  if (!existsSync(file)) return false;
  const source = readFileSync(file, "utf8");
  const exprs = extendsExpressions(source);
  if (exprs.length === 0) return false;
  const wanted = new RegExp(`\\b${mixin}\\b`);
  for (const expr of exprs) {
    if (wanted.test(expr)) {
      cache.set(key, true);
      return true;
    }
  }
  for (const expr of exprs) {
    for (const id of new Set(expr.match(/[A-Za-z_$][\w$]*/g) ?? [])) {
      const base = importedClassPath(source, id, file, sources);
      if (base && composesMixin(base, mixin, sources, cache, seen)) {
        cache.set(key, true);
        return true;
      }
    }
  }
  cache.set(key, false);
  return false;
}

/**
 * Every `class X extends <expr>` expression in a file, with same-file
 * `const` bases inlined — so `const XBase = AMixin(B); class X extends
 * XBase {}` reads as `AMixin(B)` and not as the bare word `XBase`.
 *
 * Exported for the gate's own tests; the inlining is transitive (a base
 * built from another base) and cycle-guarded by the visited set.
 */
export function extendsExpressions(source: string): string[] {
  const out = [...source.matchAll(/\bclass\s+\w+\s+extends\s+([^{]+)\{/g)]
    .map((m) => (m[1] ?? "").trim())
    .filter(Boolean);
  const visited = new Set<string>();
  // Breadth-first over identifiers: anything named in an expression that
  // is bound by a same-file `const` contributes that binding's text too.
  for (let i = 0; i < out.length; i++) {
    for (const id of new Set(out[i]?.match(/[A-Za-z_$][\w$]*/g) ?? [])) {
      if (visited.has(id)) continue;
      visited.add(id);
      const bound = constBinding(source, id);
      if (bound) out.push(bound);
    }
  }
  return out;
}

/**
 * The initializer text of a same-file `const <id> = …;`, or null.
 *
 * Scanned by balancing brackets to the terminating `;` rather than by
 * regex, because every real base stack spans dozens of lines and nests
 * parentheses to a depth of twenty.
 */
function constBinding(source: string, id: string): string | null {
  const decl = new RegExp(`(?:^|[\\n;])\\s*(?:export\\s+)?const\\s+${id}\\s*(?::[^=]+)?=`, "m");
  const at = decl.exec(source);
  if (!at) return null;
  let i = at.index + at[0].length;
  let depth = 0;
  const start = i;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (ch === ";" && depth <= 0) break;
  }
  const text = source.slice(start, i).trim();
  return text.length ? text : null;
}

/** The class path a source file backs — the inverse of `classFileOf`. */
export function classPathOfFile(
  file: string,
  sources: readonly PackSource[],
  mudDir: string = MUD,
): string | null {
  for (const pack of sources) {
    if (file.startsWith(pack.srcDir + "/")) {
      const rel = relative(pack.srcDir, file).replace(/\.ts$/, "");
      return `${pack.roots[0]}/${rel}`;
    }
  }
  if (file.startsWith(mudDir + "/")) {
    return "/" + relative(mudDir, file).replace(/\.ts$/, "");
  }
  return null;
}

/** Resolve an imported identifier to the class path its module backs. */
function importedClassPath(
  source: string,
  id: string,
  file: string,
  sources: readonly PackSource[],
): string | null {
  const re = /import\s+([^;]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const clause = m[1] ?? "";
    const spec = m[2] ?? "";
    if (!new RegExp(`\\b${id}\\b`).test(clause)) continue;
    if (spec.startsWith("@saxonberg/server/mud/")) {
      return "/" + spec.slice("@saxonberg/server/mud/".length);
    }
    if (spec.startsWith(".")) {
      return classPathOfFile(resolve(dirname(file), spec) + ".ts", sources);
    }
    return null;
  }
  return null;
}

/** Every `.ts` module under a pack's `src/`, `__tests__` excluded. */
export function packSrcFiles(srcDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "__tests__" || entry === "node_modules") continue;
        walk(full);
      } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
        out.push(full);
      }
    }
  };
  walk(srcDir);
  return out;
}

/** One `static _mixinName` declaration, and where it was written. */
export interface MixinDeclaration {
  /** The declared name (`ShipmentDeskMixin`), or `''` when unresolvable. */
  name: string;
  /** The verbatim initializer text, for reporting an unresolvable one. */
  expr: string;
  /** Absolute file it was declared in. */
  file: string;
  /** The pack id that ships it, or `'kernel'`. */
  owner: string;
  /** Its `static _mixinRefusal`, when the declaration carries one. */
  refusal?: string;
}

/**
 * Every `static _mixinName` declared in the kernel tree and in every
 * pack's `src/` — the flat mixin namespace, read from its one
 * declaration site.
 *
 * ⭐ This is the build-time twin of `MixinApi.registerComposedMixins`,
 * which fills the same namespace at runtime by walking `queryMixins`
 * over each class a pack's rows name. They agree because both read
 * `_mixinName`; they differ in reach, and deliberately — the runtime
 * knows only what an installed pack composes, while this sees every
 * declaration on disk, which is what lets `lint:mixin-names` refuse a
 * collision before anybody boots into it.
 *
 * ⚠ A name bound through a module const (`static _mixinName =
 * WORKING_MIXIN`) is resolved through that same file's `const WORKING_MIXIN
 * = '…'`, because most pack mixins are written that way. A name that
 * resolves to neither a literal nor a same-file const is skipped rather
 * than guessed at.
 */
export function declaredMixins(
  contentDir: string = CONTENT,
  mudDir: string = MUD,
): MixinDeclaration[] {
  const out: MixinDeclaration[] = [];
  const scan = (file: string, owner: string): void => {
    const source = readFileSync(file, "utf8");
    if (!source.includes("_mixinName")) return;
    for (const m of source.matchAll(
      // ⚠ Anchored at line start (after indentation) so a TSDoc line
      // DISCUSSING the static — `* \`static _mixinName = …\`` — is not
      // read as declaring one. One such comment in `lib/slot/Attired.ts`
      // was enough to fail the gate on a file that declares it correctly
      // three lines further down.
      /^[ \t]*static\s+(?:override\s+)?_mixinName\s*(?::[^=]+)?=\s*([^;\n]+)/gm,
    )) {
      const expr = (m[1] ?? "").trim();
      const name = literalOrConst(expr, source);
      // ⚠ An expression this reader cannot resolve is REPORTED, never
      // skipped. Skipping is how a census undercounts in silence, and
      // this one is load-bearing twice over: the runtime's own reader
      // (`PackLogic.registerPackMixins`) resolves the same three forms,
      // so a fourth form would be a mixin nothing could name.
      out.push({ name: name ?? "", expr, file, owner, refusal: refusalNear(source) });
    }
  };
  for (const file of tsFilesUnder(mudDir)) scan(file, "kernel");
  for (const pack of packSources(contentDir)) {
    for (const file of packSrcFiles(pack.srcDir)) scan(file, pack.id);
  }
  return out;
}

/**
 * A quoted literal, the value of a same-file `const NAME = '…'`, or a
 * `Mixins.<Key>` member read off the kernel registry.
 *
 * ⚠ All three forms are in the tree and the third is the most common in
 * the kernel (`static _mixinName: string = Mixins.Registrar`). Reading
 * only literals saw 165 of 167 kernel mixins and called the other two
 * absent — the kind of quiet undercount a census gate must not ship.
 */
function literalOrConst(expr: string, source: string): string | null {
  const lit = /^['"`]([^'"`]+)['"`]/.exec(expr);
  if (lit) return lit[1] ?? null;
  const member = /^Mixins\.([A-Za-z_$][\w$]*)/.exec(expr);
  if (member) return kernelMixins()[member[1] ?? ""] ?? null;
  const id = /^[A-Za-z_$][\w$]*/.exec(expr);
  if (!id) return null;
  const bound = new RegExp(
    `const\\s+${id[0]}\\s*(?::[^=]+)?=\\s*['"\`]([^'"\`]+)['"\`]`,
  ).exec(source);
  return bound?.[1] ?? null;
}

let KERNEL_MIXINS: Record<string, string> | null = null;

/**
 * The kernel's `Mixins` const, read as text from `lib/mixin.ts`.
 *
 * Textual rather than imported for the reason the whole file is: a lint
 * script does not import the mudlib, whose module graph drags in the
 * runtime it is meant to be checking from outside.
 */
function kernelMixins(): Record<string, string> {
  if (KERNEL_MIXINS) return KERNEL_MIXINS;
  const out: Record<string, string> = {};
  const file = join(MUD, "lib", "mixin.ts");
  if (existsSync(file)) {
    const body = /export const Mixins = \{([\s\S]*?)\n\} as const;/.exec(
      readFileSync(file, "utf8"),
    );
    for (const m of (body?.[1] ?? "").matchAll(
      /^\s*([A-Za-z_$][\w$]*)\s*:\s*['"]([^'"]+)['"]/gm,
    )) {
      out[m[1] ?? ""] = m[2] ?? "";
    }
  }
  KERNEL_MIXINS = out;
  return out;
}

/** The file's `static _mixinRefusal`, if it declares one. */
function refusalNear(source: string): string | undefined {
  // ⚠ Matched to the SAME quote character it opened with. A class
  // matching any quote cut `"{} isn't a shipping desk"` at the
  // apostrophe and registered `{} isn` — a refusal sentence truncated
  // mid-word, in the one place a truncation reads as deliberate prose.
  const m = /^[ \t]*static\s+(?:override\s+)?_mixinRefusal\s*(?::[^=]+)?=\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/m.exec(
    source,
  );
  return m?.[2]?.replace(/\\(.)/g, "$1");
}

/** Every `.ts` module under a directory, `__tests__` excluded. */
function tsFilesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "__tests__" || entry === "node_modules") continue;
        walk(full);
      } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Template rows, and the EFFECTIVE row a gate must reason about
// ──────────────────────────────────────────────────────────────────────

/** One authored template file, as it sits on disk. */
export interface TemplateRow {
  /** Absolute file path. */
  file: string;
  /** The template path the file seeds. */
  path: string;
  /** The pack id, or `'kernel'` for a seed under `src/mud/seeds`. */
  pack: string;
  /** The parsed YAML, exactly as authored. */
  raw: Record<string, unknown>;
}

/** The row a clone actually sees: the parent chain folded in. */
export interface EffectiveRow {
  class: string | null;
  hydratorClass: string | null;
  data: Record<string, unknown>;
  /** Parent paths, nearest first. */
  chain: string[];
  /** Why the chain could not be resolved, when it could not. */
  error: string | null;
}

/**
 * The content subdirectories that are NOT template rows — the installer's
 * `NON_TEMPLATE_DIRS`, mirrored the way this module already mirrors
 * `namespaceRootsOf`: derived from `DocumentKinds.ts` rather than
 * enumerated, so a new yaml document kind does not silently start
 * reading as a malformed template.
 */
export function nonTemplateDirs(serverSrc: string = SERVER_SRC): Set<string> {
  const out = new Set(["settings", "subjects", "descriptor-banks", "quantity"]);
  const file = join(serverSrc, "mud", "lib", "document", "DocumentKinds.ts");
  if (existsSync(file)) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(
      /contentDir:\s*['"]([^'"]+)['"],\s*ext:\s*['"]yaml['"]/g,
    )) {
      out.add(m[1]!);
    }
  }
  return out;
}

/**
 * Is this content-relative path a TEMPLATE row? The installer's rule:
 * every `.yaml` outside the declared kind dirs — and `cmd/` is skipped
 * at ANY depth, because a command view has no `class:` and is the
 * `command-view` document kind.
 */
export function isTemplateRelPath(rel: string, kindDirs: ReadonlySet<string>): boolean {
  const parts = rel.split("/");
  if (parts.includes("cmd")) return false;
  return !(parts.length > 1 && kindDirs.has(parts[0]!));
}

function walkYamlFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.startsWith(".") || e === "node_modules") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walkYamlFiles(p, out);
    else if (e.endsWith(".yaml")) out.push(p);
  }
  return out;
}

/**
 * ⭐⭐ Every authored template row in the repo, keyed by template path —
 * **the lint family's one reader.**
 *
 * Fifteen gates grew their own local YAML walk, and every one of them
 * selected rows by `raw.class`. Under template inheritance a child row
 * states no class, so each of them would skip it **silently** — a gate
 * that answers "nothing to check" is the failure class the derived
 * family exists to prevent, and it is indistinguishable from a pass.
 */
export function templateRows(
  serverSrc: string = SERVER_SRC,
  contentDir: string = CONTENT,
): Map<string, TemplateRow> {
  const rows = new Map<string, TemplateRow>();
  const kindDirs = nonTemplateDirs(serverSrc);
  const add = (file: string, root: string, pack: string): void => {
    const rel = relative(root, file).split("\\").join("/");
    if (!isTemplateRelPath(rel, kindDirs)) return;
    const path = "/" + rel.replace(/\.yaml$/, "");
    let raw: unknown;
    try {
      raw = YAML.parse(readFileSync(file, "utf8"));
    } catch {
      return;
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    rows.set(path, { file, path, pack, raw: raw as Record<string, unknown> });
  };
  const seeds = join(serverSrc, "mud", "seeds");
  for (const f of walkYamlFiles(seeds)) add(f, seeds, "kernel");
  if (existsSync(contentDir)) {
    for (const pack of readdirSync(contentDir)) {
      const root = join(contentDir, pack, "content");
      if (!existsSync(root)) continue;
      for (const f of walkYamlFiles(root)) add(f, root, pack);
    }
  }
  return rows;
}

/** How deep an `extends:` chain may go — `Template`'s own cap. */
export const TEMPLATE_CHAIN_DEPTH_CAP = 32;

/**
 * The effective row at `path`: the nearest stated `class` /
 * `hydratorClass` along the chain, and the merged `data`.
 *
 * ⚠ **The merge here is SHALLOW** — a child key wins whole, and a list
 * replaces rather than merging by entry. That is deliberate and the
 * limit is real: a gate that reasons about list ENTRIES (the props
 * census, the identity rules) reads `raw` and says so. Mirroring the
 * runtime's per-field `inherit` algebra would mean a second
 * implementation of it in a script, which is how two answers to one
 * question get shipped.
 */
export function effectiveRow(
  path: string,
  rows: ReadonlyMap<string, TemplateRow>,
  rules?: (classPath: string) => Map<string, FieldRule>,
): EffectiveRow {
  const chain: string[] = [];
  const stack: Array<Record<string, unknown>> = [];
  const seen = new Set<string>([path]);
  let cursor = rows.get(path);
  if (!cursor) {
    return { class: null, hydratorClass: null, data: {}, chain, error: `no row at ${path}` };
  }
  stack.push(cursor.raw);
  for (;;) {
    const parent = cursor!.raw.extends;
    if (typeof parent !== "string" || parent.length === 0) break;
    if (seen.has(parent)) {
      return { class: null, hydratorClass: null, data: {}, chain, error: `cyclic extends chain through '${parent}'` };
    }
    if (chain.length >= TEMPLATE_CHAIN_DEPTH_CAP) {
      return { class: null, hydratorClass: null, data: {}, chain, error: `extends chain deeper than ${TEMPLATE_CHAIN_DEPTH_CAP}` };
    }
    const next = rows.get(parent);
    if (!next) {
      return { class: null, hydratorClass: null, data: {}, chain, error: `extends '${parent}', which no row ships` };
    }
    seen.add(parent);
    chain.push(parent);
    stack.push(next.raw);
    cursor = next;
  }
  let cls: string | null = null;
  let hyd: string | null = null;
  // Ancestor-first, so the nearest statement overwrites.
  for (let i = stack.length - 1; i >= 0; i--) {
    const r = stack[i]!;
    if (typeof r.class === "string" && r.class.length > 0) cls = r.class;
    if (typeof r.hydratorClass === "string" && r.hydratorClass.length > 0) {
      hyd = r.hydratorClass;
    }
  }
  // ⚠⚠ The merge respects each field's declared `inherit` rule, and the
  // one that MATTERS here is `never`: every `Biome` field declares it,
  // because biome resolves per read by its own walk. A shallow merge
  // that ignored it handed `lint:envelope` a child biome carrying its
  // ancestor's `_defaultTemperature` and the gate reported a decree
  // nobody had authored. A script that models inheritance has to model
  // the rules, or it invents findings.
  const rule = cls && rules ? rules(cls) : new Map<string, FieldRule>();
  let data: Record<string, unknown> = {};
  for (let i = stack.length - 1; i >= 0; i--) {
    const r = stack[i]!;
    const d = r.data;
    const own =
      d && typeof d === "object" && !Array.isArray(d)
        ? (d as Record<string, unknown>)
        : {};
    const next: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(data), ...Object.keys(own)])) {
      const how = rule.get(key)?.inherit ?? "replace";
      if (how === "never") {
        if (key in own) next[key] = own[key];
        continue;
      }
      if (!(key in own)) {
        next[key] = data[key];
        continue;
      }
      if (!(key in data)) {
        next[key] = own[key];
        continue;
      }
      const pv = data[key];
      const cv = own[key];
      if (
        how === "by-key" &&
        pv && typeof pv === "object" && !Array.isArray(pv) &&
        cv && typeof cv === "object" && !Array.isArray(cv)
      ) {
        next[key] = { ...(pv as object), ...(cv as object) };
        continue;
      }
      // ⚠ `by-entry` is NOT modelled entry-by-entry here — the child's
      // list replaces. A gate that reasons about list ENTRIES reads
      // `raw`, and says so at its own call site.
      next[key] = cv;
    }
    data = next;
  }
  return { class: cls, hydratorClass: hyd, data, chain, error: null };
}

/**
 * Every field name the class at `classPath` declares — its own
 * `static fieldMeta` keys plus every base class's and every mixin's,
 * followed through the same `extends`-expression walk
 * {@link composesMixin} uses.
 *
 * ⚠ Source-level, so it is a LOWER bound: a declaration written in a
 * shape this reader does not know reads as absent. Its one consumer
 * (the orphan-data-key census) is therefore census-then-ratchet, never
 * a bare assertion.
 */
export function declaredFields(
  classPath: string,
  sources: readonly PackSource[],
  cache: Map<string, Set<string>> = new Map(),
  seen: Set<string> = new Set(),
): Set<string> {
  const cached = cache.get(classPath);
  if (cached) return cached;
  if (seen.has(classPath)) return new Set();
  seen.add(classPath);

  const out = new Set<string>();
  const file = classFileOf(classPath, sources);
  if (!existsSync(file)) return out;
  const source = readFileSync(file, "utf8");
  for (const key of fieldMetaKeys(source)) out.add(key);
  for (const expr of extendsExpressions(source)) {
    for (const id of new Set(expr.match(/[A-Za-z_$][\w$]*/g) ?? [])) {
      const base = importedClassPath(source, id, file, sources);
      if (!base) continue;
      for (const key of declaredFields(base, sources, cache, seen)) out.add(key);
    }
  }
  cache.set(classPath, out);
  return out;
}

/** What a gate needs to know about one declared field. */
export interface FieldRule {
  /** The merge rule the field declares, or `undefined` for the default. */
  inherit?: 'replace' | 'by-key' | 'by-entry' | 'never';
}

/**
 * The declared fields of the class at `classPath`, WITH their merge
 * rules — its own `static fieldMeta` plus every base's and every
 * mixin's, followed through the same walk {@link composesMixin} uses.
 */
export function declaredFieldRules(
  classPath: string,
  sources: readonly PackSource[],
  cache: Map<string, Map<string, FieldRule>> = new Map(),
  seen: Set<string> = new Set(),
): Map<string, FieldRule> {
  const cached = cache.get(classPath);
  if (cached) return cached;
  if (seen.has(classPath)) return new Map();
  seen.add(classPath);

  const out = new Map<string, FieldRule>();
  const file = classFileOf(classPath, sources);
  if (!existsSync(file)) return out;
  const source = readFileSync(file, "utf8");
  for (const [key, rule] of fieldMetaEntries(source)) out.set(key, rule);
  for (const expr of extendsExpressions(source)) {
    for (const id of new Set(expr.match(/[A-Za-z_$][\w$]*/g) ?? [])) {
      const base = importedClassPath(source, id, file, sources);
      if (!base) continue;
      for (const [k, v] of declaredFieldRules(base, sources, cache, seen)) {
        if (!out.has(k)) out.set(k, v);
      }
    }
  }
  cache.set(classPath, out);
  return out;
}

/** The top-level keys of every `static fieldMeta = { … }` in a file. */
export function fieldMetaKeys(source: string): string[] {
  return [...fieldMetaEntries(source).keys()];
}

/** Every declared field in a file, with the `inherit` rule it states. */
export function fieldMetaEntries(source: string): Map<string, FieldRule> {
  const out = new Map<string, FieldRule>();
  const decl = /static\s+(?:readonly\s+)?fieldMeta\s*(?::[^=]+)?=\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(source))) {
    let i = decl.lastIndex;
    let depth = 1;
    const start = i;
    for (; i < source.length && depth > 0; i++) {
      const ch = source[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    const body = source.slice(start, i - 1);
    // Depth-1 keys only: a nested entry's own properties are not fields.
    let d = 0;
    let line = "";
    for (const ch of body) {
      if (ch === "{" || ch === "[" || ch === "(") d++;
      else if (ch === "}" || ch === "]" || ch === ")") d--;
      if (d === 0) line += ch;
      else if (d === 1 && (ch === "{" || ch === "[" || ch === "(")) line += ch;
    }
    for (const km of line.matchAll(
      /(?:^|[,{])\s*(?:\/\/[^\n]*\n\s*)*(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:/g,
    )) {
      out.set((km[1] ?? km[2])!, {});
    }
    // The `inherit:` rules, read off the ORIGINAL body (the depth-1
    // flattening above deliberately drops each entry's own properties).
    // ⚠ Position-independent on purpose: an entry preceded by a COMMENT
    // line is neither at the start nor after a `,`/`{`, and anchoring on
    // those read `Biome._defaultTemperature` as declaring no rule at all
    // — which handed `lint:envelope` a false finding.
    for (const im of body.matchAll(
      /(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))\s*:\s*\{[^{}]*\binherit:\s*['"]([a-z-]+)['"]/g,
    )) {
      const key = (im[1] ?? im[2])!;
      out.set(key, { inherit: im[3] as FieldRule['inherit'] });
    }
  }
  return out;
}

/**
 * The index a gate needs to see an EFFECTIVE row: every template row by
 * path, plus the file → path map that lets a gate with its own walk look
 * one up by the file it just read.
 */
export interface InheritanceIndex {
  rows: Map<string, TemplateRow>;
  byFile: Map<string, string>;
  /** The merge rules a class declares — memoized across the gate run. */
  rules: (classPath: string) => Map<string, FieldRule>;
}

/** Build the index once per gate run. */
export function inheritanceIndex(
  serverSrc: string = SERVER_SRC,
  contentDir: string = CONTENT,
): InheritanceIndex {
  const rows = templateRows(serverSrc, contentDir);
  const byFile = new Map<string, string>();
  for (const [path, row] of rows) byFile.set(row.file, path);
  let sources: PackSource[] | null = null;
  const cache = new Map<string, Map<string, FieldRule>>();
  const rules = (classPath: string): Map<string, FieldRule> => {
    sources ??= packSources(contentDir);
    return declaredFieldRules(classPath, sources, cache);
  };
  return { rows, byFile, rules };
}

/**
 * ⭐⭐ The one-line shim every class-selecting gate applies right after
 * it parses a row: the doc it goes on to reason about, with the parent
 * chain folded into `class`, `hydratorClass` and `data`.
 *
 * A file the index does not know (a kind dir's yaml — an emote, a
 * recipe, a command view) and a row with no parent both pass through
 * untouched, so the shim costs nothing where inheritance is not in play.
 *
 * ⚠ Without it a gate selecting on `raw.class` **skips a class-less
 * child silently**, which reads exactly like a pass. Fifteen gates had
 * that shape; this is what fixed all fifteen the same way.
 */
export function effectiveDoc(
  file: string,
  doc: Record<string, unknown>,
  idx: InheritanceIndex,
): Record<string, unknown> {
  if (typeof doc.extends !== 'string') return doc;
  const path = idx.byFile.get(file);
  if (path === undefined) return doc;
  const eff = effectiveRow(path, idx.rows, idx.rules);
  if (eff.error) return doc;
  const out: Record<string, unknown> = { ...doc, data: eff.data };
  if (eff.class !== null) out.class = eff.class;
  if (eff.hydratorClass !== null) out.hydratorClass = eff.hydratorClass;
  return out;
}
