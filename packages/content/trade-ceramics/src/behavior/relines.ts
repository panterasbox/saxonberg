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
 * ⭐ The keeper knows his own street (`knows:` on his row): every walk —
 * to the counter (a furnace man going to the store) or to the furnace (a
 * storekeeper who keeps a kiln up the hill) — is planned within it and
 * taken a `go` at a time from where he stands on shift (`ctx.goTo`, B107 —
 * it was an authored `ways:` list). Blocked means blocked, and he tries
 * again next beat.
 *
 * Config: `{ furnace: <row path>, counter: <counter row path>, knows?:
 * <extent> }`. The furnace is the one of that row in the keeper's room or a
 * room he knows, so a row propped in two realms is never confused.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Burner } from '@saxonberg/server/mud/lib/fire/Burner';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';

type Keeper = Stuff & Mobile & Containable & Container & CommandGiver;
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
    // A furnace in a place he does not know is not his to keep.
    if (furnaceRoom !== start && !ctx.knows(furnaceRoom)) return;

    // ── the errand: firebrick from the counter, on the house's card.
    const needed = bricksNeeded(furnace);
    if (firebrickHeld(keeper) < needed) {
      const counterPath = typeof ctx.config.counter === 'string' ? ctx.config.counter : '';
      const counter = counterPath ? StuffApi.findByTemplatePath(counterPath) : null;
      const counterRoom =
        counter && MixinApi.isContainable(counter) ? (counter.getContainer()?.getTemplatePath() ?? '') : '';
      if (counterRoom === '' || !ctx.knows(counterRoom)) return;
      if (!(await ctx.goTo(counterRoom))) return;
      try {
        await keeper.forceCommand('wallet use house');
        for (let held = firebrickHeld(keeper); held < needed; ) {
          await keeper.forceCommand(`buy ${FIREBRICK}`);
          const now = firebrickHeld(keeper);
          if (now <= held) break; // refused (none on the shelf, no money)
          held = now;
        }
      } finally {
        await ctx.goTo(start);
      }
      if (keeper.getContainer()?.getTemplatePath() !== start) return;
    }
    if (firebrickHeld(keeper) === 0) return;

    // ── the reline: at the furnace, the literal verb.
    if (!(await ctx.goTo(furnaceRoom))) return;
    try {
      await keeper.forceCommand(`fit lining to ${keywordOf(furnace) ?? 'furnace'}`);
    } finally {
      await ctx.goTo(start);
    }
  }
} satisfies BrainStatics;

/** Is the lining thin enough to reline? A furnace with no lining never is. */
function wornThin(furnace: Furnace): boolean {
  const h = furnace.liningHealth();
  return h !== null && h < relineBelow();
}

/**
 * The configured furnace, live: the one of that row in the keeper's room,
 * else in a room he knows — else the first of the row anywhere.
 */
function furnaceOf(ctx: BrainContext): Furnace | null {
  const path = ctx.config.furnace;
  if (typeof path !== 'string' || path === '') return null;
  const here = MixinApi.isContainable(ctx.host) ? ctx.host.getContainer() : null;
  const furnaces = StuffApi.findAllByTemplatePath<Stuff>(path).filter(
    (c): c is Furnace => MixinApi.isBurner(c) && MixinApi.isContainable(c),
  );
  const roomOf = (f: Furnace): string => f.getContainer()?.getTemplatePath() ?? '';
  return (
    furnaces.find((f) => here !== null && f.getContainer() === here) ??
    furnaces.find((f) => roomOf(f) !== '' && ctx.knows(roomOf(f))) ??
    furnaces[0] ??
    null
  );
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

