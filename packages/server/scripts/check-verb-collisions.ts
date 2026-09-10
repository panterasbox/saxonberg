/**
 * ⭐⭐ `lint:verb-collisions` — **two command views may not claim the same
 * verb.**
 *
 * ## The failure this exists for, which shipped
 *
 * The consequence build added `platform/cmd/work/watch.yaml` for standing
 * a guard's post. `platform/cmd/stream/watch.yaml` had claimed `watch`
 * since the streaming build — *put a livestream in the cockpit embed* —
 * and the new view **shadowed it outright**. Because the guard verb was
 * afforded by the born-with credential wallet, it did so for every
 * character alive:
 *
 * ```
 * help watch              → "WATCH: Stand a guard's post"
 * watch twitch.tv/shroud  → declined: no-watch-claim
 * watch off               → "You are not on watch."
 * ```
 *
 * ⚠⚠ **Nothing failed.** Not a test, not a lint, not the boot. A shipped
 * feature simply became unreachable by its own name, and the only way it
 * surfaced was somebody asking what the new verb was for.
 *
 * ⭐ The census-then-ratchet shape (`docs/lint-family.md`). The census
 * found **nine collisions already shipped**, so the gate is an
 * ALLOWLIST rather than a zero: each pre-existing pair is named with a
 * reason, and anything not on the list fails. The list is a to-do, not
 * an amnesty — ⚠ and it has NOT been diagnosed. The census measured
 * which verbs are claimed twice; which of those actually shadow (and in
 * which direction) is a question each row still owes an answer to.
 *
 * ⚠ Aliases count. `verbs: [job, jobs]` claims both, and a second view
 * claiming `jobs` would shadow just as silently as one claiming `job`.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, sep } from "path";
import YAML from "yaml";
import { CONTENT } from "./pack-roots";

/** Every `cmd/**\/*.yaml` that is a command VIEW (not a controller row). */
function commandViews(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.endsWith(".yaml")) continue;
      // ⚠ A `cmd` dir is views UNLESS its parent is `idea` — that is the
      // shipped path rule (`<root>/idea/cmd/**` holds CONTROLLERS, whose
      // rows carry `class:` and no `verbs:`).
      const parts = full.split(sep);
      const cmdAt = parts.lastIndexOf("cmd");
      if (cmdAt < 1 || parts[cmdAt - 1] === "idea") continue;
      out.push(full);
    }
  };
  walk(root);
  return out;
}

interface Claim {
  verb: string;
  file: string;
}

/**
 * ⚠ The nine collisions that shipped before this gate existed, each with
 * what is known about it. **Only `lease`/`unlease` is understood to be
 * safe** — those are domain-local verbs in two different localities
 * (Duncan Hall, Mayfield Row), never afforded to the same person at the
 * same time. The rest are live questions.
 *
 * ⭐ To remove a row: decide whether the two really are one verb (fold
 * them into one view with subcommands) or two (rename one), then delete
 * the line. Never add a row to make a new build pass.
 */
const KNOWN_COLLISIONS: Record<string, string> = {
  lease:
    "domain-local, two different localities (duncan-hall provision / " +
    "mayfield-row lease) — never afforded together. SAFE.",
  unlease: "as `lease` — the same two localities. SAFE.",
  me: "platform: author/player.yaml vs social/score.yaml — undiagnosed.",
  pour: "platform: bulk/pour.yaml vs crafting/pour.yaml — undiagnosed.",
  hang: "platform inventory/hang.yaml vs trade-cooking dry.yaml — undiagnosed.",
  mount: "platform: inventory/hang.yaml vs movement/mount.yaml — undiagnosed.",
  dress:
    "medical/treat.yaml (dress a wound) vs trade-cooking butcher.yaml " +
    "(dress a carcass) — ⭐ both diegetically correct, which is the hard case.",
  drive:
    "platform movement/drive.yaml (a vehicle) vs trade-mining drive.yaml " +
    "(drive a drift) — undiagnosed.",
  butcher: "trade-cooking vs trade-ranching, both trades — undiagnosed.",
};

export function claimsIn(files: string[]): Claim[] {
  const out: Claim[] = [];
  for (const file of files) {
    let doc: { verbs?: unknown } | null = null;
    try {
      doc = YAML.parse(readFileSync(file, "utf-8")) as { verbs?: unknown };
    } catch {
      continue;
    }
    const verbs = doc?.verbs;
    if (!Array.isArray(verbs)) continue;
    for (const v of verbs) {
      if (typeof v === "string" && v.trim()) {
        out.push({ verb: v.trim().toLowerCase(), file });
      }
    }
  }
  return out;
}

/** Verbs claimed by more than one view, with the files that claim them. */
export function collisionsIn(claims: Claim[]): Map<string, string[]> {
  const byVerb = new Map<string, string[]>();
  for (const c of claims) {
    const list = byVerb.get(c.verb) ?? [];
    if (!list.includes(c.file)) list.push(c.file);
    byVerb.set(c.verb, list);
  }
  const bad = new Map<string, string[]>();
  for (const [verb, files] of byVerb) {
    if (files.length > 1) bad.set(verb, files);
  }
  return bad;
}

/**
 * Every command view across every shipped pack — ⚠ **every** pack, not
 * just the capability ones. A content-only pack (a locality) ships
 * domain-local verbs and can collide exactly as hard.
 */
export function allViews(contentDir: string = CONTENT): string[] {
  if (!existsSync(contentDir)) return [];
  const out: string[] = [];
  for (const pack of readdirSync(contentDir).sort()) {
    const content = join(contentDir, pack, "content");
    if (!existsSync(content)) continue;
    out.push(...commandViews(content));
  }
  return out;
}

function main(): void {
  const files = allViews();
  const collisions = collisionsIn(claimsIn(files));
  const fresh = [...collisions].filter(([verb]) => !(verb in KNOWN_COLLISIONS));
  const healed = Object.keys(KNOWN_COLLISIONS).filter(
    (verb) => !collisions.has(verb),
  );

  if (fresh.length === 0 && healed.length === 0) {
    console.info(
      `check-verb-collisions: ok — ${files.length} command view(s); ` +
        `${collisions.size} known collision(s), no new ones.`,
    );
    return;
  }

  if (healed.length > 0) {
    // ⭐ The ratchet's other direction: a fixed collision must leave the
    // list, or the list stops meaning anything.
    console.error(
      `check-verb-collisions: ${healed.length} collision(s) are FIXED — ` +
        `delete them from KNOWN_COLLISIONS: ${healed.join(", ")}\n`,
    );
  }

  for (const [verb, claimed] of fresh) {
    console.error(`  ⚠ NEW: '${verb}' is claimed by ${claimed.length} views:`);
    for (const f of claimed) console.error(`      ${f.replace(CONTENT, "…")}`);
  }
  if (fresh.length > 0) {
    console.error(
      "\n⚠⚠ Two views claiming one verb do not merge — one SHADOWS the\n" +
        "  other, silently, and the loser becomes unreachable by its own\n" +
        "  name. The consequence build did this to the livestream `watch`\n" +
        "  for every character alive, and nothing failed.\n\n" +
        "  The fix is one view with subcommands, or a different verb —\n" +
        "  never a new line in KNOWN_COLLISIONS.",
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith("check-verb-collisions.ts")) {
  main();
}
