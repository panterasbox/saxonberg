/**
 * `hauls` brain (`/trade/haulage/behavior/hauls`) — ⭐⭐ **the reserve
 * supply of the realm's first labor market.**
 *
 * Each beat the carter reads the boards, and for every posted haul that
 * **nobody has taken inside its window** he does the work himself:
 * walks to the origin, picks up the crate, journeys to the destination,
 * puts it down, and turns the gig in.
 *
 * Three things that buys at once, and the third is the one that matters:
 *
 *  1. the economy stays **DAU-independent** — the standing commitment
 *     holds, because the NPC always covers;
 *  2. every NPC-performed haul is **visibly a job a player could have
 *     taken and didn't** — the labor market is legible even when nobody
 *     is in it;
 *  3. ⭐⭐ **the NPC is the reserve supply, so it SETS THE WAGE.** A
 *     player cannot charge more than the carter costs and need not
 *     accept less. The reservation wage, doing real work.
 *
 * ## ⚠ It does not CLAIM
 *
 * Gigs are posted `--bounty`: no claim step, escrow held from post,
 * anyone may turn it in. So the carter never takes a gig off the board
 * — he simply does one nobody else did, and turns it in. That dodges
 * contract.md's deferred *"NPC claiming brains"* seam entirely, and it
 * is why **a player who does it first is paid and the carter finds
 * nothing** (AC15e): the gig is settled and gone by the time he looks.
 *
 * ## ⚠ The window is the CARTER's patience, not the posting's lifetime
 *
 * Postings are minted with no expiry. If the posting lapsed instead, the
 * escrow would revert and the venue would go unstocked — the exact
 * regression D11 forbids. So the gig stays open forever and the carter
 * waits `haulage.gigWindowGameHours` before covering it. **The venue is
 * stocked either way** (AC15f), and the window is what makes the job
 * visible to a player first.
 *
 * ## ⭐ It moves on the SAME `Journey` a player drives
 *
 * There is no second implementation (AC14). The carter plans a route on
 * a lane and runs a `Journey`, exactly as `journey to <place>` does —
 * so a background haul passes through every room on the way, and a busy
 * road is visibly busy whether or not anybody is playing.
 *
 * ⚠ Every act is a literal verb through `forceCommand`, so the carter is
 * subject to the rules a person is: a blocked road stops him, a rig he
 * cannot handle refuses him, and a gig he cannot reach he does not do.
 * It inherits `consigns`' guards line for line — bounded loops, never a
 * bare `get <keyword>`, and home is re-taken in `finally`.
 *
 * config: `{ boards: string[], lane?: string, batch?: number }` — the
 * boards it watches (template paths), the lane it travels (default
 * `city`), and how many gigs it will cover per beat (default 1, because
 * a haul is a long act and a carter who did four at once would be
 * teleporting in all but name).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { ContractApi } from '@saxonberg/server/mud/api/contract';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { ContractRecord } from '@saxonberg/server/mud/lib/employment/ContractRecord';
import type {
  BrainContext,
  BrainStatics,
} from '@saxonberg/server/mud/lib/behavior/brain';
import LaneCatalogue, {
  LANE_CATALOGUE_PATH,
} from '@saxonberg/content-transport/src/idea/LaneCatalogue';

/** Game hours a posted haul waits for a player before the carter covers it. */
const DEFAULT_WINDOW_GAME_HOURS = 6;
/** ⚠ One. A haul is a long act; a carter doing four a beat is teleporting. */
const DEFAULT_BATCH = 1;
const ONE_GAME_HOUR_S = 3_600;

type Carter = Stuff & Mobile & Containable & Container & CommandGiver;

export const brain = class {
  static label = 'hauls';
  static presenceGated = false;
  // A functional poller (it moves freight), not ambient chatter —
  // exempt from the global ambient-cadence dial.
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
    const carter = host as Carter;
    const boards = stringList(ctx.config.boards);
    if (boards.length === 0) return;

    const nowS = WorldClockApi.getNow().rawValue();
    const windowS = windowGameHours() * ONE_GAME_HOUR_S;
    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);

    // Everything posted, oldest first — the longest-waiting job is the
    // one a carter goes to, and it is also the one a player has had the
    // most chance to take.
    const waiting: ContractRecord[] = [];
    for (const board of boards) {
      for (const gig of await ContractApi.openGigsOn(board)) {
        // ⚠ Untaken AND past its window. A gig somebody is holding is
        // theirs; a gig posted a moment ago is a player's chance.
        if (gig.claimant !== '') continue;
        if (nowS - gig.postedAt < windowS) continue;
        if (gig.origin === '') continue;
        waiting.push(gig);
      }
    }
    if (waiting.length === 0) return;
    waiting.sort((a, b) => a.postedAt - b.postedAt);

    const home = carter.getContainer();
    for (const gig of waiting.slice(0, batch)) {
      await cover(carter, gig, String(ctx.config.lane ?? 'city'));
    }
    // Back to the yard. In a `finally`-shaped position for the same
    // reason `consigns` re-takes home: a beat that died mid-route must
    // not strand the carter at somebody else's counter.
    if (home && MixinApi.isContainer(home) && carter.getContainer() !== home) {
      await travel(carter, home.getTemplatePath() ?? '', 'city');
    }
  }
} satisfies BrainStatics;

/** Do one gig: fetch, carry, drop, turn in. */
async function cover(
  carter: Carter,
  gig: ContractRecord,
  lane: string,
): Promise<void> {
  const destination = gig.clause?.condition.destinationPath ?? '';
  if (destination === '') return;

  // 1 · To the origin.
  if (!(await travel(carter, gig.origin, lane))) return;

  // 2 · Pick the consignment up. ⚠⚠ `get 1 <kw>`, never a bare
  // `get <kw>`: `get` binds GREEDILY, and a floor holding many crates
  // would otherwise put every one of them in the carter's arms — the
  // batch cap above would then bound nothing at all. The `consigns`
  // brain learned this the expensive way (a profile put 54% of the
  // process in the resulting inventory walk).
  let crate = crateFor(carter, gig);

  // ⭐⭐ **A SUPPLY order is bought, not collected.** The two legs of
  // this economy are genuinely different acts:
  //
  //   - a PRODUCER's crate is already made and already the house's, so
  //     the carriage is pure carriage — no capital, the labor market's
  //     first rung;
  //   - a VENUE's order names goods standing on somebody's counter, and
  //     whoever fetches them **buys them and is reimbursed by the
  //     reward**. That is what a supply run actually is, it keeps the
  //     distributor paid and the consignors' resale intact, and it makes
  //     a real second rung with working capital.
  //
  // ⚠ The keeper could not do this herself: `buy` happens at a counter
  // and she no longer travels. So it is the hauler's, exactly as it
  // would be for a player taking the same job.
  if (!crate) {
    crate = await buyAtOrigin(carter, gig);
    if (!crate) return;
  }
  const kw = keywordOf(crate);
  if (!kw) return;
  if (crate.getContainer() !== (carter as unknown as Stuff)) {
    await carter.forceCommand(`get 1 ${kw}`);
    if (crate.getContainer() !== (carter as unknown as Stuff)) return;
  }

  // 3 · Carry it. The same `Journey` a player drives — no second
  // movement implementation anywhere (AC14/AC5).
  if (!(await travel(carter, destination, lane))) return;

  // 4 · Put it down where it was wanted, and turn the gig in. The
  // completion pays the escrow to the carter's employer and announces
  // `contract.settled`, which is what files the bill of lading — so the
  // brain's carriage is on the paper exactly like a counter tender's.
  await carter.forceCommand(`drop ${kw}`);
  await carter.forceCommand(`job complete ${gig.contractId.slice(0, 8)}`);
}

/**
 * Walk or drive to `path` on `lane`, one `Journey`.
 *
 * ⚠ Returns false when there is no route: **blocked means blocked**, and
 * auto-replanning around it would hide the geography this whole build
 * exists to make real. The carter simply does not do that job this beat,
 * and the gig stays on the board for somebody who can.
 */
async function travel(
  carter: Carter,
  path: string,
  lane: string,
): Promise<boolean> {
  if (path === '') return false;
  const here = carter.getContainer()?.getTemplatePath() ?? '';
  if (here === path) return true;

  const catalogue = await StuffApi.singleton<LaneCatalogue>(
    LANE_CATALOGUE_PATH,
  ).catch(() => null);
  if (!catalogue) return false;
  const route = await catalogue.planRoute(here, path, lane);
  if (!route) return false;

  // The literal verb, through the ordinary dispatch — the carter is
  // subject to every gate a person is.
  await carter.forceCommand(`journey to ${path} via ${lane}`);
  return carter.getContainer()?.getTemplatePath() === path;
}

/**
 * Buy what the gig names, here, as the carrier's house — the supply
 * leg's first act.
 *
 * ⚠ It buys ONE. A gig names one line, and a carter who bought a
 * counter out would be doing something no player would be allowed to
 * afford. Returns what is now in hand, or `null` if the counter refused
 * (out of stock, or the house cannot pay — either way the gig stays on
 * the board for somebody who can).
 */
async function buyAtOrigin(
  carter: Carter,
  gig: ContractRecord,
): Promise<(Stuff & Containable) | null> {
  const condition = gig.clause?.condition;
  if (!condition || condition.item.kind !== 'template') return null;
  const wanted = condition.item.path;

  const here = carter.getContainer();
  if (!here || !MixinApi.isContainer(here)) return null;
  // The counter's own goods carry the keyword a `buy` binds on. Reading
  // the exemplar rather than guessing means the carter asks for exactly
  // what the gig named.
  const exemplar = (here.getContents() as Stuff[]).find(
    (s) => s.getTemplatePath() === wanted,
  );
  const kw = exemplar ? keywordOf(exemplar) : null;
  if (!kw) return null;

  await carter.forceCommand('wallet use house');
  await carter.forceCommand(`buy ${kw}`);
  const got = (carter.getContents() as Stuff[]).find(
    (s) => s.getTemplatePath() === wanted,
  );
  return got && MixinApi.isContainable(got)
    ? (got as Stuff & Containable)
    : null;
}

/** The consignment this gig is about, standing at the origin. */
function crateFor(carter: Carter, gig: ContractRecord): (Stuff & Containable) | null {
  const here = carter.getContainer();
  if (!here || !MixinApi.isContainer(here)) return null;
  const condition = gig.clause?.condition;
  if (!condition) return null;
  for (const thing of here.getContents() as Stuff[]) {
    if (!MixinApi.isContainable(thing)) continue;
    if (condition.item.kind === 'chattel') {
      if (
        MixinApi.isChattel(thing) &&
        thing.getChattelId() === condition.item.chattelId
      ) {
        return thing as Stuff & Containable;
      }
      continue;
    }
    if (thing.getTemplatePath() === condition.item.path) {
      return thing as Stuff & Containable;
    }
  }
  return null;
}

function keywordOf(thing: Stuff): string | null {
  if (!MixinApi.isPerceptible(thing)) return null;
  return thing.getPrimaryKeyword() || thing.getKeywords()[0] || null;
}

/**
 * ⭐ `haulage.gigWindowGameHours` — **the window IS the labor market.**
 * Too short and nobody ever sees a job; too long and a bar runs dry
 * waiting for somebody who was never coming.
 */
function windowGameHours(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.haulageGigWindowGameHours);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDOW_GAME_HOURS;
  } catch {
    return DEFAULT_WINDOW_GAME_HOURS;
  }
}

function stringList(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : [];
}

function positiveInt(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
    ? Math.floor(v)
    : fallback;
}
