/**
 * AssayBench — ⭐⭐ **the water mill's shape, applied to a reading.**
 *
 * A fixed `ToolItem` with a queue. You leave samples on it, it works
 * through them over game-time, and it **holds nothing of yours**: no
 * engagement, no `AttendantMixin`, no lease. Walk out, log off, come
 * back — the papers are on the bench.
 *
 * ⚠ That is the whole reason the mill is the precedent rather than the
 * bar. An engagement would make an assay a thing you stand and watch,
 * and the point of an assay is that it is the part of prospecting you
 * are NOT doing while it happens.
 *
 * ## The two rungs are one capability
 *
 * The bench declares `assay-scale` — **the shipped capability**, already
 * on the carried `assay-kit` and already consumed by the mining
 * archetype. The kit is the portable rung and this is the fixed one, and
 * they differ in `perSampleS`, in fee and in ceiling, **never in
 * access**. The controller tells them apart on `fixedInPlace`.
 *
 * ## ⚠ Runtime, not persistent
 *
 * `busy` and `pending` are runtime-only, like `AttendantMixin._queue`. A
 * queue that survived a restart would be a promise the world clock can
 * no longer keep — the timers are gone — so the honest behaviour is that
 * a restart empties the bench, and nothing was taken from anybody
 * because the samples are still on it.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

/** One customer's batch, waiting or running. */
export interface AssayBatch {
  /** The samples, in the order they were handed over. */
  readonly samples: Stuff[];
  /** Who is paying, by identity path. */
  readonly customer: string;
  /** What to call them on the paper. */
  readonly customerLabel: string;
  /** Seconds this batch will take once it starts. */
  readonly seconds: number;
}

export default class AssayBench extends ToolItem {
  /**
   * ⭐ The bench contributes the verb where the bench IS. The carried
   * kit contributes it on `inventory` (see `assay-kit.yaml`), so a
   * prospector in the field is refused by the CHANNEL — *nothing here
   * can read that; a bench or a kit could* — rather than by the verb not
   * existing.
   */
  static override commandContributions: CommandContributions = {
    self: [],
    environment: ['trade/mining/cmd/mining/assay.yaml'],
    peers: ['trade/mining/cmd/mining/assay.yaml'],
  };

  static override fieldMeta: FieldMeta = {
    ...ToolItem.fieldMeta,
    setupS: { persistent: true, authorable: true },
    perSampleS: { persistent: true, authorable: true },
    fee: { persistent: true, authorable: true },
  };

  /**
   * ⭐⭐ **The amortization, and it is the whole economics of the trip.**
   * Lighting the furnace and bringing it to heat costs the same whether
   * you brought one sample or eight, so a batch of eight costs
   * `setup + 8×per` and not `8×(setup + per)`. Carrying one sample in is
   * a decision you should feel bad about.
   */
  public setupS: number = 1800;

  /** Each sample's own time once the furnace is up. */
  public perSampleS: number = 600;

  /** Minor units per sample, paid to whoever owns the bench. */
  public fee: number = 25;

  /** Runtime: a batch is on the fire. */
  private busy = false;

  /** Runtime: batches waiting, in order. */
  private pending: AssayBatch[] = [];

  public getSetupS(): number {
    return this.setupS;
  }

  public getPerSampleS(): number {
    return this.perSampleS;
  }

  public getFee(): number {
    return this.fee;
  }

  public isBusy(): boolean {
    return this.busy;
  }

  /** How many batches are in front of a newcomer. */
  public queueLength(): number {
    return this.pending.length + (this.busy ? 1 : 0);
  }

  /** What a batch of `n` samples will take, amortized. */
  public secondsFor(n: number): number {
    return this.setupS + n * this.perSampleS;
  }

  /** Join the queue. Returns the position, 0 meaning *straight on*. */
  public enqueue(batch: AssayBatch): number {
    this.pending.push(batch);
    return this.queueLength() - 1;
  }

  /**
   * Take the next batch if the fire is free. `null` when the bench is
   * working or the queue is empty — the caller schedules nothing.
   */
  public takeNext(): AssayBatch | null {
    if (this.busy) return null;
    const next = this.pending.shift();
    if (!next) return null;
    this.busy = true;
    return next;
  }

  /** The fire is free again. */
  public release(): void {
    this.busy = false;
  }
}
