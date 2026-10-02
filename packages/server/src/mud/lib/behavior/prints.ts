/**
 * `prints` brain — the editor who PRINTS the price index (economic
 * bootstrap D20): once an edition window, read `BankingApi.priceIndex()`
 * and put the number in print as the paper, through the literal verb —
 * `press post "Prices: the basket stands at one hundred and four against
 * the base" --as <publisher> --kind notice` — as the editor, who holds the
 * publishing seat on the paper's chart.
 *
 * ⭐ Journalism, never an oracle. The index is what the counters ASK,
 * read off the shelves the Schedule's basket names; the Gazette reports
 * it and a member can walk the same row and check. The state aggregates
 * and never reports — this is a paper on the committee's chart, and the
 * reserve's dashboard prints the same number to the Governor.
 *
 * The cadence is REAL (the row says `cadence:2m`); the edition window is
 * GAME time (`press.indexEditionGameHours`), remembered on the host's
 * scratch state as the game-second of the last edition — so a paper
 * prints on the world's clock, and a fast-running world prints often.
 *
 * config: `{ publisher: string }` — the organization path to publish as.
 */

import { MixinApi } from '../../api/mixin';
import { BankingApi } from '../../api/banking';
import { AppApi } from '../../api/app';
import { GrammarApi } from '../../api/grammar';
import { WorldClockApi } from '../../api/worldclock';
import { AppSettingKeys } from '../config/AppSettings';
import type { BrainContext, BrainStatics } from './brain';
import type { EngagementSlot } from '../activity/Engaged';
import type { TaskKind } from './Urgency';
import { Urgency } from './Urgency';

const DEFAULT_EDITION_GAME_HOURS = 6;

export const brain = class {
  static label = 'prints';
  static kind: TaskKind = 'work';
  static claims: readonly EngagementSlot[] = ['hands', 'attention'];
  static summary =
    "Prints the price index as the paper's notice once an edition " +
    'window, through the ordinary `press post` verb.';
  // ⚠ No `discipline:` — the realm ships no journalism Discipline, and a
  // brain crediting a key nothing resolves writes evidence nobody can
  // read back. `lint:idle-cadence` refuses it, which is how this comment
  // came to exist.
  // ⭐ The honest read: there is nothing to do until the window is up.
  // Returning `wanted` every beat and discarding it inside `act` would
  // make the editor look busy while doing nothing, and would cost every
  // other candidate a tie-break it should have won.
  static urgency(ctx: BrainContext): Urgency {
    const publisher = ctx.config.publisher;
    if (typeof publisher !== 'string' || publisher === '') {
      return new Urgency("idle");
    }
    const now = WorldClockApi.getNow().rawValue();
    const window = editionGameHours() * 3600;
    const last =
      typeof ctx.state.lastEditionS === 'number'
        ? ctx.state.lastEditionS
        : -Infinity;
    if (now - last < window) return new Urgency("idle");
    return new Urgency('wanted', 'squares up a sheet and starts setting type');
  }
  static presenceGated = false;
  // A functional poller (the paper prints with nobody reading), not
  // ambient chatter — exempt from the global ambient-cadence dial.
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host)) return;
    const publisher = ctx.config.publisher;
    if (typeof publisher !== 'string' || publisher === '') return;

    // The edition window, on the world's clock.
    const now = WorldClockApi.getNow().rawValue();
    const window = editionGameHours() * 3600;
    const last = typeof ctx.state.lastEditionS === 'number' ? ctx.state.lastEditionS : -Infinity;
    if (now - last < window) return;

    const index = BankingApi.priceIndex();
    if (index.counters.length === 0) return;
    ctx.state.lastEditionS = now;

    const headline = `Prices: the basket stands at ${GrammarApi.inWords(index.percent)} against a base of one hundred`;
    // NOT forced: a forced frame is unattributable by design (the stamp
    // keeps a player's driven act off their name), and a release derives
    // its author from the frame. The editor prints under their own name —
    // the beat is their act, not something done to them.
    await host.executeCommand(`press post "${headline}" --as ${publisher} --kind notice`);
  }
} satisfies BrainStatics;

/** `press.indexEditionGameHours` — the edition window, or the code floor. */
function editionGameHours(): number {
  try {
    const raw = Number(AppApi.setting(AppSettingKeys.pressIndexEditionGameHours));
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_EDITION_GAME_HOURS;
  } catch {
    return DEFAULT_EDITION_GAME_HOURS;
  }
}
