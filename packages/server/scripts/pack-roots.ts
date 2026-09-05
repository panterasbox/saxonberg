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
  const exprs = [...source.matchAll(/\bclass\s+\w+\s+extends\s+([^{]+)\{/g)]
    .map((m) => m[1] ?? "")
    .filter(Boolean);
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
  const re = /import\s+([^;]*?)\s+from\s+[\'"]([^\'"]+)[\'"]/g;
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
