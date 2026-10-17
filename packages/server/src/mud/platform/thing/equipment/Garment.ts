/**
 * Garment — the concrete row-backing class for **worn things that cover
 * the body**: clothing, and armor as the protective tail of clothing.
 *
 * ⭐ There used to be an `Armor` class beside this one. It is retired:
 * every shipped armor row now names this class, and is
 * byte-identical — and the retired class was asserting something the
 * engine never asked. A breastplate is a garment that happens to stand
 * between a body and a blade, and whether it does is a question about
 * the material and the form — it never asks what class they are.
 *
 * That is `textiles.md`'s headline (*a garment's purpose is
 * which exposure channel it intercepts, not what class it is*) — applied
 * to the one class that was already an exception. Nobody authors *"this
 * is armor"*; they author a material and a form, and the channel follows.
 *
 * Composition:
 * - `WearableMixin` (which composes `SlottableMixin`) — occupies body
 *   slots, carries `slotClaims`, derives its insulation (`getClo`).
 * - `DurableMixin` — wear, mending, and the condition bands; `salvage` and
 *   `repair` works on them. A durable good, NOT a crafting tool.
 * - `CraftedMixin` (which composes `GradedMixin`) — the as-made grade
 *   and the maker's mark, so a garment can be a recipe output and a
 *   store-bought one simply has an empty mark.
 * - `DetailedMixin` — the parts a viewer can examine, and the surface a
 *   maker's authored prose rides on.
 * - `DyedMixin` — the dye application stack and its fastness, so a
 *   garment can be coloured, washed, and faded. Undyed is the sparse
 *   default (an empty stack), so this costs a shipped row nothing.
 *
 * Variety stays content + composition, never subclassing: *type* is
 * `slotClaims` + description; *added behavior* is a mixin layered on
 * (`DisguiseGarment` is the one shipped example, and it inherits all of
 * the above for free).
 *
 * Seeded as content (e.g. `/stuff/thing/clothes/white-coat`) with
 * `data.slotClaims: { /stuff/idea/species/BodyPlan/biped: [torso] }`,
 * `_materialPath`, `constructionForm`, `gradeBand` and `mass`.
 */

import Good from '../../../lib/stuff/Good';
import { ConstructedMixin } from '../../../lib/material/Constructed';
import { DurableMixin } from '../../../lib/material/Durable';
import { CraftedMixin } from '../../../lib/craft/Crafted';
import { DyedMixin } from '../../../lib/material/Dyed';
import { SlottableMixin } from '../../../lib/slot/Slottable';
import { WearableMixin } from '../../../lib/slot/Wearable';
import { SoilableMixin } from '../../../lib/cleanliness/Soilable';
import type { WashOutcome, WashSpec } from '../../../lib/cleanliness/Soilable';
import { LabelledMixin } from '../../../lib/description/Labelled';
import type Material from '../../../lib/material/Material';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { WorldClockApi } from '../../../api/worldclock';
import { BiomeApi } from '../../../api/biome';
import { CelestialApi } from '../../../api/celestial';
import { Quantity } from '../../../lib/quantity';
import { TemplatePaths } from '../../../lib/paths';
import type { FieldMeta } from '../../../lib/mixin';
import type DirtKindCatalogue from '../../idea/DirtKindCatalogue';
import type { DirtKindDescriptor } from '../../idea/DirtKind';
import type { WashPolicy, WashSubject } from '../../../lib/cleanliness/WashPolicy';

// ⭐ Soilable and Labelled OUTERMOST (cleanliness D3, D9): every garment
// may carry dirt by kind and be washed — a shirt, an apron, a pair of
// gloves — and every garment may be marked with its owner's name, which
// is what a laundry mark is.
const GarmentBase = LabelledMixin(SoilableMixin(WearableMixin(
  SlottableMixin(
    CraftedMixin(
      DurableMixin(ConstructedMixin(DyedMixin(Good))),
    ),
  ),
)));

/** The water at which wool FELTS — boiling, near enough. */
const FELT_ABOVE_K = 363;

/** The longest gap an airing integrates (a garment forgotten on a line). */
const AIRING_MAX_GAP_S = 10 * 24 * 3600;
/** The daylight walk's step. */
const AIRING_STEP_S = 2 * 3600;
/** The sun's oxidiser dose per daylight hour on a line — a week of good
 * days whitens a stained shirt. */
const SUN_DOSE_PER_HOUR = 0.012;
/** The fume's dose per hour at unit share of the air. */
const FUME_DOSE_PER_FRACTION_HOUR = 20;

export default class Garment extends GarmentBase {
  // ── airing (cleanliness D21): the sun and the fumes ──

  /**
   * ⭐ How far the sun has YELLOWED this (a protein fibre — wool — in
   * daylight), `0..1`; sulfur fume whitens it back. Read out in words.
   */
  public sunYellow = 0;
  /** Game-seconds of the last airing reconcile; `0` = never. */
  public airingStamp = 0;

  static fieldMeta: FieldMeta = {
    sunYellow: { persistent: true, runtimeState: true },
    airingStamp: { persistent: true, runtimeState: true },
  };

  /**
   * ⭐⭐ What washing does to CLOTH (cleanliness D10) — on top of the dirt
   * the mixin lifts:
   *
   * - **boiling felts wool** — a protein fibre in water at a boil becomes
   *   `felted`, and shrinks hard (`textiles.wash.feltShrink`);
   * - **hot water shrinks** — a fibre garment at or above
   *   `textiles.wash.shrinkAboveK` loses a little of its cut;
   * - **the chemistry eats the fibre** — a cleanser whose material is
   *   corrosive to one of this garment's tags (lye on wool, vitriol on
   *   linen) wears it, and so does a full-strength bleach on cellulose;
   *   sand scratches what its row says it scratches;
   * - **unfast dye bleeds** — what the wash strips goes, in part, onto
   *   whatever else is in the water with it;
   * - and it comes out **wet**.
   *
   * ⚠ Water must reach the fibre for any of it: a garment of rubber or a
   * rubberized cloth carries no `fibre` tag and neither shrinks nor felts
   * (the one wet law, when it lands, decides how wet it comes out).
   */
  /**
   * ⭐ What a laundress sees before it goes in the water (cleanliness
   * D26), at her band — repair's *quote only what you can see*: a hand
   * that reads cloth names the fibre and the stains; an untrained one sees
   * a dirty shirt. Never the consequence: she says what she will do, not
   * what it will do to it.
   */
  public describeForLaundress(policy: WashPolicy): {
    said: string;
    subject: WashSubject;
    kinds: string[];
  } {
    const material = this.getMaterial();
    const wool = !!material?.hasTag('protein') && !!material.hasTag('fibre');
    const kinds = this.soilKinds();
    const subject: WashSubject = { wool, blood: kinds.includes('blood') };
    const name = this.getPresentation();
    if (!policy.readsTheCloth()) {
      return {
        said: `"Your ${name}. ${policy.sayMethod(subject)}."`,
        subject,
        kinds,
      };
    }
    const fibre = material?.getName() ?? 'cloth';
    const dirt = this.describeSoil();
    return {
      said:
        `"${fibre.charAt(0).toUpperCase()}${fibre.slice(1)}` +
        (dirt ? `, and ${dirt}` : ', and not much on it') +
        `. ${policy.sayMethod(subject)}."`,
      subject,
      kinds,
    };
  }

  public override washSite(spec: WashSpec, site: string = ''): WashOutcome {
    const outcome = super.washSite(spec, site);
    const damage = [...outcome.damage];
    const material = this.getMaterial();
    const fibre = material !== null && material.hasTag('fibre');

    // The colour first: the bath strips what is not bound, and some of
    // what it strips goes onto what is washed with it.
    const before = this.dyeStrength();
    if (this.launder()) damage.push('faded');
    const lost = before - this.dyeStrength();
    if (lost > 0.01 && spec.coWashed && spec.coWashed.length > 0) {
      const top = this.getDyeStack().slice(-1)[0];
      const share = dial(AppSettingKeys.textilesWashBleedFraction, 0.3);
      for (const other of spec.coWashed) {
        if (other === (this as unknown as Stuff) || !MixinApi.isDyed(other)) continue;
        if (!top) continue;
        other.applyDye({ ...top, strength: Math.min(1, lost * share) });
      }
      damage.push('bled');
    }

    if (fibre) {
      if (material!.hasTag('protein') && spec.waterK >= FELT_ABOVE_K) {
        if (this.getConstructionForm() !== 'felted') {
          void this.setConstructionForm('felted').catch((err: unknown) =>
            console.warn('Garment.washSite: felting failed:', err),
          );
          this.shrinkCut(dial(AppSettingKeys.textilesWashFeltShrink, 0.85));
          damage.push('felted');
        }
      } else if (spec.waterK >= dial(AppSettingKeys.textilesWashShrinkAboveK, 333)) {
        this.shrinkCut(dial(AppSettingKeys.textilesWashHotShrink, 0.97));
        damage.push('shrunk');
      }
    }

    // The chemistry on the fibre: what a cleanser's material corrodes is
    // derived from the material row, never authored on the cleanser.
    const rot = dial(AppSettingKeys.textilesWashRotDose, 0.05);
    for (const c of spec.cleansers) {
      const agent = c.materialPath
        ? StuffApi.findByTemplatePath<Material>(c.materialPath)
        : null;
      const eats = (agent?.getCorrosiveTo() ?? []).some(
        (tag) => material?.hasTag(tag) ?? false,
      );
      const bleaches =
        c.row.action === 'oxidiser' && (material?.hasTag('cellulose') ?? false);
      if (eats || bleaches) {
        this.wear(rot, 'corrosion');
        damage.push(eats ? 'burnt' : 'rotted');
      }
      for (const d of c.row.damages) {
        if (d.effect === 'scratches' && material?.hasTag(d.fibreTag)) {
          this.wear(rot, 'edge');
          damage.push('scratched');
        }
      }
    }

    this.wet(1);
    return { ...outcome, damage: [...new Set(damage)] };
  }

  /**
   * ⭐⭐ The bleach ladder, integrated (cleanliness D21) — a garment HUNG
   * somewhere (on a line, a green, a shut room's chair) gets the daylight
   * its place has had since it was last read, and the sulfur fume in the
   * air. Daylight is an oxidiser-slow dose: stains fade, colour fades,
   * linen whitens — and wool YELLOWS. Fume is an oxidiser: it whitens
   * wool. Nothing at night, nothing indoors without fume, nothing for a
   * garment somebody is wearing or carrying (it is not hung out).
   *
   * ⚠ The fume share is sampled ONCE per reconcile (the light-strike
   * fidelity rule); the daylight is walked in two-hour steps over the gap,
   * capped at ten days.
   */
  public override async reconcileAiring(): Promise<void> {
    const now = WorldClockApi.getNow().rawValue();
    if (this.airingStamp === 0 || now <= this.airingStamp) {
      this.airingStamp = now;
      return;
    }
    const gapS = Math.min(now - this.airingStamp, AIRING_MAX_GAP_S);
    const startS = now - gapS;
    this.airingStamp = now;
    const room = this.getContainer();
    if (room === null || room.isAgent() || !MixinApi.isContainer(room)) return;

    let dayHours = 0;
    if (BiomeApi.isSkyExposed(room)) {
      for (let t = startS; t < now; t += AIRING_STEP_S) {
        if (await CelestialApi.isDayAt(room, Quantity.of(t, 's'))) {
          dayHours += Math.min(AIRING_STEP_S, now - t) / 3600;
        }
      }
    }
    let fume = 0;
    for (const c of BiomeApi.resolveAtmosphereContentsFor(room)) {
      const m = StuffApi.findByTemplatePath<Material>(c.type);
      if (m?.hasTag('sulfur-fume')) fume += c.amount;
    }
    const sunDose = Math.min(1, dayHours * SUN_DOSE_PER_HOUR);
    const fumeDose = Math.min(1, fume * (gapS / 3600) * FUME_DOSE_PER_FRACTION_HOUR);
    if (sunDose <= 0 && fumeDose <= 0) return;

    // Stains and films that answer to an oxidiser fade by the dose.
    for (const kind of this.soilKinds('')) {
      const row = dirtRowFor(kind);
      const answers = this.isSoilSet(kind, '') ? row?.setAnswersTo : row?.answersTo;
      const dose =
        (answers?.includes('oxidiser-slow') ? sunDose : 0) +
        (answers?.includes('oxidiser') ? fumeDose : 0);
      if (dose > 0) this.removeSoil(kind, Math.min(1, dose), '');
    }
    this.bleach(sunDose * 0.5 + fumeDose * 0.5);
    const material = this.getMaterial();
    if (material?.hasTag('protein')) {
      this.sunYellow = Math.max(0, Math.min(1, this.sunYellow + sunDose - fumeDose * 2));
    }
  }

  /** The soil line, and the yellowing the sun has done to wool. */
  public override soilLookLine(viewer: Stuff | null = null): string {
    const soil = super.soilLookLine(viewer);
    const yellow = this.sunYellow >= 0.25 ? 'The sun has yellowed it.' : '';
    return [soil, yellow].filter((l) => l.length > 0).join(' ');
  }

  private dyeStrength(): number {
    return this.getDyeStack().reduce((n, a) => n + a.strength, 0);
  }
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function dirtRowFor(kind: string): DirtKindDescriptor | null {
  return (
    StuffApi.findByTemplatePath<DirtKindCatalogue>(
      TemplatePaths.dirtKindCatalogue,
    )?.peek(kind) ?? null
  );
}
