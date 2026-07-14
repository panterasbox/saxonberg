/**
 * controller-seeds.integrity — every controller a command YAML names
 * must have a seed template on disk.
 *
 * Command dispatch clones a fresh controller per execution via
 * `StuffApi.clone(<resolved controller template path>)` (see
 * `CommandGiver._executeOne`). That clone reads a Template out of the
 * `domain` collection, which `SeederManager` populates from
 * `mud/seeds/**` — one YAML file per template path. A `controller:`
 * field in a command spec with no matching seed YAML therefore throws
 * "Template not found" the first time the verb is dispatched on a
 * fresh DB. It only "works" on a long-lived DB that happens to have
 * accumulated the template some other way, which is exactly the trap:
 * the bug is invisible until a clean deploy.
 *
 * This guard makes the omission a test failure instead. A `controller:`
 * value is a PATH, resolved by the single rule `CommandDefinition`
 * applies (see `resolveController` there):
 *   - starts with `/` → it IS the `/`-rooted mud template path.
 *   - otherwise → resolve relative to the spec file's own directory,
 *     then map to the `/`-rooted mud template path.
 * The resolved template path both names the seed
 * (`mud/seeds/<path>.yaml`) and is the `class:` that seed must declare.
 *
 * Concretely, the two homes shake out as:
 *   - **Engine verbs** — spec under `cmd/<category>/`, controller written
 *     absolute as `/obj/command/<category>/<Name>Controller`, seeded at
 *     `mud/seeds/obj/command/<category>/<Name>Controller.yaml`.
 *   - **Domain-local verbs** — spec under
 *     `domain/<sphere>/<locality>/cmd/`, controller written relative as
 *     `../command/<Name>Controller` (the sibling `.../command/` dir),
 *     resolving to `/domain/<sphere>/<locality>/command/<Name>Controller`,
 *     seeded at
 *     `mud/seeds/domain/<sphere>/<locality>/command/<Name>Controller.yaml`.
 *
 * Controllers are referenced at two levels — verb-level
 * (`controller:` at the spec root) and per-subcommand
 * (`subcommands.<name>.controller:`). Both are dispatch targets, so the
 * walk collects every `controller` string key at any depth. Relative
 * refs are resolved against the spec file they came from, so every ref
 * is tracked together with its source file.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative, resolve as resolvePath, sep } from "path";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
// src/mud/api/__tests__ -> src/mud
const MUD_ROOT = join(here, "..", "..");
const CMD_ROOT = join(MUD_ROOT, "cmd");
const DOMAIN_ROOT = join(MUD_ROOT, "domain");
const SEEDS_ROOT = join(MUD_ROOT, "seeds");

function walkYaml(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      walkYaml(p, out);
    } else if (entry.endsWith(".yaml")) {
      out.push(p);
    }
  }
}

/**
 * Every command spec on disk: all of `cmd/`, plus the domain-local
 * command specs (`domain/<sphere>/<locality>/cmd/*.yaml`) — the same
 * two roots CommandLogic discovers.
 */
function collectSpecFiles(): string[] {
  const specs: string[] = [];
  walkYaml(CMD_ROOT, specs);
  const domainAll: string[] = [];
  try {
    walkYaml(DOMAIN_ROOT, domainAll);
  } catch {
    // No domain tree in this checkout — nothing to add.
  }
  for (const p of domainAll) {
    if (p.split(/[\\/]/).includes("cmd")) specs.push(p);
  }
  return specs;
}

/**
 * Resolve a raw `controller:` value to its `/`-rooted mud template
 * path — byte-for-byte the rule `CommandDefinition.resolveController`
 * applies. Relative refs resolve against the spec file's own directory.
 */
function resolveController(rawController: string, specFilePath: string): string {
  if (rawController.startsWith("/")) return rawController;
  const abs = resolvePath(dirname(specFilePath), rawController);
  return "/" + relative(MUD_ROOT, abs).split(sep).join("/");
}

/** Where the seed for a resolved template path lives on disk. */
function seedPathFor(templatePath: string): string {
  // templatePath is `/`-rooted; strip the leading slash to join under seeds/.
  return join(SEEDS_ROOT, `${templatePath.slice(1)}.yaml`);
}

/**
 * Recursively collect every `controller` string value at any depth,
 * tagged with the spec file it came from (relative refs need it).
 */
function collectControllers(
  node: unknown,
  specFile: string,
  out: Array<{ raw: string; specFile: string }>
): void {
  if (Array.isArray(node)) {
    for (const item of node) collectControllers(item, specFile, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "controller" && typeof value === "string") {
        out.push({ raw: value, specFile });
      } else {
        collectControllers(value, specFile, out);
      }
    }
  }
}

describe("controller-seed integrity", () => {
  const specFiles = collectSpecFiles();

  // Resolve every ref exactly as the engine does, deduped by resolved
  // template path.
  const templatePaths = new Set<string>();
  for (const file of specFiles) {
    const raws: Array<{ raw: string; specFile: string }> = [];
    const parsed = YAML.parse(readFileSync(file, "utf-8"));
    collectControllers(parsed, file, raws);
    for (const { raw, specFile } of raws) {
      templatePaths.add(resolveController(raw, specFile));
    }
  }

  it("finds controller references to validate", () => {
    // Sanity floor: if the walk collects nothing the test would pass
    // vacuously, hiding a path-resolution regression in this very file.
    expect(templatePaths.size).toBeGreaterThan(50);
  });

  it("covers the domain-local command bundles", () => {
    // Guard the guard: the domain scan must actually pick up the
    // content-local controllers (else this test silently stops covering
    // the pattern it was extended for).
    const domainRefs = [...templatePaths].filter((p) =>
      p.startsWith("/domain/")
    );
    expect(domainRefs.length).toBeGreaterThan(0);
  });

  it("every command controller has a seed template on disk", () => {
    const missing: string[] = [];
    for (const p of templatePaths) {
      if (!existsSync(seedPathFor(p))) missing.push(p);
    }
    expect(
      missing,
      `command controllers missing a seed template (dispatch would throw ` +
        `"Template not found" on a fresh DB):\n  ${missing.sort().join("\n  ")}`
    ).toEqual([]);
  });

  it("every controller seed declares the matching class path", () => {
    const mismatched: string[] = [];
    for (const p of templatePaths) {
      const seed = seedPathFor(p);
      if (!existsSync(seed)) continue; // covered by the test above
      const parsed = YAML.parse(readFileSync(seed, "utf-8")) as {
        class?: string;
      };
      // The resolved template path IS the class the seed must declare.
      if (parsed?.class !== p) {
        mismatched.push(`${p}: class=${parsed?.class ?? "<none>"}`);
      }
    }
    expect(
      mismatched,
      `controller seeds whose 'class' does not match their path:\n  ` +
        mismatched.sort().join("\n  ")
    ).toEqual([]);
  });
});
