/**
 * Office — the government-seat value-object, its two vocabularies, the
 * authored apparatus constant, and the small result types the office
 * substrate's surface speaks.
 *
 * An office is a *named seat with a single holder* — apparatus-defined,
 * authored-in-code (constitutional, not operator-editable data), and
 * distinct from a general-purpose `Group` (which any player mints) and
 * from a derived chamber population (which falls out of influence and is
 * never "filled"). It carries a branch and an origin the group model
 * lacks; every v1 office is singular (no cardinality vocabulary, no
 * vacancy machinery — a vacated seat reverts to the founder default).
 *
 * Module category: the "Named value-object / vocabulary / registry"
 * home — one module, one concept (the Office), with the vocabularies +
 * the authored `OFFICE_APPARATUS` constant + the surface's result types
 * (a sanctioned `const`/type export). No persistence, no Stuff.
 */

/**
 * The branch of government an office belongs to. Executive +
 * legislative only in v1 — there is no `judiciary` branch because there
 * is no judiciary office: a jury is a *selection from a pool*, not a
 * seat, and that machinery (plus any judiciary seat) is deferred to the
 * political-machinery build. The Governor of the Central Bank is
 * `executive` (administering the economy is an executive function —
 * Art. V §9 / VIII §4).
 */
export type OfficeBranch = 'executive' | 'legislative';

export const OFFICE_BRANCHES: readonly OfficeBranch[] = [
  'executive',
  'legislative',
] as const;

/**
 * How an office came to exist. `constituted` offices are mandated by
 * the constitution (abolished only by amendment); `founder-established`
 * offices are stood up by the founder's pool-of-one power and are
 * ordinary law (the polity may later charter, replace, or abolish them
 * — Art. VIII §3).
 */
export type OfficeOrigin = 'constituted' | 'founder-established';

export const OFFICE_ORIGINS: readonly OfficeOrigin[] = [
  'constituted',
  'founder-established',
] as const;

/** A plain roster row for an office's authored identity. */
export interface OfficeRosterIdentity {
  key: string;
  displayName: string;
  branch: OfficeBranch;
  origin: OfficeOrigin;
}

/**
 * Office — an immutable value-object. Construct via the constructor or
 * {@link Office.from}; accessors only (no setters, no persistence). The
 * apparatus is the authored `OFFICE_APPARATUS` constant below; this
 * class never persists.
 */
export class Office {
  private readonly _key: string;
  private readonly _displayName: string;
  private readonly _branch: OfficeBranch;
  private readonly _origin: OfficeOrigin;

  constructor(
    key: string,
    displayName: string,
    branch: OfficeBranch,
    origin: OfficeOrigin,
  ) {
    this._key = key;
    this._displayName = displayName;
    this._branch = branch;
    this._origin = origin;
  }

  /** Build from a plain shape (the authored-apparatus convenience). */
  public static from(shape: OfficeRosterIdentity): Office {
    return new Office(
      shape.key,
      shape.displayName,
      shape.branch,
      shape.origin,
    );
  }

  /** Lookup an authored office in `OFFICE_APPARATUS` by key, or null. */
  public static byKey(key: string): Office | null {
    const trimmed = (key ?? '').trim();
    if (trimmed.length === 0) return null;
    return OFFICE_APPARATUS.find((o) => o.getKey() === trimmed) ?? null;
  }

  /** Stable slug — the join key to the handoff store + the verb arg. */
  public getKey(): string {
    return this._key;
  }

  /** Human-readable name (e.g. "Prime Minister"). */
  public getDisplayName(): string {
    return this._displayName;
  }

  public getBranch(): OfficeBranch {
    return this._branch;
  }

  public getOrigin(): OfficeOrigin {
    return this._origin;
  }

  /** The public-roster identity row (no holder — that joins at read). */
  public toRosterRow(): OfficeRosterIdentity {
    return {
      key: this._key,
      displayName: this._displayName,
      branch: this._branch,
      origin: this._origin,
    };
  }
}

/**
 * The authored apparatus — the five singular offices. Constitutional
 * data, authored in code (not a seedable collection, not YAML). Four
 * `constituted` seats (Art. IV legislature + House names, Art. V
 * executive/PM) plus one `founder-established` seat (the Central-Bank
 * Governor — ordinary law per Art. VIII §3).
 *
 * The Governor's branch is `executive` (monetary policy is an executive
 * function — Art. V §9 / VIII §4) and it carries no constitutional
 * independence (that would be a legislative choice, unmade). No jury /
 * judiciary office exists in v1 (deferred).
 */
export const OFFICE_APPARATUS: readonly Office[] = [
  Office.from({
    key: 'prime-minister',
    displayName: 'Prime Minister',
    branch: 'executive',
    origin: 'constituted',
  }),
  Office.from({
    key: 'speaker-producer-house',
    displayName: 'Speaker of the Producer House',
    branch: 'legislative',
    origin: 'constituted',
  }),
  Office.from({
    key: 'speaker-patron-house',
    displayName: 'Speaker of the Patron House',
    branch: 'legislative',
    origin: 'constituted',
  }),
  Office.from({
    key: 'speaker-consumer-house',
    displayName: 'Speaker of the Consumer House',
    branch: 'legislative',
    origin: 'constituted',
  }),
  Office.from({
    key: 'central-bank-governor',
    displayName: 'Governor of the Central Bank',
    branch: 'executive',
    origin: 'founder-established',
  }),
] as const;

// ── Surface result types (the office substrate speaks these) ──

/**
 * Who holds an office. `explicit` = a handed-off holder (a row in
 * `office_holders`); `founder` = the computed default (no row);
 * `unknown` = the key isn't an authored office.
 */
export type OfficeHolderResult =
  | { kind: 'explicit'; officeKey: string; holderPlayerId: string }
  | { kind: 'founder'; officeKey: string; founderLabel: string }
  | { kind: 'unknown'; officeKey: string };

/** A public-roster row: authored identity joined with current holder. */
export interface OfficeRosterRow extends OfficeRosterIdentity {
  /** The explicit handed-off holder's playerId, or null on the default. */
  holderPlayerId: string | null;
  /** True when no handoff exists and the seat rests on the founder. */
  isFounderDefault: boolean;
  /** The configured founder display handle (for offline presentation). */
  founderLabel: string;
}

/** The outcome of an `assign` handoff. */
export interface OfficeAssignResult {
  /** Whether anything changed (false = the seat already held by them). */
  changed: boolean;
  /**
   * The displaced explicit holder's playerId, or null when the seat was
   * on the founder default (the auditable replace).
   */
  priorHolderId: string | null;
  /** False when the office key isn't an authored office. */
  ok: boolean;
}
