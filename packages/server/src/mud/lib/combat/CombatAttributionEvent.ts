/**
 * CombatAttributionEvent — one row of the append-only combat **blame
 * ledger**, one document per attribution act in the dedicated
 * `combat_attribution_events` collection.
 *
 * A plain `Document` (not Stuff): the row IS the fact. This is the
 * `RenownEvent` / `AuthoringEvent` shape — a **dumb store, smart
 * consumer**. Combat never stamps a "murderer" flag on a `Creature`;
 * instead it appends the objective facts of a fight — who opened it, on
 * what terms, whether the defender consented, and who fell to whom — and
 * culpability is **derived on read** by replaying the rows
 * (`CombatLogic.blameFor`), exactly as `ProvenanceApi.authorOf` derives
 * authorship from the earliest authoring row. Re-legislating what counts
 * as a crime re-scores history without rewriting a single row.
 *
 * Three writers, no others:
 *   - `opened`   — a fight began: initiator, opponent, terms, consent,
 *                  and whether the opponent was a sentient person.
 *   - `violated` — the crime marker: lethal terms were **imposed** on a
 *                  non-consenting sentient (the standalone signal a
 *                  future world-reaction / bounty consumer reads).
 *   - `death`    — a combatant was killed: victim, killer, and the terms
 *                  in force, so the reader derives lawful-vs-crime.
 *
 * Durable ids are `templatePath`s (an Avatar's `/obj/Avatar/<id>`, an
 * NPC's template path) — the same durable keying renown/provenance use,
 * so a combatant's blame survives a reclone.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../../../backend/PersistenceManager';
import type { Lethality, StopCondition } from './CombatTerms';

/** The kind of attribution row. Closed vocabulary (three writers). */
export type CombatAttributionKind = 'opened' | 'violated' | 'death';

/**
 * The derived verdict of the blame ledger for a victim's death — who is
 * culpable and whether it was a crime. Derived on read by replaying the
 * append-only attribution rows (never a stamped stat); `null` when the
 * victim has no attributed death.
 */
export interface BlameVerdict {
  sessionId: string;
  /** Durable id of the party who struck the killing blow. */
  killer: string;
  /** Durable id of the party who opened the fight. */
  initiator: string;
  /** Durable id of the fallen. */
  victim: string;
  /** Unlawful — a sentient person killed under non-consented lethal terms. */
  crime: boolean;
}

/**
 * The fields a caller supplies to append one attribution row — the
 * `CombatApi.recordAttribution` call shape. `kind`, `sessionId`,
 * `initiator`, and `opponent` are required; `victim`/`killer` default to
 * `''` (set only on `death` rows); `at`/`realAt` default to the game-time
 * witness / wall clock (resolved by the append seam when omitted).
 */
export interface CombatAttributionFields {
  kind: CombatAttributionKind;
  /** The combat session's engagement id (groups a fight's rows). */
  sessionId: string;
  /** Durable id of the party who opened the fight. */
  initiator: string;
  /** Durable id of the other party. */
  opponent: string;
  /** Durable id of the fallen (death rows only). */
  victim?: string;
  /** Durable id of the finisher (death rows only). */
  killer?: string;
  lethality: Lethality;
  stopCondition: StopCondition;
  /** Whether the opponent consented to these terms. */
  consented: boolean;
  /** Whether the opponent was a sentient person (vs. a beast/cull). */
  sentient: boolean;
  /** Address-prefix scope where it happened, or `null` = global. */
  locality?: string | null;
  /** Game-time SECONDS witness. */
  at?: number;
  /** Real-time epoch MILLISECONDS — the ordering key for earliest-row. */
  realAt?: number;
}

export default class CombatAttributionEvent extends Document {
  static collectionName = Collections.CombatAttributionEvents;
  static persistentFields = [
    'kind',
    'sessionId',
    'initiator',
    'opponent',
    'victim',
    'killer',
    'lethality',
    'stopCondition',
    'consented',
    'sentient',
    'locality',
    'at',
    'realAt',
  ];

  kind: CombatAttributionKind = 'opened';
  /** The fight's engagement id — indexed (a fight's whole chain). */
  sessionId = '';
  /** Durable id of who opened the fight. */
  initiator = '';
  /** Durable id of the other party. */
  opponent = '';
  /** Durable id of the fallen — indexed (blame for a victim's death). */
  victim = '';
  /** Durable id of the finisher. */
  killer = '';
  lethality: Lethality = 'non-lethal';
  stopCondition: StopCondition = 'yield';
  /** Whether the opponent consented to these terms. */
  consented = true;
  /** Whether the opponent was a sentient person. */
  sentient = false;
  /** Address-prefix scope, or `null` = global. */
  locality: string | null = null;
  /** Game-time SECONDS witness. */
  at = 0;
  /** Real-time epoch MILLISECONDS — earliest-row ordering key. */
  realAt = 0;

  /**
   * The replay reader (pure): derive the blame verdict for a victim from
   * their attribution rows — the **earliest** `death` row is the
   * authoritative one (the `ProvenanceApi.authorOf` earliest-row rule).
   * A death is a **crime** when a sentient person was killed under lethal
   * terms they did not consent to. `null` when there is no death row.
   */
  static deriveBlame(rows: CombatAttributionEvent[]): BlameVerdict | null {
    const deaths = rows.filter((r) => r.kind === 'death');
    if (deaths.length === 0) return null;
    const first = [...deaths].sort((a, b) => a.realAt - b.realAt)[0]!;
    return {
      sessionId: first.sessionId,
      killer: first.killer,
      initiator: first.initiator,
      victim: first.victim,
      crime:
        first.lethality === 'lethal' && !first.consented && first.sentient,
    };
  }
}
