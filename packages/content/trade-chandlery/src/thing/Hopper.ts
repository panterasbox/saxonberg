/**
 * Hopper — the ash hopper: a tub of wood ash with water dripped through it,
 * and the lye that comes out of the bottom (cleanliness D24).
 *
 * ⭐ It makes lye with NO verb: `put ash in hopper`, `pour water into
 * hopper`, and half a day later `pour hopper into kettle`. The leaching is
 * a maturation — the `lye-leach` profile — that this vessel runs ONLY
 * while there is ash in it (`matchProfile`: water in an empty hopper is
 * just water). ⭐ The water PERCOLATES down through the heaps (cordage W7,
 * potash-on-sugar): each heap gives up its alkali as the water reaches
 * down through it, over half a day, and is spent ash only once the water
 * is through — read on the hopper's own reads (its seepers).
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
import type { Percolating } from '@saxonberg/server/mud/lib/material/Percolating';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContentsTitle } from '@saxonberg/server/mud/lib/chattel/ContentsTitle';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';

/** The profile a hopper of water and ash runs. */
const LEACH = 'lye-leach';

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
   * ⭐⭐ The leach (potash D6; percolating since cordage W7): the liquor in
   * the hopper is put on the heaps — each takes its share of the litres by
   * mass — and works down through them over half a day, each heap giving up
   * its alkali as it goes (`Ash.onPercolated`). What this act decides NOW is
   * whose the lye is: the communal-oven rule, read off the heaps' titles at
   * the fill — a later read makes no claim.
   */
  private leach(heaps: Stuff[]): void {
    const litres = this.getBulkAmount('interior').rawValue();
    if (!(litres > 0)) return;
    const ash = heaps.filter((h): h is Stuff & Percolating => MixinApi.isPercolating(h) && !h.isDestroyed());
    if (ash.length === 0) return;
    const payload = this.getBulkPayload('interior');
    // ⭐ The lye is whose the ash was (the communal-oven rule): your heaps
    // in the ashery's hopper make your lye. Rain makes no claim; heaps of
    // two owners make it nobody's.
    const title = ash.reduce((t, heap) => {
      const o = MixinApi.isChattel(heap) ? heap.stampedOwner() : null;
      return o && o.kind !== 'group' ? t.with(o) : t;
    }, new ContentsTitle(payload?.contentsOwner));
    // ⭐ Nothing titled went in — the ashery's own store, rain: the lye is
    // whoever made it (the communal oven, completed by the live walk — free
    // ash made a lye nobody could ever sell). The one pouring or putting is
    // the author of the act this leach is part of.
    const claim = title.claimed();
    const maker = claim === undefined ? (ExecutionContextApi.getCausingAuthor() as Stuff | null) : null;
    const contentsOwner =
      maker && maker.getIdentityPath()
        ? { kind: 'player' as const, templatePath: maker.getIdentityPath()! }
        : claim;
    this.setBulkPayload('interior', { ...(payload ?? {}), contentsOwner });
    const totalKg = ash.reduce((sum, h) => sum + (MixinApi.isTangible(h) ? h.getMass().rawValue() : 0), 0);
    for (const heap of ash) {
      const kg = MixinApi.isTangible(heap) ? heap.getMass().rawValue() : 0;
      heap.receivePercolant(totalKg > 0 ? (litres * kg) / totalKg : litres / ash.length);
    }
  }

  /** Reentry guard for {@link getContents} (a heap spent mid-read moves into this hopper). */
  private _reconcilingHeaps = false;

  /**
   * ⭐ Load on use: whoever looks into the hopper sees the heaps as far as
   * the water has got through them — spent ash only once it is through
   * (cordage W7). The liquor's reads do the same through the vessel's
   * seepers; a listing of what is IN the hopper must not lag behind them.
   */
  public override getContents(): (Stuff & Containable)[] {
    const all = super.getContents();
    if (this._reconcilingHeaps) return all;
    this._reconcilingHeaps = true;
    try {
      for (const c of all) if (MixinApi.isPercolating(c)) c.reconcilePercolation();
    } finally {
      this._reconcilingHeaps = false;
    }
    return super.getContents();
  }

  /**
   * ⭐ Ash put into liquor ALREADY in the hopper leaches too (found by the
   * potash drive: a hopper drained not quite dry took the lye back as a
   * top-up, never re-matched, and the second pass added nothing). Into
   * water, the batch is re-keyed so the leach runs as a fill would; into a
   * lye, the heap is leached straight into it.
   */
  public onContainableAdded(thing: Stuff & Containable): void {
    const m = MixinApi.isTangible(thing) ? thing.getMaterial() : null;
    if (!m?.hasTag('potash')) return;
    const liquor = this.getBulkMaterial('interior');
    if (!liquor || this.getBulkAmount('interior').rawValue() <= 0) return;
    if (liquor.hasTag('lye')) {
      this.leach([thing]);
      return;
    }
    if (liquor.hasTag('water')) {
      this.leach([thing]);
      const path = liquor.getTemplatePath();
      if (path) this.rekeyBatch(path);
    }
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
