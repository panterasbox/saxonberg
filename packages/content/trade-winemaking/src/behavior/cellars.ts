/**
 * The `cellars` brain — the winery's producing beat (fermentation P7,
 * the `farms` shape: literal player verbs, bounded, home in `finally`).
 *
 * One concern per beat, read off the floor's vats:
 *
 *  - a FINISHED (or turned) vat → the bottling leg: take an empty
 *    bottle, fill it from the vat (the W0 seam stamps the batch's band
 *    and mark), cork it, and consign the take at the distributor as
 *    the outfit;
 *  - an IDLE vat with grapes in reach → the crush leg: `order crush`
 *    off the cellar book (the shipped kitchen-menu shape — the hand is
 *    the on-shift maker and the board is unpriced), then pour the
 *    bucket into the vat — the pour is the fill that founds the batch;
 *  - otherwise, every `buyEvery` beats → the buying leg: the house
 *    card at the distributor, grapes home to the floor (the B2B leg,
 *    observable in `bank_ledger`).
 *
 * Every act is a literal player verb; reads (vat phase, held stock)
 * are direct state reads, the `farms` rule. Ferment timing does the
 * rest — the brain never sleeps on a batch, it just reads the vat
 * each beat.
 *
 * config: `{ home: string, counterRoom: string, asks: Record<string,
 * number>, defaultAsk?: number, batch?: number, buyEvery?: number,
 * buyCount?: number, crushes?: string[] }`
 */

import type { BrainContext, BrainStatics } from '@saxonberg/server/mud/lib/behavior/brain';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Fermenting } from '@saxonberg/server/mud/lib/ferment/Fermenting';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';

const DEFAULT_BATCH = 4;
const DEFAULT_ASK = 10;
const DEFAULT_BUY_EVERY = 6;
const DEFAULT_BUY_COUNT = 2;
/** Crush orders per crush beat (each fills one bucket → one pour). */
const CRUSHES_PER_BEAT = 3;

type Hand = Stuff & Mobile & Containable & Container & CommandGiver;

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function positiveInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? Math.floor(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** The floor's fermenting vats (category `vat` — never the bottles). */
function vatsIn(room: Stuff & Container): (Stuff & Fermenting)[] {
  const out: (Stuff & Fermenting)[] = [];
  for (const c of room.getContents()) {
    if (!MixinApi.isFermenting(c)) continue;
    if (!MixinApi.isBulkable(c) || c.getCategory() !== 'vat') continue;
    out.push(c);
  }
  return out;
}

/** Empty wine bottles standing on the floor (the vessel faucet's). */
function emptyBottles(room: Stuff & Container): Stuff[] {
  const out: Stuff[] = [];
  for (const c of room.getContents()) {
    if (!MixinApi.isBulkable(c)) continue;
    if (c.getCategory() !== 'wine-bottle') continue;
    if (!c.isBulkEmpty('interior')) continue;
    out.push(c);
  }
  return out;
}

/** Loose grape items reachable on the floor (crates are open Containers). */
function grapesInReach(room: Stuff & Container): number {
  let n = 0;
  for (const c of room.getContents()) {
    if (MixinApi.isContainer(c)) {
      for (const inner of c.getContents()) {
        if (keywordOf(inner) === 'grapes') n++;
      }
    }
    if (keywordOf(c) === 'grapes' && !MixinApi.isContainer(c)) n++;
  }
  return n;
}

function keywordOf(s: Stuff): string | null {
  const v = (s as unknown as { getPrimaryKeyword?: () => string | null })
    .getPrimaryKeyword?.();
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** The ask for a filled bottle, by its held material's primary keyword. */
function askFor(
  config: Record<string, unknown>,
  bottle: Stuff,
): number {
  const asks = (config.asks ?? {}) as Record<string, number>;
  const fallback = positiveInt(config.defaultAsk, DEFAULT_ASK);
  if (!MixinApi.isBulkable(bottle)) return fallback;
  const held = bottle.getBulkMaterial('interior');
  const kw = held?.getPrimaryKeyword() ?? held?.getName() ?? '';
  const ask = asks[kw];
  return typeof ask === 'number' && ask > 0 ? ask : fallback;
}

export const brain = class {
  static label = 'cellars';
  static presenceGated = false;
  // A functional poller (works the cellar, moves stock), not chatter.
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const hand = ctx.host as Hand;
    const homePath = str(ctx.config.home);
    const counterRoomPath = str(ctx.config.counterRoom);
    if (!homePath || !counterRoomPath) return;

    // Home is the AUTHORED floor — never "wherever the hand is now".
    const home = StuffApi.findByTemplatePath(homePath);
    if (!home || !MixinApi.isContainer(home)) return;
    if (hand.getContainer() !== home) hand.teleport(home as Stuff & Container);

    const beats = ((ctx.state.beats as number | undefined) ?? 0) + 1;
    ctx.state.beats = beats;

    const vats = vatsIn(home);
    if (vats.length === 0) return;

    // ── the bottling leg: a finished (or turned) vat pays out ──
    const ready = vats.find((v) => {
      const phase = v.getFermentPhase();
      if (phase !== 'finished' && phase !== 'turned') return false;
      const bulk = v as Stuff & Fermenting & { getBulkAvailable(a: 'interior'): number };
      return bulk.getBulkAvailable('interior') > 0.75;
    });
    if (ready) {
      await this.bottleAndConsign(ctx, hand, home, counterRoomPath);
      return;
    }

    // ── the crush leg: an idle vat and grapes in reach ──
    const idle = vats.find((v) => v.getFermentPhase() === 'idle');
    if (idle && grapesInReach(home) >= 6) {
      const crushes = Array.isArray(ctx.config.crushes)
        ? (ctx.config.crushes as string[])
        : ['crush'];
      const which = crushes[beats % crushes.length] ?? 'crush';
      for (let i = 0; i < CRUSHES_PER_BEAT; i++) {
        if (grapesInReach(home) < 6) break;
        await CommandApi.forceCommand(hand, `order ${which}`);
        await CommandApi.forceCommand(hand, `pour bucket into vat`);
      }
      return;
    }

    // ── the buying leg: grapes from the distributor, on the house ──
    const buyEvery = positiveInt(ctx.config.buyEvery, DEFAULT_BUY_EVERY);
    if (beats % buyEvery === 0) {
      await this.buyGrapes(ctx, hand, home, counterRoomPath);
    }
  }

  /** Fill, cork and consign up to `batch` bottles from the ready vat. */
  private static async bottleAndConsign(
    ctx: BrainContext,
    hand: Hand,
    home: Stuff & Container,
    counterRoomPath: string,
  ): Promise<void> {
    const batch = positiveInt(ctx.config.batch, DEFAULT_BATCH);
    const empties = emptyBottles(home).slice(0, batch);
    const filled: Stuff[] = [];
    for (let i = 0; i < empties.length; i++) {
      await CommandApi.forceCommand(hand, 'get bottle');
      await CommandApi.forceCommand(hand, 'fill bottle from vat');
      await CommandApi.forceCommand(hand, 'close bottle');
      // Verify by state, not hope: an empty fill (vat ran dry) stops the leg.
      const held = hand
        .getContents()
        .find((c) => MixinApi.isBulkable(c) && !c.isBulkEmpty('interior'));
      if (!held) break;
      filled.push(held);
    }
    if (filled.length === 0) return;

    const counterRoom = StuffApi.findByTemplatePath(counterRoomPath);
    if (!counterRoom || !MixinApi.isContainer(counterRoom)) return;
    hand.teleport(counterRoom as Stuff & Container);
    try {
      await CommandApi.forceCommand(hand, 'wallet use house');
      for (const bottle of filled) {
        const ask = askFor(ctx.config, bottle);
        await CommandApi.forceCommand(hand, `consign bottle --ask ${ask}`);
      }
    } finally {
      hand.teleport(home);
    }
  }

  /** Buy grape crates at the distributor and carry them home. */
  private static async buyGrapes(
    ctx: BrainContext,
    hand: Hand,
    home: Stuff & Container,
    counterRoomPath: string,
  ): Promise<void> {
    const counterRoom = StuffApi.findByTemplatePath(counterRoomPath);
    if (!counterRoom || !MixinApi.isContainer(counterRoom)) return;
    const buyCount = positiveInt(ctx.config.buyCount, DEFAULT_BUY_COUNT);
    hand.teleport(counterRoom as Stuff & Container);
    try {
      await CommandApi.forceCommand(hand, 'wallet use house');
      for (let i = 0; i < buyCount; i++) {
        await CommandApi.forceCommand(hand, 'buy grapes');
        await CommandApi.forceCommand(hand, 'get grapes');
      }
    } finally {
      hand.teleport(home);
      // Set the crates down where the press can reach them.
      for (const c of [...hand.getContents()]) {
        if (keywordOf(c) === 'grapes') {
          await CommandApi.forceCommand(hand, 'drop grapes');
        }
      }
    }
  }
} satisfies BrainStatics;
