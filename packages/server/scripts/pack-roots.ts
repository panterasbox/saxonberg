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
import { dirname, join } from "path";
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
