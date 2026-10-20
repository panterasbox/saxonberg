/**
 * Hopper — the ash hopper: a tub of wood ash with water dripped through it,
 * and the lye that comes out of the bottom (cleanliness D24).
 *
 * ⭐ It makes lye with NO verb: `put ash in hopper`, `pour water into
 * hopper`, and half a day later `pour hopper into kettle`. The leaching is
 * a maturation — the `lye-leach` profile — that this vessel runs ONLY
 * while there is ash in it (`matchProfile`: water in an empty hopper is
 * just water). The leach takes the ash's potash: the ash is spent.
 *
 * ⚠ And it is TALL: drawing lye off it bare-handed splashes the face —
 * lye in the eyes, which blinds until it is rinsed (D23). Deterministic,
 * not a dice roll (`uncertainty.md`: never roll what your action DID):
 * gloves are how a careful hand draws it.
 */

import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import type MaturationProfile from '@saxonberg/server/mud/lib/maturation/MaturationProfile';
import MaturationProfileRef from '@saxonberg/server/mud/lib/maturation/MaturationProfile';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { LyeStrength, UNMEASURED_LYE_KG_PER_L } from '@saxonberg/server/mud/lib/cleanliness/LyeStrength';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';

/** The profile a hopper of water and ash runs. */
const LEACH = 'lye-leach';
/** What a leached heap leaves behind (potash D6). */
const SPENT_ASH = '/trade/fuel/thing/spent-ash';
/** A leached heap keeps this share of its mass as spent ash. */
const SPENT_SHARE = 0.9;
/** The alkali share assumed of an ash heap that does not say its own. */
const UNSAID_STRENGTH = 0.1;

export default class Hopper extends ContainerMixin(Vat) {
  /**
   * ⭐ Water leaches into lye only through ash — and the ash is spent by
   * it. Anything else in a hopper does nothing.
   */
  public override matchProfile(material: Material): MaturationProfile | null {
    // ⭐ Water leaches; so does a LYE poured back through fresh ash — a
    // second pass, and the oldest way to make a lye strong (potash D6).
    if (!material.hasTag('water') && !material.hasTag('lye')) return null;
    const ash = this.getContents().filter((c) => {
      const m = MixinApi.isTangible(c) ? c.getMaterial() : null;
      return m?.hasTag('potash') ?? false;
    });
    if (ash.length === 0) return null;
    this.leach(ash);
    return MaturationProfileRef.byKey(LEACH);
  }

  /**
   * ⭐⭐ The leach, derived (potash D6): the water takes the ash's alkali —
   * each heap's mass × its strength — into its litres, less what a HARD
   * water spends on its own lime (river water makes a weaker lye than
   * rain), on top of whatever strength a lye poured back through already
   * had. The heaps are spent, not gone: each leaves a heap of spent ash.
   * The hopper takes the strength's grade, so the lye drawn off it carries
   * the band (a pour carries the holder's grade).
   */
  private leach(ash: Stuff[]): void {
    const litres = this.getBulkAmount('interior').rawValue();
    if (!(litres > 0)) return;
    const alkaliPath = (() => {
      try {
        return AppApi.setting(AppSettingKeys.fireAshAlkaliMaterial) || '/stuff/idea/material/mineral/potash';
      } catch {
        return '/stuff/idea/material/mineral/potash';
      }
    })();
    let alkaliKg = 0;
    for (const heap of ash) {
      const mass = MixinApi.isTangible(heap) ? heap.getMass().rawValue() : 0;
      const strength = MixinApi.isComposition(heap) ? heap.fractionOf(alkaliPath) : UNSAID_STRENGTH;
      alkaliKg += mass * strength;
    }
    const payload = this.getBulkPayload('interior');
    const dgh = payload?.hardnessDgh ?? 0;
    const perDgh = (() => {
      try {
        const v = Number(AppApi.setting(AppSettingKeys.potashLyeHardnessWastePerDgh));
        return Number.isFinite(v) && v > 0 ? v : 0.04;
      } catch {
        return 0.04;
      }
    })();
    const kept = Math.max(0, 1 - perDgh * dgh);
    // A lye poured back that nobody measured is taken at soap strength.
    const carried =
      payload?.dissolvedSolidsKgPerL ??
      (this.getBulkMaterial('interior')?.hasTag('lye') ? UNMEASURED_LYE_KG_PER_L : 0);
    const kgPerL = carried + (alkaliKg / litres) * kept;
    this.setBulkPayload('interior', { ...(payload ?? {}), dissolvedSolidsKgPerL: kgPerL });
    this.setGrade(Grade.of(new LyeStrength(kgPerL).gradeBand()));
    for (const heap of ash) void this.spend(heap);
  }

  /** A leached heap becomes spent ash, the owner's still (made from it). */
  private async spend(heap: Stuff): Promise<void> {
    const mass = MixinApi.isTangible(heap) ? heap.getMass().rawValue() : 0;
    try {
      const spent = await StuffApi.clone<Stuff & Containable>(SPENT_ASH, undefined, { madeFrom: [heap] });
      if (MixinApi.isTangible(spent) && mass > 0) spent.setMass(Quantity.of(mass * SPENT_SHARE, 'kg'));
      ContainmentApi.move(spent, this as unknown as Stuff & Container);
    } catch (err) {
      console.warn(`Hopper: no spent ash at '${SPENT_ASH}':`, err);
    }
    await StuffApi.destruct(heap);
  }

  /** Drawn bare-handed, a caustic splashes the face (D23). */
  public override afterPouredOutBy(by: Stuff, litres: number): void {
    super.afterPouredOutBy(by, litres);
    const m = this.getBulkMaterial('interior');
    const drawn = m ?? null;
    if (!drawn || !drawn.hasTag('caustic')) return;
    if (!MixinApi.isAttired(by)) return;
    const gloved = by.handSites().some((h) => by.outermostAt(h) !== null);
    if (gloved) return;
    if (drawn.corrodeOnContact(by, { site: 'body.head' })) {
      MessageApi.scene(by)
        .topic('act.deed')
        .toSelf(
          Mml.compose`The lye slops over the lip of the hopper and up into your face. Your eyes are on fire.`,
        )
        .send();
    }
  }
}
