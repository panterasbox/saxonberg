/**
 * OrganizationMixin — the org chart: positions, holders, and the authority
 * that fills them.
 *
 * **Business models participation in the economy; an organization models
 * the chart.** Everything here is the chart half: the authored
 * {@link Position}s, the {@link Roster}, the **appointing authority**, and
 * the holder transitions the employment engine drives.
 * `BusinessMixin` **requires** this on its base and keeps only what trades
 * — `banksAt`, `operatingLocations`, the P&L account path, wage
 * settlement.
 *
 * The point of the split is that *"who holds position P in organization
 * O?"* has to be answerable of a ministry, a shop and a newspaper with one
 * read. Before it, a registry had to be a Business — a thing that does not
 * trade, standing up as a trading entity — purely because that is where
 * positions lived. See docs/subsystems/employment.md.
 *
 * Persistent fields are the raw seed shapes; the accessors wrap them in the
 * {@link Position} / {@link Roster} value objects on read (the `Biome`
 * field-plus-getter precedent).
 *
 * Every record write is keyed on THIS organization's own path — which is
 * exactly the participant contract on `Employed`'s gated mutators
 * (`FromMixin(Mixins.Organization)` + a `where` requiring the written key
 * to be the calling organization's path). An organization can never touch a
 * record it isn't party to.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff, PresentationView } from '../stuff/Stuff';
import { NounPhrase } from '../description/NounPhrase';
import { GrammarApi } from '../../api/grammar';
import { CallSecurity } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { Authority, type PrincipalRef } from './Authority';
import { Position, type PositionData } from './Position';
import { Opening } from './Opening';
import { ContractApi } from '../../api/contract';
import { MixinApi } from '../../api/mixin';
import { CompetenceBand } from '../advancement/CompetenceBand';
import type { CompetenceBandName } from '../advancement/CompetenceBand';
import { Roster, type RosterAssignment } from './Roster';
import {
  EXITED_STATUSES,
  Employment,
  type EmploymentData,
  type EmploymentStatus,
} from './Employment';
import type { Employed } from './Employed';
import { StuffApi } from '../../api/stuff';
import { Final, Unshadowable } from '../security/decorators';
import type {
  OrganizationStuff,
  BusinessStuff,
  StockSheetLine,
} from '../../api/employment';
// eslint-disable-next-line no-restricted-imports -- the F4 org face: an organization's appoint()/dismiss()/roster reads forward into the employment logic singleton exactly as the api/employment facade does (the Combustible/Energized precedent)
import { EmploymentLogic } from '../../platform/idea/api/EmploymentLogic';
import { EmploymentApi } from '../../api/employment';

/**
 * The organization's own mutation surface: itself, or the employment engine
 * orchestrating a lifecycle step. Reads stay Public.
 */
const OrganizationSurface = SecurityPolicies.AnyOf(
  SecurityPolicies.SelfOnly,
  SecurityPolicies.FromTemplate('/platform/idea/api/employment'),
);

/**
 * Public method surface (methods only, per the inter-stuff contract). The
 * `proprietorPath` / `positions` / `rosterSlots` fields are public so the
 * applier can reflect into them, but they are NOT the contract surface —
 * external code goes through these methods.
 */
/**
 * Why a house did or did not take an applicant. Every refusal carries the
 * two numbers the prose must name — what was asked and what is held — so
 * the player learns what LIFTS it, not merely that it is shut.
 */
export type ApplicationVerdict =
  | { ok: true }
  | { ok: false; kind: 'already-held' }
  | { ok: false; kind: 'no-opening' }
  | { ok: false; kind: 'not-employable' }
  | { ok: false; kind: 'gigs'; wanted: number; held: number }
  | {
      ok: false;
      kind: 'band';
      discipline: string;
      wanted: CompetenceBandName;
      held: CompetenceBandName;
    };

export interface Organization {
  /** How the organization is called in prose; `''` when unnamed. */
  getName(): string;
  // The org face (F4) — forwards into EmploymentLogic.
  /** Hire `actor` into `positionKey` (the `appoint` verb's act). */
  appoint(actor: Stuff, positionKey: string): Promise<Employment | null>;
  /** Fire `actor` (status → fired; history preserved). */
  dismiss(actor: Stuff): Promise<void>;
  /** Does `subject` hold ANY non-exited position here? */
  employs(subject: Stuff | null): boolean;
  /** May `subject` act as this organization's proprietor? */
  hasProprietor(subject: Stuff): Promise<boolean>;
  /** May `principal` publish as this organization? Fails closed. */
  allowsPublishingBy(principal: Stuff | null): boolean;
  /** Every actor holding `positionKey` here (durable templatePaths). */
  holdersOf(positionKey: string): string[];
  /**
   * Everyone with an employment record here, exits included (durable
   * identity paths). The roster read; `holdersOf` is the per-position one.
   */
  employees(): readonly string[];
  /** The organization chain above this one, nearest parent first. */
  organizationChain(): Promise<OrganizationStuff[]>;
  /** The live stock sheet against what `viewer` perceives. */
  stockSheetFor(viewer: Stuff): StockSheetLine[];

  /** This organization's durable key — its own templatePath. */
  getOrganizationPath(): string;
  /**
   * Who may fill this organization's positions, or `null` when nothing
   * resolvable is authored (in which case nobody may — the resolver fails
   * closed). See {@link PrincipalRef}.
   */
  getAppointingAuthority(): PrincipalRef | null;
  /**
   * The proprietor's templatePath, or undefined — the *entity* case of the
   * appointing authority, kept because the economic half asks it directly
   * (the unpaid-cover rule, `businessOfProprietor`). An authority that
   * names an office or a committee has no proprietor.
   */
  getProprietor(): string | undefined;
  /** The authored positions, as value objects. */
  getPositions(): readonly Position[];
  /** The position with `key`, or undefined. */
  getPosition(key: string): Position | undefined;
  /**
   * ⭐ How many places of `positionKey` are unfilled: the authored
   * `headcount` minus whoever holds it. **Derived, never stored** — so
   * nothing can decrement it wrong, and a hire, a `quit` and a `vacated`
   * all move it by arithmetic. A seat with no `headcount` advertises
   * nothing and returns 0.
   */
  openingsFor(positionKey: string): number;
  /** Every seat here with an unfilled place, as {@link Opening}s. */
  openings(): Opening[];
  /**
   * ⭐ Would this house take `applicant` for `positionKey`? The verdict
   * carries WHY and BY HOW MUCH, because a refusal that names no number
   * is a wall — see `docs/antipatterns.md § A bare COUNT as a permanent
   * gate`. Standing is conferred by the employer: the organization
   * decides, the applicant asks.
   */
  considerApplicant(
    applicant: Stuff,
    positionKey: string,
  ): Promise<ApplicationVerdict>;
  /** The roster (schedule) value object. */
  getRoster(): Roster;
  /** The roster assignments in list order. */
  getRosterAssignments(): readonly RosterAssignment[];
  /**
   * The organization this one sits inside (a durable templatePath), or
   * undefined at the top. A department inside a ministry; a desk inside a
   * paper.
   */
  getParentOrganizationPath(): string | undefined;
  /**
   * The reporting chain above `positionKey`, nearest superior first —
   * `[Communications Director]` for a Press Secretary that reports to it.
   * Empty when the position reports to nobody or does not exist.
   *
   * ⚠ **A `reportsTo` cycle is refused, not looped on**: the walk throws
   * rather than returning a truncated chain, because a chart that eats its
   * own tail is an authoring error and a quiet partial answer hides it.
   */
  getReportingChain(positionKey: string): readonly Position[];

  /** Hire `actor` into `positionKey` (employed, off-shift). */
  hire(
    actor: Stuff & Employed,
    positionKey: string,
    nowRaw: number,
  ): Employment | null;
  /** Flip `actor`'s record with this organization to a terminal status. */
  endEmployment(actor: Stuff & Employed, status: 'fired' | 'quit' | 'vacated'): void;
  /** The existing record, or a lazily-materialized off-shift one. */
  ensureRostered(
    actor: Stuff & Employed,
    positionKey: string,
    nowRaw: number,
  ): Employment;
  /** Stamp `actor` on-shift (`onShiftSince = nowRaw`). */
  getStartsShiftOnHire(): boolean;
  setStartsShiftOnHire(value: boolean): void;
  beginShift(actor: Stuff & Employed, nowRaw: number): void;
  /** Flip `actor` off-shift (caller settles the wage off the captured
   * record first). */
  endShift(actor: Stuff & Employed): void;
  /**
   * Show the seat's on-shift status on its holder (when the seat has one).
   * `beginShift` does it; the roster tick calls it again when a restart
   * re-moves a hand who was already on shift.
   */
  showShiftStatus(actor: Stuff & Employed): void;
  /** Begin a proprietor's transient on-shift cover. */
  beginCover(actor: Stuff & Employed, nowRaw: number): Employment | null;
  /** End a proprietor's cover: drop the transient record. */
  endCover(actor: Stuff & Employed): void;
}

/**
 * The persistent field slots this mixin declares. Public because the
 * applier reflects into them by name — NOT the contract surface (other
 * Stuff go through the {@link Organization} methods). Named as an
 * interface so a mixin that requires this one can say so in its base
 * constraint (`BusinessMixin` does).
 */
export interface OrganizationFields {
  appointingAuthority: PrincipalRef | string | null;
  parentOrganization: string;
  proprietorPath: string;
  positions: PositionData[];
  rosterSlots: RosterAssignment[];
  startsShiftOnHire: boolean;
}

export function OrganizationMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  // Class *declaration* (not a returned expression) so the method
  // decorators are valid under legacy-decorator rules.
  class OrganizationMixin extends Base implements Organization {
    static _mixinName = 'OrganizationMixin';

    static fieldMeta: FieldMeta = {
      appointingAuthority: { persistent: true, authorable: true },
      parentOrganization: {
        persistent: true,
        authorable: true,
        authorPicker: 'Template',
        ref: 'identity:relation',
      },
      proprietorPath: {
        persistent: true,
        authorable: true,
        authorPicker: 'Template',
        ref: 'identity:relation',
      },
      positions: { persistent: true, authorable: true },
      rosterSlots: { persistent: true, authorable: true },
      startsShiftOnHire: { persistent: true, authorable: true },
      name: { persistent: true, authorable: true },
    };

    /**
     * How the organization is called in prose — "the house account of
     * Dave's Bar", "Stock at the cash-and-carry". Authored on the row;
     * empty falls through to the Stuff default ("something"), which is
     * what every business read as until the libations live drive.
     */
    public name: string = '';

    public getName(): string {
      return this.name;
    }

    public setName(value: string): void {
      this.name = typeof value === 'string' ? value.trim() : '';
    }

    /**
     * ⭐ Overrides the PHRASE, not the rendered string. An organization's
     * name is a proper name, so it takes no article and the possessive
     * and the definite form come out right without this class knowing
     * any grammar — which is the whole point of the override point
     * moving one layer down.
     */
    public presentationPhrase(view: PresentationView = 'own'): NounPhrase {
      return this.name.length > 0
        ? GrammarApi.properPhrase(this.name)
        : super.presentationPhrase(view);
    }

    /**
     * Who may fill this organization's positions — a {@link PrincipalRef},
     * or a bare templatePath string (the legacy shape, normalized on read).
     * `null` = unauthored, and the resolver refuses everyone.
     */
    public appointingAuthority: PrincipalRef | string | null = null;

    /**
     * ⚠⚠ **Legacy hydration slot. Do NOT delete it because the seeds are
     * clean.** No shipped seed authors `proprietorPath` any more — that is
     * asserted by `world/__tests__/business-authority.test.ts` — so a grep
     * makes this look dead. It is not.
     *
     * The retired seeder was insert-only, so every box seeded before the
     * port still has `proprietorPath` in its `content` rows (the installer
     * adopts a row's body only where the file changed). This
     * slot is what makes those rows keep working: it reads as
     * `{kind: 'entity', path}`, which is byte-identical to what they resolved
     * to before.
     *
     * `appointingAuthority` wins when both are present, so a reseeded row
     * upgrades silently and no migration is required to *stay* correct.
     */
    public proprietorPath: string = '';

    /**
     * The enclosing organization's templatePath. Empty = top of the chart.
     */
    public parentOrganization: string = '';

    /**
     * Authored positions, stored raw; wrapped on read.
     */
    public positions: PositionData[] = [];

    /**
     * Roster assignments, stored raw; wrapped on read.
     */
    public rosterSlots: RosterAssignment[] = [];

    /**
     * ⭐⭐⭐ **Does being taken on here mean starting work?** Default
     * `false`, which is every house shipped before 2026-10-09 and the
     * shipped contract *a shift is something you choose to start*.
     *
     * ⚠⚠ **Why this is a house's declaration and not a global rule.**
     * `beginShift` has exactly two drivers: the roster tick, over
     * authored `rosterSlots`, and `clock on`, for a seat somebody
     * applied for. That leaves a **third population with no home** — an
     * NPC an employer takes on ad hoc, which reaches neither, so it held
     * a job and never worked a shift. Two attempts to close that
     * globally each broke a shipped contract with a test on the other
     * side: starting the shift at hire broke *being taken on does NOT
     * put you on shift*, and writing the hand a rota slot broke *the
     * roster tick leaves a clocked-on applicant alone* (an applicant has
     * no assignment, which is exactly what keeps the tick off a
     * voluntary shift).
     *
     * ⭐ So the house says. A bore crew is hired at the beam and starts
     * at the beam — the wage runs from the moment they take hold of it,
     * which is the whole of what makes a dry hole expensive. A press
     * office's appointee does not start anything by being appointed.
     * Both are true, they are not the same claim, and the chart is where
     * a claim about *this* house's hiring belongs — beside `positions`,
     * `rosterSlots` (and, on a business, `OnCallMixin`'s `call`), the other hiring
     * facts.
     *
     * ⚠ A **player** is never auto-started whatever this says: clocking
     * on is their act, and `apply` + `clock on` is their path. This is
     * about hands who have no choice to exercise.
     */
    public startsShiftOnHire = false;

    public getOrganizationPath(): string {
      // The identity path — the template path for every content row, the
      // minted identity for a business stood up from a seed (D15).
      return (this as unknown as Stuff).getIdentityPath() ?? '';
    }

    public getAppointingAuthority(): PrincipalRef | null {
      const ref =
        Authority.fromData(this.appointingAuthority) ??
        Authority.fromData(this.proprietorPath);
      // ⭐ `{kind: owners}` authored bare reads THIS organization's table.
      if (ref?.kind === 'owners' && !ref.organization) {
        const self = this.getOrganizationPath();
        return self === '' ? null : { kind: 'owners', organization: self };
      }
      return ref;
    }

    public getProprietor(): string | undefined {
      const authority = this.getAppointingAuthority();
      return authority?.kind === 'entity' ? authority.path : undefined;
    }

    public getPositions(): readonly Position[] {
      return this.positions.map((p) => Position.fromData(p));
    }

    public getPosition(key: string): Position | undefined {
      const p = this.positions.find((entry) => entry.key === key);
      return p ? Position.fromData(p) : undefined;
    }

    public getRoster(): Roster {
      return Roster.fromData(this.rosterSlots);
    }

    public getRosterAssignments(): readonly RosterAssignment[] {
      return this.getRoster().getAssignments();
    }

    public getParentOrganizationPath(): string | undefined {
      return this.parentOrganization || undefined;
    }

    public getReportingChain(positionKey: string): readonly Position[] {
      const out: Position[] = [];
      const seen = new Set<string>([positionKey]);
      let current = this.getPosition(positionKey);
      while (current?.reportsTo) {
        const next = current.reportsTo;
        if (seen.has(next)) {
          throw new Error(
            `OrganizationMixin.getReportingChain: reportsTo cycle at ` +
              `'${next}' in ${this.getOrganizationPath()}`,
          );
        }
        seen.add(next);
        const superior = this.getPosition(next);
        // A dangling `reportsTo` ends the chain rather than throwing: the
        // position it names may simply not be authored yet, which is a gap
        // and not a contradiction.
        if (!superior) break;
        out.push(superior);
        current = superior;
      }
      return out;
    }

    /* ───── employment transitions (the org acts on its employee) ─────
     *
     * The engine (`EmploymentLogic`) supplies the clock and keeps
     * orchestration (roster evaluation, wage settlement, capability
     * re-resolve); the relationship mutation is the organization's own
     * behavior.
     */

    @CallSecurity(OrganizationSurface)
    public hire(
      actor: Stuff & Employed,
      positionKey: string,
      nowRaw: number,
    ): Employment | null {
      const organizationPath = this.getOrganizationPath();
      if (!organizationPath) return null;
      const record: EmploymentData = {
        organizationPath,
        positionKey,
        status: 'employed',
        hiredAt: nowRaw,
        onShiftSince: null,
      };
      actor._upsertEmployment(record);
      return Employment.of(record);
    }

    @CallSecurity(OrganizationSurface)
    public endEmployment(
      actor: Stuff & Employed,
      status: 'fired' | 'quit' | 'vacated',
    ): void {
      actor._setEmploymentStatus(this.getOrganizationPath(), status);
    }

    @CallSecurity(OrganizationSurface)
    public ensureRostered(
      actor: Stuff & Employed,
      positionKey: string,
      nowRaw: number,
    ): Employment {
      const organizationPath = this.getOrganizationPath();
      const existing = actor.getEmployment(organizationPath);
      if (existing) return existing;
      const record: EmploymentData = {
        organizationPath,
        positionKey,
        status: 'off-shift' as EmploymentStatus,
        hiredAt: nowRaw,
        onShiftSince: null,
      };
      actor._upsertEmployment(record);
      return Employment.of(record);
    }

    /** Does a hire here start work at once? See the field. */
    public getStartsShiftOnHire(): boolean {
      return this.startsShiftOnHire;
    }

    /** Declare whether a hire here starts work at once. */
    public setStartsShiftOnHire(value: boolean): void {
      this.startsShiftOnHire = value === true;
    }

    @CallSecurity(OrganizationSurface)
    public beginShift(actor: Stuff & Employed, nowRaw: number): void {
      const emp = actor.getEmployment(this.getOrganizationPath());
      if (!emp) return;
      actor._upsertEmployment(emp.withStatus('on-shift', nowRaw).serialize());
      this.showShiftStatus(actor);
    }

    @CallSecurity(OrganizationSurface)
    public showShiftStatus(actor: Stuff & Employed): void {
      // ⭐ The seat says what its holder is doing while on shift.
      const emp = actor.getEmployment(this.getOrganizationPath());
      const line = emp ? this.getPosition(emp.positionKey)?.onShiftStatus : undefined;
      if (line && MixinApi.isStatus(actor)) actor.setStatus(line);
    }

    @CallSecurity(OrganizationSurface)
    public endShift(actor: Stuff & Employed): void {
      // A hand who walked off at the settle (sugar D10) stays gone.
      const emp = actor.getEmployment(this.getOrganizationPath());
      if (emp && EXITED_STATUSES.includes(emp.status)) return;
      actor._setEmploymentStatus(this.getOrganizationPath(), 'off-shift');
      // Clear the seat's line — only if it still says what the seat set,
      // so a status the holder chose since is theirs to keep.
      const line = emp ? this.getPosition(emp.positionKey)?.onShiftStatus : undefined;
      if (line && MixinApi.isStatus(actor) && actor.getStatus() === line) actor.setStatus('');
    }

    @CallSecurity(OrganizationSurface)
    public beginCover(
      actor: Stuff & Employed,
      nowRaw: number,
    ): Employment | null {
      const organizationPath = this.getOrganizationPath();
      // ⭐ The seat a cover COVERS is a fulfilling one — the proprietor
      // steps behind the bar to serve, not into the bookkeeping. Falls
      // back to the first seat when the house marks none (which is what
      // `positions[0]` meant before `fulfills` existed).
      const positionKey =
        (this.positions.find((p) => (p.fulfills?.length ?? 0) > 0) ??
          this.positions[0])?.key;
      if (!organizationPath || !positionKey) return null;
      const record: EmploymentData = {
        organizationPath,
        positionKey,
        status: 'on-shift',
        hiredAt: nowRaw,
        onShiftSince: nowRaw,
      };
      actor._upsertEmployment(record);
      return Employment.of(record);
    }

    @CallSecurity(OrganizationSurface)
    public endCover(actor: Stuff & Employed): void {
      actor._removeEmployment(this.getOrganizationPath());
    }

    // ------- the org face (F4) — forwards into EmploymentLogic -------
    // (The gated methods above are the roster PRIMITIVES the logic
    // drives; these are the public orchestration verbs.)

    /**
     * Hire `actor` into this organization's `positionKey` (the
     * `appoint` verb's act — wallet conferral included). Sealed — the
     * roster invariants live in the logic.
     */
    @Final
    @Unshadowable
    public appoint(
      actor: Stuff,
      positionKey: string,
    ): Promise<Employment | null> {
      return employmentLogic().hire(
        this as unknown as OrganizationStuff,
        actor,
        positionKey,
      );
    }

    /** Fire `actor` (status → fired; history preserved). Sealed. */
    @Final
    @Unshadowable
    public dismiss(actor: Stuff): Promise<void> {
      return employmentLogic().fire(this as unknown as OrganizationStuff, actor);
    }

    /** Does `subject` hold ANY non-exited position here? (the staff test) */
    public employs(subject: Stuff | null): boolean {
      return employmentLogic().holdsPosition(
        subject,
        this as unknown as OrganizationStuff,
      );
    }

    /** May `subject` act as this organization's proprietor? */
    public hasProprietor(subject: Stuff): Promise<boolean> {
      return employmentLogic().isProprietorOf(
        subject,
        this as unknown as OrganizationStuff,
      );
    }

    /** May `principal` publish as this organization? Fails closed. */
    public allowsPublishingBy(principal: Stuff | null): boolean {
      return employmentLogic().mayPublishAs(
        principal,
        this as unknown as OrganizationStuff,
      );
    }

    public openingsFor(positionKey: string): number {
      const position = this.getPosition(positionKey);
      if (!position) return 0;
      // ⭐ A rostered seat is a place too (sugar D10): a hand who walks off
      // leaves the roster naming them and the house a vacancy, whether or
      // not the Position authored a `headcount`. `holdersOf` counts a
      // roster assignee until their record says they exited, so the seat
      // only opens on positive evidence.
      const rostered = new Set(
        this.getRosterAssignments()
          .filter((a) => a.positionKey === positionKey && a.assignee)
          .map((a) => a.assignee),
      ).size;
      const places = Math.max(position.headcount ?? 0, rostered);
      if (places <= 0) return 0;
      return Math.max(0, places - this.holdersOf(positionKey).length);
    }

    public openings(): Opening[] {
      const path = this.getOrganizationPath();
      if (!path) return [];
      const label = EmploymentApi.organizationLabel(
        this as unknown as OrganizationStuff,
      );
      const out: Opening[] = [];
      for (const position of this.getPositions()) {
        const open = this.openingsFor(position.key);
        if (open > 0) out.push(new Opening(path, position, open, label));
      }
      return out;
    }

    public async considerApplicant(
      applicant: Stuff,
      positionKey: string,
    ): Promise<ApplicationVerdict> {
      const path = this.getOrganizationPath();
      const who = applicant.getIdentityPath() ?? '';
      if (!MixinApi.isEmployed(applicant) || !path || !who) {
        return { ok: false, kind: 'not-employable' };
      }
      // Already holding it is not a refusal about WORTH — say so first,
      // before any criterion, or a returning holder gets told they are
      // short of gigs they already did.
      if (this.holdersOf(positionKey).includes(who)) {
        return { ok: false, kind: 'already-held' };
      }
      if (this.openingsFor(positionKey) <= 0) {
        return { ok: false, kind: 'no-opening' };
      }
      const requires = this.getPosition(positionKey)?.requires;
      if (!requires) return { ok: true };
      // ⭐ Gigs before band, deliberately: one refusal names ONE number,
      // and the cheaper lift goes first — a newcomer can complete a gig
      // this afternoon, where a band takes practice.
      if (requires.gigs != null && requires.gigs > 0) {
        const held = await ContractApi.settledGigsBy(who);
        if (held < requires.gigs) {
          return { ok: false, kind: 'gigs', wanted: requires.gigs, held };
        }
      }
      if (requires.discipline) {
        const wanted = requires.band ?? CompetenceBand.FLOOR;
        const held = MixinApi.isAdvancing(applicant)
          ? await applicant.competenceBandFor(requires.discipline)
          : CompetenceBand.FLOOR;
        if (!CompetenceBand.atOrAbove(held, wanted)) {
          return {
            ok: false,
            kind: 'band',
            discipline: requires.discipline,
            wanted,
            held,
          };
        }
      }
      return { ok: true };
    }

    /** Every actor holding `positionKey` here (durable templatePaths). */
    public holdersOf(positionKey: string): string[] {
      return employmentLogic().holdersOf(
        this as unknown as OrganizationStuff,
        positionKey,
      );
    }

    /** Everyone with an employment record here (durable identity paths). */
    public employees(): readonly string[] {
      return EmploymentApi.employeesOf(this.getOrganizationPath());
    }

    /** The organization chain above this one, nearest parent first. */
    public organizationChain(): Promise<OrganizationStuff[]> {
      return employmentLogic().organizationChainOf(
        this as unknown as OrganizationStuff,
      );
    }

    /** The live stock sheet against what `viewer` perceives. */
    public stockSheetFor(viewer: Stuff): StockSheetLine[] {
      return employmentLogic().stockSheetFor(
        viewer,
        this as unknown as BusinessStuff,
      );
    }
  }
  return OrganizationMixin;
}

/** Resolve the HMR-able EmploymentLogic singleton (the labor pipeline). */
function employmentLogic(): EmploymentLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/employment',
    () => new EmploymentLogic(),
  );
}
