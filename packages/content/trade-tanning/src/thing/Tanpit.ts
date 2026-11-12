/**
 * Tanpit — ⭐ **a hole full of bark and water, and it is the CONDITION a
 * hide tans against rather than a machine that tans it.**
 *
 * It holds two things at once, and that is the whole of it: hides go IN
 * (a `Container`) and liquor goes in around them (`Bulkable`). The pit
 * answers one question for each skin standing in it — *how strong is my
 * liquor, and how much of it is there per kilogram of you* — and
 * `TanningMixin` on the hide does the rest.
 *
 * ## ⚠ Why `CraftVessel` and not `Vat`
 *
 * `Vat` was the obvious row and is wrong twice. It composes
 * `MaturingMixin`, which would be a **false claim over plain water** (a
 * tanpit does not ferment, and a profile keyed to the interior material
 * would convert the liquor rather than the skins); and it is **not a
 * `Container`**, so hides could not go in it at all.
 *
 * `CraftVessel` is Container + Bulkable + Thermal + Crafted + VesselKind
 * + Serviceable + Contaminable — which is a washable, temperature-having,
 * grade-carrying vessel you can put both matter and things into. That is
 * a tanpit.
 *
 * ## ⭐ The bark is CONSUMED, and that is what makes bark worth selling
 *
 * Each hide that comes out takes bark with it. A pit is therefore a
 * running cost rather than a fixture, which is what gives the oak coppice
 * a customer and closes the loop the forestry wave opens. ⚠ When the bark
 * is gone the liquor is water: the refusal is INTRINSIC — strength falls
 * to zero and the hides simply stop — and `look pit` says so in words.
 */

import CraftVessel from '@saxonberg/server/mud/platform/thing/CraftVessel';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { LEATHERWORK, TAN_SOILS, TANNING, type TanLiquor, type Tanning } from '../lib/Tanning';

/** ⭐ Every reason a pit refuses a hide — `TanController` words each. */
export type LayInRefusal =
  /** It is in this pit already: `look` at the pit to see how it is coming on. */
  | ActRefusal<'already-in-pit'>
  /** Tanned through and lifted: nothing left for a pit to do. */
  | ActRefusal<'already-tanned'>
  /** No liquor in the pit. */
  | ActRefusal<'pit-dry'>;

/** A laying-in: instant (the hide's clock does the work), the pit's read after. */
export type LayInPlan = ActPlan<undefined, { pitLine: string }, LayInRefusal>;

/**
 * ⭐ The pit's `look` carries what is in it and how each skin is coming on
 * (controller-liquidity W11) — the read a second `tan` used to be. Words,
 * never a number: the liquor's band, then a line a skin.
 */
function pitAugmenter(text: string, host: Stuff): string {
  if (host.isDestroyed() || !(host instanceof Tanpit)) return text;
  const lines = [host.pitReport().line];
  for (const item of host.getContents()) {
    if (!MixinApi.isActive(item, 'TanningMixin')) continue;
    const name = item.getPresentation();
    lines.push(`${name.charAt(0).toUpperCase()}${name.slice(1)} is down in it. ${(item as unknown as Tanning).tanReport().line}`);
  }
  const block = lines.join('\n');
  return text && text.length > 0 ? `${text}\n\n${block}` : block;
}

/** The read a player gets off the pit — words, never a number. */
export type PitBand = 'dry' | 'water' | 'weak' | 'good' | 'harsh';

export interface PitReport {
  band: PitBand;
  line: string;
}

export default class Tanpit extends CraftVessel {
  /**
   * ⭐⭐ **The pit affords `tan`.** A tannery's second pit needs zero
   * code, and a venue that wants a tanning floor needs no class of its
   * own: the affordance is a static on this class, because a row's
   * `commandContributions:` is dead silently.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['trade/tanning/cmd/tanning/tan.yaml'],
    environment: [],
  };

  static fieldMeta: FieldMeta = {
    barkKg: { persistent: true, authorable: true },
  };

  static markupAugmenters: MarkupAugmenter[] = [pitAugmenter];

  /**
   * Kilograms of crushed bark in the liquor. ⭐ Authorable so a working
   * tannery ships with its pits charged — an empty pit in a shipped
   * tannery would read as a derelict one.
   */
  public barkKg = 0;

  public getBarkKg(): number {
    return this.barkKg;
  }

  /** Litres of liquor standing in the pit. */
  public liquorLitres(): number {
    const slot = BulkableApi.slotFor(this, undefined);
    if (!slot || slot.isEmpty()) return 0;
    return slot.getAmount().rawValue();
  }

  /** Total kilograms of hide currently in the pit. */
  public hideKgInside(): number {
    let kg = 0;
    for (const item of this.getContents()) {
      if (MixinApi.isTangible(item)) kg += item.getMass().rawValue();
    }
    return kg;
  }

  /**
   * How strong the liquor is, `[0, …]` where `1` is a full charge. Can
   * exceed `1`, and past {@link TANNING.HARSH_STRENGTH} it starts to harm
   * the grain — which is why a tanner in a hurry gets a hard hide.
   */
  public liquorStrength(): number {
    const litres = this.liquorLitres();
    if (litres <= 0) return 0;
    return this.barkKg / (litres * TANNING.BARK_KG_PER_LITRE);
  }

  /**
   * ⭐ **The answer a hide reads**, or `null` when there is nothing to
   * stand in. `hideKg` is the asking skin's own mass, and the coverage it
   * gets is the pit's liquor divided by **every** skin in there — so a
   * crowded pit tans all of them badly with no rule of its own.
   */
  public tanLiquorFor(hideKg: number): TanLiquor | null {
    const litres = this.liquorLitres();
    if (litres <= 0) return null;
    const totalHide = Math.max(hideKg, this.hideKgInside());
    if (totalHide <= 0) return null;
    return {
      strength: this.liquorStrength(),
      litresPerKg: litres / totalHide,
      temperatureK: this.getTemperature().rawValue(),
    };
  }

  /**
   * ⭐ A hide coming out is the judgement, whoever's hand it was and whatever
   * verb moved it: the hide's own rule (`TanningMixin.onLiftedFrom`). A witness
   * hook runs inside the move and cannot be awaited, so a failure is said here.
   */
  public override onContainableRemoved(thing: Stuff & Containable, to?: Stuff | null): void {
    super.onContainableRemoved(thing, to);
    // Nowhere is no lift: the pit's teardown, not somebody's hand or floor.
    if (!to || !MixinApi.isActive(thing, 'TanningMixin')) return;
    const by = to.isAgent() ? to : null;
    void (thing as unknown as Tanning).onLiftedFrom(this, by).catch((err: unknown) => {
      console.error('Tanpit: lifting a hide failed:', err);
    });
  }

  /**
   * ⭐ `tan <hide> in <pit>` — lay it in (controller-liquidity W11). The act
   * is a moment; the hide's own clock does the weeks, stamped NOW so a hide
   * dropped in and ignored for a month does not get a month of free liquor.
   * Checking on it is `look` at the pit; coming out is the hide's rule on
   * leaving it (`TanningMixin.onLiftedFrom`).
   */
  public layInPlan(hide: Stuff & Containable & Tanning, by: Stuff): LayInPlan | LayInRefusal {
    if (hide.getContainer() === (this as unknown as Stuff)) return { ok: false, reason: 'already-in-pit' };
    if (hide.isTanned()) return { ok: false, reason: 'already-tanned' };
    if (this.liquorLitres() <= 0) return { ok: false, reason: 'pit-dry' };
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      facts: undefined,
      onComplete: async () => {
        ContainmentApi.move(hide, this as never);
        hide.reconcileTanning();
        // ⭐ (cleanliness D6) The stench trade, on the hands and the apron.
        if (MixinApi.isHygienic(by)) by.soilFrom(TAN_SOILS);
        if (MixinApi.isAdvancing(by)) {
          await by.creditDeed({ discipline: LEATHERWORK, difficulty: 'easy', outcome: 'success' });
        }
        return { ok: true, facts: { pitLine: this.pitReport().line } };
      },
    };
  }

  /** Take bark out of the liquor — what a finished hide costs the pit. */
  public consumeBark(kg: number): number {
    if (!Number.isFinite(kg) || kg <= 0) return 0;
    const taken = Math.min(kg, this.barkKg);
    this.barkKg = Math.round((this.barkKg - taken) * 1000) / 1000;
    return taken;
  }

  /** Add crushed bark. Returns the new total. */
  public addBark(kg: number): number {
    if (!Number.isFinite(kg) || kg <= 0) return this.barkKg;
    this.barkKg = Math.round((this.barkKg + kg) * 1000) / 1000;
    return this.barkKg;
  }

  /**
   * ⭐ What `look` says. Words, never a number — and the refusal is
   * legible: an empty pit says it is empty, and a pit of plain water says
   * there is no bark in it, so a player who cannot tan is told why.
   */
  public pitReport(): PitReport {
    if (this.liquorLitres() <= 0) {
      return {
        band: 'dry',
        line: 'The pit is empty — bare boards and a smell that has soaked into them.',
      };
    }
    const s = this.liquorStrength();
    if (s <= 0) {
      return {
        band: 'water',
        line: 'It is standing full of clear water. Without bark in it, it is a bath and not a tanpit.',
      };
    }
    if (s < 0.5) {
      return {
        band: 'weak',
        line: 'The liquor is thin and pale. It will work, slowly, and a skin will sit in it a long while.',
      };
    }
    if (s > TANNING.HARSH_STRENGTH) {
      return {
        band: 'harsh',
        line: 'The liquor is almost black and it bites the back of your throat. It will tan fast and it will tan hard.',
      };
    }
    return {
      band: 'good',
      line: 'Brown liquor, strong and even, with a sour bark smell coming off it.',
    };
  }
}
