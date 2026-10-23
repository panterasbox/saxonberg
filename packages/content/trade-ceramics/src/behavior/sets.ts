/**
 * sets — ⭐ the setter's round (ceramics S20, D15): bone-dry bricks off the
 * hacks into the clamp, the clamp fired when it is charged, and the burnt
 * bricks out onto the stack when it is cold.
 *
 * ONE act per beat, furthest along first: burnt bricks are drawn and
 * stacked before more green ones are set; a charged clamp is fired before
 * another load is fetched. ⭐ The setter's own `brickmaking` band is what
 * decides how many bricks end up in the fire channels (`BrickClamp`'s
 * `onFireStart` reads the person who fires it) — so a better setter's
 * clamp yields fewer clinkers, deterministically, with no code here.
 *
 * Every step is the LITERAL verb through `forceCommand` — `get 40 bricks`,
 * `put bricks in clamp`, `stoke coal into clamp`, `ignite clamp`, `fire
 * clamp for 3 days`, `get bricks from clamp`, `put bricks in counter`.
 * Nothing here mints, nothing teleports, and a player's bricks are never
 * his to set.
 *
 * Config: `{ home, clamp, hacks, ways, batch?, burn? }` — `home` the clamp
 * ground, `clamp` the clamp's ROW, `hacks` the drying room, `batch` the
 * bricks a clamp is charged with before it is fired (default 40), `burn`
 * the hold (`3 days`).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { PlayerApi } from '@saxonberg/server/mud/api/player';
import { LocomotionApi } from '@saxonberg/server/mud/api/locomotion';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { Burner } from '@saxonberg/server/mud/lib/fire/Burner';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import { BEHAVIOR_BEAT_TYPE } from '@saxonberg/server/mud/lib/behavior/BehaviorBeat';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';

type Setter = Stuff & Mobile & Containable & Container & CommandGiver;
type Way = { to: string; go: readonly string[]; back: readonly string[] };
type Clamp = Stuff & Burner & Container;

const BRICK = '/trade/ceramics/thing/brick';
const DEFAULT_BATCH = 40;
const DEFAULT_BURN = '3 days';
/** Burnt bricks are drawn when they are cool enough to handle. */
const HANDLE_BELOW_K = 330;

export const brain = class {
  static label = 'sets';
  static kind: TaskKind = 'work';
  static summary = 'Sets bone-dry bricks in the clamp, fires it, and draws the burnt bricks onto the stack.';
  static discipline = 'brickmaking';
  static produces: readonly string[] = ['bricks'];
  static consumes: readonly string[] = ['coal'];
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static presenceGated = false;
  static ambient = false;

  static urgency(ctx: BrainContext): Urgency {
    const host = ctx.host;
    if (MixinApi.isEmployed(host) && !host.isFulfilling()) return new Urgency('idle');
    return new Urgency('wanted', 'walks round the clamp, looking at the casing');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (
      !MixinApi.isMobile(host) ||
      !MixinApi.isContainer(host) ||
      !MixinApi.isContainable(host) ||
      !MixinApi.isCommandGiver(host)
    ) {
      return;
    }
    if (MixinApi.isEmployed(host) && !host.isFulfilling()) return;
    const s = host as Setter;
    if (MixinApi.isEngaged(s) && s.getEngagements().some((e) => e.type !== BEHAVIOR_BEAT_TYPE)) return;
    const { home, clamp: clampPath, hacks } = ctx.config;
    if (typeof home !== 'string' || typeof clampPath !== 'string' || typeof hacks !== 'string') return;
    const ways = waysOf(ctx);
    const wayTo = (path: string): Way | null => ways.find((w) => w.to === path) ?? null;

    const standing = s.getContainer()?.getTemplatePath() ?? '';
    if (standing !== home) {
      const back = wayTo(standing);
      if (back) await walkRoute(s, back.back);
      return;
    }
    const ground = s.getContainer() as (Stuff & Container) | null;
    if (!ground || !MixinApi.isContainer(ground)) return;
    const clamp = (ground.getContents() as Stuff[]).find(
      (c): c is Clamp => c.getTemplatePath() === clampPath && MixinApi.isBurner(c) && MixinApi.isContainer(c),
    );
    if (!clamp) return;
    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);
    const burn = typeof ctx.config.burn === 'string' && ctx.config.burn !== '' ? ctx.config.burn : DEFAULT_BURN;

    // A clamp alight is left to burn: nothing goes in or out of a burning
    // clamp, and firing it again would re-set what is already set. Once its
    // hold is done and the bricks are burnt, the setter stops its mouths
    // (`douse`) and lets it cool — a clamp's coal would otherwise smoulder
    // on for weeks after the bricks were made.
    if (clamp.isLit()) {
      const done = (clamp.getContents() as Stuff[]).some((b) => isBurnt(b) && !isPlayers(b));
      if (done) await s.forceCommand('douse clamp');
      return;
    }

    // 1. Burnt bricks in hand go on the stack.
    if (count(s.getContents() as Stuff[], isBurnt) > 0) {
      await s.forceCommand('put bricks in counter');
      return;
    }

    // 2. A cold clamp with burnt bricks in it is drawn.
    const inClamp = clamp.getContents() as Stuff[];
    const burnt = inClamp.filter((b) => isBurnt(b) && !isPlayers(b));
    if (burnt.length > 0) {
      if (burnt.every((b) => coolEnough(b))) await s.forceCommand('get bricks from clamp');
      return;
    }

    // 3. Bone-dry bricks in hand are set.
    if (count(s.getContents() as Stuff[], isFireable) > 0) {
      await s.forceCommand('put bricks in clamp');
      return;
    }
    // …and green ones that are NOT dry go back to the hacks.
    if (count(s.getContents() as Stuff[], isGreenBrick) > 0) {
      const way = wayTo(hacks);
      if (way && (await walkRoute(s, way.go))) {
        try {
          await s.forceCommand('drop bricks');
        } finally {
          await walkRoute(s, way.back);
        }
      }
      return;
    }

    // 4. A charged clamp is fired: fuel in the channels, a light, the hold.
    const charged = count(
      inClamp.filter((b) => !isPlayers(b)),
      isFireable,
    );
    if (charged >= batch) {
      if (clamp.fuelRemaining() <= 0) {
        const coal = (ground.getContents() as Stuff[]).some(
          (c) => !isPlayers(c) && MixinApi.isPerceptible(c) && c.hasKeyword('coal'),
        );
        if (!coal) return; // no coal: the clamp waits for the fuel trade
        await s.forceCommand('stoke coal into clamp');
      }
      await s.forceCommand('ignite clamp');
      if (clamp.isLit()) await s.forceCommand(`fire clamp for ${burn}`);
      return;
    }

    // 5. Bone-dry bricks in the hacks are fetched.
    const way = wayTo(hacks);
    if (!way) return;
    if (!(await walkRoute(s, way.go))) return;
    try {
      const rows = s.getContainer() as (Stuff & Container) | null;
      const dry = rows && MixinApi.isContainer(rows)
        ? (rows.getContents() as Stuff[]).filter((b) => isFireable(b) && !isPlayers(b))
        : [];
      // ⭐ By IDENTITY, the gang's own: a bare `get N bricks` takes whatever
      // answers, and the player's bone-dry test brick in the hacks went to
      // the clamp with the gang's (the ceramics drive A, run 22).
      let want = Math.max(0, batch - charged);
      for (const b of dry) {
        if (want <= 0) break;
        const n = Math.min(want, MixinApi.isStackable(b) ? b.getQuantity() : 1);
        await s.forceCommand(`get ${n} #${b.stuffId}`);
        want -= n;
      }
    } finally {
      await walkRoute(s, way.back);
    }
  }
} satisfies BrainStatics;

function isGreenBrick(b: Stuff): boolean {
  return b.getTemplatePath() === BRICK && MixinApi.isGreenware(b) && b.isGreen();
}

function isFireable(b: Stuff): boolean {
  return isGreenBrick(b) && MixinApi.isGreenware(b) && b.isFireable() && b.getRuin() === null;
}

/** Out of the fire: a brick whose clay the heat has converted. */
function isBurnt(b: Stuff): boolean {
  return b.getTemplatePath() === BRICK && MixinApi.isGreenware(b) && !b.isGreen();
}

function coolEnough(b: Stuff): boolean {
  return !MixinApi.isThermal(b) || b.getTemperature().rawValue() < HANDLE_BELOW_K;
}

function isPlayers(s: Stuff): boolean {
  if (MixinApi.isChattel(s) && s.stampedOwner()?.kind === 'player') return true;
  // ⭐ A STACK bears no title (owned by possession), so a player's bricks
  // set out to dry carry no stamp at all — the maker is what says whose
  // they are, and the setter carted a drive's nine bone-dry bricks to the
  // clamp off its hack (drive A, runs 29 and 32).
  return MixinApi.isCrafted(s) && PlayerApi.isAvatarIdentityPath(s.getMaker());
}

function count(goods: readonly Stuff[], pred: (s: Stuff) => boolean): number {
  let n = 0;
  for (const g of goods) {
    if (!pred(g)) continue;
    n += MixinApi.isStackable(g) ? g.getQuantity() : 1;
  }
  return n;
}

function positiveInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : fallback;
}

function waysOf(ctx: BrainContext): Way[] {
  const rows = Array.isArray(ctx.config.ways) ? ctx.config.ways : [];
  const dirs = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((d): d is string => typeof d === 'string') : [];
  const out: Way[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as { to?: unknown; go?: unknown; back?: unknown };
    if (typeof r.to !== 'string' || r.to === '') continue;
    const way = { to: r.to, go: dirs(r.go), back: dirs(r.back) };
    if (way.go.length === 0 || way.back.length === 0) continue;
    out.push(way);
  }
  return out;
}

async function walkRoute(s: Setter, directions: readonly string[]): Promise<boolean> {
  for (const direction of directions) {
    const room = s.getContainer();
    if (!room || !MixinApi.isExitable(room)) return false;
    const exit = (room as Stuff & Exitable).getExits().get(direction);
    if (!exit) return false;
    const stepped = await LocomotionApi.traverseWithDefault(s, exit);
    if (!stepped.ok) return false;
  }
  return true;
}
