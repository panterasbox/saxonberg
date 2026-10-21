/**
 * CurrentReading — ⭐ `measure current`: how fast the water is running
 * where you are (river D32).
 *
 * The second of the river's two readings, beside `measure temperature`:
 * the three things that kill you in a river are cold, rough water and
 * traps, and the current is how hard the river is pushing you into all of
 * them. Without it they are learned by drowning.
 *
 * - **The eye rung** reads the surface — *slack, slow, brisk, fast,
 *   racing* — in words, and no further than the row's ceiling.
 * - **The log rung** times a float over a measured line (the current log)
 *   and gives the figure, bracketed by the band.
 *
 * Where the water is: the water place you are in (the river where you
 * are — the margin's current at a bank, the channel's mid-river), or the
 * water a shore you stand on cites (`measure current river`).
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';

export default class CurrentReading extends Reading {
  /** The eye rung: what the surface tells you, in words. */
  protected override async analyze(
    context: CommandContext,
    _target: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const mps = await this.currentFor(giver, param);
    if (mps === null) {
      this.decline(context, Mml.compose`There is no running water here to judge.`, 'no-water');
      return;
    }
    this.report(context, Mml.compose`${eyeWords(mps)}\n`);
  }

  /** The log rung: a float timed over a measured line. */
  protected override async measure(
    context: CommandContext,
    _target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const mps = await this.currentFor(giver, param);
    if (mps === null) {
      this.decline(context, Mml.compose`There is no running water here to put a log in.`, 'no-water');
      return;
    }
    const speed = Math.abs(mps);
    const shown = this.bracketed(Quantity.of(speed, 'm/s'), band, this.seedFor(giver, null, param));
    const up = mps < -0.05 ? ' — upstream, on the flood tide' : '';
    this.report(
      context,
      Mml.compose`The log runs out along its line: the current is ${shown}${up}. ${eyeWords(mps)}\n`,
    );
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: this.getDiscipline() || 'swimming', difficulty: 'standard', outcome: 'success' });
    }
  }

  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!target) return null;
    const mps = await this.currentFor(target, '');
    return mps === null ? null : Math.abs(mps);
  }

  /**
   * The current where `who` is: the first water place they are in (a boat
   * is a step in the walk), else the water the shore they stand on cites.
   * `null` where there is no water to read.
   */
  private async currentFor(who: Stuff, param: string): Promise<number | null> {
    let at: Stuff | null = who;
    while (at !== null) {
      if (MixinApi.isWaterPlace(at)) return at.currentFor(who);
      if (MixinApi.isShore(at) && !MixinApi.isWaterPlace(at) && at !== who) {
        const pick = await at.waterRefFor(param || undefined);
        if ('ref' in pick) return pick.read.currentMps ?? 0;
        if (param !== '') return null;
      }
      at = MixinApi.isContainable(at) ? (at.getContainer() as Stuff | null) : null;
    }
    return null;
  }
}

/** What an eye on the surface says, from *slack* to *racing*. */
function eyeWords(mps: number): string {
  const v = Math.abs(mps);
  const up = mps < -0.05 ? ' It is running UP the river — the tide is making.' : '';
  if (v < 0.1) return `The water is slack; a leaf on it barely moves.${up}`;
  if (v < 0.4) return `The water is slow; a stick drifts at a stroll.${up}`;
  if (v < 1) return `The water is brisk; a stick goes by at a walk.${up}`;
  if (v < 2) return `The water is fast; a stick goes by faster than you could walk.${up}`;
  return `The water is racing; anything on it is gone before you can follow it.${up}`;
}
