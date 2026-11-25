/**
 * ⭐⭐ `lint:view-keys` — **the command def predicts everything**
 * (docs/review-questions.md P9).
 *
 * ## The defect
 *
 * ```yaml
 * # BAD — a key the dispatcher acts on, that neither the def nor `help` explains
 * verbs: [cut]
 * readies: tool      # put the held thing away, draw the tool, THEN run
 * ```
 *
 * The size and carrying build shipped `readies:` — a view field that made
 * the dispatcher put away what you held and draw a tool before the
 * controller ran. A player reading the def and `help` could not predict it,
 * and it was retired. Owner: *"the whole point of the command def is it's
 * supposed to be the one document that, if you get your head around it,
 * you can predict everything a command will do."*
 *
 * Every key a view may carry is a thing the command can do; the schema is
 * `additionalProperties: false` at every surface, so the key list IS the
 * vocabulary of what a def can say. A new key is a new kind of behavior,
 * and it is never added in passing.
 *
 * ## What it checks (the schema file, parsed as JSON)
 *
 * The `properties` of the four surfaces in `command.schema.json` — the view
 * (the root), a subcommand (`$defs/subcommand`), an arg (`$defs/positional`,
 * the `FieldDefinition`) and an option (`$defs/option`, which `payload:`
 * shares) — against the list pinned below **by name**, each key with one
 * line on what it does to the command.
 *
 *   - a key in the schema and NOT in the pin **fails**: add it to the pin,
 *     with its line, in a reviewed change — and ask P9 of it first;
 *   - a key in the pin and no longer in the schema **passes** (the
 *     vocabulary shrank) and prints a note to drop it from the pin.
 *
 * ⭐ Census, then ratchet (docs/lint-family.md), by name rather than by
 * count: a count would let one key be swapped for another unseen.
 *
 *   tsx scripts/check-view-keys.ts --lint      # the gate
 *   tsx scripts/check-view-keys.ts --report    # every surface's keys, with their lines
 */

import { readFileSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import { MUD } from "./pack-roots";

export const SCHEMA_FILE = join(MUD, "lib", "command", "command.schema.json");

export type ViewSurface = "view" | "subcommand" | "arg" | "option";

/** The pinned vocabulary: every key each surface may carry, and what it does. */
export const PINNED_VIEW_KEYS: Readonly<Record<ViewSurface, Readonly<Record<string, string>>>> = {
  view: {
    verbs: "the one word the view answers to",
    category: "where help lists it and the radial slots it; equals its cmd/<category>/ directory",
    defaultAliases: "the removable default player shortcuts for the verb",
    unreachable: "why nothing confers it (read by lint:reachability only; no runtime effect)",
    controller: "which controller runs it",
    description: "the one-line help header",
    help: "the authored help prose",
    examples: "worked invocations shown in help",
    args: "the positional slots the verb binds",
    subcommands: "the subcommand words, each with its own shape",
    options: "the verb's --flags",
    payload: "structured-form-only fields a client form attaches (never typed)",
    validators: "verb-level preconditions checked before any field binds",
    testOnly: "the verb exists only in a test world",
    fallthrough: "an unknown first word falls from subcommands through to args",
    opens_card: "the one card its controller may open (a declared gate, not the push)",
    async: "the controller detaches from the giver's input chain by default",
    compellable: "whether another body's code may ask you to run it (never, or consent — you are asked first; help says so)",
  },
  subcommand: {
    description: "the subcommand's one-line help",
    help: "the subcommand's authored help prose",
    examples: "worked invocations of the subcommand",
    controller: "a controller of its own instead of the verb's",
    args: "the subcommand's positional slots",
    options: "the subcommand's --flags",
    validators: "subcommand-level preconditions, after the verb's",
    compellable: "the subcommand's own answer to the verb's compellable",
  },
  arg: {
    requires: "the mixin a bound object must compose (or `any`)",
    name: "the field the bound value lands on",
    type: "what kind of value binds (string, enum, number, duration, object, objects, struct, …)",
    schema: "a JSON Schema the structured value must satisfy (struct only)",
    required: "a missing value is a shape error",
    greedy: "takes the rest of the line verbatim (prose only)",
    multiple: "accumulates values into a list",
    validators: "checks run on the bound value",
    default: "the text used when nothing is typed (variables expanded)",
    scope: "the MQL fragments tried, in order, to resolve the object",
    updates_focus: "moves the giver's focus (extend / replace / none)",
    prepositions: "the leading words the slot consumes (at, to, …)",
    prepositionRequired: "the slot binds only when its preposition is typed",
    values: "the closed word list of an enum",
    granularity: "a duration's smallest step (minute · hour · day)",
    min: "a duration's least value, written as a duration",
    max: "a duration's greatest value, written as a duration",
    cardinality: "how many resolved objects the slot accepts",
    onExcess: "what happens when MQL resolves more than the cardinality",
    onShortage: "what happens when MQL resolves fewer than the cardinality",
    onFiltered: "what happens when a match fails `requires:`",
  },
  option: {
    requires: "the mixin a bound object must compose (or `any`)",
    short: "the one-letter -x form",
    type: "what kind of value binds",
    values: "the closed word list of an enum",
    granularity: "a duration's smallest step (minute · hour · day)",
    min: "a duration's least value, written as a duration",
    max: "a duration's greatest value, written as a duration",
    schema: "a JSON Schema the structured value must satisfy (struct only)",
    scope: "the MQL fragments tried, in order, to resolve the object",
    field: "the field the bound value lands on (default: the option's name)",
    required: "a payload field the client must attach",
    multiple: "accumulates values into a list",
    default: "the value used when the option is absent",
    description: "the option's line in help",
    validators: "checks run on the bound value",
    cardinality: "how many resolved objects the option accepts",
    onExcess: "what happens when MQL resolves more than the cardinality",
    onShortage: "what happens when MQL resolves fewer than the cardinality",
    onFiltered: "what happens when a match fails `requires:`",
    effects: "skips or replaces a named dispatcher phase when the option is set",
  },
};

type Json = Record<string, unknown>;

/** The keys each surface of a parsed schema allows. */
export function schemaKeys(schema: Json): Record<ViewSurface, string[]> {
  const defs = (schema["$defs"] ?? {}) as Record<string, Json>;
  const keys = (o: Json | undefined): string[] => Object.keys((o?.["properties"] ?? {}) as Json);
  return {
    view: keys(schema),
    subcommand: keys(defs["subcommand"]),
    arg: keys(defs["positional"]),
    option: keys(defs["option"]),
  };
}

export interface ViewKeyDiff {
  /** Keys the schema allows that the pin does not name — each FAILS. */
  added: Array<{ surface: ViewSurface; key: string }>;
  /** Keys the pin names that the schema no longer allows — each passes. */
  removed: Array<{ surface: ViewSurface; key: string }>;
}

/** Compare a schema against a pin (the live pin by default). */
export function diffViewKeys(
  schema: Json,
  pinned: Readonly<Record<ViewSurface, Readonly<Record<string, string>>>> = PINNED_VIEW_KEYS,
): ViewKeyDiff {
  const live = schemaKeys(schema);
  const out: ViewKeyDiff = { added: [], removed: [] };
  for (const surface of Object.keys(pinned) as ViewSurface[]) {
    const have = new Set(live[surface]);
    const pin = pinned[surface];
    for (const key of live[surface]) if (!(key in pin)) out.added.push({ surface, key });
    for (const key of Object.keys(pin)) if (!have.has(key)) out.removed.push({ surface, key });
  }
  return out;
}

export function readSchema(file: string = SCHEMA_FILE): Json {
  return JSON.parse(readFileSync(file, "utf8")) as Json;
}

function main(): void {
  const schema = readSchema();
  if (process.argv.includes("--report")) {
    const live = schemaKeys(schema);
    for (const surface of Object.keys(live) as ViewSurface[]) {
      console.log(`${surface} (${live[surface].length}):`);
      for (const key of live[surface]) {
        console.log(`  ${key.padEnd(20)} ${PINNED_VIEW_KEYS[surface][key] ?? "✗ NOT PINNED"}`);
      }
    }
    return;
  }
  const { added, removed } = diffViewKeys(schema);
  for (const r of removed) {
    console.log(
      `check-view-keys: note — ${r.surface} key '${r.key}' is gone from the schema; drop it from PINNED_VIEW_KEYS.`,
    );
  }
  if (added.length > 0) {
    console.error(`check-view-keys: ✗ ${added.length} command-def key(s) the pin does not name:\n`);
    for (const a of added) console.error(`  ✗ ${a.surface}: ${a.key}`);
    console.error(
      "\nA key on a view is a thing the command can do (review-questions.md P9). Ask: could a\n" +
        "player predict it from the def and `help`? If it is a convenience, it belongs to the\n" +
        "player (an option, an arg type, a verb, an alias, a script), never a dispatcher flag.\n" +
        "If it is genuinely new, add it to PINNED_VIEW_KEYS in scripts/check-view-keys.ts with\n" +
        "its one line, in a reviewed change.",
    );
    process.exit(1);
  }
  const total = Object.values(schemaKeys(schema)).reduce((n, k) => n + k.length, 0);
  console.log(`check-view-keys: ${total} command-def keys, every one pinned ✔`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
