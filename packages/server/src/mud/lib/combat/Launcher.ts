/**
 * Launcher — ⭐⭐ **a weapon that stores energy somewhere other than your
 * arm.**
 *
 * That sentence is the whole of the mixin, and it is the whole of what
 * separates the medieval from everything after it. A sword's energy comes
 * out of the swing: `WeaponProfile` derives it from mass and balance and
 * the arm behind it, and no amount of technique makes a sword hit harder
 * than a person can swing. A bow stores the draw in a limb; a crossbow
 * stores it in a prod you can leave loaded; a musket stores it in
 * chemistry. **The energy stops being a fact about the wielder**, which
 * is why the same body can fight past its own strength — and why armour
 * suddenly has to answer pressure rather than effort.
 *
 * ⚠⚠ **Composed on `platform/thing/equipment/Launcher`, NEVER on
 * `Weapon`.** A knife does not launch. Putting this on the base would
 * claim that every weapon in the game has a muzzle speed and a
 * projectile, and every read of those would then need a guard to
 * re-narrow the host set — which is the tell that the host is wrong.
 *
 * ⭐ **A launcher is still a weapon.** It composes `Weapon`, so a bow has
 * a `constructionForm` and a melee profile and can be hit with — which is
 * both true (a bowstave is a club) and what keeps `lint:inert-weapon`
 * satisfied without a special case.
 *
 * What it does NOT carry, deliberately: reliability, dry-fire, a hold
 * window, pattern keys, misfire. Those are the ranged slate's W3/W4 and
 * each is a real design; `readySeconds` is the **one** number this build
 * ships, because one number is enough to make the families tactically
 * different (a bow you can loose again in three seconds, a musket you
 * cannot).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { Quantity } from '../quantity';
import type { EnergySourceKind } from './EnergySource';

/** The launcher surface — see the module doc. */
export interface Launcher {
  /**
   * Where the shot's energy was stored before it was a shot. The axis
   * that makes this a launcher rather than a thrown thing: `muscle` is
   * an arm, `stored-elastic` is a drawn limb or a wound prod, `chemical`
   * is a charge.
   */
  energySource: EnergySourceKind;
  /** How fast this launcher sends its projectile (m/s). */
  muzzleSpeed: Quantity<'m/s'>;
  /** The template path of the ammunition it takes. */
  projectileTemplate: string;
  /**
   * ⭐ Game-seconds to make it ready again — the family's tactical
   * identity in ONE number. A bow is three, a crossbow nine, a musket
   * twelve, and that ratio is the entire reason anybody kept using bows
   * for two centuries after firearms arrived.
   */
  readySeconds: number;

  /**
   * ⭐ Game-time (seconds) at which this launcher is ready again. `0` is
   * "ready now", which is every launcher that has never been fired.
   *
   * ⚠ A **read**, not a timer: nothing schedules anything, and a body
   * that logs out mid-reload comes back to a launcher that is ready
   * because the world clock moved on. That is the same reconcile-on-read
   * discipline every other clock in this engine uses, and it is why
   * readiness needs no engagement machinery to be real.
   */
  readyAtS: number;

  getEnergySource(): EnergySourceKind;
  getMuzzleSpeed(): Quantity<'m/s'>;
  getProjectileTemplate(): string;
  getReadySeconds(): number;
  /** Seconds until ready, or `0` if it is ready now. */
  secondsUntilReady(nowS: number): number;
  /** Stamp the reload clock from `nowS`. */
  markFired(nowS: number): void;
}

export function LauncherMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class LauncherMixin extends Base implements Launcher {
    static _mixinName: string = 'LauncherMixin';

    static fieldMeta: FieldMeta = {
      energySource: { persistent: true, authorable: true },
      muzzleSpeed: { persistent: true, authorable: true },
      projectileTemplate: { persistent: true, authorable: true },
      readySeconds: { persistent: true, authorable: true },
      readyAtS: { persistent: true, runtimeState: true },
    };

    public energySource: EnergySourceKind = 'stored-elastic';
    public muzzleSpeed: Quantity<'m/s'> = Quantity.of(0, 'm/s');
    public projectileTemplate = '';
    public readySeconds = 0;
    public readyAtS = 0;

    public getEnergySource(): EnergySourceKind {
      return this.energySource;
    }
    public getMuzzleSpeed(): Quantity<'m/s'> {
      return this.muzzleSpeed;
    }
    public getProjectileTemplate(): string {
      return this.projectileTemplate;
    }
    public getReadySeconds(): number {
      return Math.max(0, this.readySeconds);
    }

    public secondsUntilReady(nowS: number): number {
      return Math.max(0, this.readyAtS - nowS);
    }

    public markFired(nowS: number): void {
      this.readyAtS = nowS + this.getReadySeconds();
    }
  };
}
