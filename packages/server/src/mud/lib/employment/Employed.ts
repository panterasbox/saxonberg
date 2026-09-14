/**
 * EmployedMixin — an actor's employment relationships.
 *
 * Composed on `Character` (actor-agnostic: NPCs are the v1 consumer, but a
 * player Avatar is employable at this relationship layer for free — only
 * the *capability* grant waits on runtime mixin composition). A sparse
 * null-default persistent field — the `BeliefStore` / `Status` precedent —
 * so an unemployed Character carries nothing.
 *
 * **Pure storage + the derived conferral read.** The mixin holds the
 * `Employment` records (as plain data) and dumb CRUD over them. It flips no
 * shift state itself: the privileged mutators are written under a
 * **participant contract** — the organization party to the record (its
 * transition methods `hire`/`endEmployment`/`ensureRostered`/`beginShift`/
 * `endShift`/`beginCover`/`endCover` are the callers), with a narrow
 * janitorial arm for the employment engine.
 *
 * `getConferredMixinNames()` is the knowing→doing seam the augment
 * substrate reads: the union of every **on-shift** Employment's Position
 * `confers` list. `MixinApi.collectAugmentConferralNames` picks it up via a
 * structural soft-lookup (no import), so an on-shift bartender's gated
 * `MakerMixin` goes active — and an off-shift one's goes inert.
 *
 * ## ⭐ And **who answers for you** — {@link Employed.institutionPath}
 *
 * The harm ledger names two persons (`killer` and `victim`); what it
 * lacked was their two **parties**. `institutionPath()` is that read: the
 * standing institution that fields this actor, whether or not anybody
 * gave an order on the day. `AccountabilityEvent.partyForOf` calls it and
 * six producers stamp the answer onto every harm row as
 * `killerFor` / `victimFor`.
 *
 * ⚠⚠ **It is NOT `directedBy`, and folding those two together would be a
 * lie the governance design is careful never to tell by accident:**
 *
 *   | | |
 *   |---|---|
 *   | `directedBy` | **episodic** — a captain's recorded directive began *this act* |
 *   | the institution | **standing** — this actor is fielded by X, order or no order |
 *
 * A guard acting for the watch was not *directed* by the watch on this
 * occasion. Conflating them would make every institutional act read as a
 * command.
 *
 * ⭐ **Two attributions or one — same field, different arity.** A `Cast`
 * member carries both, and both are real: Odile's bad ruling is Odile's
 * act *and* the Registry's failure, which is how offices work. A sentient
 * `Extra` has no identity of its own, so its institutional attribution is
 * the only one it has. A wolf has neither, and answers to nobody forever.
 *
 * ⚠ **Why it lives HERE rather than on a mixin of its own.** It shipped
 * as `AffiliatedMixin` and was folded in: a mixin whose composers are
 * exactly one class (`Character`) is the mixin-on-the-wrong-host tell,
 * and both of the read's tiers are authored-or-employment — tier 2 IS
 * `getActiveEmployment()`. The wider name would have been justified by
 * the parcel tier, and that is deferred (below). If a third tier over
 * ground title ever lands, or a non-employable host needs to be fielded
 * by somebody, splitting it back out is the honest move — and by then
 * there will be a second composer to justify it.
 */

import { Mixins, type MixinConstructor, type FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { Employment, type EmploymentData, type EmploymentStatus } from './Employment';
import type { OrganizationStuff, BusinessStuff } from '../../api/employment';
// eslint-disable-next-line no-restricted-imports -- the F4 actor face: an employee's quitJob()/buysFor()/cover verbs forward into the employment logic singleton exactly as the api/employment facade does (the Combustible/Energized precedent)
import { EmploymentLogic } from '../../platform/idea/api/EmploymentLogic';

/**
 * A stored record as it may actually be on disk: pre-split rows carry
 * `businessPath` where current ones carry `organizationPath`. Every raw
 * read below goes through {@link recordKey} rather than either name, so
 * the two shapes coexist with no migration.
 */
type StoredEmployment = EmploymentData & { businessPath?: string };

/** The counterparty key of a stored record, whichever name it was written under. */
function recordKey(record: StoredEmployment): string {
  return record.organizationPath ?? record.businessPath ?? '';
}

/**
 * The participant contract on an employment-record write: the caller is
 * **the organization party to the record** — an `OrganizationMixin`
 * composer whose own path is the record key being written
 * (`_upsertEmployment` carries it inside the record; the other two take it
 * as the first argument). An organization can never touch a record it
 * isn't party to. The employment engine keeps a narrow janitorial arm
 * (`FromTemplate('/platform/idea/api/employment')`) for records whose organization
 * Idea isn't standing (lazy standup means a `quit` can outlive its
 * organization's live instance).
 */
const ByEmployingOrganization = SecurityPolicies.AnyOf(
  SecurityPolicies.FromMixin(Mixins.Organization, {
    where: (caller, _target, method, args) => {
      const path = (caller as Stuff).getTemplatePath() ?? '';
      if (!path) return false;
      const keyed =
        method === '_upsertEmployment'
          ? recordKey((args[0] ?? {}) as StoredEmployment)
          : (args[0] as string | undefined);
      return keyed === path;
    },
  }),
  SecurityPolicies.FromTemplate('/platform/idea/api/employment'),
);

/**
 * Public method surface (methods only). `employments` is public for the
 * Hydrator but is not the contract surface.
 */
export interface Employed {
  /** The authored institution override, or `null`. */
  getInstitution(): string | null;
  /** Set the authored override (an identity path-string). */
  setInstitution(value: string | null): void;
  /**
   * ⭐ **Who answers for this actor** — the standing party that fields
   * them: an authored `institution:`, else the employer, else `null`.
   *
   * The chain shape this codebase uses everywhere
   * (`LocomotionApi.defaultModeFor`, the biome outward walk, the address
   * longest-prefix):
   *
   *   1. an authored `institution:` — explicit wins;
   *   2. else **the employer** — the first still-active `Employment`'s
   *      `organizationPath`. ⭐ The identity build expected to have to
   *      *write* this reverse lookup (`organization → people` shipped;
   *      `person → organization` did not). It was already here.
   *   3. else `null`.
   *
   * ⚠⚠ **Resolved from the DECLARED affiliation, never the current
   * location.** A guard who walks into a tavern does not become the
   * tavern's. There is no containment read on this path at all, and that
   * is the one way to get this obviously wrong.
   *
   * ⚠ **Synchronous, and that is load-bearing.** Combat appends its
   * accountability rows in the *synchronous* prefix of the beat,
   * deliberately — the coup choreography reads the ledger in the same
   * turn as the killing blow.
   *
   * ## ⚠ Why there is no parcel tier (identity-ledgers D10)
   *
   * The plan's third tier was `ParcelApi.ownerOf(<declared home>)`.
   * Deferred, for three reasons that compound:
   *
   *   - **It is async**, and an await here would be a real behaviour
   *     change bought for a tier with no consumer;
   *   - **it has no consumer**: tier 3's only input is
   *     `Character.getDomicileAddress()`, authored on exactly ONE row in
   *     the shipped world (Odile) — who is employed, so tier 2 answers
   *     her first;
   *   - **two of the three owner kinds would be wrong anyway.** A
   *     parcel's owner may be a wizard `group` or a `player`; neither is
   *     an institution in the fiction, and attributing the watch's losses
   *     to the `lounge` wizard group is worse than attributing them to
   *     nobody.
   *
   * ⭐ The honest answer for someone with no employer and no authored
   * institution is *nobody fields you* — and `lint:identity` turns that
   * into a build error for a sentient `Extra`, so an **author** is told
   * rather than the engine guessing from ground title.
   */
  institutionPath(): string | null;

  // The actor face (F4) — forwards into EmploymentLogic.
  quitJob(organizationPath: string): Promise<void>;
  buysFor(): Promise<BusinessStuff[]>;
  beginCovering(business: OrganizationStuff): Employment | null;
  endCovering(business: OrganizationStuff): void;
  shiftState(): 'on-shift' | 'off-shift';
  /** All employment records as value objects. */
  getEmployments(): readonly Employment[];
  /** The record at `organizationPath`, or undefined. */
  getEmployment(organizationPath: string): Employment | undefined;
  /** The first still-active (not quit/fired) employment, or undefined. */
  getActiveEmployment(): Employment | undefined;
  /**
   * Every still-active employment — *what does this actor hold, anywhere?*
   * The inverse of an organization's who-holds-P read, and identical for a
   * ministry, a shop and a publisher.
   */
  getActiveEmployments(): readonly Employment[];
  /** True iff any employment is currently on shift (sync hot-path read). */
  isOnShift(): boolean;
  /** Mixin names conferred by every on-shift Employment's Position. */
  getConferredMixinNames(): readonly string[];
  /**
   * ⭐ **What the job calls its holder** — `'bartender'`, `'clerk'` —
   * from the first ACTIVE employment's Position, or `null`.
   *
   * The second rung of the handle chain, under the author's own word.
   * Active rather than on-shift, deliberately: a bartender walking home
   * is still a bartender. ⭐ And it FOLLOWS the job — the staleness fix,
   * because a description retyped onto the NPC leaves a dismissed
   * weaver reading *"a weaver"* forever.
   */
  getPositionNoun(): string | null;

  /** Participant-gated: set an existing record's status — written by the
   * organization party to the record. */
  _setEmploymentStatus(
    organizationPath: string,
    status: EmploymentStatus,
  ): void;
  /** Participant-gated: replace-or-append a full record — written by the
   * organization party to the record. */
  _upsertEmployment(record: EmploymentData): void;
  /** Participant-gated: drop the record at `organizationPath` — written by
   * the organization party to the record. */
  _removeEmployment(organizationPath: string): void;
}

/** The terminal (no-longer-working) statuses. */
const INACTIVE: readonly EmploymentStatus[] = ['quit', 'fired'];

export function EmployedMixin<TBase extends MixinConstructor>(Base: TBase) {
  class EmployedMixin extends Base implements Employed {
    static _mixinName = 'EmployedMixin';

    static fieldMeta: FieldMeta = {
      employments: { persistent: true, runtimeState: true },
      institution: { ref: 'identity', persistent: true, authorable: true },
    };

    /**
     * Stored employment records (plain data). Sparse: `null` on an
     * unemployed Character (nothing written to the doc). Wrapped into
     * `Employment` value objects on read.
     *
     * ⭐ **An accessor pair, not a plain field.** Every write lands on the
     * setter — a hire (`_upsertEmployment`), an exit (`_removeEmployment`),
     * the Hydrator's bracket-assign fallback, the persistence spine's
     * restore, and a test's direct assignment — and the setter is what
     * keeps the employment logic's per-organization roster memo true. Its
     * predecessor was the reason *who works here?* had to read every
     * object in the world twice on the wage path. CLAUDE.md §
     * per-field invariants belong on setters.
     */
    private _employments: StoredEmployment[] | null = null;

    public get employments(): StoredEmployment[] | null {
      return this._employments;
    }

    public set employments(value: StoredEmployment[] | null) {
      this._employments = value;
      this._noteEmploymentChange();
    }

    /**
     * ⚠ **A method, not a call straight out of the setter.** The roster
     * witness is gated on *the actor writing its own relationship*, and an
     * accessor is not a dispatched frame — a bare
     * `employedLogic().noteEmployments(this)` inside the setter is
     * attributed to whoever did the assigning (a test, the Hydrator) and
     * denied. Going through a method gives the call the actor's own frame.
     *
     * The memo is additive and safe when stale: a leftover entry resolves
     * to no record and every reader skips it, so nothing is removed here.
     */
    public _noteEmploymentChange(): void {
      employedLogic().noteEmployments(this as unknown as Stuff);
    }

    /**
     * The authored institution — an **identity path-string**, not a live
     * ref. It has to survive a reclone, and holding a live `Business`
     * would keep that business resident for as long as any of its people
     * are standing; see `ref-shapes.md`.
     */
    public institution: string | null = null;

    public getInstitution(): string | null {
      return this.institution;
    }

    public setInstitution(value: string | null): void {
      if (value !== null && typeof value !== 'string') {
        throw new TypeError(
          'EmployedMixin.institution must be a path string or null',
        );
      }
      const trimmed = value?.trim() ?? '';
      this.institution = trimmed.length > 0 ? trimmed : null;
    }

    /** See {@link Employed.institutionPath}. */
    public institutionPath(): string | null {
      // 1 — explicit wins.
      if (this.institution) return this.institution;
      // 2 — the employer.
      const path = this.getActiveEmployment()?.organizationPath;
      if (path) return path;
      // 3 — nobody fields you, and the world should say so out loud.
      return null;
    }

    public getEmployments(): readonly Employment[] {
      return (this.employments ?? []).map((e) => Employment.fromData(e));
    }

    public getEmployment(organizationPath: string): Employment | undefined {
      const found = (this.employments ?? []).find(
        (e) => recordKey(e) === organizationPath,
      );
      return found ? Employment.fromData(found) : undefined;
    }

    public getActiveEmployment(): Employment | undefined {
      const found = (this.employments ?? []).find(
        (e) => !INACTIVE.includes(e.status),
      );
      return found ? Employment.fromData(found) : undefined;
    }

    public getActiveEmployments(): readonly Employment[] {
      return (this.employments ?? [])
        .filter((e) => !INACTIVE.includes(e.status))
        .map((e) => Employment.fromData(e));
    }

    public isOnShift(): boolean {
      return (this.employments ?? []).some((e) => e.status === 'on-shift');
    }

    public getConferredMixinNames(): readonly string[] {
      const store = this.employments ?? [];
      if (store.length === 0) return [];
      const out = new Set<string>();
      for (const e of store) {
        if (e.status !== 'on-shift') continue;
        const organization = StuffApi.findByTemplatePath(recordKey(e));
        // ⚠ `MixinApi.isOrganization`, not `typeof x.getPosition ===
        // 'function'`. The duck-type predates the predicate — this build
        // is what added `Mixins.Organization` — and it narrows by shape,
        // so anything that happens to expose a `getPosition` would satisfy
        // it while a genuine organization behind a shadow might not.
        if (!organization || !MixinApi.isOrganization(organization)) continue;
        const position = organization.getPosition(e.positionKey);
        if (!position) continue;
        for (const name of position.confers) out.add(name);
      }
      return [...out];
    }

    /** See {@link Employed.getPositionNoun}. */
    public getPositionNoun(): string | null {
      // The same walk `getConferredMixinNames` makes, taken once against
      // the first active record: employment → organization → position.
      const employment = this.getActiveEmployment();
      if (!employment) return null;
      const organization = StuffApi.findByTemplatePath(
        employment.organizationPath,
      );
      if (!organization || !MixinApi.isOrganization(organization)) return null;
      // ⚠ Null, not a guess, when the position has no noun: a firm-named
      // key (`vionne`, `hollis`) is an identifier and "a vionne" is not
      // a thing anybody is called. The chain falls to the species.
      return organization.getPosition(employment.positionKey)?.noun ?? null;
    }

    @CallSecurity(ByEmployingOrganization)
    @Final
    @Unshadowable
    public _setEmploymentStatus(
      organizationPath: string,
      status: EmploymentStatus,
    ): void {
      const store = this.employments;
      if (!store) return;
      const record = store.find((e) => recordKey(e) === organizationPath);
      if (!record) return;
      record.status = status;
      // Leaving a shift clears the running-shift stamp; the on-transition
      // stamp is set by the engine via `_upsertEmployment` (it owns the
      // clock).
      if (status !== 'on-shift') record.onShiftSince = null;
    }

    @CallSecurity(ByEmployingOrganization)
    @Final
    @Unshadowable
    public _upsertEmployment(record: EmploymentData): void {
      // Rebuild-and-assign rather than mutate in place: the assignment is
      // what fires the setter, and the setter is the roster memo's witness.
      const store = this._employments ? [...this._employments] : [];
      const idx = store.findIndex(
        (e) => recordKey(e) === record.organizationPath,
      );
      if (idx >= 0) store[idx] = record;
      else store.push(record);
      this.employments = store;
    }

    @CallSecurity(ByEmployingOrganization)
    @Final
    @Unshadowable
    public _removeEmployment(organizationPath: string): void {
      if (!this._employments) return;
      this.employments = this._employments.filter(
        (e) => recordKey(e) !== organizationPath,
      );
    }
    // ------- the actor face (F4) — forwards into EmploymentLogic -------

    /** Quit `organizationPath` (status → quit; unlinks the house account). */
    public quitJob(organizationPath: string): Promise<void> {
      return employedLogic().quit(this as unknown as Stuff, organizationPath);
    }

    /** Every Business this actor buys for (position `purchases: true`). */
    public buysFor(): Promise<BusinessStuff[]> {
      return employedLogic().buysFor(this as unknown as Stuff);
    }

    /** Begin covering `business` (transient on-shift Employment). */
    public beginCovering(business: OrganizationStuff): Employment | null {
      return employedLogic().beginCover(this as unknown as Stuff, business);
    }

    /** End a cover — drop the transient cover Employment. */
    public endCovering(business: OrganizationStuff): void {
      employedLogic().endCover(this as unknown as Stuff, business);
    }

    /** On-shift/off-shift, roster-aware (the ticked read). */
    public shiftState(): 'on-shift' | 'off-shift' {
      return employedLogic().shiftStateOf(this as unknown as Stuff);
    }
  }

  return EmployedMixin;
}

/** Resolve the HMR-able EmploymentLogic singleton (the labor pipeline). */
function employedLogic(): EmploymentLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/employment',
    () => new EmploymentLogic(),
  );
}
