/**
 * RearingTray — a shallow wooden tray, and ⭐ the host of a rearing.
 *
 * The box IS the host, exactly as the hive carries its colony: a tray of
 * worms is one thing you carry, read and keep warm, and the worms are its
 * state (`RearingMixin`). It is `Thermal` because the rearing's clock is
 * the tray's own temperature — true of any wooden tray in any room — and a
 * `Container` because everything you do to a rearing is `put` something
 * in it or `get` something out of it:
 *
 * - `put egg lot in tray` — the eggs are adopted (the card is consumed);
 * - `put leaf in tray` — fodder; the worms take it as they want it;
 * - `put brush in tray` — something for wandering worms to climb;
 * - `get cocoons from tray` — the harvest, in three heft stacks.
 *
 * ⚠ **A tray is not a shelf.** It takes eggs, leaf, a brush, cocoons and
 * frass, and refuses the rest — the refusal is where the object says what
 * it is for.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { RearingMixin } from '../lib/Rearing';
import EggLot from './EggLot';

/** `look tray` — the rearing in words, after the tray's own description. */
function rearingAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof RearingTray)) return text;
  const line = host.rearingLine();
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** Whoever is acting right now, by identity — the tray's keeper. */
function actingKeeper(): string {
  const giver = ExecutionContextApi.getCurrentCommandGiver() as Stuff | null;
  if (!giver || typeof (giver as { getIdentityPath?: unknown }).getIdentityPath !== 'function') {
    return '';
  }
  return giver.getIdentityPath() ?? '';
}

export default class RearingTray extends RearingMixin(ThermalMixin(ContainerMixin(Good))) {
  static fieldMeta: FieldMeta = {};

  static markupAugmenters: MarkupAugmenter[] = [rearingAugmenter];

  public canAddContainable(thing: Stuff & Containable): VetoResult {
    if (thing instanceof EggLot) {
      if (this.hasLiveRearing()) {
        return { ok: false, reason: 'There are worms on it already.' };
      }
      if (this.getContents().some((s) => s.getTemplatePath() === '/trade/sericulture/thing/cocoons')) {
        return { ok: false, reason: 'Clear the cocoons off it first.' };
      }
      if (!thing.isReadyToHatch()) {
        return {
          ok: false,
          reason: 'These eggs have not wintered. They will not hatch until they have been through a cold spell.',
        };
      }
      return { ok: true };
    }
    // The crop and its leavings go back on a tray; tools and stock do not.
    const path = thing.getTemplatePath() ?? '';
    if (path === '/trade/sericulture/thing/cocoons' || path === '/trade/sericulture/thing/frass') {
      return { ok: true };
    }
    if (MixinApi.isTangible(thing)) {
      const m = thing.getMaterial();
      if (m?.hasTag('silkworm-fodder') || m?.hasTag('mounting')) return { ok: true };
    }
    return { ok: false, reason: 'A rearing tray is for worms and their leaf.' };
  }

  public onContainableAdded(thing: Stuff & Containable): void {
    if (thing instanceof EggLot) {
      this.reconcileRearing();
      this.seedFromLot(thing, actingKeeper());
      consumeAfterMove(thing);
      return;
    }
    // Feeding the tray is keeping it.
    if (MixinApi.isTangible(thing) && thing.getMaterial()?.hasTag('silkworm-fodder')) {
      // ⚠ Bring the clock current BEFORE the leaf counts — leaf put down
      // now cannot have fed the worms during the hours before it arrived.
      this.reconcileRearingExcluding(thing);
      this.noteKeeper(actingKeeper());
    }
  }

  /**
   * Reconcile as if `arrived` were not yet on the tray: the window up to
   * now is fed from what WAS there.
   */
  private reconcileRearingExcluding(arrived: Stuff): void {
    this._withheld = arrived;
    try {
      this.reconcileRearing();
    } finally {
      this._withheld = null;
    }
  }

  private _withheld: Stuff | null = null;

  public override leafOnTray(): Stuff[] {
    return super.leafOnTray().filter((s) => s !== this._withheld);
  }
}

/**
 * ⚠⚠ Destruct AFTER the move, never inside it — `onContainableAdded`
 * fires from inside `ContainmentApi.move` (the hive's lesson, which only a
 * live drive found).
 */
function consumeAfterMove(thing: Stuff): void {
  void Promise.resolve()
    .then(() => StuffApi.destruct(thing))
    .catch(() => {
      // An empty card that outlives its eggs is untidy and harmless.
    });
}
