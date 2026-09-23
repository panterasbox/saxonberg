/**
 * check-committees-are-players — ⭐ **no group that holds title enrols an
 * NPC** (economic bootstrap, retrofit gate 1; doctrine 2 of the
 * requirements' retrofit section).
 *
 * > A committee assignment is governance; a position is a job.
 *
 * A committee IS whoever holds parcel title, and title is claimed in the
 * pack manifests for a `{ group }` holder. A manifest may also author a
 * group's `members[]` — the installer's owner-conferred enrolment (the
 * NPC-only fence admits exactly the pack's own NPC rows). Put together,
 * the two let a pack seat an NPC on a committee by data alone, which is
 * how Walter (the letting agent) and Katie (the dorm manager) sat on the
 * landlords' committees at 1.0: **an NPC's job was written as a seat.**
 * Both are staff of an Organization now, and this gate is what keeps the
 * next one from being written.
 *
 * ## The rule, stated exactly
 *
 * For every `requires.title[]` entry across the shipped manifests whose
 * holder is `{ group: <name> }`, every `requires.groups[]` entry named
 * `<name>` — in any manifest, since a claim may name a host's group —
 * must list no `members[]` whose id carries an `/agent/` path segment
 * (an NPC row's branch). Zero is green.
 *
 * ## Census, then ratchet
 *
 * The census on master before the retrofit was 2 (Walter, Katie); the
 * retrofit took it to 0 and the ceiling is 0. It may never rise. The
 * `check-untitled-paths.ts` shape: an exported pure `classify`, a
 * `--lint` mode, a test beside it that proves the gate FIRES on a
 * fixture. CI-gating through `lint:family`.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, "..", "..", "content");

/** The ceiling: the census this gate holds. It may fall; it may never rise. */
export const NPC_COMMITTEE_CEILING = 0;

export interface ManifestView {
  id: string;
  groups: Array<{ name: string; members: string[] }>;
  titleGroups: string[];
}

export interface NpcSeat {
  pack: string;
  group: string;
  member: string;
}

/**
 * Is `id` an NPC row — a template path with an `/agent/` branch segment?
 * ⚠ A PLAYER's identity path is `/platform/agent/Avatar/<playerId>` — the
 * same segment, and exactly the member a committee is for; excluded.
 */
export function isAgentPath(id: string): boolean {
  if (id.startsWith("/platform/agent/Avatar/")) return false;
  return /(^|\/)agent\//.test(id);
}

/**
 * The pure decision core: every NPC member of every title-holding group,
 * across the manifests (a claim may name a group a HOST declares).
 */
export function classify(manifests: readonly ManifestView[]): NpcSeat[] {
  const holding = new Set<string>();
  for (const m of manifests) for (const g of m.titleGroups) holding.add(g);
  const out: NpcSeat[] = [];
  for (const m of manifests) {
    for (const g of m.groups) {
      if (!holding.has(g.name)) continue;
      for (const member of g.members) {
        if (isAgentPath(member)) out.push({ pack: m.id, group: g.name, member });
      }
    }
  }
  return out.sort((a, b) => a.pack.localeCompare(b.pack) || a.member.localeCompare(b.member));
}

interface RawManifest {
  id?: string;
  requires?: {
    groups?: Array<{ name?: string; members?: Array<{ id?: string }> }>;
    title?: Array<{ extent?: string; holder?: { group?: string; organization?: string } }>;
  };
}

/** One manifest, reduced to what the rule reads. */
export function viewOf(raw: RawManifest, fallbackId: string): ManifestView {
  const groups = (raw.requires?.groups ?? []).map((g) => ({
    name: String(g.name ?? ""),
    members: (g.members ?? []).map((m) => String(m.id ?? "")).filter((s) => s.length > 0),
  }));
  const titleGroups = (raw.requires?.title ?? [])
    .map((t) => t.holder?.group)
    .filter((g): g is string => typeof g === "string" && g.length > 0);
  return { id: String(raw.id ?? fallbackId), groups, titleGroups };
}

function scan(): ManifestView[] {
  const out: ManifestView[] = [];
  if (!existsSync(CONTENT)) return out;
  for (const pack of readdirSync(CONTENT).sort()) {
    const file = join(CONTENT, pack, "pack.yaml");
    if (!existsSync(file)) continue;
    const raw = (YAML.parse(readFileSync(file, "utf8")) ?? {}) as RawManifest;
    out.push(viewOf(raw, pack));
  }
  return out;
}

function main(): void {
  const seats = classify(scan());
  if (seats.length > NPC_COMMITTEE_CEILING) {
    console.error(
      `\n✖ lint:committees-are-players — ${seats.length} NPC member(s) of a ` +
        `title-holding group; the ceiling is ${NPC_COMMITTEE_CEILING}.\n\n` +
        `  A committee is whoever holds title, and committees are PLAYERS ` +
        `ONLY: a committee assignment is governance, a position is a job. ` +
        `An NPC that acts for a landlord holds a POSITION at an Organization ` +
        `whose appointing authority is that committee (Walter at Mayfield ` +
        `Holdings, Katie at Duncan Hall's college) — never a seat on it.\n`,
    );
    for (const s of seats) console.error(`  ${s.pack}: group '${s.group}' enrols ${s.member}`);
    process.exit(1);
  }
  console.log(`lint:committees-are-players — ${seats.length} NPC seat(s) (ceiling ${NPC_COMMITTEE_CEILING})`);
}

if (process.argv[1]?.includes("check-committees-are-players")) main();
