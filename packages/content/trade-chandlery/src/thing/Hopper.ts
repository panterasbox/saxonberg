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

/** The profile a hopper of water and ash runs. */
const LEACH = 'lye-leach';

export default class Hopper extends ContainerMixin(Vat) {
  /**
   * ⭐ Water leaches into lye only through ash — and the ash is spent by
   * it. Anything else in a hopper does nothing.
   */
  public override matchProfile(material: Material): MaturationProfile | null {
    if (!material.hasTag('water')) return null;
    const ash = this.getContents().filter((c) => {
      const m = MixinApi.isTangible(c) ? c.getMaterial() : null;
      return m?.hasTag('potash') ?? false;
    });
    if (ash.length === 0) return null;
    for (const a of ash) void StuffApi.destruct(a);
    return MaturationProfileRef.byKey(LEACH);
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
