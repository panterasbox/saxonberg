/**
 * ⭐ **The five standing-ledger append events** — the seam that makes
 * every downstream projection reactive instead of polled.
 *
 * Each of the five standing ledgers (`renown_events`,
 * `participation_events`, `producer_events`, `transcripts`,
 * `disposition_events`) is an append-only log whose standing derives on
 * read. That works fine for a verb — you ask, it computes — and not at
 * all for a *live figure on a client*, which has to learn that its
 * number changed without asking.
 *
 * So each ledger fires one of these immediately after its row is
 * persisted. The subscription layer names them as `changes:` sources on
 * the derived standing fields; anything else that wants to react to a
 * standing move can subscribe without the ledger knowing.
 *
 * **Raw and uninterpreted, deliberately.** These carry the subject and
 * enough of the append's shape to decide whether you care — never a
 * band, a score, or a delta. `ReactionFiredEvent` set that posture and
 * the reasoning is the same: a provisional score on the bus is a score
 * two subsystems will disagree about. Read the ledger if you want a
 * number.
 *
 * ⚠ **Fired AFTER the write, never before.** A listener that recomputes
 * must not read a ledger that has not been written yet.
 *
 * See `docs/subsystems/renown.md`, `influence.md`, `participation.md`,
 * `advancement.md`, `trait.md`.
 */

/** Common shape: every standing append is *about* somebody. */
export interface StandingAppendedPayload {
  /**
   * Durable subject key — the `templatePath`-derived id the ledger
   * stores against, NOT a live stuffId. Consumers match on this.
   */
  subject: string;
}

/** One raw renown signal landed for `subject`. */
export interface RenownAppendedPayload extends StandingAppendedPayload {
  /** `'reaction'`, `'reception'`, … — the signal class, unscored. */
  kind: string;
  /** Locality the signal was witnessed in, when scoped. */
  locality: string | null;
  /** Group refs the signal counts toward. */
  groups: string[];
}

export class RenownAppendedEvent {
  static readonly KIND = 'renown.appended';
  readonly kind = RenownAppendedEvent.KIND;
  constructor(public readonly payload: RenownAppendedPayload) {}
}

/** One participation (PLAY) bucket credited for `subject`. */
export interface ParticipationAppendedPayload extends StandingAppendedPayload {
  /** `'command'` by default — what kind of presence was credited. */
  kind: string;
  /** The activity bucket credited; appends dedupe per bucket. */
  bucket: number;
}

export class ParticipationAppendedEvent {
  static readonly KIND = 'participation.appended';
  readonly kind = ParticipationAppendedEvent.KIND;
  constructor(public readonly payload: ParticipationAppendedPayload) {}
}

/**
 * One producer (MAKE) credit landed. `subject` is the **author** being
 * credited; `actor` is whoever generated the engagement that earned it.
 */
export interface ProducerAppendedPayload extends StandingAppendedPayload {
  /** The engaging party whose activity produced the credit. */
  actor: string;
  /** Where the credited content lives. */
  zonePath: string;
  kind: string;
  bucket: number;
}

export class ProducerAppendedEvent {
  static readonly KIND = 'producer.appended';
  readonly kind = ProducerAppendedEvent.KIND;
  constructor(public readonly payload: ProducerAppendedPayload) {}
}

/** One transcript entry — evidence toward a Discipline's competence. */
export interface TranscriptAppendedPayload extends StandingAppendedPayload {
  /** Which Discipline the evidence counts toward. */
  discipline: string;
  /** `'deed'` | `'claim'` — evidence weight differs by kind. */
  kind: string;
}

export class TranscriptAppendedEvent {
  static readonly KIND = 'transcript.appended';
  readonly kind = TranscriptAppendedEvent.KIND;
  constructor(public readonly payload: TranscriptAppendedPayload) {}
}

/** One disposition entry — evidence toward a trait axis position. */
export interface DispositionAppendedPayload extends StandingAppendedPayload {
  /** Which opposed-pair axis the evidence moves. */
  disposition: string;
  kind: string;
}

export class DispositionAppendedEvent {
  static readonly KIND = 'disposition.appended';
  readonly kind = DispositionAppendedEvent.KIND;
  constructor(public readonly payload: DispositionAppendedPayload) {}
}

/**
 * ⭐ **A derived standing finished folding.** Fired by
 * {@link DerivedStandingCache} when a background fold lands, so a live
 * subscription re-resolves and picks up a figure that was absent a
 * moment ago.
 *
 * This is the other half of *a figure the server has not computed yet
 * is absent, not zero*: the absence is honest, and this is what ends
 * it. Without this event the first read of an un-warmed standing would
 * stay blank until something else happened to trigger a re-resolve.
 */
export interface StandingWarmedPayload extends StandingAppendedPayload {
  /** Which derived figure warmed — `'trait'` | `'competence'`. */
  figure: string;
}

export class StandingWarmedEvent {
  static readonly KIND = 'standing.warmed';
  readonly kind = StandingWarmedEvent.KIND;
  constructor(public readonly payload: StandingWarmedPayload) {}
}
