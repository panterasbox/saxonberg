/**
 * fodders — a stock hand's brain (cover build D14): make the hay in
 * summer and stack it on the rick, so the herd has a winter.
 *
 * Every act a verb a player could type, and in this order each beat:
 *
 *   1. holding hay beside an EMPTY trough → `put hay in <trough>` (the
 *      forking a keeper sees; the trough is otherwise kept from the rick
 *      by its own `suppliedBy`, which is what carries a month nobody is
 *      watching — a clock jump runs no brain);
 *   2. holding hay at the rick → `put hay in <store>`, then walk back out
 *      to the meadow;
 *   3. holding hay in the meadow → walk home to the rick;
 *   4. in the meadow, hay lying cut → `get hay`;
 *   5. in the meadow, the grass ready to cut and a scythe in hand → `mow`;
 *   6. anywhere else, not holding → walk out to the meadow.
 *
 * ⭐ The meadow is where the hand waits. A hand that waited at the rick
 * would have to walk out to look at grass it cannot see from the yard,
 * every beat, all winter.
 *
 * config: `{ meadow: string[], home: string[], store: string,
 * trough?: string }` — the directions from the rick out to the meadow
 * and back, the rick's word, and the trough's word.
 *
 * ⚠ The config names WORDS, never commands (the `cuts` rule): a row that
 * could hand this brain a command string would make its NPC type
 * anything at all.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import Field from '@saxonberg/content-trade-farming/src/location/Field';

/** What the hand can see where it stands. */
interface Yard {
  /** Standing in the configured meadow. */
  inMeadow: boolean;
  /** Standing beside the configured rick. */
  atStore: boolean;
  /** A trough of the configured word here, with nothing in it. */
  troughEmpty: boolean;
  /** Hay in hand. */
  holdingHay: boolean;
  /** Cut hay lying loose on the ground here. */
  hayLying: boolean;
  /** The grass here is ready to cut. */
  mowable: boolean;
  /** A mowing tool in hand. */
  hasScythe: boolean;
}

interface Round {
  meadow: readonly string[];
  home: readonly string[];
  store: string;
  trough: string | null;
}

/** One plain word — a direction or a keyword, never a command. */
const WORD = /^[a-z][a-z-]*$/i;

export const brain = class {
  static label = 'fodders';
  static kind: TaskKind = 'work';
  static summary = 'Makes the hay in summer and stacks it on the rick for the winter.';
  static discipline = 'stockmanship';
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static presenceGated = false;
  static ambient = false;

  static round(config: unknown): Round {
    const c = (config ?? {}) as {
      meadow?: unknown[];
      home?: unknown[];
      store?: unknown;
      trough?: unknown;
    };
    const words = (v: unknown[] | undefined): string[] =>
      (v ?? []).filter((d): d is string => typeof d === 'string' && WORD.test(d));
    const word = (v: unknown): string | null =>
      typeof v === 'string' && WORD.test(v) ? v : null;
    return {
      meadow: words(c.meadow),
      home: words(c.home),
      store: word(c.store) ?? 'rick',
      trough: word(c.trough),
    };
  }

  static urgency(ctx: BrainContext): Urgency {
    const round = brain.round(ctx.config);
    const yard = brain.read(ctx.host, round);
    return yard && brain.next(yard, round) !== null
      ? new Urgency('wanted', 'sees to the hay')
      : new Urgency('idle');
  }

  /** The next verbs (an errand is one per line), or `null`. Pure. */
  static next(y: Yard, r: Round): string | null {
    const go = (dirs: readonly string[]): string[] => dirs.map((d) => `go ${d}`);
    if (y.holdingHay && y.troughEmpty && r.trough) return `put hay in ${r.trough}`;
    if (y.holdingHay && y.atStore) {
      return [`put hay in ${r.store}`, ...go(r.meadow)].join('\n');
    }
    if (y.holdingHay && y.inMeadow) return go(r.home).join('\n') || null;
    if (y.inMeadow) {
      if (y.hayLying) return 'get hay';
      if (y.mowable && y.hasScythe) return 'mow';
      return null;
    }
    if (!y.holdingHay && y.atStore) return go(r.meadow).join('\n') || null;
    return null;
  }

  static read(host: Stuff, r: Round): Yard | null {
    // A hired hand works on shift.
    if (
      MixinApi.isEmployed(host) &&
      host.getActiveEmployment() &&
      host.shiftState() !== 'on-shift'
    ) {
      return null;
    }
    if (!MixinApi.isContainable(host)) return null;
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return null;
    const named = (s: Stuff, w: string): boolean =>
      MixinApi.isPerceptible(s) && s.hasKeyword(w);
    const isHay = (s: Stuff): boolean =>
      MixinApi.isTangible(s) && s.isEdible() && named(s, 'hay');
    const held = MixinApi.isContainer(host) ? (host.getContents() as Stuff[]) : [];
    const here = room.getContents() as Stuff[];
    const store = here.find((s) => MixinApi.isContainer(s) && named(s, r.store));
    const trough = r.trough
      ? here.find((s) => MixinApi.isFeeder(s) && named(s, r.trough!))
      : undefined;
    const field = room instanceof Field ? room : null;
    const band = field ? field.swardBand() : null;
    return {
      inMeadow: field !== null && store === undefined,
      atStore: store !== undefined,
      troughEmpty: trough !== undefined && MixinApi.isFeeder(trough) && trough.offerings().length === 0,
      holdingHay: held.some(isHay),
      hayLying: here.some((s) => isHay(s) && !MixinApi.isFeeder(s)),
      mowable: band === 'ready' || band === 'ahead-of-them',
      hasScythe: held.some((s) => MixinApi.isTool(s) && s.hasCapability('mowing')),
    };
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host)) return;
    const round = brain.round(ctx.config);
    const yard = brain.read(host, round);
    if (yard === null) return;
    const verbs = brain.next(yard, round);
    if (verbs === null) return;
    for (const verb of verbs.split('\n')) {
      // NOT forced: the work is the hand's own act (the `cuts` rule).
      await (host as Stuff & CommandGiver).executeCommand(verb);
    }
  }
};
