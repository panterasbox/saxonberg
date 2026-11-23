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
import Silkworm from '../agent/Silkworm';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi, type ClockHandle } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';

const SILKWORM_ROW = '/trade/sericulture/agent/silkworm';
/** A live rearing wakes at least this often (organism-biology D10, the mould's cap). */
const REARING_WAKE_S = 3600;

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
  static fieldMeta: FieldMeta = {
    exemplarSeq: { persistent: true },
  };

  /** ⭐ How many exemplar worms this tray has minted — the next one's seed (D10). */
  public exemplarSeq = 0;
  private _exemplarBusy = false;
  private _rearingWake: ClockHandle | null = null;

  /**
   * ⭐⭐ **The tray is the compression** (organism-biology D10, ranching
   * D19/D21): while the rearing is in a larval age the tray holds ONE
   * exemplar worm as real content, seeded from (this tray, its index); out
   * of a larval age it holds none. ⛔ Called only from WRITE paths — a put,
   * a get, the tray's own wake, the staging setter — so a look never mints.
   */
  public async refreshExemplar(): Promise<void> {
    if (this._exemplarBusy || this.isDestroyed()) return;
    const state = this.getRearingState();
    const larval = state === 'feeding' || state === 'wandering';
    const worms = this.getContents().filter((s): s is Silkworm => s instanceof Silkworm);
    if (!larval) {
      for (const w of worms) consumeAfterMove(w);
      return;
    }
    if (worms.length > 0) return;
    this._exemplarBusy = true;
    try {
      const worm = await StuffApi.clone<Silkworm>(SILKWORM_ROW);
      worm.seedFromTray(this.degreeDays, this.exemplarSeq++);
      if (!this.isDestroyed()) ContainmentApi.move(worm as unknown as Stuff & Containable, this);
    } catch (err) {
      // @quiet a tray with no exemplar is still a rearing; the next write path mints one.
      console.warn(`RearingTray: the exemplar worm did not stand up: ${String(err)}`);
    } finally {
      this._exemplarBusy = false;
    }
    this.armRearingWake();
  }

  /**
   * ⭐ A live rearing wakes itself on the game clock, at most an hour apart
   * (D10, the mould's shape — its temperature drifts): the wake brings the
   * clock current and refreshes the exemplar, so a tray nobody looks at
   * still hatches into a worm you can pick up. No event bus (a unit world):
   * no wake.
   */
  private armRearingWake(): void {
    if (this._rearingWake !== null || !this.hasLiveRearing()) return;
    if (!StuffApi.findByTemplatePath('/platform/idea/EventRegistry')) return;
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return;
    const at = WorldClockApi.getNow().rawValue() + REARING_WAKE_S;
    this._rearingWake = WorldClockApi.at(Quantity.of(at, 's'), () => {
      this._rearingWake = null;
      this.reconcileRearing();
      this.refreshExemplar()
        .then(() => this.armRearingWake())
        .catch((err: unknown) => {
          // @quiet the rearing stands without its exemplar; the next wake tries again.
          console.warn(`RearingTray: the wake did not refresh the exemplar: ${String(err)}`);
        });
    }, { host: this as unknown as Stuff, tag: 'rearing' });
  }

  /**
   * ⭐ Stage the rearing's clock (organism-biology D10) — the staging setter
   * a drive reaches through `testharness stage` (which is `@TestOnly`):
   * the degree-days since hatch, the stamp set to now, the exemplar
   * refreshed. Nothing in play sets a tray's age.
   */
  public setDegreeDays(value: number): void {
    this.reconcileRearing();
    this.degreeDays = Number.isFinite(value) && value >= 0 ? value : 0;
    this.refreshExemplar().catch((err: unknown) => {
      // @quiet the rearing stands without its exemplar; the next write path tries again.
      console.warn(`RearingTray: the exemplar did not refresh: ${String(err)}`);
    });
  }

  static markupAugmenters: MarkupAugmenter[] = [rearingAugmenter];

  /**
   * ⭐ A tray is NAMED by what is on it (silk's browser walk): a loft's
   * three trays listed as three identical "rearing tray"s left a player no
   * way to tell the working one from the two already harvested — and the
   * ordinal they reached for (`look third tray`) counts the room's order,
   * not the house's. What is on a tray is what anyone would call it by.
   */
  override getShortDescription(): string {
    const stem = super.getShortDescription();
    switch (this.getRearingState()) {
      case 'eggs':
        return 'tray of silkworm eggs';
      case 'feeding':
        return this.isMoulting() ? 'tray of sleeping silkworms' : 'tray of silkworms';
      case 'wandering':
        return 'tray of wandering silkworms';
      case 'spinning':
        return 'tray of spinning silkworms';
      case 'collapsed':
        return 'tray of dead silkworms';
      default:
        return this.getContents().some((s) => s.getTemplatePath() === '/trade/sericulture/thing/cocoons')
          ? 'tray of cocoons'
          : stem;
    }
  }

  /**
   * ...and what it is called is what it answers to: `look silkworms` asked for
   * this tray by the name on the room's list and found nothing, so it took the
   * egg cards (the silk drive's AC 2, W10's `--strict` proof).
   */
  override getKeywords(viewer?: Stuff): string[] {
    const out = super.getKeywords(viewer);
    const name = this.getShortDescription();
    const onIt = name.startsWith('tray of ') ? name.slice('tray of '.length) : '';
    if (!onIt) return out;
    const words = [name, onIt, onIt.split(' ').pop() ?? onIt];
    return [...out, ...words.filter((w) => !out.includes(w))];
  }

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
    // A worm goes back on a live tray, where it folds into the rearing (D10).
    if (thing instanceof Silkworm) {
      return this.hasLiveRearing() ? { ok: true } : { ok: false, reason: 'There is no rearing on it to put a worm back into.' };
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
      this.armRearingWake();
      return;
    }
    // ⭐ A worm put back folds into the rearing (D10, the egg lot's
    // adoption shape): one more in the count, the object gone — unless it
    // is the exemplar this tray is minting.
    if (thing instanceof Silkworm) {
      if (this._exemplarBusy) return;
      this.reconcileRearing();
      if (this.hasLiveRearing()) this.eggCount += 1;
      void Promise.resolve()
        .then(() => StuffApi.destruct(thing as unknown as Stuff))
        .then(() => this.refreshExemplar())
        .catch(() => {
          // @quiet a worm that outlives its fold is untidy and harmless; the next write refreshes it.
        });
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
   * ⭐ A worm taken off the tray (D10) leaves with the tray's clock and
   * lowers the count by one; the tray mints its next exemplar.
   */
  public onContainableRemoved(thing: Stuff & Containable): void {
    if (!(thing instanceof Silkworm)) return;
    this.reconcileRearing();
    thing.seedFromTray(this.degreeDays, thing.seedIndex);
    if (this.hasLiveRearing()) this.eggCount = Math.max(0, this.eggCount - 1);
    this.refreshExemplar().catch((err: unknown) => {
      // @quiet the rearing stands without its exemplar; the next write path tries again.
      console.warn(`RearingTray: the exemplar did not refresh: ${String(err)}`);
    });
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
