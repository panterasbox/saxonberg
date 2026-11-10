/**
 * Assaying — ⭐⭐ **an instrument that reads samples and hands back a paper
 * for each**, whether it is a kit you carry or a bench bolted to a shed
 * floor.
 *
 * The two rungs do the same job and differ in time, in fee and in ceiling —
 * never in access:
 *
 * | | the kit | the bench |
 * |---|---|---|
 * | where | wherever you are | where it is bolted down |
 * | time | slower — a folding balance and a field furnace | the muffle, and a queue |
 * | fee | none, it is yours | the house's, owed for its furnace |
 * | who reads | you, at the kit's ceiling | the house's assayer on shift, else the bench's ceiling |
 *
 * ⭐ **The mill's shape, and you need not stand over it.** Hand the samples
 * over, pay, and go: the world clock carries the fire, and the papers are on
 * the bench (or wherever you set the kit up) when the batch finishes.
 *
 * ⚠ Survey C18, all three halves, fixed here because they are the
 * instrument's rules and not the verb's:
 *  - the samples are HANDED OVER at dispatch — moved into the instrument —
 *    so a customer cannot sell, drop or re-assay what is already in the
 *    fire;
 *  - the fee is waived only for the house's OWN people on shift (any
 *    employee of any business walked in free);
 *  - the assayer whose band goes on the paper is somebody on shift FOR
 *    THIS bench's house (any on-shift employee standing in the shed was).
 *
 * A protocol mixin (controller-liquidity Appendix B). Hosts: `AssayKit`,
 * `AssayBench`; both are containers, because both take the samples.
 */

import type { NestingConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tool';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type ReadingRecord from '@saxonberg/server/mud/platform/thing/ReadingRecord';
import type { BusinessStuff } from '@saxonberg/server/mud/api/employment';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { Money } from '@saxonberg/server/mud/lib/banking/Money';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import ReadingCatalogue, { READING_CATALOGUE_PATH } from '@saxonberg/server/mud/platform/idea/ReadingCatalogue';
import { GEOLOGY } from './SurveyReading';
import Ore from '../thing/Ore';

/** The capability both rungs declare — shipped, not minted here. */
export const ASSAY_SCALE = 'assay-scale';
/** The marker `MixinApi.isActive` narrows on. */
export const ASSAYING_MIXIN = 'AssayingMixin';

/** The report row every finished assay mints. */
const RECORD_ROW = '/platform/thing/reading-record';
/** A field kit's setup — the folding furnace — game-seconds. */
const FIELD_SETUP_S = 2400;
/** A field kit's time per sample, game-seconds: slower than a muffle. */
const FIELD_PER_SAMPLE_S = 1200;
/** The channels a bench rung can read, in the order it tries them. */
const BENCH_CHANNELS = ['grade', 'chemistry'] as const;

/** One batch: whose samples, and how long the fire takes over them. */
export interface AssayBatch {
  readonly samples: Stuff[];
  /** The customer's identity path — the papers are taken by them. */
  readonly customer: string;
  readonly customerLabel: string;
  readonly seconds: number;
  /** The house's assayer on shift, whose band goes on the paper. */
  readonly readBy: Stuff | null;
  /** Where the papers land: the room the batch was handed over in. */
  readonly room: Stuff & Container;
}

/** ⭐ Every reason the instrument will not take a batch. */
export type AssayRefusal =
  | ActRefusal<'no-samples'>
  /** The customer is nowhere a paper could be left. */
  | ActRefusal<'no-room'>
  /** The house's fee, and the customer cannot meet it — the samples stay in hand. */
  | ActRefusal<'cannot-pay', { fee: number; assayer: Stuff | null }>;

/** What handing the batch over came to. */
export type AssayTaken =
  /** In the fire now: this many samples, this long. */
  | { kind: 'started'; count: number; seconds: number; fixed: boolean }
  /** On the slate behind others. */
  | { kind: 'queued'; ahead: number; seconds: number };

/** An assay hand-over — instant; the fire is the world clock's. */
export type AssayPlan = ActPlan<undefined, AssayTaken, AssayRefusal>;

/** An instrument that runs an assay. */
export interface Assaying {
  /** Take `samples` from `actor` for assay: the hand-over, or why not. */
  assayPlanFor(actor: Stuff, samples: readonly Stuff[]): Promise<AssayPlan | AssayRefusal>;
  /** @hook Game-seconds a batch of `n` takes on this instrument. */
  secondsFor(n: number): number;
  /** @hook The house's fee per sample — none on a kit. */
  feePerSample(): number;
  /**
   * @hook Start (or queue) a handed-over batch; the number ahead of it.
   * A kit has no queue: it is yours, and you are the queue.
   */
  takeBatch(batch: AssayBatch): number;
}

type Instrument = Stuff & Container & Tooled & Assaying;

export function AssayingMixin<TBase extends NestingConstructor<Stuff & Container>>(Base: TBase) {
  return class AssayingMixin extends Base implements Assaying {
    static _mixinName: string = ASSAYING_MIXIN;
    static _mixinKind = 'protocol' as const;

    public async assayPlanFor(actor: Stuff, samples: readonly Stuff[]): Promise<AssayPlan | AssayRefusal> {
      const self = this as unknown as Instrument;
      const batchOf = samples.filter((s) => MixinApi.isSampled(s));
      if (batchOf.length === 0) return { ok: false, reason: 'no-samples' };
      const room = MixinApi.isContainable(actor) ? actor.getContainer() : null;
      if (!room || !MixinApi.isContainer(room)) return { ok: false, reason: 'no-room' };
      const fixed = MixinApi.isContainable(self) && self.isFixedInPlace();
      const house = fixed ? EmploymentApi.businessAt(room.getTemplatePath() ?? '') : null;
      const ours = (body: Stuff): boolean =>
        house !== null && MixinApi.isEmployed(body) && body.isOnShiftFor(house.getOrganizationPath());
      const assayer = house === null ? null : this.assayerIn(room, actor, ours);
      // ⚠ The fee is for somebody ELSE's furnace, and it is owed whether or
      // not anybody is standing at it — fuel costs the same in an empty
      // shed. The house's own people pay nothing (a sink otherwise).
      const fee = house !== null && !ours(actor) ? this.feePerSample() * batchOf.length : 0;
      const seconds = this.secondsFor(batchOf.length);
      return {
        ok: true,
        durationMs: 0,
        effortW: 0,
        facts: undefined,
        onComplete: async () => {
          // ⚠ Paid BEFORE the samples are handed over: a customer who
          // cannot pay keeps them.
          if (fee > 0 && house !== null && !(await this.collectFee(house, fee))) {
            return { ok: false, reason: 'cannot-pay', facts: { fee, assayer } };
          }
          // ⭐ Handed over: in the instrument, out of the customer's hands.
          for (const s of batchOf) {
            if (MixinApi.isContainable(s) && s.getContainer() !== self) {
              ContainmentApi.move(s as Stuff & Containable, self);
            }
          }
          const ahead = this.takeBatch({
            samples: batchOf,
            customer: actor.getIdentityPath() ?? '',
            customerLabel: actor.getPresentation(),
            seconds,
            readBy: assayer,
            room,
          });
          return {
            ok: true,
            facts: ahead > 0
              ? { kind: 'queued', ahead, seconds }
              : { kind: 'started', count: batchOf.length, seconds, fixed },
          };
        },
      };
    }

    /** @hook A field kit: set up the furnace, then a sample at a time. */
    public secondsFor(n: number): number {
      return FIELD_SETUP_S + n * FIELD_PER_SAMPLE_S;
    }

    /** @hook No fee: it is yours. */
    public feePerSample(): number {
      return 0;
    }

    /** @hook No queue: the fire starts now. */
    public takeBatch(batch: AssayBatch): number {
      this.fireAfter(batch);
      return 0;
    }

    /** Light the fire over `batch`; it finishes on the world clock. */
    protected fireAfter(batch: AssayBatch): void {
      void WorldClockApi.after(
        Quantity.of(batch.seconds, 's'),
        () => {
          void this.finish(batch);
        },
        { host: this as unknown as Stuff, tag: 'assay' },
      );
    }

    /**
     * ⭐⭐ Read every sample, destroy it, mint a paper for each into the
     * room the batch was handed over in. ⚠ One sample must never take the
     * process down: a completion runs on the world clock, where a throw is
     * an unhandled rejection, so a sample that cannot be read yields no
     * paper and the rest still run.
     */
    protected async finish(batch: AssayBatch): Promise<void> {
      const self = this as unknown as Instrument;
      try {
        for (const sample of batch.samples) {
          if (sample.isDestroyed()) continue;
          try {
            const reading = await this.channelFor(sample);
            // Made from the CUSTOMER's sample, so the paper is theirs.
            const paper = (await StuffApi.clone(RECORD_ROW, undefined, { madeFrom: sample })) as unknown as ReadingRecord;
            const stamp = MixinApi.isSampled(sample) ? sample.getSampling() : null;
            const said = (reading ? await reading.benchReadFor(sample, self, this.ceiling()) : null) ??
              { prose: 'Nothing this bench can read.', value: null, unit: '' };
            paper.inscribe({
              channel: reading?.getChannel() ?? '',
              subjectLabel: sample.getPresentation(),
              reading: said.prose,
              value: said.value,
              unit: said.unit,
              // ⭐ What you buy from an assayer IS their band.
              band: await this.readerBand(batch.readBy),
              takenBy: batch.customer,
              takenByLabel: batch.customerLabel,
              takenWith: self.getTemplatePath() ?? '',
              takenWithGrade: MixinApi.isGraded(self) ? self.getGradeBand() : '',
              takenOn: Math.round(WorldClockApi.getNow().rawValue() * 1000),
              sampledAt: stamp?.at ?? '',
              sampledBy: stamp?.by ?? '',
              sampledOn: stamp?.on ?? 0,
              tell: said.tell ?? null,
            });
            ContainmentApi.move(paper as unknown as Stuff & Containable, batch.room);
            // ⭐ CONSUMED: an assay is destructive — why it costs a sample.
            await StuffApi.destruct(sample);
          } catch (err) {
            console.error('assay: a sample could not be read', err);
          }
        }
      } finally {
        this.batchDone();
      }
    }

    /** @hook The fire is free again — a bench starts its next batch. */
    protected batchDone(): void {}

    /** The house's assayer on shift in this room, not the customer. */
    protected assayerIn(room: Stuff & Container, customer: Stuff, ours: (b: Stuff) => boolean): Stuff | null {
      for (const body of room.getContents()) {
        if (body.stuffId !== customer.stuffId && ours(body)) return body;
      }
      return null;
    }

    /**
     * Take the fee into the house's operating account. `false` when the
     * customer cannot meet it; an unowned, unstood bench is FREE, because
     * there is nobody whose furnace it is.
     */
    protected async collectFee(house: BusinessStuff, fee: number): Promise<boolean> {
      let account: string;
      try {
        account = await EmploymentApi.operatingAccountOf(house);
      } catch {
        return true;
      }
      try {
        await BankingApi.settle(
          { amount: Money.of(fee, BankingApi.compactCurrency()), reason: 'assay', presented: true, payeeAccountId: account, category: 'sales' },
          { kind: 'credential' },
        );
        return true;
      } catch {
        return false;
      }
    }

    /** The bench channel this sample can be read on, or `null`. */
    protected async channelFor(sample: Stuff): Promise<Reading | null> {
      const catalogue = await StuffApi.singleton<ReadingCatalogue>(READING_CATALOGUE_PATH);
      for (const channel of BENCH_CHANNELS) {
        const reading = await catalogue.warmed(channel);
        if (!reading || reading.getBench() === '') continue;
        // Grade is a fact about an ore lot; chemistry about any matter.
        if (channel === 'grade' ? sample instanceof Ore : MixinApi.isTangible(sample)) return reading;
      }
      return null;
    }

    /**
     * ⭐ The instrument's CEILING — a bench reads as well as the bench is,
     * and you do not have to be anybody.
     */
    protected ceiling(): CompetenceBandName {
      const self = this as unknown as Stuff;
      if (!MixinApi.isGraded(self)) return 'proficient';
      const grade = self.getGradeBand();
      if (grade === 'masterful' || grade === 'exceptional') return 'expert';
      if (grade === 'poor') return 'competent';
      return 'proficient';
    }

    /**
     * ⭐⭐ Who the paper credits: the assayer's own competence when one ran
     * it, capped by the instrument — a fine bench does not make a poor
     * assayer good, and a poor bench caps a good one.
     */
    protected async readerBand(reader: Stuff | null): Promise<CompetenceBandName> {
      const ceiling = this.ceiling();
      if (!reader || !MixinApi.isAdvancing(reader)) return ceiling;
      const theirs = await reader.competenceBandFor(GEOLOGY);
      return CompetenceBand.rank(theirs) <= CompetenceBand.rank(ceiling) ? theirs : ceiling;
    }
  };
}
