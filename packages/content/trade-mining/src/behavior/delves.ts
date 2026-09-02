/**
 * `delves` brain (`/trade/mining/behavior/delves`) — the mine's producer
 * beat: a miner works a face, brings the take to the assay shed, and
 * consigns it.
 *
 * ⭐ **Supply must not be a function of concurrency.** A smelter whose
 * input dries up on a quiet night is not an economy — it is a demo that
 * only works when somebody is watching. This brain is what makes the
 * chain a running thing rather than a thing a player has to run.
 *
 * ⭐⭐ **Nothing here is unavailable to a player.** Every act is a forced
 * LITERAL verb through `CommandApi.forceCommand`, so the hand is subject
 * to exactly the rules a person is: bad ground refuses it, a worked-out
 * face refuses it, foul air will kill it. It inherits `consigns`' guards
 * line for line — bounded loops, never a bare `get <keyword>`, and home
 * is re-taken in `finally` so a beat that dies at the scale does not
 * strand the miner there.
 *
 * The beat, in order: shore if the ground is telling you to · hew the
 * best face it can reach · carry the take to the scale · `wallet use
 * house` · `consign` each lot, bounded by the shelf's headroom.
 *
 * config: `{ home: string, shelf: string, ask?: number, batch?: number }`
 * — `home` the working (template path), `shelf` the assay shed's
 * consignment counter (template path), `batch` cuts per beat (default 4).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Working, Face } from '../location/Working';
import { WORKING_MIXIN } from '../location/Working';

/** Cuts per beat — a bound, like every loop here. */
const DEFAULT_BATCH = 4;
/** The default ask per lot, in minor units. */
const DEFAULT_ASK = 8;
/** Faces considered per beat — a second bound, on the read as well as the act. */
const FACES_CAP = 10;

type Hand = Stuff & Mobile & Containable & Container & CommandGiver;

export const brain = class {
  static label = 'delves';
  // A functional producer (moves matter, feeds a smelter), not chatter:
  // its timing is load-bearing and it must run unwatched.
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (
      !MixinApi.isMobile(host) ||
      !MixinApi.isContainer(host) ||
      !MixinApi.isCommandGiver(host)
    ) {
      return;
    }
    const hand = host as Hand;
    const homePath = ctx.config.home;
    const shelfPath = ctx.config.shelf;
    if (typeof homePath !== 'string' || typeof shelfPath !== 'string') return;

    // Home is the AUTHORED working — never "wherever the hand is now".
    const home = StuffApi.findByTemplatePath(homePath);
    if (!home || !MixinApi.isContainer(home)) return;
    if (hand.getContainer() !== home) hand.teleport(home as Stuff & Container);
    if (!MixinApi.isActive(home, WORKING_MIXIN)) return;
    const working = home as unknown as Working;

    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);

    // ── set timber when the ground says to ──
    //
    // ⚠ The hand reads the SAME telegraph a player does and acts on it
    // through the same verb. It is not privileged: if it has no timber,
    // `shore` declines and the beat moves on, exactly as a person's would.
    const ground = await working.stabilityAt();
    if (ground.state !== 'sound') {
      await CommandApi.forceCommand(hand, 'shore');
    }

    // ── win what this face will give ──
    let faces: Face[] = [];
    try {
      faces = (await working.facesOf()).slice(0, FACES_CAP);
    } catch {
      return; // a working with no deposit under it: nothing to do here
    }
    const workable = faces
      .filter((f) => !f.open && f.kind === 'seam' && (f.remaining ?? 0) > 0)
      .sort((a, b) => b.grade - a.grade);
    let cut = 0;
    for (const face of workable) {
      if (cut >= batch) break;
      // Bounded twice: by the batch, and by a no-progress guard — a hew
      // that declines (bad ground, a blocked face) must not grind.
      const before = working.getWorkedFaces()[face.direction] ?? 0;
      await CommandApi.forceCommand(hand, `hew ${face.direction}`);
      cut += 1;
      if ((working.getWorkedFaces()[face.direction] ?? 0) <= before) break;
    }

    // ── carry the take to the scale ──
    //
    // ⚠ `hew` lands the lump in the ROOM, so the hand picks up its own
    // take by keyword — never a bare `get`, which is the greedy hazard
    // the `consigns` brain was bounded against.
    const lying = (home.getContents() as Stuff[]).filter((c) => isOre(c)).slice(0, batch);
    for (const lump of lying) {
      const kw = keywordOf(lump);
      if (kw) await CommandApi.forceCommand(hand, `get ${kw}`);
    }

    const carried = (hand.getContents() as Stuff[]).filter((c) => isOre(c));
    if (carried.length === 0) return;

    const shelf =
      StuffApi.findByTemplatePath(shelfPath) ??
      (await StuffApi.singletonOrClone(shelfPath));
    if (!shelf || !MixinApi.isConsignmentShelf(shelf) || !MixinApi.isContainable(shelf)) {
      return;
    }
    const outfit = (await EmploymentApi.buysFor(hand))[0];
    if (!outfit) return;
    // ⭐ The shelf's own authored cap when present — a per-shelf cap is
    // right for ore lots, and it is farming's answer to the same problem.
    const cap = shelf.getListingCapOverride() ?? listingCap();
    const headroom =
      cap > 0
        ? Math.max(0, cap - shelf.activeListingCount(outfit.getTemplatePath() ?? ''))
        : Number.POSITIVE_INFINITY;
    if (headroom <= 0) return;
    const counterRoom = shelf.getContainer();
    if (!counterRoom || !MixinApi.isContainer(counterRoom)) return;

    const lots = carried.slice(
      0,
      Number.isFinite(headroom) ? (headroom as number) : undefined,
    );
    hand.teleport(counterRoom as Stuff & Container);
    try {
      await CommandApi.forceCommand(hand, 'wallet use house');
      const ask = positiveInt(ctx.config.ask, DEFAULT_ASK);
      for (const lot of lots) {
        const kw = keywordOf(lot);
        if (!kw) continue;
        await CommandApi.forceCommand(hand, `consign ${kw} --ask ${ask}`);
      }
    } finally {
      // ⚠ ALWAYS. A beat that dies at the scale must not strand the
      // miner there with the face standing idle.
      hand.teleport(home as Stuff & Container);
    }
  }
} satisfies BrainStatics;

/** An ore lot: a chattel glob with a grade on it. */
function isOre(thing: Stuff): boolean {
  return (
    MixinApi.isGlobbable(thing) &&
    MixinApi.isChattel(thing) &&
    typeof (thing as unknown as { getGrade?(): number }).getGrade === 'function'
  );
}

function keywordOf(thing: Stuff): string | null {
  if (!MixinApi.isPerceptible(thing)) return null;
  return thing.getPrimaryKeyword() ?? thing.getKeywords()[0] ?? null;
}

/** `retail.consignment.listingCap` — the global dial (0 = none). */
function listingCap(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.retailConsignmentListingCap);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5;
  } catch {
    return 5;
  }
}

function positiveInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}
