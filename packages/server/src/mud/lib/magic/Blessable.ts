/**
 * BlessableMixin — an item that carries a {@link Blessing}.
 *
 * **Opt-in per template**, deliberately. Most things in the world have
 * no BUC state and should not carry the fields, the hidden-state risk,
 * or the identification surface. A thing is blessable when its author
 * says so.
 *
 * ## The two behaviours, and why they are here rather than elsewhere
 *
 * **Hidden until revealed.** The true band is the item's own fact; what
 * the world knows about it is a separate, also-per-instance fact. The
 * mixin exposes both and they must not be confused: `getBlessing()` is
 * ground truth (engine-side only), `getBlessingBucket()` is what
 * anything player-facing may act on. Stack identity keys on the
 * **bucket**, so two unknown items merge regardless of their true state
 * and merge behaviour leaks nothing.
 *
 * Note that BUC's revelation is **per-instance**, unlike wave 5's
 * per-class identification: knowing what a potion of healing *is* tells
 * you nothing about whether *this particular flask* is cursed. Two
 * different questions, so two different memories.
 *
 * **Cursed sticks.** The release gate lives here as a *veto*, in the
 * `canEvict` shape: the engine asks, the object decides. For a charged
 * item D11 sharpens it — not merely *the slot will not release* but
 * **stuck on you and discharging into you**, which is why the gate and
 * the discharge are one method rather than two features that happen to
 * co-occur.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { Blessing } from './Blessing';
import type { BlessingBand, BlessingBucket, BlessingOdds } from './Blessing';

/** Fraction of remaining charge a cursed item dumps per discharge beat. */
const CURSED_DISCHARGE_FRACTION = 0.05;
/** Trauma severity per kilojoule dumped. *Calibrate at launch.* */
const CURSED_SEVERITY_PER_KJ = 0.02;

/**
 * Why a release did not happen — the return of {@link
 * Blessable.tryRelease}. `dumpedKJ` is what the refusal cost the holder,
 * and is 0 for a curse with no charge behind it.
 */
export interface ReleaseRefusal {
  readonly dumpedKJ: number;
}

export interface Blessable {
  /**
   * **Ground truth.** The item's actual band, regardless of what anyone
   * knows. Engine-side only — a player-facing surface must go through
   * {@link getBlessingBucket}, or hidden state leaks.
   */
  getBlessing(): Blessing;
  setBlessing(value: Blessing): void;
  /** The persisted band word. The Hydrator's entry. */
  getBlessingBand(): string;
  setBlessingBand(value: string): void;

  /**
   * **What is known about this item's BUC** — `'unknown'` until
   * something reveals it, the true band afterwards.
   *
   * This is the read every player-facing surface must use, and the one
   * **stack identity keys on**. It is deliberately *item-side* rather
   * than per-viewer, because BUC is a **per-instance** fact while
   * identification is **per-class**: knowing what a potion of healing is
   * tells you nothing about whether *this* flask is cursed. Two
   * different questions, two different memories.
   *
   * Keying identity on this rather than on {@link getBlessing} is what
   * closes the leak: two *unknown* items merge regardless of their true
   * state, so merge behaviour carries no information. A stack that
   * silently refused to merge would be a free curse detector.
   */
  getBlessingBucket(): BlessingBucket;
  /**
   * Reveal this item's BUC to the world. Idempotent. After this the item
   * no longer merges with unknowns — which is correct and is not a leak,
   * because the split is caused by a *revelation everyone can see*
   * rather than by the hidden state itself.
   */
  revealBlessing(): void;
  /** Has it been revealed? */
  isBlessingKnown(): boolean;

  /**
   * **Does this refuse to come off?** A cursed item does. The `canEvict`
   * shape: a veto the engine asks for and the object answers, defaulting
   * to permission.
   */
  refusesRelease(): boolean;

  /**
   * **Ask to take it off** — the whole release decision in one call.
   *
   * `null` ⇒ it comes away; a {@link ReleaseRefusal} ⇒ it does not, and
   * `dumpedKJ` is what it cost you to find out (0 for an uncharged
   * curse).
   *
   * The pairing exists because {@link refusesRelease} and
   * {@link dischargeIntoHolder} are two halves of one fact, and a caller
   * that checks the veto and forgets the discharge produces a curse that
   * sticks but never bites — a silent, plausible bug that no test of
   * either half would catch. Every release verb (`remove`, `unwield`)
   * goes through this rather than the two methods.
   *
   * ⚠ The **caller** decides whether the item is actually in a slot
   * first. A cursed wand sitting in your pack refuses nothing; the curse
   * is a fact about wearing it, not about owning it.
   */
  tryRelease(holder: Stuff): ReleaseRefusal | null;

  /**
   * **The cursed discharge** (D11). A cursed *charged* item is not
   * merely stuck — it is emptying itself into whoever is wearing it.
   * Returns the kilojoules it dumped, so the caller can narrate; 0 when
   * the item is not cursed, not charged, or already flat.
   *
   * One method rather than two, because "it will not come off" and "and
   * it is hurting you" are the same fact from the wearer's side, and
   * splitting them invites a caller to check one and forget the other.
   */
  dischargeIntoHolder(holder: Stuff): number;

  /**
   * **This kind's own generation odds** — how often a freshly minted one
   * comes out at each band. A Zone's declaration wins over it; see
   * {@link BlessingOdds}.
   *
   * ⚠ Read at MINT time only. It is not instance state and nothing
   * consults it afterwards — an item that already exists has a band, and
   * the odds that produced it are not a fact about it. It lives here
   * rather than on `Circulating` because the field is meaningless
   * without an effect axis to displace, which is the same reason the
   * mixin is scoped to `Wand`/`Rod`.
   */
  getBlessingOdds(): BlessingOdds | null;
  setBlessingOdds(odds: BlessingOdds | null): void;

  /**
   * **Draw this item's band at mint time.** `regionOdds` is the already-
   * resolved zone table (`null` when the place declares none), and it
   * WINS over this item's own baseline — the `regionTarget` ←
   * `zone.stocks` precedence, one axis over.
   *
   * A no-op when neither side declares a usable table, which leaves an
   * authored band alone: a deliberately cursed exemplar stays cursed
   * rather than being re-rolled to ordinary.
   *
   * The draw lives here rather than in the spawn sweep so distribution
   * never imports the magic tree — it asks through `MixinApi.isBlessable`
   * and hands over a table, the way `Circulating` reads `Arcane` without
   * importing it.
   */
  applyMintOdds(regionOdds: BlessingOdds | null, roll?: () => number): void;

  // ---------- storage (public for the Hydrator) ----------
  blessingBand: string;
  blessingBucket: string;
  blessingOdds: BlessingOdds | null;
}

export function BlessableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class BlessableMixin extends Base implements Blessable {
    static _mixinName = 'BlessableMixin';

    static fieldMeta: FieldMeta = {
      // ⚠ The true band is persistent but is NOT a glob-identity field.
      // Putting it there would split stacks by a fact nobody can see —
      // which IS the leak: you would learn an item was cursed by
      // watching it refuse to stack.
      blessingBand: { persistent: true, authorable: true },
      // The BUCKET is what identity keys on. Both persistent, satisfying
      // the framework's `globIdentityFields ⊂ persistentFields`
      // constraint, which it enforces at registration.
      blessingBucket: {
        persistent: true,
        authorable: true,
        globIdentity: true,
      },
      // ⚠ NOT a glob-identity field. Two items differing only in the
      // odds that MADE them are indistinguishable, and splitting a
      // stack on it would leak a generation parameter as instance state.
      blessingOdds: { persistent: true, authorable: true },
    };

    /** Ordinary is the overwhelming default. */
    public blessingBand: string = 'uncursed';

    /** What the world knows. Unknown until revealed. */
    public blessingBucket: string = 'unknown';

    /** This kind's mint-time odds. `null` ⇒ fall back to the zone/dial. */
    public blessingOdds: BlessingOdds | null = null;

    public getBlessingOdds(): BlessingOdds | null {
      return Blessing.hasOdds(this.blessingOdds) ? this.blessingOdds : null;
    }

    public setBlessingOdds(odds: BlessingOdds | null): void {
      this.blessingOdds = Blessing.hasOdds(odds) ? odds : null;
    }

    public applyMintOdds(
      regionOdds: BlessingOdds | null,
      roll?: () => number,
    ): void {
      const odds = Blessing.hasOdds(regionOdds)
        ? regionOdds
        : this.getBlessingOdds();
      if (!Blessing.hasOdds(odds)) return;
      this.setBlessing(Blessing.draw(odds, roll));
    }

    public getBlessingBand(): string {
      return this.blessingBand;
    }

    public setBlessingBand(value: string): void {
      if (!Blessing.isBand(value)) {
        throw new RangeError(
          `BlessableMixin.setBlessingBand: unknown band '${value}'`,
        );
      }
      this.blessingBand = value;
    }

    public getBlessing(): Blessing {
      return Blessing.of(this.blessingBand);
    }

    public setBlessing(value: Blessing): void {
      this.blessingBand = value.getBand();
    }

    public getBlessingBucket(): BlessingBucket {
      return Blessing.isBand(this.blessingBucket)
        ? (this.blessingBucket as BlessingBand)
        : 'unknown';
    }

    public isBlessingKnown(): boolean {
      return this.getBlessingBucket() !== 'unknown';
    }

    public revealBlessing(): void {
      this.blessingBucket = this.blessingBand;
    }

    public refusesRelease(): boolean {
      return this.getBlessing().isCursed();
    }

    public tryRelease(holder: Stuff): ReleaseRefusal | null {
      if (!this.refusesRelease()) return null;
      return { dumpedKJ: this.dischargeIntoHolder(holder) };
    }

    public dischargeIntoHolder(holder: Stuff): number {
      const self = this as unknown as Stuff;
      if (!this.getBlessing().isCursed()) return 0;
      if (!MixinApi.isCharged(self)) return 0;
      const stored = self.getStoredKJ();
      if (stored <= 0) return 0;

      // What it dumps per beat is a fraction of what it holds, so a
      // freshly-charged curse bites hardest and a nearly-flat one is a
      // nuisance. Asymptotic — it never quite finishes, which is the
      // soft-entropy constraint applied to something unpleasant.
      const dumped = stored * CURSED_DISCHARGE_FRACTION;
      if (!self.spendCharge(dumped)) return 0;

      // The energy has to GO somewhere — first law. It goes into the
      // wearer, through the shipped thermal path, so what it does to
      // them is a materials-response read rather than a magic rule.
      if (MixinApi.isVitals(holder)) {
        holder.afflict({
          kind: 'trauma',
          type: 'burn',
          site: 'body.torso',
          severity: dumped * CURSED_SEVERITY_PER_KJ,
          mechanism: 'heat',
        });
      }
      return dumped;
    }
  };
}
