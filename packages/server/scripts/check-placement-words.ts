/**
 * check-placement-words — the gate on the **ways-of-sitting vocabulary**
 * and the verbs that speak it.
 *
 * ⭐⭐ **Why this exists.** The build's central claim is that *a new way
 * of sitting costs one row, plus one word on every verb whose argument
 * accepts a placement host*. The first half is free — a `Placement` row
 * under any root, warmed by the catalogue. The second half is the trap:
 * a verb whose arg gate names `PlacingMixin` but whose `prepositions:`
 * list is missing the new member's word will bind the target and then
 * never see the word, or refuse it outright. That failure is **closed
 * and silent** — the binder consumes nothing, the controller never
 * runs, and no controller test can see it. It is the same class as
 * `hammer` requiring a `DurableMixin` nothing composed.
 *
 * So the gate's real job is the `--list` roster: **it tells an author
 * which views need the word.** An author who cannot find the set has to
 * grep the tree, and the claim is false in practice however true it is
 * in principle.
 *
 * ## What it checks
 *
 * 1. **Every member lists at least one preposition.** A member no word
 *    names can never be typed.
 * 2. **No two members share a PRIMARY word.** `prepositions[0]` is a
 *    member's own word and is how `put` disambiguates a typed
 *    preposition; two members claiming one primary makes the typed
 *    branch ambiguous for a reason no player can act on. A member may
 *    list another's word as a SECONDARY — that is exactly how `put ham
 *    on hook` reaches a `from`-only host.
 * 3. **`put` accepts every member's primary word.** `put` is the
 *    universal placement verb: a member it cannot reach is a way of
 *    sitting nothing in the game can perform, which is the
 *    shipped-but-dead class.
 *
 * ⚠ **What it deliberately does NOT check: that every listed
 * preposition is a member.** An arg that accepts a placement host may
 * carry prepositions of its own that are not ways of sitting at all —
 * `butcher <carcass> at <block>` says *where you do it*, not *how it
 * sits*. An earlier draft of this gate flagged that `at` and was
 * simply wrong; there is no way to tell a verb's own grammar from a
 * stale placement word by inspection, and guessing would make the gate
 * refuse correct content.
 *
 * ## The roster
 *
 * `--list` prints, per placement-accepting argument, which members it
 * accepts and which it does not — keyed on each member's **primary**
 * word, because that is the word a player must be able to type to name
 * the member unambiguously. A verb legitimately may not accept every
 * member (`dry` has no business accepting `in`), which is why this half
 * is reported and not gated. It is the answer to *which verbs need the
 * word*, and half of acceptance criterion 4.
 *
 * ## Usage
 *
 *   pnpm lint:placement-words          the roster (which verbs, which members)
 *   pnpm lint:placement-words --lint   CI gate (exit 1 on any violation)
 */

import { CONTENT, walkYamlFiles } from "./pack-roots";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, relative } from "path";
import YAML from "yaml";

const ROOT = new URL("../..", import.meta.url).pathname;
const rel = (f: string): string => relative(ROOT, f);

/** The mixin name an arg gate must mention for its verb to speak this. */
const PLACING = "PlacingMixin";

interface Member {
  name: string;
  words: string[];
  file: string;
}

interface AcceptingArg {
  verb: string;
  arg: string;
  words: string[];
  file: string;
}

/** Every authored `Placement` row, from every pack, under any root. */
export function members(contentDir: string = CONTENT): Member[] {
  const out: Member[] = [];
  if (!existsSync(contentDir)) return out;
  for (const pack of readdirSync(contentDir).sort()) {
    const root = join(contentDir, pack, "content");
    if (!existsSync(root)) continue;
    for (const file of walkYamlFiles(root)) {
      if (!file.split("\\").join("/").includes("/idea/Placement/")) continue;
      let raw: unknown;
      try {
        raw = YAML.parse(readFileSync(file, "utf8"));
      } catch {
        continue;
      }
      const data = (raw as { data?: Record<string, unknown> })?.data;
      if (!data) continue;
      const name = typeof data.name === "string" ? data.name : "";
      const words = Array.isArray(data.prepositions)
        ? (data.prepositions as unknown[]).filter(
            (w): w is string => typeof w === "string",
          )
        : [];
      if (name === "") continue;
      out.push({ name, words, file });
    }
  }
  return out;
}

/**
 * Every command-view arg whose `requires:` names `PlacingMixin` — the
 * set an author has to touch when they add a member. A view lives at
 * `<root>/cmd/<category>/<verb>.yaml`; `<root>/idea/cmd/` is
 * controllers, not views.
 */
export function acceptingArgs(contentDir: string = CONTENT): AcceptingArg[] {
  const out: AcceptingArg[] = [];
  if (!existsSync(contentDir)) return out;
  for (const pack of readdirSync(contentDir).sort()) {
    const root = join(contentDir, pack, "content");
    if (!existsSync(root)) continue;
    for (const file of walkYamlFiles(root)) {
      const path = file.split("\\").join("/");
      if (!path.includes("/cmd/") || path.includes("/idea/cmd/")) continue;
      let raw: unknown;
      try {
        raw = YAML.parse(readFileSync(file, "utf8"));
      } catch {
        continue;
      }
      const doc = raw as {
        verbs?: unknown;
        args?: Array<Record<string, unknown>>;
      };
      const verb = Array.isArray(doc?.verbs)
        ? String(doc.verbs[0] ?? "")
        : "";
      for (const arg of doc?.args ?? []) {
        const requires = arg.requires;
        const terms: string[] =
          typeof requires === "string"
            ? [requires]
            : Array.isArray(requires)
              ? requires.map(String)
              : [];
        // An alternation (`ContainerMixin|PlacingMixin`) counts: the arg
        // accepts a placement host on one of its limbs.
        if (!terms.some((t) => t.split("|").includes(PLACING))) continue;
        const words = Array.isArray(arg.prepositions)
          ? (arg.prepositions as unknown[]).filter(
              (w): w is string => typeof w === "string",
            )
          : [];
        out.push({
          verb: verb || rel(file),
          arg: String(arg.name ?? "?"),
          words,
          file,
        });
      }
    }
  }
  return out;
}

function main(): void {
  const lint = process.argv.includes("--lint");
  const list = process.argv.includes("--list") || !lint;
  const roster = members();
  const args = acceptingArgs();

  if (list) {
    console.log(
      `${roster.length} way(s) of sitting, spoken by ${args.length} verb ` +
        `argument(s).\n`,
    );
    for (const m of roster) {
      console.log(
        `  ${m.name.padEnd(8)} ${m.words.join(", ").padEnd(16)} ${rel(m.file)}`,
      );
    }
    console.log(
      `\n⭐ Which verbs a new member needs its word added to — every ` +
        `argument below:\n`,
    );
    for (const a of args) {
      const has = roster
        .filter((m) => m.words[0] !== undefined && a.words.includes(m.words[0]))
        .map((m) => m.name);
      const missing = roster.filter((m) => !has.includes(m.name)).map((m) => m.name);
      console.log(
        `  ${a.verb}.${a.arg}\n` +
          `      accepts: ${has.join(", ") || "—"}\n` +
          `      does NOT accept: ${missing.join(", ") || "—"}`,
      );
    }
    console.log("");
  }

  const problems: string[] = [];

  const byPrimary = new Map<string, Member[]>();
  for (const m of roster) {
    const primary = m.words[0];
    if (primary === undefined) {
      problems.push(
        `  ⛔ ${rel(m.file)} — member '${m.name}' lists no prepositions, so\n` +
          `     no player can ever name it.`,
      );
      continue;
    }
    byPrimary.set(primary, [...(byPrimary.get(primary) ?? []), m]);
  }
  for (const [word, claimants] of byPrimary) {
    if (claimants.length < 2) continue;
    problems.push(
      `  ⛔ '${word}' is the PRIMARY word of ${claimants.length} members:\n` +
        claimants.map((m) => `       ${m.name}: ${rel(m.file)}`).join("\n") +
        `\n     A primary word is how a typed preposition picks a member —\n` +
        `     two claimants makes every use of it ambiguous for a reason\n` +
        `     no player can act on. A member may list another's word as a\n` +
        `     SECONDARY (that is how \`put ham on hook\` works); it may not\n` +
        `     claim it first.`,
    );
  }

  // ⭐ `put` is the universal placement verb. A member it cannot reach
  // is a way of sitting no shipped verb can perform.
  const putArg = args.find((a) => a.verb === 'put');
  if (putArg === undefined) {
    problems.push(
      `  ⛔ no command view declares a 'put' argument accepting ` +
        `${PLACING}.\n     Every way of sitting is unreachable.`,
    );
  } else {
    for (const m of roster) {
      const primary = m.words[0];
      if (primary === undefined || putArg.words.includes(primary)) continue;
      problems.push(
        `  ⛔ 'put' does not accept '${primary}', the primary word of the\n` +
          `     '${m.name}' member (${rel(m.file)}). \`put\` is the universal\n` +
          `     placement verb — a member it cannot reach is a way of sitting\n` +
          `     nothing in the game can perform. Add the word to\n` +
          `     ${rel(putArg.file)}.`,
      );
    }
  }

  if (problems.length > 0) {
    console.error(`\n✖ lint:placement-words — ${problems.length} violation(s):\n`);
    console.error(problems.join("\n\n"));
    if (lint) process.exit(1);
    return;
  }
  console.log(
    `✔ lint:placement-words — ${roster.length} member(s), ` +
      `${args.length} placement-accepting argument(s), every word carried.`,
  );
}

if (process.argv[1] && /check-placement-words\.ts$/.test(process.argv[1])) main();
