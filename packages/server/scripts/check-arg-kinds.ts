/**
 * check-arg-kinds — the affordance-honesty gate.
 *
 * ⚠ **Why this exists.** The affordance resolver is **syntactic by
 * design**: a verb is reported `enabled` when its operand binds and its
 * field validators pass. A verb whose real refusal lives in its
 * *controller* therefore reports `enabled` against targets it cannot
 * act on — the menu says yes and the verb then says no. Measured when
 * this gate was written: `attack`, `drink`, `talk` and `cast` were all
 * offered on a room.
 *
 * The client cannot filter these out. It is forbidden from re-deriving
 * semantics, so a wrong figure on the wire is a wrong figure on screen.
 * That makes an unvalidated object-typed arg a *correctness* problem,
 * not a tidiness one.
 *
 * ## What counts
 *
 * Every `type: object` / `type: objects` field — positional args and
 * options alike, at verb level and inside every subcommand — across
 * `cmd/**` and `domain/**`. Each is classified:
 *
 *   - **validated** — carries at least one *kind* validator: one that
 *     constrains WHAT THE TARGET IS. `mustBeContainer` counts.
 *     `mustBeVisible` and `canReach` do NOT: they constrain the
 *     viewer's relationship to the target, and every object arg wants
 *     them, so counting them would mark the whole tree validated while
 *     changing nothing about which verbs are offered.
 *   - **declared** — carries `targetKind: any`, the marker for a
 *     genuinely unconstrained arg (a wizard's `destruct <anything>`).
 *     Declared at the site, the way `@hook` is, so the gate can tell
 *     *deliberately universal* from *forgotten*.
 *   - **unaccounted** — neither. The thing this gate exists to count.
 *
 * ⭐ **The relational/kind split is the whole judgement in this script.**
 * Get it wrong in the permissive direction and the gate reports success
 * over an unchanged tree.
 *
 * ## Usage
 *
 *   pnpm lint:arg-kinds            report (always exit 0)
 *   pnpm lint:arg-kinds --lint     CI gate (exit 1 on any unaccounted)
 *   pnpm lint:arg-kinds --by-file  group the report by spec
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";
import { parse as parseYaml } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const MUD_ROOT = join(here, "..", "src", "mud");
const ROOTS = [join(MUD_ROOT, "cmd"), join(MUD_ROOT, "domain")];

/**
 * Validators that constrain the viewer's RELATIONSHIP to a target
 * rather than what the target IS.
 *
 * ⚠ These deliberately do not count as kind validators. They are near-
 * universal on object args, so treating them as sufficient would mark
 * most of the tree "validated" while leaving every menu exactly as
 * wrong as it was.
 */
const RELATIONAL_VALIDATORS = new Set([
  "mustBeVisible",
  "canReach",
  "mustBeInLocation",
  "mustBeInInventory",
  "mustBeHeld",
  "notEmpty",
]);

interface FieldRecord {
  file: string;
  verb: string;
  scope: string;
  name: string;
  type: string;
  kindValidators: string[];
  relationalValidators: string[];
  targetKindAny: boolean;
}

function yamlFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__") continue;
      yamlFiles(full, out);
    } else if (entry.endsWith(".yaml") && entry !== "command.schema.json") {
      out.push(full);
    }
  }
  return out;
}

function leafName(spec: string): string {
  const slash = spec.lastIndexOf("/");
  return slash === -1 ? spec : spec.slice(slash + 1);
}

/** Classify one declared field, if it is object-typed. */
function recordField(
  file: string,
  verb: string,
  scope: string,
  name: string,
  def: Record<string, unknown>,
  out: FieldRecord[],
): void {
  const type = typeof def.type === "string" ? def.type : "";
  if (type !== "object" && type !== "objects") return;

  const specs = Array.isArray(def.validators)
    ? (def.validators as unknown[]).filter(
        (v): v is string => typeof v === "string",
      )
    : [];
  const kindValidators: string[] = [];
  const relationalValidators: string[] = [];
  for (const spec of specs) {
    const leaf = leafName(spec);
    if (RELATIONAL_VALIDATORS.has(leaf)) relationalValidators.push(leaf);
    else kindValidators.push(leaf);
  }

  out.push({
    file,
    verb,
    scope,
    name,
    type,
    kindValidators,
    relationalValidators,
    targetKindAny: def.targetKind === "any",
  });
}

function collectFrom(file: string): FieldRecord[] {
  const out: FieldRecord[] = [];
  let view: Record<string, unknown>;
  try {
    view = parseYaml(readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return out;
  }
  if (!view || typeof view !== "object") return out;

  const rel = relative(MUD_ROOT, file).split("\\").join("/");
  const verbs = Array.isArray(view.verbs) ? (view.verbs as string[]) : [];
  const verb = verbs[0] ?? leafName(rel).replace(/\.yaml$/, "");

  const scan = (
    scope: string,
    args: unknown,
    options: unknown,
  ): void => {
    if (Array.isArray(args)) {
      for (const a of args as Record<string, unknown>[]) {
        if (a && typeof a.name === "string") {
          recordField(rel, verb, scope, a.name, a, out);
        }
      }
    }
    if (options && typeof options === "object") {
      for (const [name, def] of Object.entries(
        options as Record<string, Record<string, unknown>>,
      )) {
        if (def && typeof def === "object") {
          recordField(rel, verb, scope, `--${name}`, def, out);
        }
      }
    }
  };

  scan("verb", view.args, view.options);
  if (view.subcommands && typeof view.subcommands === "object") {
    for (const [sub, def] of Object.entries(
      view.subcommands as Record<string, Record<string, unknown>>,
    )) {
      if (def && typeof def === "object") scan(sub, def.args, def.options);
    }
  }
  return out;
}

function main(): void {
  const lint = process.argv.includes("--lint");
  const byFile = process.argv.includes("--by-file");

  const all: FieldRecord[] = [];
  for (const root of ROOTS) {
    for (const file of yamlFiles(root)) all.push(...collectFrom(file));
  }

  const validated = all.filter((f) => f.kindValidators.length > 0);
  const declared = all.filter(
    (f) => f.kindValidators.length === 0 && f.targetKindAny,
  );
  const unaccounted = all.filter(
    (f) => f.kindValidators.length === 0 && !f.targetKindAny,
  );

  console.log(
    `check-arg-kinds: ${all.length} object-typed args — ` +
      `${validated.length} validated, ${declared.length} declared ` +
      `targetKind:any, ${unaccounted.length} unaccounted`,
  );

  if (unaccounted.length > 0) {
    if (byFile) {
      const groups = new Map<string, FieldRecord[]>();
      for (const f of unaccounted) {
        const list = groups.get(f.file) ?? [];
        list.push(f);
        groups.set(f.file, list);
      }
      console.log(`\nunaccounted, by spec (${groups.size} specs):`);
      for (const [file, fields] of [...groups].sort()) {
        console.log(`\n  ${file}`);
        for (const f of fields) {
          const rel =
            f.relationalValidators.length > 0
              ? `  [relational: ${f.relationalValidators.join(", ")}]`
              : "";
          console.log(`    ${f.scope}.${f.name} (${f.type})${rel}`);
        }
      }
    } else {
      // Category totals first — the sweep is planned per category, and
      // a flat list of 88 is not a plan.
      const byCategory = new Map<string, number>();
      for (const f of unaccounted) {
        const cat = f.file.split("/").slice(0, 2).join("/");
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
      }
      console.log(`\nunaccounted by category:`);
      for (const [cat, n] of [...byCategory].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${String(n).padStart(3)}  ${cat}`);
      }
    }
  }

  if (lint && unaccounted.length > 0) {
    console.error(
      `\ncheck-arg-kinds: FAILED — ${unaccounted.length} object-typed ` +
        `arg(s) neither carry a kind validator nor declare targetKind: any.`,
    );
    process.exit(1);
  }
}

if (process.argv[1]?.includes("check-arg-kinds")) {
  main();
}
