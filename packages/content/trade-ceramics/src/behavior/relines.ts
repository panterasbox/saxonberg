/**
 * relines — ⭐ the furnace's keeper relines it (ceramics D20).
 *
 * On shift, when the lining's health has fallen below
 * `ceramics.lining.relineBelow` (0.4), the keeper buys firebrick at the
 * configured counter on the house's card — as many as have burnt through —
 * and relines with `fit lining to <furnace>`. Every step is a LITERAL verb
 * through `forceCommand`, so a player watching sees the same acts a player
 * would type (the `stocks` precedent). Firebrick already in hand is fitted
 * without the errand.
 *
 * ⭐ The keeper knows his own street: every walk is an AUTHORED way on his
 * row, from where he stands on shift — to the counter (a furnace man going
 * to the store) or to the furnace (a storekeeper who keeps a kiln up the
 * hill). Nothing here searches a graph; blocked means blocked, and he tries
 * again next beat.
 *
 * Config: `{ furnace: <row path>, counter: <counter row path>,
 * ways?: [{ to: <room path>, go: [<direction>…], back: [<direction>…] }] }`.
 * The furnace is the one of that row in the room a way leads to (or the
 * keeper's own room), so a row propped in two realms is never confused.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { LocomotionApi } from '@saxonberg/server/mud/api/locomotion';
import { AppApi } from '@saxonberg/server/mud/api/app';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Burner } from '@saxonberg/server/mud/lib/fire/Burner';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';

type Keeper = Stuff & Mobile & Containable & Container & CommandGiver;
type Way = { to: string; go: readonly string[]; back: readonly string[] };
type Furnace = Stuff & Burner & Containable;

/** The word a keeper buys and fits by. */
const FIREBRICK = 'firebrick';

function relineBelow(): number {
  try {
    const raw = AppApi.setting('ceramics.lining.relineBelow');
    const n = raw == null || raw === '' ? NaN : Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0.4;
  } catch {
    return 0.4;
  }
}

export const brain = class {
  static label = 'relines';
  static kind: TaskKind = 'work';
  static summary = 'On shift, relines the house furnace with firebrick when its lining has worn thin.';
  static discipline = 'masonry';
  static claims: readonly EngagementSlot[] = ['hands'];
  static presenceGated = false;
  // A functional poller (spends money, mends a furnace), not ambient chatter.
  static ambient = false;

  /** IDLE while the lining is sound — a constant `wanted` would win every tie. */
  static urgency(ctx: BrainContext): Urgency {
    const furnace = furnaceOf(ctx);
    if (furnace === null || !wornThin(furnace)) return new Urgency('idle');
    return new Urgency('wanted', 'looks the lining over, and frowns at it');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isMobile(host) || !MixinApi.isContainer(host) || !MixinApi.isCommandGiver(host)) return;
    if (MixinApi.isEmployed(host) && !host.isFulfilling()) return;
    const keeper = host as Keeper;
    const furnace = furnaceOf(ctx);
    if (furnace === null || !wornThin(furnace)) return;
    const furnaceRoom = furnace.getContainer()?.getTemplatePath() ?? '';
    const start = keeper.getContainer()?.getTemplatePath() ?? '';
    if (furnaceRoom === '' || start === '') return;
    const ways = waysOf(ctx);
    const wayTo = (path: string): Way | null =>
      path === start ? { to: path, go: [], back: [] } : (ways.find((w) => w.to === path) ?? null);
    // A furnace he has no way to is not his to keep.
    const toFurnace = wayTo(furnaceRoom);
    if (toFurnace === null) return;

    // ── the errand: firebrick from the counter, on the house's card.
    const needed = bricksNeeded(furnace);
    if (firebrickHeld(keeper) < needed) {
      const counterPath = typeof ctx.config.counter === 'string' ? ctx.config.counter : '';
      const counter = counterPath ? StuffApi.findByTemplatePath(counterPath) : null;
      const counterRoom =
        counter && MixinApi.isContainable(counter) ? (counter.getContainer()?.getTemplatePath() ?? '') : '';
      const toCounter = counterRoom === '' ? null : wayTo(counterRoom);
      if (toCounter === null) return;
      if (!(await walkRoute(keeper, toCounter.go))) return;
      try {
        await keeper.forceCommand('wallet use house');
        for (let held = firebrickHeld(keeper); held < needed; ) {
          await keeper.forceCommand(`buy ${FIREBRICK}`);
          const now = firebrickHeld(keeper);
          if (now <= held) break; // refused (none on the shelf, no money)
          held = now;
        }
      } finally {
        await walkRoute(keeper, toCounter.back);
      }
      if (keeper.getContainer()?.getTemplatePath() !== start) return;
    }
    if (firebrickHeld(keeper) === 0) return;

    // ── the reline: at the furnace, the literal verb.
    if (!(await walkRoute(keeper, toFurnace.go))) return;
    try {
      await keeper.forceCommand(`fit lining to ${keywordOf(furnace) ?? 'furnace'}`);
    } finally {
      await walkRoute(keeper, toFurnace.back);
    }
  }
} satisfies BrainStatics;

/** Is the lining thin enough to reline? A furnace with no lining never is. */
function wornThin(furnace: Furnace): boolean {
  const h = furnace.liningHealth();
  return h !== null && h < relineBelow();
}

/**
 * The configured furnace, live: the one of that row in the keeper's room or
 * a room one of his ways leads to — else the first of the row anywhere.
 */
function furnaceOf(ctx: BrainContext): Furnace | null {
  const path = ctx.config.furnace;
  if (typeof path !== 'string' || path === '') return null;
  const rooms: Stuff[] = [];
  const here = MixinApi.isContainable(ctx.host) ? ctx.host.getContainer() : null;
  if (here) rooms.push(here as Stuff);
  for (const w of waysOf(ctx)) {
    const room = StuffApi.findByTemplatePath(w.to);
    if (room) rooms.push(room);
  }
  for (const room of rooms) {
    if (!MixinApi.isContainer(room)) continue;
    for (const c of room.getContents() as Stuff[]) {
      if (c.getTemplatePath() === path && MixinApi.isBurner(c) && MixinApi.isContainable(c)) {
        return c as Furnace;
      }
    }
  }
  const live = StuffApi.findByTemplatePath(path);
  return live && MixinApi.isBurner(live) && MixinApi.isContainable(live) ? (live as Furnace) : null;
}

/** How many bricks the lining has lost (at least one — the worn one). */
function bricksNeeded(furnace: Stuff): number {
  if (!MixinApi.isAssembled(furnace)) return 0;
  const line = furnace.getLine('lining');
  return line === null ? 0 : Math.max(1, line.failed);
}

/** Firebricks in hand, counting a stack by its quantity. */
function firebrickHeld(keeper: Keeper): number {
  let n = 0;
  for (const g of keeper.getContents() as Stuff[]) {
    if (!MixinApi.isPerceptible(g) || !g.getKeywords().includes(FIREBRICK)) continue;
    n += MixinApi.isStackable(g) ? g.getQuantity() : 1;
  }
  return n;
}

function keywordOf(s: Stuff): string | null {
  if (!MixinApi.isPerceptible(s)) return null;
  return s.getPrimaryKeyword() || s.getKeywords()[0] || null;
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

async function walkRoute(keeper: Keeper, directions: readonly string[]): Promise<boolean> {
  for (const direction of directions) {
    const room = keeper.getContainer();
    if (!room || !MixinApi.isExitable(room)) return false;
    const exit = (room as Stuff & Exitable).getExits().get(direction);
    if (!exit) return false;
    const stepped = await LocomotionApi.traverseWithDefault(keeper, exit);
    if (!stepped.ok) return false;
  }
  return true;
}
