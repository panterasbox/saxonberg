/**
 * AccountabilityEvent — one row of the append-only **harm-accountability
 * ledger**, one document per attribution act in the dedicated
 * `accountability_events` collection.
 *
 * A plain `Document` (not Stuff): the row IS the fact. This is the
 * `RenownEvent` / `AuthoringEvent` / `CombatAttributionEvent` shape — a
 * **dumb store, smart consumers**. Nothing stamps a "murderer" flag on a
 * `Creature`; instead the objective facts of a harm are appended — who
 * did it, on what terms, whether the victim consented, whether the victim
 * was a sentient person, and (for a death) who fell to whom — and
 * culpability is **derived on read** by replaying the rows
 * (`AccountabilityLogic.blameFor`), exactly as `ProvenanceApi.authorOf`
 * derives authorship from the earliest authoring row. Re-legislating what
 * counts as a crime re-scores history without rewriting a single row.
 *
 * This substrate **generalizes combat's former `CombatAttributionEvent`**
 * (extracted here byte-identically): combat migrates onto it as its first
 * consumer, and its blame outcomes are unchanged. The one addition is the
 * `harm` kind — a single terminal row a non-combat producer (a sprung
 * player-trap) appends at the moment it hurts someone. The combat-specific
 * `lethality`/`stopCondition` are optional (harmless defaults for a
 * `harm` row; a snare has no "lethal terms").
 *
 * The row kinds:
 *   - `opened`   — a fight began: initiator, opponent, terms, consent,
 *                  and whether the opponent was a sentient person.
 *   - `violated` — the crime marker: lethal terms were **imposed** on a
 *                  non-consenting sentient (the standalone signal a future
 *                  world-reaction / bounty consumer reads).
 *   - `death`    — a combatant was killed: victim, killer, and the terms
 *                  in force, so the reader derives lawful-vs-crime.
 *   - `harm`     — a non-combat harm landed (a sprung trap): actor, victim,
 *                  consent (default non-consented), and sentience. Its
 *                  crime rule is the terms-free `!consented && sentient`.
 *
 * Durable ids are `templatePath`s (an Avatar's `/obj/Avatar/<id>`, an
 * NPC's template path) — the same durable keying renown/provenance use,
 * so a victim's blame survives a reclone.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
import type { Lethality, StopCondition } from '../combat/CombatTerms';
import type { FieldMeta } from '../mixin';

/** The kind of attribution row. Closed vocabulary (four writers). */
export type AccountabilityKind = 'opened' | 'violated' | 'death' | 'harm';

/**
 * The derived verdict of the accountability ledger for a victim — who is
 * culpable and whether it was a crime. Derived on read by replaying the
 * append-only rows (never a stamped stat); `null` when the victim has no
 * attributed terminal harm (`death` or `harm`).
 */
export interface BlameVerdict {
  sessionId: string;
  /** Durable id of the party who struck the killing/harming blow. */
  killer: string;
  /** Durable id of the party who opened the fight / set the trap. */
  initiator: string;
  /** Durable id of the harmed party. */
  victim: string;
  /** Unlawful — harm to a non-consenting sentient (see the kind rule). */
  crime: boolean;
  /**
   * Durable id of the party bearing **command responsibility** — the
   * captain whose recorded directive began the killing act — or `''`.
   * Derived, never stamped: a crime row carrying `directedBy` names the
   * commander alongside the striker, so credit and blame can diverge
   * (an unlawful directed Master-Apprentice kill: the apprentice holds
   * the deed, the master holds the responsibility). Legitimacy consumers
   * (guard/law/court) read this; the engine only records the facts.
   */
  commandResponsible: string;
}

/**
 * The fields a caller supplies to append one attribution row — the
 * `AccountabilityApi.record` call shape. `kind`, `sessionId`,
 * `initiator`, and `opponent` are required; `victim`/`killer` default to
 * `''` (set only on terminal rows); `lethality`/`stopCondition` default to
 * harmless non-combat values (only combat rows set them); `at`/`realAt`
 * default to the game-time witness / wall clock (resolved by the append
 * seam when omitted).
 */
export interface AccountabilityFields {
  kind: AccountabilityKind;
  /** The producing session's id (groups a fight's rows; a trap's is its own). */
  sessionId: string;
  /** Durable id of the party who opened the fight / set the trap. */
  initiator: string;
  /** Durable id of the other party. */
  opponent: string;
  /** Durable id of the harmed party (terminal rows only). */
  victim?: string;
  /** Durable id of the finisher (terminal rows only). */
  killer?: string;
  /** Combat-only: the terms' lethality (absent for a `harm` row). */
  lethality?: Lethality;
  /** Combat-only: the terms' stop condition (absent for a `harm` row). */
  stopCondition?: StopCondition;
  /** Whether the victim consented to being harmed by this actor. */
  consented: boolean;
  /** Whether the victim was a sentient person (vs. a beast/cull). */
  sentient: boolean;
  /** Address-prefix scope where it happened, or `null` = global. */
  locality?: string | null;
  /**
   * The killer's side's formation path in force at the terminal act
   * (`''` when none applied) — a recorded FACT for legitimacy consumers,
   * never consulted by the crime rule itself.
   */
  formationPath?: string;
  /** The killer's assigned formation role at the terminal act (`''`). */
  killerRole?: string;
  /**
   * Durable id of the captain whose recorded directive began the killing
   * act (`''` when unbidden). A directed formation implies command
   * responsibility — `deriveBlame` surfaces it on a crime verdict.
   */
  directedBy?: string;
  /** Game-time SECONDS witness. */
  at?: number;
  /** Real-time epoch MILLISECONDS — the ordering key for earliest-row. */
  realAt?: number;
}

export default class AccountabilityEvent extends Document {
  static collectionName = Collections.AccountabilityEvents;
  /**
   * The epistemic wire mark the persistence layer stamps on a row written
   * from circle context (sandbox.md's PASS(mark) row).
   *
   * Declared here for one reason: `Document.fromDocument` only reads
   * DECLARED persistent fields, so without this the mark was written to
   * Mongo and then silently dropped on the way back — recorded, and
   * unreadable by the one consumer that needs it.
   *
   * Kept OFF field-side rows by the `toDocument` override below, so an
   * ordinary row's document is byte-identical to what it was before.
   */
  circleScope: string | null = null;

  static fieldMeta: FieldMeta = {
    kind: { persistent: true },
    sessionId: { persistent: true },
    initiator: { persistent: true },
    opponent: { persistent: true },
    victim: { persistent: true },
    killer: { persistent: true },
    lethality: { persistent: true },
    stopCondition: { persistent: true },
    consented: { persistent: true },
    sentient: { persistent: true },
    locality: { persistent: true },
    formationPath: { persistent: true },
    killerRole: { persistent: true },
    directedBy: { persistent: true },
    at: { persistent: true },
    realAt: { persistent: true },
    circleScope: { persistent: true },
  };

  kind: AccountabilityKind = 'opened';
  /** The producing session's id — indexed (a fight's whole chain). */
  sessionId = '';
  /** Durable id of who opened the fight / set the trap. */
  initiator = '';
  /** Durable id of the other party. */
  opponent = '';
  /** Durable id of the harmed party — indexed (blame for a victim). */
  victim = '';
  /** Durable id of the finisher. */
  killer = '';
  lethality: Lethality = 'non-lethal';
  stopCondition: StopCondition = 'yield';
  /** Whether the victim consented to being harmed by this actor. */
  consented = true;
  /** Whether the victim was a sentient person. */
  sentient = false;
  /** Address-prefix scope, or `null` = global. */
  locality: string | null = null;
  /** The killer's side's formation path at the terminal act, or `''`. */
  formationPath = '';
  /** The killer's assigned formation role at the terminal act, or `''`. */
  killerRole = '';
  /** Durable id of the directing captain, or `''` (unbidden). */
  directedBy = '';
  /** Game-time SECONDS witness. */
  at = 0;
  /** Real-time epoch MILLISECONDS — earliest-row ordering key. */
  realAt = 0;

  /**
   * The replay reader (pure): derive the blame verdict for a victim from
   * their attribution rows — the **earliest** terminal row (`death` or
   * `harm`) is the authoritative one (the `ProvenanceApi.authorOf`
   * earliest-row rule). Crime branches on the row's `kind`, which is why
   * combat stays byte-identical:
   *   - `death` — a crime when a sentient person was killed under lethal
   *     terms they did not consent to (the unchanged combat rule).
   *   - `harm`  — a crime when a non-consenting sentient was harmed (there
   *     is no "lethal terms" concept for a snare).
   * `null` when there is no terminal row.
   */
  /**
   * Keep `circleScope` off field-side rows.
   *
   * The persistence layer stamps the mark itself when a write happens from
   * circle context; this class never sets it. Emitting an explicit `null`
   * for ordinary rows would change every document in the collection for no
   * reason, so it is stripped when absent and an ordinary row's shape stays
   * exactly what it was.
   */
  protected override toDocument(): Record<string, unknown> {
    const doc = super.toDocument();
    if (doc.circleScope == null) delete doc.circleScope;
    return doc;
  }

  static deriveBlame(rows: AccountabilityEvent[]): BlameVerdict | null {
    // A killing staged inside a private circle is not evidence about
    // anyone. The write-path policy table classifies this collection
    // PASS(mark): the row persists carrying its `circleScope`, and readers
    // may lens the mark — so a holodeck death stays a true thing that
    // happened to you, while being structurally unable to convict you.
    //
    // Without this, anyone who could open a circle could manufacture a
    // crime row against a real identity, because the mark was recorded and
    // never consulted. Derive-on-read is exactly the right place to fix
    // that: it re-legislates every row ever written without rewriting one.
    const field = rows.filter((r) => !r.circleScope);
    const terminal = field.filter(
      (r) => r.kind === 'death' || r.kind === 'harm',
    );
    if (terminal.length === 0) return null;
    const first = [...terminal].sort((a, b) => a.realAt - b.realAt)[0]!;
    const crime =
      first.kind === 'death'
        ? first.lethality === 'lethal' && !first.consented && first.sentient
        : !first.consented && first.sentient;
    return {
      sessionId: first.sessionId,
      killer: first.killer,
      initiator: first.initiator,
      victim: first.victim,
      crime,
      // Command responsibility: a directed unlawful act names the
      // commander alongside the striker (credit/blame divergence). The
      // crime rule itself is untouched — this is an additional derived
      // fact, not a new culpability condition.
      commandResponsible: crime ? (first.directedBy ?? '') : '',
    };
  }
}
