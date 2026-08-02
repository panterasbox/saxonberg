/**
 * CombatFormation — an authored, party-level **policy over the threat
 * graph**: who holds which engagement, who intercepts what, who finishes
 * the fallen. One singleton Idea per preset at
 * `/lib/combat/CombatFormation/<name>` (the `LocomotionMode`
 * precedent — authored data, no registry), referenced by **path string**
 * from the party side (ref-shapes Pattern A).
 *
 * The Idea carries only **declared shape**; what a policy token *means*
 * (how `'called'` allocates, what `high-threat` measures) is combat's
 * module-private interpreter in `CombatLogic`, and every magnitude is a
 * `combat.formation.*` AppSettings dial. Formation resolution is a
 * **total chain** on the party face (`PartyApi.formationPathOf`: active
 * party's formation, else the default preset) — there is no null branch
 * anywhere in the exchange loop, and "solo" is not a concept: a partyless
 * combatant, a party that never chose, and a party of one all resolve the
 * same way.
 *
 * **Roles are sets, not seats**: `roles` is the assignment vocabulary the
 * captain hands out (`party assign <role> <member>`), any number of
 * members may hold the same role, a **vacant** role's clauses are inert
 * (the policy degrades to its fallback rung), and a **plural** role
 * resolves to its holders in party-roster order wherever a clause needs
 * exactly one referent. See docs/subsystems/combat-formations.md.
 */

import { Idea } from "../stuff/Idea";
import { SingletonMixin } from "../stuff/Singleton";
import type { FieldMeta } from "../mixin";

/** How a member under this formation picks its exchange target. */
export type AllocationKind = "sustain" | "called" | "primary";

/** When an interception (policy-triggered redirect) fires for a
 * protected role: never / on any incoming edge / only at focus-fire
 * pressure (`combat.formation.ma.highThreatEdges` incoming edges). */
export type InterceptTrigger = "none" | "any" | "high-threat";

/** Who holds the coup decision — whoever is engaged (the default), or
 * the party captain (a hierarchical formation's command call). */
export type CoupCall = "engaged" | "captain";

const ALLOCATION_KINDS: readonly AllocationKind[] = [
  "sustain",
  "called",
  "primary",
];
const INTERCEPT_TRIGGERS: readonly InterceptTrigger[] = [
  "none",
  "any",
  "high-threat",
];
const COUP_CALLS: readonly CoupCall[] = ["engaged", "captain"];

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

export class CombatFormation extends SingletonMixin(Idea) {
  /**
   * The built-in fallback policy — value-equal to the seeded `default`
   * preset (a test pins the equivalence), consumed when the Idea is not
   * resident (bare unit tests, cold boot). Byte-preserves pre-formation
   * combat: sustained allocation, no interception, engaged coup.
   */
  static readonly DEFAULT_POLICY: FormationPolicy = Object.freeze({
    name: "default",
    roles: Object.freeze([]) as readonly string[],
    allocation: "sustain",
    primaryRole: "",
    protectsRoles: Object.freeze([]) as readonly string[],
    interceptorRoles: Object.freeze([]) as readonly string[],
    interceptTrigger: "none",
    coupRight: "engaged",
    coupCall: "engaged",
  });

  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    roles: { persistent: true },
    allocation: { persistent: true },
    primaryRole: { persistent: true },
    protectsRoles: { persistent: true },
    interceptorRoles: { persistent: true },
    interceptTrigger: { persistent: true },
    coupRight: { persistent: true },
    coupCall: { persistent: true },
  };

  /** Short name (`'vanguard'`); the templatePath is
   * `/lib/combat/CombatFormation/<name>`. */
  protected name: string = "";
  protected roles: string[] = [];
  protected allocation: AllocationKind = "sustain";
  protected primaryRole: string = "";
  protected protectsRoles: string[] = [];
  protected interceptorRoles: string[] = [];
  protected interceptTrigger: InterceptTrigger = "none";
  protected coupRight: string = "engaged";
  protected coupCall: CoupCall = "engaged";

  /** Memoized frozen policy; every setter invalidates it. */
  private _policy: FormationPolicy | null = null;

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError("CombatFormation.setName: must be a non-empty string");
    }
    this.name = value;
    this._policy = null;
  }

  public getRoles(): readonly string[] {
    return this.roles;
  }
  public setRoles(value: string[]): void {
    assertUniqueNonEmpty(value, "setRoles");
    this.roles = value;
    this._policy = null;
  }

  public getAllocation(): AllocationKind {
    return this.allocation;
  }
  public setAllocation(value: AllocationKind): void {
    if (!ALLOCATION_KINDS.includes(value)) {
      throw new TypeError(
        `CombatFormation.setAllocation: invalid value '${value}'; ` +
          `expected one of ${ALLOCATION_KINDS.join(", ")}`,
      );
    }
    this.allocation = value;
    this._policy = null;
  }

  public getPrimaryRole(): string {
    return this.primaryRole;
  }
  public setPrimaryRole(value: string): void {
    this.primaryRole = value ?? "";
    this._policy = null;
  }

  public getProtectsRoles(): readonly string[] {
    return this.protectsRoles;
  }
  public setProtectsRoles(value: string[]): void {
    assertUniqueNonEmpty(value, "setProtectsRoles");
    this.protectsRoles = value;
    this._policy = null;
  }

  public getInterceptorRoles(): readonly string[] {
    return this.interceptorRoles;
  }
  public setInterceptorRoles(value: string[]): void {
    assertUniqueNonEmpty(value, "setInterceptorRoles");
    this.interceptorRoles = value;
    this._policy = null;
  }

  public getInterceptTrigger(): InterceptTrigger {
    return this.interceptTrigger;
  }
  public setInterceptTrigger(value: InterceptTrigger): void {
    if (!INTERCEPT_TRIGGERS.includes(value)) {
      throw new TypeError(
        `CombatFormation.setInterceptTrigger: invalid value '${value}'; ` +
          `expected one of ${INTERCEPT_TRIGGERS.join(", ")}`,
      );
    }
    this.interceptTrigger = value;
    this._policy = null;
  }

  public getCoupRight(): string {
    return this.coupRight;
  }
  public setCoupRight(value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError(
        "CombatFormation.setCoupRight: must be 'engaged' or a role name",
      );
    }
    this.coupRight = value;
    this._policy = null;
  }

  public getCoupCall(): CoupCall {
    return this.coupCall;
  }
  public setCoupCall(value: CoupCall): void {
    if (!COUP_CALLS.includes(value)) {
      throw new TypeError(
        `CombatFormation.setCoupCall: invalid value '${value}'; ` +
          `expected one of ${COUP_CALLS.join(", ")}`,
      );
    }
    this.coupCall = value;
    this._policy = null;
  }

  /** The frozen policy value the beat consults (memoized; invalidated by
   * every setter, so a CMS re-hydrate is picked up next consult). */
  public policy(): FormationPolicy {
    if (!this._policy) {
      this._policy = Object.freeze({
        name: this.name,
        roles: Object.freeze([...this.roles]) as readonly string[],
        allocation: this.allocation,
        primaryRole: this.primaryRole,
        protectsRoles: Object.freeze([
          ...this.protectsRoles,
        ]) as readonly string[],
        interceptorRoles: Object.freeze([
          ...this.interceptorRoles,
        ]) as readonly string[],
        interceptTrigger: this.interceptTrigger,
        coupRight: this.coupRight,
        coupCall: this.coupCall,
      });
    }
    return this._policy;
  }
}

function assertUniqueNonEmpty(value: string[], where: string): void {
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== "string" || v.length === 0) {
      throw new TypeError(
        `CombatFormation.${where}: entries must be non-empty strings`,
      );
    }
    if (seen.has(v)) {
      throw new TypeError(`CombatFormation.${where}: duplicate entry '${v}'`);
    }
    seen.add(v);
  }
}

export default CombatFormation;
