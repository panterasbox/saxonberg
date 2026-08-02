/**
 * CredentialWalletMixin — one holder, many credentials-as-data.
 *
 * A keyed store of {@link Credential} records (one per {@link CredentialKind}).
 * Base-agnostic, so it composes around BOTH an incorporeal hosted
 * {@link CredentialWalletUpdate} (the born-with "wallet app") and a corporeal
 * card `Thing` (`PaymentCard` / `TravelCard`) — one scan (the MQL `reachable`
 * pool filtered on {@link MixinApi.isCredentialWallet}) finds the holder in
 * either base.
 *
 * It is a **dumb store**: it knows nothing about what any credential *means*.
 * The semantics live in the smart consumers that already exist — `BankingApi`
 * reads the `payment` record (settlement); the `teleport`/`register` TPA path
 * reads the `travel` record. **Affordance** (the verbs a holder lights up)
 * rides each concrete holder class's static `commandContributions`, not this
 * mixin — a payment card affords `pay`/`wallet`, a travel card affords
 * nothing.
 *
 * Persistence rides the `credentials` accessor (the `TravelCredentialMixin`
 * `registered` idiom): the getter yields the storable array of
 * {@link SerializedCredential}; the setter rebuilds the records (a travel
 * record re-floors its born-with node). Session-durable in v1.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import {
  Credential,
  type CredentialKind,
  type SerializedCredential,
  type PaymentCredential,
  type TravelCredential,
  type KeyCredential,
} from "./Credential";

/** Maps a kind to the concrete record type {@link CredentialWallet} returns. */
export interface CredentialByKind {
  payment: PaymentCredential;
  travel: TravelCredential;
  key: KeyCredential;
}

/** Public shape provided by {@link CredentialWalletMixin}. */
export interface CredentialWallet {
  /** The held credential of `kind`, or undefined if the wallet has none. */
  getCredential<K extends CredentialKind>(
    kind: K,
  ): CredentialByKind[K] | undefined;
  /** The held credential of `kind`, minting a default one if absent. */
  ensureCredential<K extends CredentialKind>(kind: K): CredentialByKind[K];
  /** Whether the wallet currently holds a credential of `kind`. */
  hasCredential(kind: CredentialKind): boolean;
  /** A snapshot of every held credential. */
  getCredentials(): readonly Credential[];
}

export function CredentialWalletMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class CredentialWalletMixin extends Base implements CredentialWallet {
    static _mixinName = "CredentialWalletMixin";

    /**
     * Persistent — the held credentials. Hydrated through the `credentials`
     * accessor (Phase 1 setter / Phase 2 bracket-assign).
     */
    static fieldMeta: FieldMeta = {
      credentials: { persistent: true },
    };

    /**
     * The credential kinds a fresh instance is born holding (empty records).
     * Concrete holders override it — a payment card with `["payment"]`, the
     * wallet app with `["payment", "travel"]` — so `new X()` carries its
     * records without a seed (the clone pipeline replaces them on hydrate).
     * The mixin itself seeds nothing.
     */
    static defaultCredentialKinds: readonly CredentialKind[] = [];

    /**
     * The held records, keyed by kind, born-seeded from
     * {@link defaultCredentialKinds}. Not `#`-private — mixin instance state
     * on a proxy-wrapped Stuff host must be a TypeScript `private`.
     */
    private _credentials: Map<CredentialKind, Credential> = new Map(
      (
        this.constructor as {
          defaultCredentialKinds?: readonly CredentialKind[];
        }
      ).defaultCredentialKinds?.map((k) => [k, Credential.mint(k)] as const) ??
        [],
    );

    /**
     * Persistence accessor. The getter yields the storable array; the setter
     * rebuilds records from their serialized rows (travel re-floors).
     * @runtimeState
     */
    get credentials(): SerializedCredential[] {
      return [...this._credentials.values()].map((c) => c.toData());
    }
    set credentials(rows: SerializedCredential[]) {
      this._credentials = new Map(
        rows.map((r) => [r.kind, Credential.fromData(r)] as const),
      );
    }

    getCredential<K extends CredentialKind>(
      kind: K,
    ): CredentialByKind[K] | undefined {
      return this._credentials.get(kind) as CredentialByKind[K] | undefined;
    }

    ensureCredential<K extends CredentialKind>(kind: K): CredentialByKind[K] {
      let cred = this._credentials.get(kind);
      if (!cred) {
        cred = Credential.mint(kind);
        this._credentials.set(kind, cred);
      }
      return cred as CredentialByKind[K];
    }

    hasCredential(kind: CredentialKind): boolean {
      return this._credentials.has(kind);
    }

    getCredentials(): readonly Credential[] {
      return [...this._credentials.values()];
    }
  };
}
