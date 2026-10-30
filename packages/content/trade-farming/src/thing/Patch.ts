/**
 * Patch — **a named part of a field, with soil of its own** (field
 * population D2).
 *
 * The top end of the upper bench is thin, stony and dries first; the lane
 * end is deep and holds its water. Before this build a field had ONE
 * soil, so the whole bench read as one average and nobody could see the
 * top end failing. A patch is that part made real: it composes the
 * kernel's `SoilMixin` whole — its own reserves (sized from its area and
 * its leaned sample), its own reconcile, its own rain edge (catchment =
 * its area), its own draw — so nothing in the soil model is written
 * twice. The field becomes the AGGREGATE: every soil read of a divided
 * field is the area-weighted answer over its patches (the kernel's parts
 * protocol, `Soil.soilParts`).
 *
 * ## What it is, and what it is not
 *
 *  - **A fixture of the field** — the `Floor` shape: minted by
 *    `Field.ensurePatches` at `onCreate` (get-or-create at slot
 *    `patch:<key>`), never loose contents, never carried (the
 *    Adornment-not-portable invariant fires at `ContainmentApi.move`),
 *    targetable by its name (`look at the top end`) because a fixture is a
 *    peer candidate. Its runtime state — reserves and soil stamps — rides
 *    the FIELD's record through the fixtures slice; it persists nothing of
 *    its own.
 *  - ⛔ **Not a `Location`** — you do not walk to the top end.
 *  - ⛔ **Not a `Container`** — nothing is inside it. Its crops stand in
 *    the field's contents and root in it by key (`Growing.groundPart`).
 *
 * Composition: `CharacteredSoilMixin(SoilMixin(ReservedMixin(
 * AdornmentMixin(VisibleMixin(Thing)))))` over the kernel's substrate
 * `Thing` (the `Floor` precedent).
 *
 * See [docs/subsystems/soil.md] and docs/plans/field-population-plan.md.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { VisibleMixin } from '@saxonberg/server/mud/lib/description/Visible';
import { AdornmentMixin } from '@saxonberg/server/mud/lib/boundary/Adornment';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { SoilMixin } from '@saxonberg/server/mud/lib/husbandry/Soil';
import type { Growing } from '@saxonberg/server/mud/lib/husbandry/Growing';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import GroundCharacter, {
  TEXTURE_MATERIALS,
  type GroundLean,
  type GroundSample,
} from '@saxonberg/content-ground/src/idea/GroundCharacter';
import {
  CharacteredSoilMixin,
  CROP_TRANSPIRATION_L_PER_M2_DAY,
} from '../lib/CharacteredSoil';
import Field, { type PatchSpec } from '../location/Field';

/** A part's water against the field's is held within this band (D14). */
const DEPTH_FACTOR_MIN = 0.2;
const DEPTH_FACTOR_MAX = 2;

/**
 * ⭐ What `look at the top end` reads: the ground's own look phrase, the
 * crop rooted here read at the VIEWER's band, then any plant somebody has
 * labeled here. Sync and pure — an augmenter only reads.
 */
function patchAugmenter(text: string, host: Stuff, viewer: Stuff): string {
  if (!(host instanceof Patch)) return text;
  const lines = host.patchLines(viewer);
  if (lines.length === 0) return text;
  const block = lines.join(' ');
  return text && text.length > 0 ? `${text}\n\n${block}` : block;
}

// The soil half composed separately: inference through this many nested
// generic mixin factories in one expression collapses (the `Field`
// precedent).
const PatchGround = SoilMixin(ReservedMixin(AdornmentMixin(VisibleMixin(Thing))));
const PatchBase = CharacteredSoilMixin(PatchGround);

export default class Patch extends PatchBase {
  /** The ground, the crop on it, and any labeled plant, in words. */
  static markupAugmenters: MarkupAugmenter[] = [patchAugmenter];

  static fieldMeta: FieldMeta = {
    patchKey: { persistent: true, authorable: true },
    lean: { persistent: true, authorable: true },
  };

  /**
   * ⭐ The key a crop binds by (`groundPart: top-end`) — stable; the name
   * may change. Set by the field from its spec.
   */
  public patchKey = '';

  /** The nudge this part makes to the field's sample, or `null`. */
  public lean: GroundLean | null = null;

  public getPatchKey(): string {
    return this.patchKey;
  }

  public getLean(): GroundLean | null {
    return this.lean;
  }

  /** The field this patch is a part of, or `null` when unattached. */
  public getField(): Field | null {
    const host = this.getAdornedTo();
    return host instanceof Field ? host : null;
  }

  // ---------- the parts protocol (kernel hooks) ----------

  /** A crop standing in the field binds to this part by this key. */
  public override soilPartKey(): string {
    return this.patchKey;
  }

  /** How deep the topsoil runs here — the roots read it. */
  public override soilDepthM(): number | null {
    return this.lastSample?.topsoilM ?? null;
  }

  // ---------- the soil hooks a patch answers as part of its field ----------

  /**
   * ⭐ **A patch catches the field's sky.** A fixture is in nobody's
   * contents, so the default (ask the container) would leave it under no
   * sky at all; the field IS the place it is part of.
   */
  protected override watershedScope(): (Stuff & Container) | null {
    const field = this.getField();
    return field && MixinApi.isContainer(field as unknown as Stuff)
      ? (field as unknown as Stuff & Container)
      : null;
  }

  /**
   * What drinks this part: the crops rooted in it, per square metre still
   * standing, plus its share of the field's sward.
   */
  public override soilWaterDemandPerGameDay(): number {
    const field = this.getField();
    const crops = this.cropsOn().reduce(
      (n, c) => n + c.standingAreaM2() * CROP_TRANSPIRATION_L_PER_M2_DAY,
      0,
    );
    if (!field) return crops;
    const fieldArea = field.getAreaM2();
    const share = fieldArea > 0 ? this.areaM2 / fieldArea : 0;
    return crops + field.swardTranspirationPerGameDay() * share;
  }

  /** The draw follows the field's season (it reads the field's sky). */
  public override soilDrawFactor(fromS: number, toS: number): number {
    const field = this.getField();
    return field ? field.soilDrawFactor(fromS, toS) : super.soilDrawFactor(fromS, toS);
  }

  /**
   * ⭐ **Whose the crop is, is the field's question** (W0 hand-off): the
   * harvest asks the crop's bed, and on a divided field that is this
   * patch — so a stranger's cut on the bench is still the farm's.
   */
  public override async ensureCropTitle(): Promise<void> {
    await this.getField()?.ensureCropTitle();
  }

  /** Sowing here is the field's question: ploughed this season, or not. */
  public override sowingRefusal(): string | null {
    return this.getField()?.sowingRefusal() ?? null;
  }

  // ---------- configured by its field ----------

  /**
   * Take a spec's identity and area: the name it reads by (a leading
   * *the* is the register, not the stem), the words it answers to, the
   * lean, the description. Re-run on every `onCreate`, so an edited row
   * reaches a booted world.
   */
  public configurePatch(spec: PatchSpec, areaM2: number): void {
    this.patchKey = spec.key;
    this.lean = spec.lean ?? null;
    this.setAreaM2(areaM2);
    const stem = spec.name.trim().replace(/^the\s+/i, '') || spec.key.replace(/-/g, ' ');
    this.setShortDescription(stem);
    this.setRegister('definite');
    this.setKeywords([
      ...this.getKeywords(),
      stem,
      ...stem.split(/\s+/),
      spec.key,
      ...(spec.keywords ?? []),
    ]);
    if (spec.description) this.setLongDescription(spec.description);
  }

  /**
   * Size this part's soil from its own sample (the field's, nudged by its
   * lean) against the field's: ⭐ a part whose topsoil runs a third as deep
   * holds a third of the water per square metre (D14). The material is
   * what the sample says the ground is.
   */
  public installFromField(sample: GroundSample, fieldSample: GroundSample): void {
    this.lastSample = sample;
    const ratio =
      fieldSample.topsoilM > 0 ? sample.topsoilM / fieldSample.topsoilM : 1;
    const depthFactor = Math.min(
      DEPTH_FACTOR_MAX,
      Math.max(DEPTH_FACTOR_MIN, Number.isFinite(ratio) ? ratio : 1),
    );
    this.installSoilReserves(sample, depthFactor);
    const material = StuffApi.findByTemplatePath<Material>(
      TEXTURE_MATERIALS[sample.texture],
    );
    if (material) this.setMaterial(material);
    this.settleSoilPlacement();
  }

  // ---------- reads ----------

  /** The area crops standing in the field rooted in this part. */
  public cropsOn(): (Stuff & Growing)[] {
    return this.plantsOn().filter((c) => c.isAreaCrop());
  }

  /** Every growing thing in the field rooted in this part. */
  private plantsOn(): (Stuff & Growing)[] {
    const field = this.getField();
    if (!field) return [];
    const out: (Stuff & Growing)[] = [];
    for (const c of field.getContents()) {
      if (MixinApi.isGrowing(c) && c.getBed() === (this as unknown as Stuff)) {
        out.push(c);
      }
    }
    return out;
  }

  /**
   * `look at the top end`'s lines: the ground, then each crop here at the
   * viewer's band, then each labeled plant (*"Trial stands here,
   * labeled."*). In words, never numbers.
   */
  public patchLines(viewer: Stuff | null): string[] {
    const lines: string[] = [];
    if (this.lastSample) {
      lines.push(capitalize(GroundCharacter.lookPhrase(this.lastSample)));
    }
    for (const crop of this.cropsOn()) {
      const band =
        viewer && MixinApi.isAdvancing(viewer)
          ? viewer.competenceBandCached(crop.getDiscipline())
          : CompetenceBand.FLOOR;
      lines.push(
        `${capitalize(crop.getPresentation())} grows here.`,
        ...crop.readLines(band),
      );
    }
    for (const plant of this.plantsOn()) {
      if (plant.isAreaCrop() || !MixinApi.isLabelled(plant)) continue;
      const label = plant.getLabel();
      if (label) lines.push(`${capitalize(label)} stands here, labeled.`);
    }
    return lines;
  }
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}
