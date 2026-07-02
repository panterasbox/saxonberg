/**
 * Credential — the unified credential value-object family.
 *
 * A **credential is data, not a class.** Where the engine once grew a new
 * mixin (and a new aether-hosted update + physical-card pair) for every
 * credential concept — `PaymentCredentialMixin`, `TravelCredentialMixin` —
 * a new credential *kind* is now a new record type held in one
 * {@link CredentialWalletMixin}. The wallet is a dumb keyed store; these
 * records carry the kind-specific **authorization** state and the pure
 * predicate that reads it. **Affordance** (the verbs holding a credential
 * lights up) lives on the *holder* (the wallet app / the card), not here —
 * the two jobs are deliberately separated.
 *
 * Each record serializes itself to a plain {@link SerializedCredential} the
 * wallet round-trips through persistence (the `data.credentials` array), and
 * reconstructs via {@link Credential.fromData}. Session-durable in v1: the
 * wallet update is re-cloned each login, so a payment credential's links are
 * re-established by `openAccount` on relog and the travel set resets to its
 * born-with floor.
 */

import { Money } from "../banking/Money";

/** The credential kinds the wallet can hold. Adding a kind is adding data. */
export type CredentialKind = "payment" | "travel";

/** Validation array companion to {@link CredentialKind}. */
export const CREDENTIAL_KINDS: readonly CredentialKind[] = [
  "payment",
  "travel",
];

/** A credential with no explicit cap admits any amount (the implant default). */
export const UNCAPPED = -1;

/**
 * The born-with registration floor — the three nodes every fresh travel
 * credential is registered for, so the interchange and the social hub are
 * universally reachable by design (the hub has no foot path to the rest of the
 * world). The **Terminus arrival node** (onboarding's lounge→campus hop now
 * lands here; walk across to campus), **the lounge** (so a fresh player can
 * always TPA back to Dave's Bar — Gate A's free return works without an
 * explicit `register`), and **the paid destination** (the newbie-wilds
 * crossroads — reachable for a fare, not a registration gate). Replaces the
 * retired single University Avenue node.
 */
export const BORN_WITH_TRAVEL_NODES = [
  "/domain/terminus/terminal/arrival-terminal",
  "/domain/lounge/terminal",
  "/domain/newbie-wilds/crossroads/terminal",
] as const;

/**
 * The serialized form of a credential — a plain object the wallet stores in
 * its `data.credentials` array and rebuilds from on hydrate. Kind-specific
 * fields are optional; {@link Credential.fromData} reads only the ones its
 * kind owns.
 */
export interface SerializedCredential {
  kind: CredentialKind;
  // payment
  linkedAccounts?: string[];
  activeAccount?: string;
  spendCap?: number;
  frozen?: boolean;
  // travel
  registered?: string[];
}

/**
 * Base value-object: every credential knows its kind and serializes itself.
 * Not a `Stuff` — a plain value object owned by the wallet, so its mutation
 * surface is ordinary methods (no proxy / persistence reflection here).
 */
export abstract class Credential {
  abstract readonly kind: CredentialKind;

  /** The storable plain-object form (round-trips through the wallet). */
  abstract toData(): SerializedCredential;

  /** Mint a fresh, default-state credential of `kind`. */
  static mint(kind: CredentialKind): Credential {
    switch (kind) {
      case "payment":
        return new PaymentCredential();
      case "travel":
        return new TravelCredential();
      default:
        throw new Error(`Credential.mint: unknown kind ${String(kind)}`);
    }
  }

  /** Reconstruct the right record subclass from its serialized form. */
  static fromData(row: SerializedCredential): Credential {
    switch (row.kind) {
      case "payment":
        return PaymentCredential.fromData(row);
      case "travel":
        return TravelCredential.fromData(row);
      default:
        throw new Error(
          `Credential.fromData: unknown kind ${String(row.kind)}`,
        );
    }
  }
}

/**
 * The on-ledger payment credential: a set of linked accounts, an
 * active-account pointer, a per-credential spend cap, and a frozen flag. The
 * credential **authorizes** a charge against its routing account; the
 * **risk ladder** (cash bearer / body-bound implant / freezable card) is
 * expressed by where the record lives and by `freeze` + `spendCap`. Over-cap
 * or frozen is refused — the diegetic limit, never a fee.
 */
export class PaymentCredential extends Credential {
  readonly kind = "payment" as const;

  /** The accounts this credential may route from. */
  private _linkedAccounts: Set<string> = new Set();
  /** The default routing account (one of the linked set), or "". */
  private _activeAccount = "";
  /** Per-credential spend cap in minor units; UNCAPPED = no limit. */
  private _spendCap: number = UNCAPPED;
  /** Report-lost flag — a frozen credential authorizes nothing. */
  private _frozen = false;

  static fromData(row: SerializedCredential): PaymentCredential {
    const c = new PaymentCredential();
    c._linkedAccounts = new Set(row.linkedAccounts ?? []);
    c._activeAccount = row.activeAccount ?? "";
    c._spendCap = row.spendCap ?? UNCAPPED;
    c._frozen = row.frozen ?? false;
    return c;
  }

  toData(): SerializedCredential {
    return {
      kind: this.kind,
      linkedAccounts: [...this._linkedAccounts],
      activeAccount: this._activeAccount,
      spendCap: this._spendCap,
      frozen: this._frozen,
    };
  }

  /** Link an account this credential may route from; first becomes active. */
  linkAccount(accountId: string): void {
    this._linkedAccounts.add(accountId);
    if (!this._activeAccount) this._activeAccount = accountId;
  }

  /** Whether `accountId` is linked to this credential. */
  hasAccount(accountId: string): boolean {
    return this._linkedAccounts.has(accountId);
  }

  /** A copy of the linked-account set. */
  getLinkedAccounts(): ReadonlySet<string> {
    return new Set(this._linkedAccounts);
  }

  /** The account a default (no-override) payment routes from, or null. */
  getActiveAccount(): string | null {
    return this._activeAccount || null;
  }

  /** Set the active account (must be linked). Throws if not linked. */
  setActiveAccount(accountId: string): void {
    if (!this._linkedAccounts.has(accountId)) {
      throw new Error(
        `PaymentCredential.setActiveAccount: ${accountId} is not linked`,
      );
    }
    this._activeAccount = accountId;
  }

  /** The per-credential spend cap (UNCAPPED = no limit). */
  getSpendCap(): number {
    return this._spendCap;
  }

  setSpendCap(minor: number): void {
    this._spendCap = minor;
  }

  /** Whether the credential is frozen (report-lost). */
  isFrozen(): boolean {
    return this._frozen;
  }

  setFrozen(frozen: boolean): void {
    this._frozen = frozen;
  }

  /** True iff this credential may clear `amount` (not frozen, within cap). */
  authorize(amount: Money): boolean {
    if (this._frozen) return false;
    if (this._spendCap !== UNCAPPED && amount.minor > this._spendCap) {
      return false;
    }
    return true;
  }
}

/**
 * The fast-travel credential: a registered-node set plus the
 * register/authorize surface. A node's network identity is its own
 * singleton template path; the registered set is a set of those paths. Every
 * credential is born with the {@link BORN_WITH_TRAVEL_NODES} floor registered
 * (the interchange, the lounge, and the paid destination), the documented
 * exception to "reach a node before you can travel to it"; the floor is
 * preserved across hydration (saved entries union on top, never clearing it).
 */
export class TravelCredential extends Credential {
  readonly kind = "travel" as const;

  /** The allowed-node set, seeded with the born-with floor. */
  private _registered: Set<string> = new Set(BORN_WITH_TRAVEL_NODES);

  static fromData(row: SerializedCredential): TravelCredential {
    const c = new TravelCredential();
    c._registered = new Set([
      ...BORN_WITH_TRAVEL_NODES,
      ...(row.registered ?? []),
    ]);
    return c;
  }

  toData(): SerializedCredential {
    return { kind: this.kind, registered: [...this._registered] };
  }

  /** Record a node (by its singleton path) as an allowed destination. */
  register(ref: string): void {
    this._registered.add(ref);
  }

  /** Remove a node from the allowed set. Returns whether it was present. */
  unregister(ref: string): boolean {
    return this._registered.delete(ref);
  }

  /** Is this node an allowed destination? */
  isRegistered(ref: string): boolean {
    return this._registered.has(ref);
  }

  /** Readability alias for {@link isRegistered}. */
  authorize(ref: string): boolean {
    return this._registered.has(ref);
  }

  /** A copy of the allowed-node set. */
  getRegistered(): ReadonlySet<string> {
    return new Set(this._registered);
  }
}
