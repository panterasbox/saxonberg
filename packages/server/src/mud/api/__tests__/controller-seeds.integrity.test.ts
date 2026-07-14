/**
 * controller-seeds.integrity — every controller a command YAML names
 * must have a seed template on disk.
 *
 * Command dispatch clones a fresh controller per execution via
 * `StuffApi.clone(controllerTemplatePath(controllerName))` (see
 * `CommandGiver._executeOne`). That clone reads a Template out of the
 * `domain` collection, which `SeederManager` populates from
 * `mud/seeds/**` — one YAML file per template path. A `controller:`
 * field in a command spec with no matching seed YAML therefore throws
 * "Template not found" the first time the verb is dispatched on a
 * fresh DB. It only "works" on a long-lived DB that happens to have
 * accumulated the template some other way, which is exactly the trap:
 * the bug is invisible until a clean deploy.
 *
 * This guard makes the omission a test failure instead. Two homes:
 *   - **Engine verbs** — spec under `cmd/<category>/`, controller
 *     referenced as `<category>/<Name>Controller`, seeded at
 *     `mud/seeds/obj/command/<category>/<Name>Controller.yaml` with
 *     `class: /obj/command/<category>/<Name>Controller`.
 *   - **Domain-local verbs** — spec under
 *     `domain/<sphere>/<locality>/cmd/` (separate from its controller,
 *     which lives in `.../command/`), referenced by the `domain/`-prefixed
 *     full path, seeded at
 *     `mud/seeds/domain/<sphere>/<locality>/command/<Name>Controller.yaml`
 *     with `class: /domain/<sphere>/<locality>/command/<Name>Controller`.
 * Both resolution shapes mirror `controllerTemplatePath` in CommandGiver
 * and the `domain/`-key resolution in CommandLogic.
 *
 * Controllers are referenced at two levels — verb-level
 * (`controller:` at the spec root) and per-subcommand
 * (`subcommands.<name>.controller:`). Both are dispatch targets, so the
 * walk collects every `controller` string key at any depth.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
// src/mud/api/__tests__ -> src/mud
const MUD_ROOT = join(here, "..", "..");
const CMD_ROOT = join(MUD_ROOT, "cmd");
const DOMAIN_ROOT = join(MUD_ROOT, "domain");
const SEEDS_ROOT = join(MUD_ROOT, "seeds");
const SEEDS_COMMAND_ROOT = join(SEEDS_ROOT, "obj", "command");

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

/** Where the seed for a `controller:` ref lives on disk. */
function seedPathFor(ref: string): string {
  return ref.startsWith("domain/")
    ? join(SEEDS_ROOT, `${ref}.yaml`)
    : join(SEEDS_COMMAND_ROOT, `${ref}.yaml`);
}

/** The class path that seed must declare. */
function expectedClassFor(ref: string): string {
  return ref.startsWith("domain/") ? `/${ref}` : `/obj/command/${ref}`;
}

/** Recursively collect every `controller` string value at any depth. */
function collectControllers(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectControllers(item, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "controller" && typeof value === "string") {
        out.add(value);
      } else {
        collectControllers(value, out);
      }
    }
  }
}

describe("controller-seed integrity", () => {
  const specFiles = collectSpecFiles();

  const refs = new Set<string>();
  for (const file of specFiles) {
    const parsed = YAML.parse(readFileSync(file, "utf-8"));
    collectControllers(parsed, refs);
  }

  it("finds controller references to validate", () => {
    // Sanity floor: if the walk collects nothing the test would pass
    // vacuously, hiding a path-resolution regression in this very file.
    expect(refs.size).toBeGreaterThan(50);
  });

  it("covers the domain-local command bundles", () => {
    // Guard the guard: the domain scan must actually pick up the
    // content-local controllers (else this test silently stops covering
    // the pattern it was extended for).
    const domainRefs = [...refs].filter((r) => r.startsWith("domain/"));
    expect(domainRefs.length).toBeGreaterThan(0);
  });

  it("every command controller has a seed template on disk", () => {
    const missing: string[] = [];
    for (const ref of refs) {
      if (!existsSync(seedPathFor(ref))) missing.push(ref);
    }
    expect(
      missing,
      `command controllers missing a seed template (dispatch would throw ` +
        `"Template not found" on a fresh DB):\n  ${missing.sort().join("\n  ")}`
    ).toEqual([]);
  });

  it("every controller seed declares the matching class path", () => {
    const mismatched: string[] = [];
    for (const ref of refs) {
      const seed = seedPathFor(ref);
      if (!existsSync(seed)) continue; // covered by the test above
      const parsed = YAML.parse(readFileSync(seed, "utf-8")) as {
        class?: string;
      };
      const expected = expectedClassFor(ref);
      if (parsed?.class !== expected) {
        mismatched.push(`${ref}: class=${parsed?.class ?? "<none>"}`);
      }
    }
    expect(
      mismatched,
      `controller seeds whose 'class' does not match their path:\n  ` +
        mismatched.sort().join("\n  ")
    ).toEqual([]);
  });
});
