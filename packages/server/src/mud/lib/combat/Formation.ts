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
 * live only when that formation is (documents D7): `Party.onCreate` and the
 * party's restore load it, and `party adopt <word>` resolves the word to a
 * document in the act. A combatant with NO party fights by
 * {@link Formation.DEFAULT_POLICY}, value-equal to the shipped `default`.
 *
 * **Roles are sets, not seats** — see docs/subsystems/combat-formations.md.
 */

import { DocumentCache } from "../document/DocumentCache";

/** How a member under this formation picks its exchange target. */
export type AllocationKind = 'sustain' | 'called' | 'primary';

/** When an interception (policy-triggered redirect) fires for a
 * protected role: never / on any incoming edge / only at focus-fire
 * pressure (`combat.formation.ma.highThreatEdges` incoming edges). */
export type InterceptTrigger = 'none' | 'any' | 'high-threat';

/** Who holds the coup decision — whoever is engaged (the default), or
 * the party captain (a hierarchical formation's command call). */
export type CoupCall = 'engaged' | 'captain';

const ALLOCATION_KINDS: readonly AllocationKind[] = [
  'sustain',
  'called',
  'primary',
];
const INTERCEPT_TRIGGERS: readonly InterceptTrigger[] = [
  'none',
  'any',
  'high-threat',
];
const COUP_CALLS: readonly CoupCall[] = ['engaged', 'captain'];

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
 * The formation documents, by path — see the module header.
 *
 * @internal combat's and the party's; a captain names a formation by its word.
 */
export class Formation {
  /**
   * The built-in policy of a combatant with no party — value-equal to the
   * shipped `default` preset (a test pins the equivalence). Sustained
   * allocation, no interception, engaged coup.
   */
  static readonly DEFAULT_POLICY: FormationPolicy = Object.freeze({
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

  private static memo: DocumentCache<FormationPolicy> | null = null;
  private static get cache(): DocumentCache<FormationPolicy> {
    // Built on first use: a static built at module load races an import
    // cycle through the document store.
    return (Formation.memo ??= new DocumentCache<FormationPolicy>('formation', (doc) =>
      Formation.fromData(doc.getData(), doc.getPath()),
    ));
  }

  /** Validate a formation document at `path` into its frozen policy (the installer's validator too). */
  public static fromData(data: Record<string, unknown>, path: string): FormationPolicy {
    const fail = (why: string): never => {
      throw new TypeError(`formation '${path}': ${why}`);
    };
    const list = (v: unknown, field: string): readonly string[] => {
      const arr = Array.isArray(v) ? v : [];
      const seen = new Set<string>();
      for (const x of arr) {
        if (typeof x !== 'string' || x.length === 0) fail(`${field} entries must be non-empty strings`);
        if (seen.has(x as string)) fail(`${field} has a duplicate entry '${String(x)}'`);
        seen.add(x as string);
      }
      return Object.freeze([...(arr as string[])]);
    };
    const allocation = (data.allocation ?? 'sustain') as AllocationKind;
    if (!ALLOCATION_KINDS.includes(allocation)) fail(`allocation '${String(allocation)}' is not one of ${ALLOCATION_KINDS.join(', ')}`);
    const interceptTrigger = (data.interceptTrigger ?? 'none') as InterceptTrigger;
    if (!INTERCEPT_TRIGGERS.includes(interceptTrigger)) fail(`interceptTrigger '${String(interceptTrigger)}' is not one of ${INTERCEPT_TRIGGERS.join(', ')}`);
    const coupCall = (data.coupCall ?? 'engaged') as CoupCall;
    if (!COUP_CALLS.includes(coupCall)) fail(`coupCall '${String(coupCall)}' is not one of ${COUP_CALLS.join(', ')}`);
    const coupRight = typeof data.coupRight === 'string' && data.coupRight ? data.coupRight : 'engaged';
    return Object.freeze({
      name: path.slice(path.lastIndexOf('/') + 1),
      roles: list(data.roles, 'roles'),
      allocation,
      primaryRole: typeof data.primaryRole === 'string' ? data.primaryRole : '',
      protectsRoles: list(data.protectsRoles, 'protectsRoles'),
      interceptorRoles: list(data.interceptorRoles, 'interceptorRoles'),
      interceptTrigger,
      coupRight,
      coupCall,
    });
  }

  /** The formation at `path`, read if it is not resident; throws naming a path with none. */
  public static ensure(path: string): Promise<FormationPolicy> {
    return Formation.cache.ensure(path);
  }

  /** The resident formation at `path`; `DocumentNotResidentError` if the party never loaded it. */
  public static need(path: string): FormationPolicy {
    return Formation.cache.need(path);
  }

  /** The PATH of the formation a captain's typed word names, or `null` (and it is then resident). */
  public static async pathOfWord(word: string): Promise<string | null> {
    const hits = await Formation.cache.byWord(word);
    return hits[0]?.path ?? null;
  }

  /** Keep a formation (a unit fixture with no store behind it). */
  public static remember(path: string, p: FormationPolicy): FormationPolicy {
    return Formation.cache.remember(path, p);
  }
}
