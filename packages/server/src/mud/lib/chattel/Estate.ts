/**
 * EstateMixin — **what happens to a person's holdings when they stop
 * playing**: the two succession facts on a played person's record, the
 * day their estate escheated (`escheatedAt`) and who they named to inherit
 * it (`beneficiary`). Read and written by `PlayerLogic` (dormancy and
 * escheat) and `wallet beneficiary`. See [docs/subsystems/credit.md].
 *
 * ⭐⭐ **Its goods half retired** (persistence-model D9). An estate used to
 * hold every good a player had title to, wherever it sat — a second
 * persistence scope beside the container a good stands in, whose overlap
 * with the room's record and with naming no player could predict. Now a
 * good is kept by its container, whoever holds title: a player's record is
 * what they CARRY, a kept room's record is everything in it, and a stray in
 * a staged place is lost at the next restage. Title (`ChattelMixin`) is a
 * claim, never storage.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";

export interface Estate {
  /** The game time its estate escheated (0 = it has not). */
  getEscheatedAt(): number;
  setEscheatedAt(at: number): void;
  /** The named beneficiary's identity path, or '' for none. */
  getBeneficiary(): string;
  /** Name the beneficiary (an identity path), or '' to clear. */
  setBeneficiary(identityPath: string): void;
}

export function EstateMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class EstateMixin extends Base implements Estate {
    static _mixinName = "EstateMixin";

    static fieldMeta: FieldMeta = {
      escheatedAt: { persistent: true },
      beneficiary: { persistent: true },
    };

    /** When the estate escheated (game seconds), 0 when it has not. */
    public escheatedAt: number = 0;

    public getEscheatedAt(): number {
      return this.escheatedAt;
    }

    public setEscheatedAt(at: number): void {
      this.escheatedAt = Math.max(0, Math.floor(Number(at) || 0));
    }

    /** Who inherits, by identity path — `wallet beneficiary <player>`. */
    public beneficiary: string = "";

    public getBeneficiary(): string {
      return this.beneficiary;
    }

    public setBeneficiary(identityPath: string): void {
      this.beneficiary = String(identityPath ?? "").trim();
    }
  }
  return EstateMixin;
}
