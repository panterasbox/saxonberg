/**
 * AssayController — `assay <samples> [at <bench>]`.
 *
 * ⭐⭐ **The mill's shape, and it holds nothing of yours.** Hand the
 * samples over, pay, and go: the world clock carries the fire, and the
 * papers are on the bench when you come back. No engagement, no
 * attendant lease, no standing and watching — because the point of an
 * assay is that it is the part of prospecting you are NOT doing while it
 * happens.
 *
 * ⚠⚠ `finishAssay` is a **module function**, not a method. A controller
 * is EPHEMERAL — one clone per execution, destructed the moment
 * `execute` returns — and a completion runs long after that. `this.x()`
 * on a destructed controller is a silent no-op through the proxy: the
 * samples would vanish and no paper would ever appear. The mill and the
 * hew both learned this by driving it.
 *
 * ## The two rungs, told apart on `fixedInPlace`
 *
 * The carried `assay-kit` and the fixed bench declare the SAME
 * capability, because they do the same job. They differ in time, in fee
 * and in ceiling — never in access:
 *
 * | | the kit | the bench |
 * |---|---|---|
 * | where | wherever you are | where it is bolted down |
 * | per sample | slower — a folding balance and a field furnace | the muffle |
 * | fee | none, it is yours | the owner's |
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type ReadingRecord from '@saxonberg/server/mud/platform/thing/ReadingRecord';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { Money } from '@saxonberg/server/mud/lib/banking/Money';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { GEOLOGY } from '../../../lib/SurveyReading';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { InstrumentApi } from '@saxonberg/server/mud/api/instrument';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Mml } from '@saxonberg/server/mud/api/mml';
import AssayBench from '../../../thing/instrument/AssayBench';

/** The capability both rungs declare — shipped, not minted here. */
export const ASSAY_SCALE = 'assay-scale';

/** The report row every finished assay mints. */
const RECORD_ROW = '/platform/thing/reading-record';

const TOPIC = 'act.deed';

interface AssayModel extends CommandModel {
  samples?: MqlManyResult;
  bench?: MqlOneResult;
}

export default class AssayController extends CommandController<AssayModel> {
  async execute(model: AssayModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const samples = (model.samples?.stuff ?? []).filter((s) =>
      MixinApi.isActive(s, 'SampledMixin'),
    );
    if (samples.length === 0) {
      this.refuse(
        context,
        TOPIC,
        'Assay what? A sample is a piece you took and noted — `sample` first.',
        'no-samples',
      );
      return;
    }

    const scale = this.scaleFrom(model.bench?.stuff ?? null);
    if (!scale) {
      // ⚠ The refusal names A BENCH and `help assay`, never a PLACE. A
      // trade controller that named a locality's content would be wrong
      // the moment a second world installed this pack, and a world scan
      // for benches is forbidden.
      this.refuse(
        context,
        TOPIC,
        // ⚠ Deliberately NOT *"there is nothing here…"*. A drive's not-found
        // pattern watches for `nothing here`, so a legitimate refusal
        // phrased that way reads to the harness as a parse failure — the
        // mirror of the vacuous-assertion problem, and just as confusing.
        'Nothing within reach could run an assay. It wants an assay bench, or an assayer’s kit of your own.',
        'no-bench',
      );
      return;
    }

    // ⭐ Which rung. A bolted-down bench is the fixed one; anything else
    // is the kit you are carrying. The difference is time and money,
    // never permission.
    const fixed = isFixed(scale);
    const bench = scale instanceof AssayBench ? scale : null;
    const seconds = bench
      ? bench.secondsFor(samples.length)
      : FIELD_SETUP_S + samples.length * FIELD_PER_SAMPLE_S;

    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    if (!room || !MixinApi.isContainer(room)) {
      this.refuse(context, TOPIC, 'You are nowhere to leave them.', 'no-room');
      return;
    }

    // ⭐⭐ **Somebody on shift at this bench does the reading, and you
    // pay them for it.**
    //
    // That is the whole of *paid to take a reading another cannot*: the
    // customer needs no instrument, no training and no claim — only
    // money and a walk. What changes is the BAND on the paper, which is
    // the assayer's and not the customer's.
    //
    // ⚠ The proprietor and the staff pay nothing. Charging a house for
    // its own bench would be a sink, and this build mints no money and
    // destroys none.
    const staff = fixed ? staffedBy(room as Stuff & Container, giver) : null;
    // ⚠ The fee is for using somebody ELSE'S furnace, and it is owed
    // whether or not anybody is standing at it — fuel costs the same in
    // an empty shed. What the staff change is the BAND on the paper, not
    // the price of the fire.
    //
    // ⭐ The house's own people pay nothing. Charging a business for its
    // own bench would be a sink, and this build mints no money and
    // destroys none.
    if (fixed && !onShiftHere(giver)) {
      const fee = (bench?.getFee() ?? 0) * samples.length;
      const paid = await this.charge(context, giver, fee, staff);
      if (!paid) return;
    }

    const batch = {
      samples,
      customer: identityOf(giver),
      customerLabel: giver.getPresentation(),
      seconds,
      readBy: staff,
    };

    if (bench) {
      const ahead = bench.enqueue(batch);
      if (ahead > 0) {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            Mml.compose`The slate has ${String(ahead)} ahead of you. Yours goes on when the fire is free — roughly ${hours(seconds + ahead * seconds)}.`,
          )
          .send();
        return;
      }
      startNext(bench, room as Stuff & Container, scale);
    } else {
      // The kit has no queue: it is yours, and you are the queue.
      void WorldClockApi.after(
        Quantity.of(seconds, 's'),
        () => {
          void finishAssay(batch, room as Stuff & Container, scale, null);
        },
        { host: scale as unknown as Stuff, tag: 'assay' },
      );
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        fixed
          ? Mml.compose`You set ${String(samples.length)} in the bins and light the muffle. ${hours(seconds)}, and you need not stand over it.`
          : Mml.compose`You set your kit up and start the first of ${String(samples.length)}. ${hours(seconds)}, and slower than a proper bench.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} sets samples to assay.`,
      )
      .send();
  }

  /**
   * Take the fee, or refuse BEFORE the samples are handed over.
   *
   * ⚠ Before, deliberately. A customer who cannot pay must keep their
   * samples — losing them to a bench that then would not read them is
   * the kind of quiet theft a build should not ship.
   */
  private async charge(
    context: CommandContext,
    giver: Stuff,
    fee: number,
    staff: Stuff | null,
  ): Promise<boolean> {
    if (fee <= 0) return true;
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    const venue = room?.getTemplatePath() ?? '';
    // ⚠⚠ `businessAt` (a keyed LIVE lookup), never `ensureOperatorAt`.
    //
    // `ensureOperatorAt` stands a house up and runs a full roster pass —
    // shift transitions, wage settlement, the closed sign — on the way
    // past. That is an economic act, and **a read verb must not run a
    // payroll pass**: the shipped rule one line above it in the Api is
    // *"walking into a room must not be one"*, and handing samples over
    // is no different.
    //
    // ⭐ Found by driving the round trip, where `assay … at the bench`
    // never returned. It is also the honest semantics: an unowned,
    // unstood bench is FREE, because there is nobody whose furnace it
    // is.
    const business = EmploymentApi.businessAt(venue);
    if (!business) return true;
    let account: string;
    try {
      account = await EmploymentApi.operatingAccountOf(business);
    } catch {
      return true;
    }
    try {
      await BankingApi.settle(
        {
          amount: Money.of(fee, BankingApi.compactCurrency()),
          reason: 'assay',
          presented: true,
          payeeAccountId: account,
          category: 'sales',
        },
        { kind: 'credential' },
      );
    } catch {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          staff
            ? Mml.compose`${Mml.actor(staff)} names a price of ${String(fee)} and you cannot meet it. Your samples stay in your hands.`
            : Mml.compose`The price chalked by the bench is ${String(fee)}, and you cannot meet it. Your samples stay in your hands.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'cannot-pay',
        detail: String(fee),
      });
      return false;
    }
    return true;
  }

  /** The one reachable thing that can run an assay, named or defaulted. */
  private scaleFrom(named: Stuff | null): (Stuff & Tooled) | null {
    if (!named || !MixinApi.isTool(named)) return null;
    return named.getCapabilities().includes(ASSAY_SCALE)
      ? (named as Stuff & Tooled)
      : null;
  }
}

/**
 * ⭐ Whoever is on shift at this bench — a body in the room, not the
 * customer, holding an active employment. `null` when the shed is
 * empty, which is the unstaffed rung: you run it yourself, free, at the
 * bench's own band.
 */
function staffedBy(room: Stuff & Container, customer: Stuff): Stuff | null {
  for (const body of room.getContents()) {
    if (body.stuffId === customer.stuffId) continue;
    if (!MixinApi.isEmployed(body)) continue;
    if (!body.isOnShift()) continue;
    return body;
  }
  return null;
}

/** Is the customer one of the house's own, standing their own shift? */
function onShiftHere(giver: Stuff): boolean {
  return MixinApi.isEmployed(giver) && giver.isOnShift();
}

/** A field kit is slower than a bench, and that is the whole trade-off. */
const FIELD_SETUP_S = 2400;
const FIELD_PER_SAMPLE_S = 1200;

/**
 * Start the bench's next batch, if the fire is free. ⚠ Module-level: it
 * is called from a completion, where the controller is long gone.
 */
function startNext(
  bench: AssayBench,
  room: Stuff & Container,
  scale: Stuff & Tooled,
): void {
  const batch = bench.takeNext();
  if (!batch) return;
  void WorldClockApi.after(
    Quantity.of(batch.seconds, 's'),
    () => {
      void finishAssay(batch, room, scale, bench);
    },
    { host: bench as unknown as Stuff, tag: 'assay' },
  );
}

/**
 * ⭐⭐ Read every sample, destroy it, mint a paper for each, and start
 * the next batch.
 *
 * ⚠⚠ **A module function, and the actor may be gone.** A completion runs
 * long after dispatch and a player can log out mid-fire. The papers are
 * minted into the ROOM either way — that is the promise the bench made —
 * and the narration is skipped when nobody is there to hear it.
 */
async function finishAssay(
  batch: {
    samples: Stuff[];
    customer: string;
    customerLabel: string;
    seconds: number;
    readBy?: Stuff | null;
  },
  room: Stuff & Container,
  scale: Stuff & Tooled,
  bench: AssayBench | null,
): Promise<void> {
  try {
    for (const sample of batch.samples) {
      if (sample.isDestroyed()) continue;
      try {
        const reading = await claimFor(sample);
        const paper = (await StuffApi.clone(RECORD_ROW)) as unknown as ReadingRecord;
        const stamp = (
          sample as unknown as {
            getSampling?(): { at: string; by: string; on: number } | null;
          }
        ).getSampling?.() ?? null;
        const said = reading
          ? await runBench(reading, sample, scale)
          : { prose: 'Nothing this bench can read.', value: null, unit: '' };
        paper.inscribe({
          channel: reading?.getChannel() ?? '',
          subjectLabel: sample.getPresentation(),
          reading: said.prose,
          value: said.value,
          unit: said.unit,
          // ⭐ The reader's band when somebody ran it, else the bench's.
          // What you buy from an assayer IS their band.
          band: await readerBand(batch.readBy ?? null, scale),
          takenBy: batch.customer,
          takenByLabel: batch.customerLabel,
          takenWith: scale.getTemplatePath() ?? '',
          takenWithGrade: MixinApi.isGraded(scale) ? scale.getGradeBand() : '',
          takenOn: Math.round(WorldClockApi.getNow().rawValue() * 1000),
          sampledAt: stamp?.at ?? '',
          sampledBy: stamp?.by ?? '',
          sampledOn: stamp?.on ?? 0,
          tell: said.tell ?? null,
        });
        ContainmentApi.move(paper as unknown as Stuff & Containable, room);
        // ⭐ The sample is CONSUMED. An assay is destructive — that is
        // why it costs a sample and why salting is worth doing.
        await StuffApi.destruct(sample);
      } catch (err) {
        // ⚠⚠ **One sample must not take the process down.**
        //
        // A completion runs on the world clock, outside any dispatch, so
        // a throw here has nobody to return it to: it becomes an
        // UNHANDLED REJECTION and Node exits. It did — a gate denied the
        // bench's own read and the whole world went with it, mid-drive.
        //
        // ⭐ The honest behaviour is that this sample yields no paper
        // and the rest of the batch still runs. A bench that loses one
        // assay is a bench with a bad cupel; a bench that loses the
        // world is a bug.
        console.error('assay: a sample could not be read', err);
      }
    }
  } finally {
    if (bench) {
      bench.release();
      startNext(bench, room, scale);
    }
  }
}

/** The channel this sample can be read on, or `null`. */
async function claimFor(sample: Stuff): Promise<Reading | null> {
  for (const channel of ['grade', 'chemistry']) {
    const reading = await InstrumentApi.reading(channel);
    if (!reading) continue;
    if (reading.getBench() === '') continue;
    if (!(scaleClaims(reading, sample))) continue;
    return reading;
  }
  return null;
}

/** Whether a channel will say anything about this piece of matter. */
function scaleClaims(reading: Reading, sample: Stuff): boolean {
  if (reading.getChannel() === 'grade') {
    return typeof (sample as unknown as { getGrade?(): number }).getGrade === 'function';
  }
  return MixinApi.isTangible(sample);
}

/** Run the channel's bench rung and normalise what it hands back. */
async function runBench(
  reading: Reading,
  sample: Stuff,
  scale: Stuff & Tooled,
): Promise<{ prose: string; value: number | null; unit: string; tell?: string | null }> {
  const said = await reading.benchReadFor(sample, scale, benchBand(scale));
  return said ?? { prose: 'Nothing this bench can read.', value: null, unit: '' };
}

/**
 * ⭐ The BENCH's band, and it is the instrument's ceiling — not the
 * customer's competence. That is the point of paying: a bench reads as
 * well as the bench is, and you do not have to be anybody.
 */
/**
 * ⭐⭐ Who the paper credits, and it is the honest answer to *how well
 * was this read*: the assayer's own competence when one ran it, and the
 * instrument's ceiling when nobody did.
 */
async function readerBand(
  reader: Stuff | null,
  scale: Stuff & Tooled,
): Promise<CompetenceBandName> {
  const ceiling = benchBand(scale);
  if (!reader || !MixinApi.isAdvancing(reader)) return ceiling;
  const theirs = await reader.competenceBandFor(GEOLOGY);
  // The minimum, as everywhere on this ladder: a fine bench does not
  // make a poor assayer good, and a poor bench caps a good one.
  return CompetenceBand.rank(theirs) <= CompetenceBand.rank(ceiling)
    ? theirs
    : ceiling;
}

function benchBand(scale: Stuff & Tooled): CompetenceBandName {
  if (!MixinApi.isGraded(scale)) return 'proficient';
  const grade = scale.getGradeBand();
  if (grade === 'masterful' || grade === 'exceptional') return 'expert';
  if (grade === 'poor') return 'competent';
  return 'proficient';
}

/** Non-carryable — the shipped `fixedInPlace` predicate. */
function isFixed(thing: Stuff): boolean {
  return (
    (thing as unknown as { getFixedInPlace?(): boolean }).getFixedInPlace?.() ===
    true
  );
}

function identityOf(stuff: Stuff): string {
  const s = stuff as unknown as {
    getIdentityPath?(): string | null;
    getTemplatePath?(): string | null;
  };
  return s.getIdentityPath?.() ?? s.getTemplatePath?.() ?? '';
}

/** Game-time in the words a person uses. */
function hours(seconds: number): string {
  const h = seconds / 3600;
  if (h < 1) return `${Math.round(seconds / 60)} minutes`;
  if (h < 2) return 'about an hour';
  return `about ${Math.round(h)} hours`;
}
