/**
 * AssayBench — ⭐⭐ **the water mill's shape, applied to a reading.**
 *
 * A fixed `Tool` with a queue. You leave samples on it, it works
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
 * access**. Both speak {@link AssayingMixin}; this one overrides the time,
 * the fee and the queue (controller-liquidity W9).
 *
 * ## ⚠ Runtime, not persistent
 *
 * `busy` and `pending` are runtime-only, like `AttendantMixin._queue`. A
 * queue that survived a restart would be a promise the world clock can
 * no longer keep — the timers are gone — so the honest behaviour is that
 * a restart empties the bench, and nothing was taken from anybody
 * because the samples are still in it.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { AssayingMixin, type AssayBatch } from '../../lib/Assaying';

export type { AssayBatch };

// ⭐ A container, because handing the samples over puts them IN it.
const AssayBenchBase = AssayingMixin(ContainerMixin(Tool));

export default class AssayBench extends AssayBenchBase {
  static override commandContributions: CommandContributions = {
    self: [],
    environment: ['trade/mining/cmd/mining/assay.yaml'],
    peers: ['trade/mining/cmd/mining/assay.yaml'],
  };

  static override fieldMeta: FieldMeta = {
    ...Tool.fieldMeta,
    setupS: { persistent: true, authorable: true },
    perSampleS: { persistent: true, authorable: true },
    fee: { persistent: true, authorable: true },
  };

  /** Game-seconds to bring the muffle to heat — paid once per batch. */
  public setupS: number = 1800;
  /** Game-seconds per sample once the muffle is hot. */
  public perSampleS: number = 600;
  /** What the house charges per sample, in the compact's currency. */
  public fee: number = 25;

  /** Whether a batch is in the fire. Runtime only. */
  private busy = false;
  /** Batches waiting for the fire, oldest first. Runtime only. */
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

  /** Batches on the slate, including the one in the fire. */
  public queueLength(): number {
    return this.pending.length + (this.busy ? 1 : 0);
  }

  /** ⭐ The amortization: setup once, then each sample. */
  public override secondsFor(n: number): number {
    return this.setupS + n * this.perSampleS;
  }

  public override feePerSample(): number {
    return this.fee;
  }

  /** Onto the slate; the number of batches ahead of it. */
  public enqueue(batch: AssayBatch): number {
    this.pending.push(batch);
    return this.queueLength() - 1;
  }

  /** The next batch for the fire, marking it busy — `null` while it burns. */
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

  /** Onto the slate; the fire takes it when it is free. */
  public override takeBatch(batch: AssayBatch): number {
    const ahead = this.enqueue(batch);
    this.startNext();
    return ahead;
  }

  /** The fire is free: start the next batch on the slate. */
  protected override batchDone(): void {
    this.release();
    this.startNext();
  }

  private startNext(): void {
    const next = this.takeNext();
    if (next) this.fireAfter(next);
  }
}
