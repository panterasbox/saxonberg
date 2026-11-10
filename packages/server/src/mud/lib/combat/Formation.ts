/**
 * Formation — an authored, party-level **policy over the threat graph**: who
 * holds which engagement, who intercepts what, who finishes the fallen — as
 * a `formation` document (`/platform/formations/vanguard`; a document since
 * the path-identity build — the preset is vocabulary a query reaches through
 * the party, never something targeted itself).
 *
 * The document carries only **declared shape**; what a policy token
 * *means* (how `'called'` allocates, what `high-threat` measures) is
 * combat's interpreter in `CombatLogic`, and every magnitude is a
 * `combat.formation.*` dial. A party names its formation by PATH and is
 * live only when that formation is (documents D7): the formation setter
 * asserts it resident, the party's restore loads it, and `party adopt <word>`
 * resolves the word to a document in the act. A combatant with no party, or
 * a party that never chose, fights by {@link DEFAULT_FORMATION_POLICY},
 * value-equal to the shipped `default`.
 *
 * **Roles are sets, not seats** — see docs/subsystems/combat-formations.md.
 */


/** How a member under this formation picks its exchange target. */
export type AllocationKind = 'sustain' | 'called' | 'primary';

/** When an interception (policy-triggered redirect) fires for a
 * protected role: never / on any incoming edge / only at focus-fire
 * pressure (`combat.formation.ma.highThreatEdges` incoming edges). */
export type InterceptTrigger = 'none' | 'any' | 'high-threat';

/** Who holds the coup decision — whoever is engaged (the default), or
 * the party captain (a hierarchical formation's command call). */
export type CoupCall = 'engaged' | 'captain';


/**
 * The frozen policy value the combat interpreter consumes each beat —
 * read once per consult via {@link CombatFormation.policy} so a beat
 * never sees a half-edited formation.
 */
export interface FormationPolicy {
  readonly name: string;
  /** The role vocabulary (ordered — the captain's assignment menu). */
  readonly roles: readonly string[];
  readonly allocation: AllocationKind;
  /** The role(s) under `primary` allocation whose holder anchors the
   * side's shared target (MA's apprentice). `''` when unused. */
  readonly primaryRole: string;
  /** Roles whose holders are protected (their incoming edges intercept
   * away). */
  readonly protectsRoles: readonly string[];
  /** Roles that take the redirected edge, in priority order. */
  readonly interceptorRoles: readonly string[];
  readonly interceptTrigger: InterceptTrigger;
  /** Who performs a coup: `'engaged'` (the downing attacker) or a role
   * name (its first standing holder — MA routes the deed to the
   * apprentice). */
  readonly coupRight: string;
  readonly coupCall: CoupCall;
}

/** Where the default preset lives. */
export const DEFAULT_FORMATION_PATH = '/platform/formations/default';

/**
 * The built-in policy of a combatant with no party (or a party that never
 * chose) — value-equal to the shipped `default` preset (a test pins the
 * equivalence). Sustained allocation, no interception, engaged coup.
 */
export const DEFAULT_FORMATION_POLICY: FormationPolicy = Object.freeze({
  name: 'default',
  roles: Object.freeze([]) as readonly string[],
  allocation: 'sustain',
  primaryRole: '',
  protectsRoles: Object.freeze([]) as readonly string[],
  interceptorRoles: Object.freeze([]) as readonly string[],
  interceptTrigger: 'none',
  coupRight: 'engaged',
  coupCall: 'engaged',
  });
