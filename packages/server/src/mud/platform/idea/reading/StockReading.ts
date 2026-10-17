/**
 * StockReading — the stocktake: how much is really in a store
 * (storage-and-ice D6). `measure stock <stack>` gauges each line with a
 * gauging rod and prints it bracketed to the reader's appraisal; `analyze
 * stock` is the eye — words only. The keeper compares the reading with the
 * book; the engine prints no verdict.
 *
 * ⭐ This is how pilferage is DISCOVERED: a block taken off the stack by
 * hand changes no receipt, and only a stocktake set against the book shows
 * the gap.
 */

import Reading from '../../../lib/instrument/Reading';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { StoreLine } from '../../../lib/storage/StoreLine';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { Quantity } from '../../../lib/quantity';

export default class StockReading extends Reading {
  protected override async measure(
    ctx: CommandContext,
    subject: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    if (subject === null || !MixinApi.isStore(subject)) {
      this.decline(ctx, Mml.compose`There is no stack there to gauge.`, 'not-a-store');
      return;
    }
    await subject.reconcile();
    const lines = subject.getLines();
    if (lines.length === 0) {
      this.report(ctx, Mml.compose`The rod finds nothing — the store is empty.`);
      return;
    }
    const seed = this.seedFor(this.actorOf(ctx), subject, param);
    const parts: Mml[] = [];
    lines.forEach((l, i) => {
      const fig = this.bracketed(Quantity.of(l.amountKg, 'kg'), band, seed + i * 7.31);
      parts.push(Mml.compose`${labelOf(l)}: ${fig}${packingNote(l)}`);
    });
    const body = parts.reduce((acc, p) => Mml.compose`${acc}; ${p}`);
    this.report(ctx, Mml.compose`You gauge the stack. ${body}.`);
  }

  protected override async analyze(
    ctx: CommandContext,
    subject: Stuff | null,
    _band: CompetenceBandName,
    _hand: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    if (subject === null || !MixinApi.isStore(subject)) {
      this.decline(ctx, Mml.compose`There is no stack there to look over.`, 'not-a-store');
      return;
    }
    await subject.reconcile();
    const lines = subject.getLines();
    if (lines.length === 0) {
      this.report(ctx, Mml.compose`It is empty.`);
      return;
    }
    const cap = subject.getCapacityKg();
    const parts = lines.map((l) => `${labelOf(l)} — ${fullness(l.amountKg, cap)}${packingNote(l)}`);
    this.report(ctx, Mml.compose`You look the stack over: ${parts.join('; ')}.`);
  }
}

function labelOf(l: StoreLine): string {
  const [kind, band] = l.poolKey.split('|');
  return band ? `${kind}, ${band}` : (kind ?? l.poolKey);
}

function packingNote(l: StoreLine): string {
  if (l.role !== 'packing') return '';
  const s = l.state.saturation ?? 0;
  if (s >= 0.8) return ' (sodden)';
  if (s >= 0.45) return ' (wet)';
  if (s >= 0.15) return ' (damp)';
  return ' (dry)';
}

function fullness(kg: number, capacityKg: number): string {
  if (!(capacityKg > 0)) return kg > 0 ? 'a good stack' : 'nothing';
  const f = kg / capacityKg;
  if (f > 0.9) return 'near full';
  if (f > 0.6) return 'well over half full';
  if (f > 0.4) return 'about half full';
  if (f > 0.15) return 'a little under half full';
  if (f > 0.02) return 'a low pile';
  return 'a scraping';
}
