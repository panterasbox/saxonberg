/**
 * PrincipalRef — *who may fill this position?*, as data.
 *
 * An organization's **appointing authority**. It replaces the old bare
 * `proprietorPath`, whose defect was the one the check-the-office doctrine
 * exists to prevent: a templatePath names a *specific entity*, so authority
 * under it can never be handed off. Name an **office** instead and staff
 * follows the seat — a handover moves who may appoint with no roster
 * migration, because the authority *is* the office.
 *
 * ⭐ **The appointing authority appoints; the position acts.** Holding an
 * organization's authority is the power to *fill* a position, never to
 * exercise it. A President has no press-secretary powers; they appoint a
 * press secretary. So nothing in this file is ever consulted by a
 * do-the-work check — see `mayPublishAs` for the other half.
 *
 * ## The four kinds
 *
 * | kind | resolves through | founder passes? |
 * |---|---|---|
 * | `entity` | templatePath match — the shipped proprietor edge | no |
 * | `office` | `CompactApi.holdsOffice` | **yes — founder default** |
 * | `seat` | `GovernmentApi.holdsSeat` | no |
 * | `committee` | `CompactApi.isCommitteeMember` | **yes — pool-of-one** |
 *
 * ⚠ The *founder passes* column is load-bearing, not trivia. Only `office`
 * and `committee` carry the Art. XI default, so **an authority the founder
 * cannot satisfy is one nobody can satisfy on a cold box** until a human
 * edits a group by hand. That is why the Compact's own press office names
 * a committee rather than the operator axis: `AccessApi.isAuthor` resolves
 * to membership of a `core` group that seeds **empty**.
 *
 * ⚠ **There is deliberately no `author` kind.** The operator axis is an
 * *override on top of* an authority (`isProprietorOf`'s existing
 * `AccessApi.isAuthor` arm), never an appointing authority in its own
 * right. Four kinds, each with a consumer.
 *
 * Types and constants only — the resolver lives in `EmploymentLogic`,
 * where the Api surfaces it can reach live.
 */

/** The discriminator of a {@link PrincipalRef}. */
export type PrincipalRefKind = 'entity' | 'office' | 'seat' | 'committee';

/** The blessed kind vocabulary (validation array). */
export const PRINCIPAL_REF_KINDS: readonly PrincipalRefKind[] = [
  'entity',
  'office',
  'seat',
  'committee',
] as const;

/** A specific entity, by durable templatePath — the shipped proprietor edge. */
export interface EntityPrincipalRef {
  kind: 'entity';
  /** The entity's durable templatePath. */
  path: string;
}

/** A Compact office, by key — carries the founder default. */
export interface OfficePrincipalRef {
  kind: 'office';
  /** The `OFFICE_APPARATUS` key (e.g. `prime-minister`). */
  office: string;
}

/** A seat on a diegetic government, by government + seat key. */
export interface SeatPrincipalRef {
  kind: 'seat';
  /** The government's catalogue key (e.g. `terminus-city`). */
  government: string;
  /** The seat key within that government (e.g. `magistrate`). */
  seat: string;
}

/** The committee holding title over a path — carries the founder backstop. */
export interface CommitteePrincipalRef {
  kind: 'committee';
  /** The parcel path whose title-holding group *is* the committee. */
  parcel: string;
}

/** Who may fill an organization's positions. */
export type PrincipalRef =
  | EntityPrincipalRef
  | OfficePrincipalRef
  | SeatPrincipalRef
  | CommitteePrincipalRef;

/**
 * Coerce a seed / hydrated blob into a {@link PrincipalRef}, or `null`
 * when it names nothing resolvable.
 *
 * ⚠ **A bare string normalizes to `{kind: 'entity', path}`** — the legacy
 * `proprietorPath` shape, same value under the new type, so every shipped
 * seed keeps working with no seed edit. Anything else unrecognized returns
 * `null`, and the resolver fails closed on it: an authority nobody can
 * satisfy refuses rather than admits.
 */
export class Authority {
  private constructor() {}

  public static fromData(raw: unknown): PrincipalRef | null {
    if (typeof raw === 'string') {
      return raw.length > 0 ? { kind: 'entity', path: raw } : null;
    }
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    switch (r.kind) {
      case 'entity':
        return typeof r.path === 'string' && r.path.length > 0
          ? { kind: 'entity', path: r.path }
          : null;
      case 'office':
        return typeof r.office === 'string' && r.office.length > 0
          ? { kind: 'office', office: r.office }
          : null;
      case 'seat':
        return typeof r.government === 'string' &&
          r.government.length > 0 &&
          typeof r.seat === 'string' &&
          r.seat.length > 0
          ? { kind: 'seat', government: r.government, seat: r.seat }
          : null;
      case 'committee':
        return typeof r.parcel === 'string' && r.parcel.length > 0
          ? { kind: 'committee', parcel: r.parcel }
          : null;
      default:
        return null;
    }
  }

  /** The plain-data round-trip form (a `PrincipalRef` is already data). */
  public static serialize(ref: PrincipalRef): PrincipalRef {
    return { ...ref };
  }
}
