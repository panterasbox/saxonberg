/**
 * check-mint-custody — ⭐⭐ **a good minted into the world is LANDED, not
 * moved**, and the exceptions are ENUMERATED.
 *
 * The defect. `get`/`drop`/`put` call `good.followCustody()` after their
 * moves, so a good somebody carried has a recorded place. A verb that
 * mints a good with `StuffApi.clone(...)` and puts it down with a bare
 * `ContainmentApi.move(...)` was moved by NOBODY: the good has no title
 * stamped and no `place` recorded, the room's estate slice skips it, the
 * overlay never finds it, and it is gone at the next restart. Nothing
 * fails while the world is up — the spun yarn is in your hands, the cut
 * pane is on the bench — which is why it shipped in dozens of trade verbs
 * and was invisible to every suite.
 *
 * ⭐ The one chokepoint is `ContainmentApi.land(item, to, owner)`: move,
 * stamp the title to `owner` when it has none, `followCustody`, then
 * capture the hosts that now hold it. The craft mint
 * (`CraftingApi.craft/mintFromBuild/salvage`) lands its own output, and
 * `fell` stamps + follows by hand — so a file that reaches any of those
 * is not a finding.
 *
 * So: a census, then a ratchet (docs/lint-family.md). The census began
 * in the assembly build's W0 at **55 files** (a raw-text count; this gate
 * strips comments and strings first, which dropped a comment-only hit
 * and surfaced two files whose only "landing" was a comment); the fix
 * pass landed the trade verbs, and what is left is listed below with
 * WHY. The count may
 * fall and may never rise.
 *
 * ⚠ What survives is NOT custody: a body or a login (an Avatar is
 * persisted by the spine, not by a place), infrastructure (a door, a
 * weather strike, a sandbox fork, a restore), provisioning (an
 * archetype's venue, a room's `props:`, a cast re-seed, a loadout), a
 * spell locus or a trap, a ground feature with its own record, and
 * transient working state (a gather on a blowpipe). A file is a finding
 * only by co-occurrence — `StuffApi.clone` AND `ContainmentApi.move(` and
 * none of the landing forms — so a survivor's move may be of something
 * that was never minted at all, and the why says so.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { stripNonCode } from './check-create-sites';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SERVER_ROOT, '../..');
const MUD = join(SERVER_ROOT, 'src/mud');
const CONTENT = join(REPO_ROOT, 'packages/content');

/** The ceiling. It may fall. It may never rise. */
const CEILING = 27;

/**
 * The enumerated survivors, `<repo-relative file>` → why. A file not on
 * this list is a finding even when the total is under the ceiling.
 */
const ALLOWED: ReadonlyMap<string, string> = new Map([
  // ── packs ──
  [
    'packages/content/terminus/src/market/idea/cmd/StallController.ts',
    'the counter is a fixture with its own pitch record; the goods moved on give-up are not minted — a stall good\'s custody is the stall\'s consignment',
  ],
  [
    'packages/content/tpa/src/thing/TpaTerminal.ts',
    'born-with provisioning: the gate seats its own battery cell, captured by the terminal\'s `seedBornWith`',
  ],
  [
    'packages/content/trade-apiculture/src/lib/Colony.ts',
    'a swarm is a wild colony leaving the hive — it belongs to nobody until somebody hives it, and a lost swarm is a swarm that got away',
  ],
  [
    'packages/content/trade-drilling/src/idea/cmd/drilling/BoreController.ts',
    'ground features: the wellhead is identity-keyed with its own `holder_snapshots` record, and the derrick has no state to keep',
  ],
  [
    'packages/content/trade-farming/src/thing/ToolRack.ts',
    'a lending fixture restocking its loaners on the reset sweep — nobody owns them, and the rack re-mints a missing one',
  ],
  [
    'packages/content/trade-glass/src/idea/cmd/glass/GobController.ts',
    'transient working state: a hot gather on the blowpipe under a HotWorkWatch — it becomes a good (landed) at `crack`, or cullet (landed) when it is lost',
  ],
  [
    'packages/content/trade-ranching/src/idea/cmd/ranching/DraftController.ts',
    'a drafted head is materialised from the herdbook — the filed record is its persistence, and `return` files it back',
  ],
  // ── kernel ──
  [
    'packages/server/src/mud/lib/archetype/Archetype.ts',
    'provisioning: `materialize` builds an archetype\'s derived test venue from its slot defaults',
  ],
  [
    'packages/server/src/mud/lib/character/Avatar.ts',
    'a body\'s own parts: the cranial implant is occupancy on the avatar, persisted by the avatar spine',
  ],
  [
    'packages/server/src/mud/lib/character/Character.ts',
    'a body\'s starting clothes (`wearGarments`), worn at birth and persisted with the body',
  ],
  [
    'packages/server/src/mud/lib/persistence/Persistable.ts',
    'provisioning: `reseedCast` re-mints a host\'s declared cast NPCs',
  ],
  [
    'packages/server/src/mud/lib/retail/Stock.ts',
    'a shop\'s reset repop: shelf goods are author-owned until bought (the chattel author fallback) and the reset re-mints any shortfall',
  ],
  [
    'packages/server/src/mud/lib/stuff/Staged.ts',
    'provisioning: `applyProps` lays down a host\'s authored `props:` — initial furnishing, not an act',
  ],
  [
    'packages/server/src/mud/lib/thermal/Thermal.ts',
    'a phase change on a reconcile: no actor, fire-and-forget off a READ — landing would make a read write persistence',
  ],
  [
    'packages/server/src/mud/platform/agent/Gus.ts',
    'an NPC\'s loadout, equipped at birth',
  ],
  [
    'packages/server/src/mud/platform/idea/Login.ts',
    'the connection layer: a Login mints the avatar body and its starting garments',
  ],
  [
    'packages/server/src/mud/platform/idea/api/ConditionLogic.ts',
    'the death choreography: the corpse and the shade are bodies (a corpse is identity-keyed, a shade an Avatar), and the gear moved onto a corpse was not minted',
  ],
  [
    'packages/server/src/mud/platform/idea/api/ParcelLogic.ts',
    'infrastructure: an offlining tombstone (identity-keyed), and the occupants evicted into it are people, not goods',
  ],
  [
    'packages/server/src/mud/platform/idea/api/PersistableLogic.ts',
    'the persistence spine itself: restore / materialize re-places what a record says was there',
  ],
  [
    'packages/server/src/mud/platform/idea/api/PlayerLogic.ts',
    'avatar mints are bodies; the goods moved to a shelf at estate passing were not minted',
  ],
  [
    'packages/server/src/mud/platform/idea/api/SandboxLogic.ts',
    'the holodeck: a circle\'s rooms and the wire body are a fork, discarded with the circle',
  ],
  [
    'packages/server/src/mud/platform/idea/api/WeatherLogic.ts',
    'a lightning strike: a transient Energized locus, destructed after it conducts',
  ],
  [
    'packages/server/src/mud/platform/idea/cmd/author/CloneController.ts',
    'the author\'s `clone` verb has its own placement precedence chain (`--into` → `--here` → self-placement → giver)',
  ],
  [
    'packages/server/src/mud/platform/idea/cmd/charactergen/EmbodyController.ts',
    'character generation: mints the avatar body and its starting garments',
  ],
  [
    'packages/server/src/mud/platform/idea/cmd/device/ArmController.ts',
    'a set trap is a hazard in the room, not a held good',
  ],
  [
    'packages/server/src/mud/platform/idea/cmd/inventory/PlantController.ts',
    'a planted plant is OCCUPANCY in a bed slot, persisted by the bed and the plant\'s own key — not a held good',
  ],
  [
    'packages/server/src/mud/world/lounge/idea/LoungeWarren.ts',
    'the lounge warren buds a room and seats an arrival — a person, not a good',
  ],
]);

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e) || e.startsWith('.')) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === '__tests__') continue;
      yield* walk(p);
    } else if (e.endsWith('.ts') && !e.endsWith('.test.ts')) {
      yield p;
    }
  }
}

/** Any one of these means the file lands what it mints. */
const LANDS =
  /\bfollowCustody\b|\bstampChattel\b|\bContainmentApi\.land\b|\bCraftingApi\.(?:craft|mintFromBuild|salvage)\s*\(/;

/**
 * Does this source (comments and strings already stripped) mint with
 * `StuffApi.clone` and place with a bare `ContainmentApi.move(`, with no
 * landing form anywhere in the file?
 */
export function mintsUnlanded(code: string): boolean {
  return (
    /\bStuffApi\.clone\b/.test(code) &&
    /\bContainmentApi\.move\s*\(/.test(code) &&
    !LANDS.test(code)
  );
}

function main(): void {
  const listing = process.argv.includes('--list');
  const files: string[] = [...walk(MUD)];
  if (existsSync(CONTENT)) {
    for (const pack of readdirSync(CONTENT)) {
      const src = join(CONTENT, pack, 'src');
      if (existsSync(src)) files.push(...walk(src));
    }
  }

  const sites = new Set<string>();
  for (const f of files) {
    const code = stripNonCode(readFileSync(f, 'utf8'));
    if (!mintsUnlanded(code)) continue;
    sites.add(relative(REPO_ROOT, f).split('\\').join('/'));
  }

  const unlisted = [...sites].filter((f) => !ALLOWED.has(f)).sort();

  console.log(
    `check-mint-custody: ${sites.size} file(s) mint and move without ` +
      `landing; ceiling ${CEILING}` +
      (sites.size < CEILING ? ` — ratchet down to ${sites.size}` : ''),
  );

  if (listing) {
    for (const [f, why] of ALLOWED) {
      console.log(`  ${sites.has(f) ? '·' : '✗'} ${f}\n      ${why}`);
    }
  }

  const problems: string[] = [];
  for (const f of unlisted) {
    problems.push(
      `${f}: mints with StuffApi.clone and places with a bare ` +
        `ContainmentApi.move — a good minted that way was moved by ` +
        `nobody, has no recorded place, and is gone at the next restart. ` +
        `Use \`await ContainmentApi.land(item, to, actor)\`. If this ` +
        `genuinely is not custody (a body, a fixture, provisioning, a ` +
        `transient), add it to ALLOWED here WITH its reason.`,
    );
  }
  if (sites.size > CEILING) {
    problems.push(
      `${sites.size} files mint without landing, ceiling ${CEILING}. ` +
        `The count may fall and may never rise.`,
    );
  }
  if (problems.length === 0) {
    for (const [f, why] of ALLOWED) {
      if (!sites.has(f)) {
        console.warn(
          `  ⚠ listed but no longer mints unlanded: ${f} — drop it from ` +
            `ALLOWED and lower the ceiling (${why})`,
        );
      }
    }
    return;
  }
  console.error(`\n[check-mint-custody — ERROR] ${problems.length} finding(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

if (process.argv[1] && /check-mint-custody\.ts$/.test(process.argv[1])) main();
