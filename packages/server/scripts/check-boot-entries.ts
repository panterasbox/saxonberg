/**
 * check-boot-entries — ⭐⭐ **the ratchet on what loads at boot.**
 *
 * The rule (the scan sweep, 2026-10-14): *content loads when a player's
 * act forces it, by following authored references from what is already
 * loaded — never by search, and never at boot unless the reason is
 * written down and holds.* A pack's manifest `boot:` list is the one place
 * content can load with no act at all, so it is the list this gate holds.
 *
 * When the gate landed there were **128** entries across 16 packs, and
 * most were there for one reason: *a synchronous / live-only read cannot
 * find it otherwise* — a business advertising an opening, a catalogue a
 * reader expects warm, a species whose sentience gate failed open. That
 * reason is not a reason to boot; it is a reference pointing the wrong
 * way, and the sweep flipped each one (a place names what stands with it;
 * a holder loads what it is made of; a dictionary warms on first use).
 *
 * What legitimately stays booted:
 *
 *   - the engine's own wardens and registries (they arm timers, hold the
 *     money anchor, keep the sanctioned index — `/platform/…`, `/stuff/…`);
 *   - the houses and premises whose NPCs act while nobody is present —
 *     the unobserved economy, which this build deliberately does not
 *     touch (→ `docs/slates/builds/unobserved-economy-slate.md`).
 *
 * Three clauses:
 *
 *   (a) the TOTAL is a ceiling that may fall and never rise;
 *   (b) every entry carries a non-empty `reason`;
 *   (c) every entry whose template is CONTENT — under `/world/`,
 *       `/trade/`, `/corpo/` or `/compact/` — cites `unobserved-economy`
 *       in its reason. A world row booted for any other reason is exactly
 *       what the sweep removed. The count of entries that do not is its
 *       own ratchet ({@link UNCITED_CONTENT_CEILING}), driven to zero.
 *
 * Usage:
 *   tsx scripts/check-boot-entries.ts          # CI gate
 *   tsx scripts/check-boot-entries.ts --list   # the roster, by pack
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import YAML from "yaml";
import { CONTENT } from "./pack-roots";

/** ⚠ A fact about the past: the roster the day the gate landed. */
export const CENSUS_AT_LANDING = { entries: 128, uncited: 71 };

/**
 * ⭐ The total ceiling. It may fall, never rise.
 *
 * ⚠ It read 79 for one wave and is 83 — a correction inside the build
 * that landed the gate, not a rise: W1 unbooted the Hearthworks and
 * tailor houses as advertising-only, and the drive found both run a
 * par-sheet `restocks` beat with nobody present (the hall board had no
 * work at world start). By the requirements' own rule they are the
 * unobserved economy's, so they and their rooms stay booted.
 */
export const BOOT_ENTRY_CEILING = 83;

/**
 * ⭐ Content entries whose reason does not cite the unobserved economy —
 * the burn-down clause (c) drives to zero.
 */
export const UNCITED_CONTENT_CEILING = 0;

/** The roots whose rows are CONTENT rather than the engine's own. */
export const CONTENT_ROOTS = ["/world/", "/trade/", "/corpo/", "/compact/"];

/** The phrase a kept content entry's reason must carry. */
export const ECONOMY_CITATION = "unobserved-economy";

export interface BootEntry {
  pack: string;
  template: string;
  role: string | null;
  reason: string;
}

/** Every `boot:` entry of every pack under `contentDir`. */
export function bootEntries(contentDir: string = CONTENT): BootEntry[] {
  const out: BootEntry[] = [];
  if (!existsSync(contentDir)) return out;
  for (const pack of readdirSync(contentDir).sort()) {
    const manifest = join(contentDir, pack, "pack.yaml");
    if (!existsSync(manifest)) continue;
    const doc = YAML.parse(readFileSync(manifest, "utf8")) as {
      boot?: Array<Record<string, unknown>>;
    } | null;
    for (const e of doc?.boot ?? []) {
      if (!e || typeof e !== "object") continue;
      out.push({
        pack,
        template: String(e.template ?? ""),
        role: typeof e.role === "string" ? e.role : null,
        reason: typeof e.reason === "string" ? e.reason.trim() : "",
      });
    }
  }
  return out;
}

export function isContentEntry(e: BootEntry): boolean {
  return CONTENT_ROOTS.some((r) => e.template.startsWith(r));
}

export function citesEconomy(e: BootEntry): boolean {
  return e.reason.includes(ECONOMY_CITATION);
}

export interface BootFindings {
  total: number;
  uncited: BootEntry[];
  problems: string[];
}

export function check(
  entries: BootEntry[],
  ceilings = { total: BOOT_ENTRY_CEILING, uncited: UNCITED_CONTENT_CEILING },
): BootFindings {
  const problems: string[] = [];
  if (entries.length > ceilings.total) {
    problems.push(
      `(a) ${entries.length} boot entries, ceiling ${ceilings.total}. A boot ` +
        `entry is content loaded with no act at all. If a reader cannot find ` +
        `the thing live, the reference points the wrong way: name it in the ` +
        `place's \`stands:\`, declare it a constituent of its holder, or warm ` +
        `the dictionary on first use. See docs/lint-family.md.`,
    );
  }
  for (const e of entries) {
    if (!e.reason) {
      problems.push(`(b) ${e.pack}: '${e.template}' has no reason`);
    }
  }
  const uncited = entries.filter((e) => isContentEntry(e) && !citesEconomy(e));
  if (uncited.length > ceilings.uncited) {
    problems.push(
      `(c) ${uncited.length} content entries do not cite ` +
        `'${ECONOMY_CITATION}', ceiling ${ceilings.uncited}. A world row stays ` +
        `booted only because its NPCs act while nobody is present — say so, ` +
        `and point at docs/slates/builds/unobserved-economy-slate.md. ` +
        `Newest: ${uncited.slice(-3).map((e) => e.template).join(", ")}`,
    );
  }
  return { total: entries.length, uncited, problems };
}

function main(): void {
  const entries = bootEntries();
  if (process.argv.includes("--list")) {
    for (const e of entries) {
      const flag = isContentEntry(e) && !citesEconomy(e) ? "  ⚠" : "";
      console.log(`${e.pack.padEnd(22)} ${e.template}${flag}\n${" ".repeat(23)}${e.reason}`);
    }
    return;
  }
  const r = check(entries);
  if (r.problems.length > 0) {
    console.error(`\n[check-boot-entries — ERROR]\n`);
    for (const p of r.problems) console.error(`  ${p}`);
    process.exit(1);
  }
  const slack =
    r.total < BOOT_ENTRY_CEILING || r.uncited.length < UNCITED_CONTENT_CEILING
      ? ` — ratchet down to ${r.total}/${r.uncited.length}`
      : "";
  console.log(
    `check-boot-entries: ${r.total}/${BOOT_ENTRY_CEILING} boot entries; ` +
      `${r.uncited.length}/${UNCITED_CONTENT_CEILING} content entries without ` +
      `an unobserved-economy reason${slack}.`,
  );
}

if (process.argv[1] && /check-boot-entries\.ts$/.test(process.argv[1])) main();
