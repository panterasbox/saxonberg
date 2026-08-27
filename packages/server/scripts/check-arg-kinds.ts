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
 * That makes an undeclared object-typed arg a *correctness* problem,
 * not a tidiness one.
 *
 * ## The rule
 *
 * **Every object-typed slot declares `requires:`.** One rule, one field.
 *
 * ⭐ This script used to hold a hand-maintained list of six validator
 * names — its private opinion about which files constrained *what a
 * target is* versus *the viewer's relationship to it* — and it accepted
 * a bare `targetKind: any` marker as the alternative. Both are gone.
 * The kind lives on the slot now, so the gate reads a declaration
 * instead of guessing from filenames, and a mixin name **resolves or it
 * does not**: the check below is against the live {@link Mixins}
 * registry, which is what makes `requires:` verifiable where
 * `targetKind: any` was an unfalsifiable promise. Three of that
 * marker's fifty uses were wrong, and nothing could have caught them.
 *
 * ## Two tiers, reported separately
 *
 * The two claims hiding in one number, per the affordance & suggestion
 * slate § 4 — the build that preceded this one justified the second
 * with the first's argument:
 *
 *   - **menu** — verb-level object POSITIONALS. What the affordance
 *     resolver can ever see: options are excluded deliberately (`cd
 *     --mql` would otherwise put every shell verb in every object's
 *     menu) and subcommand args structurally (`CommandDefinition.args`
 *     is empty for a subcommanded verb). A wrong declaration here is a
 *     **false figure on a player's screen**.
 *   - **all** — every object-typed field anywhere. `scope:` is a search
 *     hint, not a gate, so any arg reaching a controller should say
 *     what it accepts. A wrong declaration here is dispatch hygiene:
 *     real, but nobody sees it.
 *
 * Both gate. They are reported apart so a future regression says which
 * of the two it broke.
 *
 * ## Usage
 *
 *   pnpm lint:arg-kinds            report (always exit 0)
 *   pnpm lint:arg-kinds --lint     CI gate (exit 1 on any undeclared)
 *   pnpm lint:arg-kinds --by-file  group the report by spec
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";
import { parse as parseYaml } from "yaml";
import { Mixins, MixinRefusals } from "../src/mud/lib/mixin";

const here = dirname(fileURLToPath(import.meta.url));
const MUD_ROOT = join(here, "..", "src", "mud");
const CONTENT = join(here, "..", "..", "content");
/**
 * Every command tree: the kernel's content-local bundles under
 * `mud/world/**\/cmd/`, and each content pack's `content/cmd` (the
 * platform pack ships the engine verbs since content-packs wave 2) —
 * discovered the way `check-instanceable-placement` discovers packs.
 */
const ROOTS = [
  join(MUD_ROOT, "world"),
  ...(existsSync(CONTENT)
    ? readdirSync(CONTENT)
        .map((pack) => join(CONTENT, pack, "content", "cmd"))
        .filter((dir) => existsSync(dir))
    : []),
];

/** Live mixin vocabulary — the thing a declaration is checked against. */
const KNOWN_MIXINS = new Set<string>(Object.values(Mixins));

/**
 * The `class:` escape, mirrored from `CommandLogic.CLASS_REQUIREMENTS`.
 *
 * ⚠ Two copies of a closed one-entry list, and deliberately so: the
 * gate must not import `CommandLogic`, which drags the whole command
 * runtime into a lint script. A second entry appearing on one side and
 * not the other fails loudly here (a spec naming an unknown class is
 * reported) rather than silently — and adding one at all is a design
 * conversation, per that map's own note.
 */
const SANCTIONED_CLASSES = new Set(["Agent"]);

interface FieldRecord {
  file: string;
  verb: string;
  scope: string;
  name: string;
  type: string;
  /** True when the slot is one the affordance resolver can ever see. */
  menuVisible: boolean;
  /** Raw declaration, or `undefined` when the slot declares nothing. */
  requires: string | string[] | undefined;
  /** Mixin names named by the declaration, alternations flattened. */
  named: string[];
  /** Names that are not in the registry. */
  unknown: string[];
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
  menuVisible: boolean,
  out: FieldRecord[],
): void {
  const type = typeof def.type === "string" ? def.type : "";
  if (type !== "object" && type !== "objects") return;

  const raw = def.requires;
  let requires: string | string[] | undefined;
  if (typeof raw === "string") requires = raw;
  else if (Array.isArray(raw)) {
    requires = (raw as unknown[]).filter((v): v is string => typeof v === "string");
  }

  const named: string[] = [];
  const unknown: string[] = [];
  if (requires !== undefined && requires !== "any") {
    const entries = Array.isArray(requires) ? requires : [requires];
    for (const entry of entries) {
      for (const n of entry.split("|").map((s) => s.trim()).filter(Boolean)) {
        if (n.startsWith("class:")) {
          if (!SANCTIONED_CLASSES.has(n.slice("class:".length))) unknown.push(n);
          continue;
        }
        named.push(n);
        if (!KNOWN_MIXINS.has(n)) unknown.push(n);
      }
    }
  }

  out.push({ file, verb, scope, name, type, menuVisible, requires, named, unknown });
}

/**
 * Specs that would not parse. ⚠ Collected and REPORTED, never silently
 * skipped: a spec this script cannot read is a spec whose args it
 * cannot count, so swallowing the error makes the totals drop and the
 * gate look *better*. A hole in a gate has to be visible as a hole.
 */
const unparsed: string[] = [];

function collectFrom(file: string): FieldRecord[] {
  const out: FieldRecord[] = [];
  const rel0 = relative(MUD_ROOT, file).split("\\").join("/");
  let view: Record<string, unknown>;
  try {
    view = parseYaml(readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch (err) {
    unparsed.push(`${rel0}: ${err instanceof Error ? err.message : String(err)}`);
    return out;
  }
  if (!view || typeof view !== "object") return out;

  const rel = rel0;
  const verbs = Array.isArray(view.verbs) ? (view.verbs as string[]) : [];
  const verb = verbs[0] ?? leafName(rel).replace(/\.yaml$/, "");

  const scan = (
    scope: string,
    args: unknown,
    options: unknown,
    /** Verb-level positionals are the only menu-visible slots. */
    menuScope: boolean,
  ): void => {
    if (Array.isArray(args)) {
      for (const a of args as Record<string, unknown>[]) {
        if (a && typeof a.name === "string") {
          recordField(rel, verb, scope, a.name, a, menuScope, out);
        }
      }
    }
    if (options && typeof options === "object") {
      for (const [name, def] of Object.entries(
        options as Record<string, Record<string, unknown>>,
      )) {
        if (def && typeof def === "object") {
          recordField(rel, verb, scope, `--${name}`, def, false, out);
        }
      }
    }
  };

  scan("verb", view.args, view.options, true);
  if (view.subcommands && typeof view.subcommands === "object") {
    for (const [sub, def] of Object.entries(
      view.subcommands as Record<string, Record<string, unknown>>,
    )) {
      if (def && typeof def === "object") scan(sub, def.args, def.options, false);
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

  const undeclared = all.filter((f) => f.requires === undefined);
  const bogus = all.filter((f) => f.unknown.length > 0);
  const anyDeclared = all.filter((f) => f.requires === "any");
  const constrained = all.filter(
    (f) => f.requires !== undefined && f.requires !== "any",
  );

  const menu = all.filter((f) => f.menuVisible);
  const menuUndeclared = menu.filter((f) => f.requires === undefined);

  console.log(
    `check-arg-kinds: ${all.length} object-typed args — ` +
      `${constrained.length} constrained by mixin, ${anyDeclared.length} ` +
      `declared \`any\`, ${undeclared.length} undeclared`,
  );
  console.log(
    `  menu tier: ${menu.length} verb-level positionals — ` +
      `${menuUndeclared.length} undeclared`,
  );

  /*
   * ⚠⚠ **A required mixin MUST have a refusal phrase, and this gates.**
   *
   * `MixinRefusals` is deliberately PARTIAL — most of the 200-odd
   * mixins will never be named by a `requires:` — so nothing in the
   * type system says "you added a constraint but no words for it". A
   * spec author can name any mixin at all, and the runtime happily
   * falls back to `{} isn't the right kind of thing`.
   *
   * That fallback is right at RUNTIME (a missing phrase should be worse
   * copy, never a broken verb) and wrong at BUILD. A `requires:` is a
   * refusal players will actually hit, and this project's own rule is
   * that a refusal the player cannot act on is a dead end. Shipping
   * "isn't the right kind of thing" is shipping a dead end.
   *
   * ⚠ This used to WARN — to `console.log`, not even stderr — on the
   * reasoning that gating would stop a mixin rename landing without a
   * copywriting pass. That was wrong twice over: the phrase moves in
   * the same one-line edit as the rename, and a warning inside a
   * passing CI job is a thing nobody ever reads.
   */
  const phraseless = new Set<string>();
  for (const f of constrained) {
    for (const n of f.named) {
      if (KNOWN_MIXINS.has(n) && !(n in MixinRefusals)) phraseless.add(n);
    }
  }
  if (phraseless.size > 0) {
    console.error(
      `\n⚠ ${phraseless.size} required mixin(s) have no phrase in ` +
        `MixinRefusals (lib/mixin.ts) — they would refuse with the ` +
        `generic sentence:`,
    );
    for (const n of [...phraseless].sort()) console.error(`    ${n}`);
    console.error(
      `\n  Add one line each. \`{}\` is the target's presentation:\n` +
        [...phraseless]
          .sort()
          .map((n) => `    ${n}: "{} …",`)
          .join('\n'),
    );
  }

  /*
   * The other direction, reported and NOT gated: a phrase for a mixin
   * nothing requires is dead copy. Harmless, and deleting it is a
   * judgement call — a phrase may be sitting there for a constraint
   * about to be written — so this informs rather than refuses.
   */
  const usedMixins = new Set(constrained.flatMap((f) => f.named));
  const unusedPhrases = Object.keys(MixinRefusals).filter(
    (n) => !usedMixins.has(n),
  );
  if (unusedPhrases.length > 0) {
    console.log(
      `\nnote: ${unusedPhrases.length} refusal phrase(s) for mixins no ` +
        `spec currently requires: ${unusedPhrases.sort().join(', ')}`,
    );
  }

  if (unparsed.length > 0) {
    console.error(`\n⚠ ${unparsed.length} spec(s) DID NOT PARSE:`);
    for (const u of unparsed) console.error(`  ${u}`);
    console.error(
      `\ncheck-arg-kinds: FAILED — unreadable specs make every total ` +
        `above an undercount.`,
    );
    process.exit(1);
  }

  if (bogus.length > 0) {
    console.error(`\n⚠ ${bogus.length} arg(s) name a mixin that does not exist:`);
    for (const f of bogus) {
      console.error(
        `  ${f.file} ${f.scope}.${f.name} → ${f.unknown.join(", ")}`,
      );
    }
  }

  if (undeclared.length > 0) {
    if (byFile) {
      const groups = new Map<string, FieldRecord[]>();
      for (const f of undeclared) {
        const list = groups.get(f.file) ?? [];
        list.push(f);
        groups.set(f.file, list);
      }
      console.log(`\nundeclared, by spec (${groups.size} specs):`);
      for (const [file, fields] of [...groups].sort()) {
        console.log(`\n  ${file}`);
        for (const f of fields) {
          console.log(
            `    ${f.scope}.${f.name} (${f.type})${f.menuVisible ? "  [menu]" : ""}`,
          );
        }
      }
    } else {
      const byCategory = new Map<string, number>();
      for (const f of undeclared) {
        const cat = f.file.split("/").slice(0, 2).join("/");
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
      }
      console.log(`\nundeclared by category:`);
      for (const [cat, n] of [...byCategory].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${String(n).padStart(3)}  ${cat}`);
      }
    }
  }

  if (
    lint &&
    (undeclared.length > 0 || bogus.length > 0 || phraseless.size > 0)
  ) {
    console.error(
      `\ncheck-arg-kinds: FAILED — ${undeclared.length} object-typed ` +
        `arg(s) declare no \`requires:\`, ${bogus.length} name a mixin ` +
        `that does not exist, ${phraseless.size} name one with no ` +
        `refusal phrase.`,
    );
    process.exit(1);
  }
}

if (process.argv[1]?.includes("check-arg-kinds")) {
  main();
}
