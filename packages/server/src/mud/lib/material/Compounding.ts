/**
 * CompoundingMixin — ⭐⭐ **combining is ONE rule** (ceramics R1, D34; the
 * names are re-plan R1-D5's).
 *
 * Compounding materials yields ONE product whose makeup is COMPUTED from
 * what went in, by mass. There is no recipe and no fixed ratio: one sand
 * too many is a lean batch, one sulfur nodule too many is ebonite. Clay
 * tempered with sand, rubber milled with sulfur, the glass batch and the
 * glaze slip are one mechanism — the vessel names its PRODUCT
 * (`productMaterial`), exactly as a mould names a cast's shape, and the
 * inputs decide what is IN it.
 *
 * The verb follows the state of the matter: `knead` a plastic mass, `stir`
 * a slurry, powder or liquid — one act, and this mixin is the kernel's
 * default knead vessel (`KneadVesselMixin`): both verbs ask its
 * `kneadPlanFor`, and both end at {@link compound}.
 *
 * ```yaml
 * class: /platform/thing/CompoundingVessel
 * data:
 *   productMaterial: /stuff/idea/material/organic/compounded-rubber
 *   productTemplate: /trade/rubber/thing/compounded-stock   # absent = bulk
 * ```
 *
 * ⭐ The vessel makes nothing itself: {@link Compounding.compound} hands its
 * contents to the ONE mint, `CraftingApi.mintFromBuild({ charge })`
 * (re-plan R1-D7), which reads them as {@link chargeContributions} — the
 * record a shaker banks — and runs the path every made-of-several thing
 * runs (grade, the inputs' spoilage, the maker), with this vessel's
 * product as the namer. What each input contributes is what it IS made of
 * — the one fold, `MaterialApi.foldMakeup`:
 * a piece that records its own makeup gives that; otherwise its material's
 * kind composition; otherwise the material itself, whole. So the glass
 * batch's iron is its sand's, and a compounded rubber's sulfur fraction is
 * the sulfur you weighed in.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { BuildContribution } from '../craft/ManualBuild';
import { MixinApi } from '../../api/mixin';
import { CraftingApi } from '../../api/crafting';
import { Freshness } from './Freshness';
import { Contamination } from './Contaminable';
import type { ActPlan, ActRefusal } from '../craft/ActPlan';
import { KneadVesselMixin } from '../craft/KneadVessel';
import type { KneadRequest, KneadVessel } from '../craft/KneadVessel';
import { DipBathMixin } from '../craft/DipBath';
import type { DipBath, DipRequest } from '../craft/DipBath';
import type { FaceName } from './Faced';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { Quantity } from '../quantity';
import { Mml } from '../../api/mml';
import { MessageApi } from '../../api/message';

/** Milling a compound by hand — a quarter of a game-hour, both hands in it. */
const KNEAD_MS = 15 * 60 * 1000;
/**
 * Stirring a slurry, a powder or a liquid even, game-ms — a few minutes and
 * light work, where kneading a plastic mass is a long, heavy job. The state
 * of the matter is the verb the player chose (`stir` vs `knead`).
 */
const STIR_MS = 2 * 60 * 1000;

/** What compounding came to. */
export type CompoundOutcome =
  | { ok: true; product: Stuff | null; massKg: number; inputs: number }
  | {
      ok: false;
      reason: 'empty' | 'already-compounded' | 'mint-failed';
    };

export interface Compounding extends KneadVessel, DipBath {
  /** The material this vessel's product IS. */
  getProductMaterial(): string;
  /** The row a SOLID product is minted as; `''` = the product is this vessel's bulk. */
  getProductTemplate(): string;
  /**
   * ⭐ What is in the vessel, as build contributions — the record a shaker
   * banks, read off the vessel's physical contents: each piece of matter
   * one `item` (its count, the mass of every unit, its tags, material, own
   * makeup, microbial load and pathogens), the belly one `bulk`
   * contribution (its mass derived, `measureL × ρ`).
   */
  chargeContributions(): BuildContribution[];
  /**
   * ⭐ Compound what is in the vessel into ONE product through the one
   * mint (`CraftingApi.mintFromBuild({ charge })`), and tell `by` what came
   * of it — the end of a `knead` or a `stir`.
   */
  compound(by: Stuff, verb: string): Promise<CompoundOutcome>;
}

export function CompoundingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  // ⭐ A tub is a dip BATH (`DipBathMixin`) and a knead VESSEL
  // (`KneadVesselMixin`): it binds as `dip`'s bath and `knead`'s vessel, and
  // affords both, by what it is.
  class CompoundingMixin extends KneadVesselMixin(DipBathMixin(Base)) implements Compounding {
    static _mixinName = 'CompoundingMixin';

    /**
     * ⭐ The vessel affords `stir` — and `knead` and `dip` by what it is
     * (`KneadVesselMixin`, `DipBathMixin`): a glaze is mixed in a tub and
     * pots are dipped in the tub (the BATH affords the dip, as chandlery's
     * dip pot does; a good being dippable is not a fact about the good).
     * Environment and peers: a tub you stand at, a bucket on the bench. A
     * static on the CLASS — a row's `commandContributions:` is dead
     * silently.
     */
    static commandContributions: CommandContributions = {
      environment: ['platform/cmd/crafting/stir.yaml'],
      peers: ['platform/cmd/crafting/stir.yaml'],
    };

    static fieldMeta: FieldMeta = {
      productMaterial: { persistent: true, authorable: true },
      productTemplate: { persistent: true, authorable: true },
    };

    public productMaterial = '';
    public productTemplate = '';

    public getProductMaterial(): string {
      return this.productMaterial;
    }

    public getProductTemplate(): string {
      return this.productTemplate;
    }

    public chargeContributions(): BuildContribution[] {
      const self = this as unknown as Stuff & Container;
      const out: BuildContribution[] = [];
      for (const piece of self.getContents()) {
        if (piece.isDestroyed() || !MixinApi.isTangible(piece)) continue;
        const material = piece.getMaterial();
        if (material === null) continue;
        const count = MixinApi.isStackable(piece) ? piece.getQuantity() : 1;
        out.push({
          measureL: 0,
          gradeBand: MixinApi.isGraded(piece) ? piece.getGradeBand() : 'fair',
          kind: 'item',
          count,
          // ⭐ Every unit of a stack: `getMass()` is one unit's.
          massKg: piece.getMass().rawValue() * count,
          tags: [...material.getTags()],
          materialPath: material.getTemplatePath() ?? undefined,
          makeup: MixinApi.isComposition(piece) ? piece.effectiveMakeup() : undefined,
          freshnessLoad: MixinApi.isFresh(piece) ? piece.getMicrobialLoad() : 0,
          pathogenLoads: MixinApi.isContaminable(piece) ? piece.getPathogenLoads() : {},
        });
      }
      if (MixinApi.isBulkable(self) && self.hasInteriorBulk()) {
        const slot = self.getBulk('interior');
        const litres = slot.getAmount().rawValue();
        const held = slot.getMaterial();
        if (litres > 0 && held !== null) {
          out.push({
            tags: [...held.getTags()],
            measureL: litres,
            // A pour's grade is its holder's; so is the belly's.
            gradeBand: MixinApi.isGraded(self) ? self.getGradeBand() : 'fair',
            materialPath: held.getTemplatePath() ?? undefined,
            makeup: slot.getPayload()?.makeup,
            freshnessLoad: new Freshness(slot).load(),
            pathogenLoads: new Contamination(slot).loads(),
          });
        }
      }
      return out;
    }

    /**
     * ⭐ A tub of something that lays a coat (`Material.laysCoat` — a glaze, a
     * slip) is a coat BATH: `dip crock in tub` lays a WET coat of it on the
     * named faces, and the tub gives up what the skin holds — thickness ×
     * the good's surface area, taken as a cube's (`6 · V^⅔`). Plain on
     * purpose: a bucket of slip glazes a shelf of crocks, not one. `null` —
     * not this tub's business — when nothing is named or what it holds lays
     * no coat (the dip verb says so). The coat SETS by its own material's
     * rule (`FacedMixin`), the fire for a glaze.
     */
    public async dipPlanFor(req: DipRequest): Promise<ActPlan | ActRefusal | null> {
      const self = this as unknown as Stuff;
      const target = req.target;
      if (target === null || !MixinApi.isBulkable(self) || !self.hasInteriorBulk()) return null;
      const material = self.getBulkMaterial('interior');
      if (material === null || !material.getLaysCoat() || !(self.getBulkAmount('interior').rawValue() > 0)) {
        return null;
      }
      if (!MixinApi.isFaced(target)) {
        return {
          ok: false,
          reason: 'not-faced',
          line: Mml.compose`${Mml.thing(target)} has nothing a coat could lie on.`,
        };
      }
      const onto: FaceName[] = (req.faces ?? target.faces()).filter((f) => target.faces().includes(f));
      if (onto.length === 0) {
        return { ok: false, reason: 'no-such-face', line: Mml.compose`${Mml.thing(target)} has no inside to coat.` };
      }
      const thicknessM = compoundDial(AppSettingKeys.facesDipThicknessM, 0.0003);
      const litres = skinLitres(target, thicknessM) * onto.length;
      const where = onto.length === 2 ? 'inside and out' : onto[0] === 'inside' ? 'inside' : 'outside';
      const path = material.getTemplatePath() ?? '';
      const sets = material.getHeatTransitions().length > 0 ? 'It will set when it is fired.' : 'Let it set.';
      const giver = req.actor;
      return {
        ok: true,
        durationMs: DIP_MS,
        effortW: 80,
        beginSelf: Mml.compose`You lower ${Mml.thing(target)} into ${Mml.thing(self)} and draw it out slowly, letting it drain.`,
        beginPeers: Mml.compose`${Mml.actor(giver)} dips ${Mml.thing(target)} into ${Mml.thing(self)}.`,
        onComplete: () => {
          if (target.isDestroyed() || self.isDestroyed() || !MixinApi.isBulkable(self)) return;
          const have = self.getBulkAmount('interior').rawValue();
          if (!(have > 0)) {
            return {
              ok: false,
              reason: 'nothing-to-dip-in',
              line: Mml.compose`The bath has run dry before the coat could take.`,
            };
          }
          self.setBulkAmount('interior', Quantity.of(Math.max(0, have - litres), 'L'));
          for (const face of onto) {
            const soil = MixinApi.isSoilable(target) ? Math.max(target.soilAt(face), target.soilAt('')) : 0;
            target.layCoat(face, path, thicknessM, soil);
          }
          if (!giver.isDestroyed()) {
            MessageApi.scene(giver)
              .topic('act.deed')
              .toSelf(Mml.compose`${Mml.thing(target)} comes out ${where} under a wet skin of ${material.getName()}. ${sets}`)
              .send();
          }
          return undefined;
        },
      };
    }

    /**
     * ⭐ The kernel's default knead: work what is in the vessel into one
     * product — asked by `knead` and by `stir` alike (`req.verb`), the word
     * following the state of the matter. The narration reads the outcome;
     * the mint is {@link compound}'s.
     */
    public async kneadPlanFor(req: KneadRequest): Promise<ActPlan | ActRefusal> {
      const self = this as unknown as Stuff & Container;
      const any = self.getContents().some((c) => MixinApi.isTangible(c)) ||
        (MixinApi.isBulkable(self) && self.hasInteriorBulk() &&
          self.getBulkAmount('interior').rawValue() > 0);
      if (!any) {
        return {
          ok: false,
          reason: 'empty',
          line: Mml.compose`${Mml.thing(self)} is empty. Put what you mean to mix into it first.`,
        };
      }
      const giver = req.actor;
      const verb = req.verb ?? 'knead';
      return {
        ok: true,
        durationMs: verb === 'knead' ? KNEAD_MS : STIR_MS,
        effortW: verb === 'knead' ? 380 : 150,
        beginSelf:
          verb === 'knead'
            ? Mml.compose`You set your hands to what is in ${Mml.thing(self)}, folding it over and over on itself.`
            : Mml.compose`You begin to ${verb} ${Mml.thing(self)}, working what is in it together.`,
        beginPeers:
          verb === 'knead'
            ? Mml.compose`${Mml.actor(giver)} works at ${Mml.thing(self)} with both hands.`
            : Mml.compose`${Mml.actor(giver)} ${verb}s ${Mml.thing(self)}.`,
        onComplete: () => {
          void this.compound(giver, verb);
        },
      };
    }

    public async compound(by: Stuff, verb: string): Promise<CompoundOutcome> {
      const self = this as unknown as Stuff;
      const inputs = this.chargeContributions().length;
      // ⭐ The ONE mint (re-plan R1-D7): the charge runs the path a
      // shaker's buffer runs, and this vessel's product names what it makes.
      const minted = await CraftingApi.mintFromBuild({
        charge: self,
        makerPath: by.isDestroyed() ? '' : by.getIdentityPath() ?? '',
      });
      let out: CompoundOutcome;
      if (minted.ok) {
        // A solid product is its own piece; a bulk one is this vessel's belly.
        const product = minted.output === self ? null : minted.output;
        const massKg =
          product !== null
            ? MixinApi.isTangible(product) ? product.getMass().rawValue() : 0
            : MixinApi.isBulkable(self) && self.hasInteriorBulk()
              ? self.getBulk('interior').getMassKg()
              : 0;
        out = { ok: true, product, massKg, inputs };
      } else {
        out = {
          ok: false,
          reason:
            minted.detail === 'empty-build'
              ? 'empty'
              : minted.detail === 'already-compounded'
                ? 'already-compounded'
                : 'mint-failed',
        };
      }
      narrate(by, self, out, verb);
      return out;
    }
  }
  return CompoundingMixin;
}

/**
 * Say what compounding came to — the end of a `knead` or a `stir` (both
 * end at {@link Compounding.compound}).
 */
function narrate(giver: Stuff, vessel: Stuff, out: CompoundOutcome, verb: string): void {
  if (giver.isDestroyed()) return;
  const scene = MessageApi.scene(giver).topic('act.deed');
  if (out.ok) {
    scene
      .toSelf(
        out.product !== null
          ? Mml.compose`It comes together into one even mass: ${Mml.thing(out.product)}.`
          : Mml.compose`What is in ${Mml.thing(vessel)} comes together, even all through.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} finishes working ${Mml.thing(vessel)}.`)
      .send();
    return;
  }
  scene
    .toSelf(
      out.reason === 'empty'
        ? Mml.compose`You ${verb} ${Mml.thing(vessel)}, but there is nothing in it.`
        : out.reason === 'already-compounded'
          ? Mml.compose`It is already one even mass. There is nothing to work in.`
          : Mml.compose`It will not come together — and that is a fault in the books, not in your hands.`,
    )
    .send();
}

/** Dipping a pot and drawing it out, letting it drain — a game-minute. */
const DIP_MS = 60_000;

function compoundDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** Litres a skin of `thicknessM` over one face of the good takes. */
function skinLitres(target: Stuff, thicknessM: number): number {
  if (!MixinApi.isTangible(target)) return 0;
  const kg = target.getMass().rawValue();
  const density = target.getMaterial()?.getDensity().rawValue() || 2000;
  const volumeM3 = kg / density;
  const areaM2 = 6 * Math.pow(Math.max(0, volumeM3), 2 / 3);
  return areaM2 * thicknessM * 1000;
}
