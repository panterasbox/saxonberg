/**
 * DonationBankMixin — a civic bank of donated, typed, perishable units,
 * read BY LOT over a configured store (blood build D2).
 *
 * The substrate is deliberately not blood-specific: a donation bank keeps
 * a stock of gifts somebody may draw on, organised into *lots*, with an
 * un-withdrawable floor set by whoever operates it. Blood is its first
 * (and today only) content; the ONE blood-aware line is {@link lotKeyOf},
 * which reads a `BulkPayload.blood` unit's ABO type — the single place a
 * second typed payload (milk, a seed line) would add a branch.
 *
 * ⭐ **The vault is a POINTER, not a composition.** The bank does not hold
 * the units; it reads them out of the containers its `_vaultPaths` name
 * (the ward's cold fridge). The store holds; the register reads. This is
 * why the mixin lands on the priced board (the register) and NEVER on the
 * fridge (the store) — every fridge would otherwise be a bank.
 *
 * ⚠ **Reads the vault, not the perception sheet (D1).** `business.
 * stockSheetFor` skips a closed sealable, so a par read through it would
 * see an empty fridge whenever the door is shut; the registrar knows her
 * own fridge, so the bank reads the vault's own contents directly.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { BloodUnit } from "../vitals/Blood";
import { BloodType } from "../vitals/BloodType";
import { Freshness } from "../material/Freshness";
import { Quantity } from "../quantity";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { ContainmentApi } from "../../api/containment";
import { EmploymentApi } from "../../api/employment";

/** One lot's on-hand total: how many litres, across how many units (bags). */
export interface LotTotal {
  litres: number;
  units: number;
}

/** The ABO lots a blood bank's own system is organised into. */
export const BLOOD_LOTS = ["O", "A", "B", "AB"] as const;

/** The default par category a donation bank reads its level from. */
const LOT_CATEGORY = "blood";

/** Public surface of a donation bank. */
export interface DonationBank {
  getVaultPaths(): string[];
  setVaultPaths(paths: string[]): void;
  getLotSystem(): string;
  /** The live containers this bank reads its units out of. */
  getVaults(): Stuff[];
  /** On-hand totals per lot key (today: ABO type), derived from the vault. */
  getLots(): Map<string, LotTotal>;
  /** The operating business's par level in litres (0 when none). */
  parLevel(): number;
  /** Litres short of par (never negative). */
  shortfall(): number;
  /** Lot keys of this bank's system that currently hold NO unit. */
  shortLots(): string[];
  /**
   * Hand one unit of `lotKey` to `dest` (a container — a recipient's
   * hands), recording custody. `issuer` is who issued it (for the deed).
   * Returns the moved holder, or null when the lot is empty.
   */
  takeUnit(
    lotKey: string,
    dest: Stuff,
    issuer?: Stuff | null,
  ): Promise<Stuff | null>;
  /**
   * The oldest unit compatible with `recipient` (FIFO by freshness) — its
   * holder is returned IN the vault, drained to empty (the house
   * transfuses you; you do not keep the bag), and custody is recorded.
   * Returns the `BloodUnit` that was in it, or null when nothing matches.
   */
  takeCompatibleUnitFor(
    recipient: Stuff,
    issuer?: Stuff | null,
  ): Promise<BloodUnit | null>;
  /** Accept a gift: move `holder` into the first vault, record custody. */
  receiveGift(holder: Stuff, donor?: Stuff | null): Promise<void>;
}

export function DonationBankMixin<TBase extends MixinConstructor>(Base: TBase) {
  class DonationBankMixin extends Base implements DonationBank {
    static _mixinName = "DonationBankMixin";

    static fieldMeta: FieldMeta = {
      _vaultPaths: { persistent: true, authorable: true, authorPicker: "Template" },
      _lotSystem: { persistent: true, authorable: true },
    };

    /** Template paths of the containers this bank reads (the cold store). */
    public _vaultPaths: string[] = [];
    /** The blood system this window serves ('' = whatever the vault holds). */
    public _lotSystem: string = "";

    public getVaultPaths(): string[] {
      return this._vaultPaths;
    }
    public setVaultPaths(paths: string[]): void {
      this._vaultPaths = [...paths];
    }
    public getLotSystem(): string {
      return this._lotSystem;
    }

    public getVaults(): Stuff[] {
      const out: Stuff[] = [];
      for (const path of this._vaultPaths) {
        const v = StuffApi.findByTemplatePath(path);
        if (v && MixinApi.isContainer(v)) out.push(v);
      }
      return out;
    }

    /**
     * The bulk holders in the vaults that carry a blood unit with litres.
     * A closed sealable vault is read THROUGH (its own contents), not via
     * the perception sheet — the registrar knows her own fridge (D1).
     */
    private unitHolders(): { holder: Stuff; unit: BloodUnit; litres: number }[] {
      const out: { holder: Stuff; unit: BloodUnit; litres: number }[] = [];
      for (const vault of this.getVaults()) {
        if (!MixinApi.isContainer(vault)) continue;
        for (const item of vault.getContents()) {
          const holder = item as unknown as Stuff;
          if (!MixinApi.isBulkable(holder)) continue;
          let unit: BloodUnit | undefined;
          let litres = 0;
          try {
            const slot = holder.getBulk();
            const payload = slot.getPayload();
            unit = payload?.blood;
            litres = slot.getAmount().rawValue();
          } catch {
            continue; // a holder with no single slot is not a unit
          }
          if (unit && litres > 0) out.push({ holder, unit, litres });
        }
      }
      return out;
    }

    /** ⭐ The one blood-aware line: a unit's lot key is its ABO type. A
     * second typed payload adds a branch here and nowhere else. */
    public lotKeyOf(unit: BloodUnit): string {
      return unit.type;
    }

    public getLots(): Map<string, LotTotal> {
      const lots = new Map<string, LotTotal>();
      for (const { unit, litres } of this.unitHolders()) {
        const key = this.lotKeyOf(unit);
        const cur = lots.get(key) ?? { litres: 0, units: 0 };
        cur.litres += litres;
        cur.units += 1;
        lots.set(key, cur);
      }
      return lots;
    }

    public parLevel(): number {
      const self = this as unknown as Stuff;
      const path = self.getTemplatePath();
      if (!path) return 0;
      const business = EmploymentApi.businessAt(path);
      if (!business) return 0;
      for (const line of business.getParLines()) {
        if (line.category === LOT_CATEGORY) return line.level;
      }
      return 0;
    }

    public shortfall(): number {
      let total = 0;
      for (const { litres } of this.unitHolders()) total += litres;
      return Math.max(0, this.parLevel() - total);
    }

    public shortLots(): string[] {
      const lots = this.getLots();
      return BLOOD_LOTS.filter((k) => (lots.get(k)?.units ?? 0) === 0);
    }

    /** The holders of `lotKey`, oldest (most-aged) first — FIFO. */
    private holdersOfLot(lotKey: string): Stuff[] {
      return this.unitHolders()
        .filter((h) => this.lotKeyOf(h.unit) === lotKey)
        .sort((a, b) => this.ageOf(b.holder) - this.ageOf(a.holder))
        .map((h) => h.holder);
    }

    /** A holder's freshness load — higher = more aged (serve it first). */
    private ageOf(holder: Stuff): number {
      try {
        return new Freshness(holder.getBulk()).load();
      } catch {
        return 0;
      }
    }

    public async takeUnit(
      lotKey: string,
      dest: Stuff,
      issuer?: Stuff | null,
    ): Promise<Stuff | null> {
      const holder = this.holdersOfLot(lotKey)[0];
      if (!holder) return null;
      if (MixinApi.isContainable(holder) && MixinApi.isContainer(dest)) {
        ContainmentApi.move(holder, dest);
      }
      await this.recordCustody("issue", lotKey, issuer ?? null, dest);
      return holder;
    }

    public async takeCompatibleUnitFor(
      recipient: Stuff,
      issuer?: Stuff | null,
    ): Promise<BloodUnit | null> {
      if (!MixinApi.isVitals(recipient)) return null;
      const me = new BloodType(
        recipient.bloodSystemOf(),
        (recipient.bloodType() ?? "O") as BloodUnit["type"],
      );
      // Oldest (most-aged) compatible unit first — FIFO, as a bank would.
      const candidates = this.unitHolders()
        .filter(({ unit }) =>
          new BloodType(
            unit.system || unit.speciesPath,
            unit.type,
          ).isCompatibleDonorFor(me),
        )
        .sort((a, b) => this.ageOf(b.holder) - this.ageOf(a.holder));
      const chosen = candidates[0];
      if (!chosen) return null;
      const { holder, unit } = chosen;
      // The house transfuses you; you do not keep the bag. Empty the holder
      // so the lot's on-hand drops.
      try {
        const slot = holder.getBulk();
        slot.setAmount(Quantity.of(0, "L"));
        slot.setPayload(null);
      } catch {
        /* a holder with no slot cannot be a unit — already filtered */
      }
      await this.recordCustody("issue", this.lotKeyOf(unit), issuer ?? null, recipient);
      return unit;
    }

    public async receiveGift(
      holder: Stuff,
      donor?: Stuff | null,
    ): Promise<void> {
      const vault = this.getVaults()[0];
      if (vault && MixinApi.isContainable(holder) && MixinApi.isContainer(vault)) {
        ContainmentApi.move(holder, vault);
      }
      let lotKey = "";
      try {
        lotKey = holder.getBulk().getPayload()?.blood?.type ?? "";
      } catch {
        lotKey = "";
      }
      await this.recordCustody("gift", lotKey, donor ?? null, null);
    }

    /**
     * Write the custody deeds for one act (D16) — persons only. For an
     * `issue`, the issuer's deed (issued to recipient) + the recipient's
     * (was issued). For a `gift`, the donor's deed (gave a unit). A
     * Business keeps no chronicle, so an institutional issue leaves only
     * the recipient's record.
     */
    private async recordCustody(
      action: "issue" | "gift",
      lotKey: string,
      actor: Stuff | null,
      recipient: Stuff | null,
    ): Promise<void> {
      const self = this as unknown as Stuff;
      const container = MixinApi.isContainable(self) ? self.getContainer() : null;
      const where =
        container?.getTemplatePath() ?? self.getTemplatePath() ?? undefined;
      const windowName = self.getPresentation();
      const lot = lotKey || "blood";
      if (action === "issue") {
        if (recipient && MixinApi.isPersona(recipient)) {
          await recipient.recordDeed({
            text: `was issued a unit of ${lot} at ${windowName}.`,
            tags: ["blood", "custody", "issue"],
            where,
          });
        }
        if (actor && MixinApi.isPersona(actor)) {
          const to = recipient ? recipient.getPresentation() : "a patient";
          const who = recipient ? [recipient.getIdentityPath() ?? ""] : [];
          await actor.recordDeed({
            text: `issued a unit of ${lot} to ${to} at ${windowName}.`,
            tags: ["blood", "custody", "issue"],
            where,
            who: who.filter(Boolean),
          });
        }
      } else {
        if (actor && MixinApi.isPersona(actor)) {
          await actor.recordDeed({
            text: `gave a unit of ${lot} at ${windowName}.`,
            tags: ["blood", "custody", "gift"],
            where,
          });
        }
      }
    }
  }
  return DonationBankMixin;
}
