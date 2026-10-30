/**
 * TemperPit — ⭐ where a brickmaker's clay is tempered: a pit of water you
 * tread clay and sand into until the whole mass is even and at the WINDOW —
 * wet enough to throw into a mould, stiff enough to stand (ceramics S3, D34).
 *
 * ⭐ **And it RECLAIMS** (B99): green ware is still clay, so a slumped or
 * frost-burst piece put back in the pit is trodden into clay again. What
 * cannot be trodden in — a fired pot, a stone — is refused, by name.
 *
 * Combining is ONE rule (R1): what is put in the pit becomes one product
 * whose makeup is the inputs' by mass. The pit's row names the clay's own row
 * and material as its product, so tempered clay is still `Clay` — a stack whose
 * composition now records the sand, grog and breeze kneaded in, and whose
 * `crackRisk()` falls with every shovel of sand. No recipe and no ratio: a
 * little more sand is a leaner clay.
 *
 * What the pit adds to the kernel's compounding is the WATER: the pit must hold
 * some (`it wants water` otherwise), the tread takes up
 * `ceramics.temper.waterLPerKg` of it per kilogram of clay, and the clay comes
 * out plastic. The pit's water is never a constituent of the clay.
 *
 * `Thing`, not `Good`: a temper pit is dug into the yard and goes nowhere.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { KneadRequest } from '@saxonberg/server/mud/lib/craft/KneadVessel';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { CompoundingMixin } from '@saxonberg/server/mud/lib/material/Compounding';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Clay from '@saxonberg/content-trade-quarrying/src/thing/Clay';

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(String(raw));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

const TemperPitBase = CompoundingMixin(ContainerMixin(BulkableMixin(ThermalMixin(Thing))));

export default class TemperPit extends TemperPitBase {
  static fieldMeta: FieldMeta = {
    // The Discipline a knead here credits — brickmaking at a brickfield.
    discipline: { persistent: true, authorable: true },
  };

  public discipline = 'brickmaking';

  /**
   * Clay in a pit is trodden, however much water stands in it: the pit's
   * water is a reservoir the tread draws from (see {@link temper}), never
   * a slip.
   */
  public override workVerb(): 'knead' | 'stir' {
    return 'knead';
  }

  /** Does the pit hold water to temper with? */
  private waterLitres(): number {
    const held = this.getBulkMaterial('interior');
    if (held === null || !held.hasTag('water')) return 0;
    return this.getBulkAmount('interior').rawValue();
  }

  public override async kneadPlanFor(req: KneadRequest): Promise<ActPlan | ActRefusal> {
    const self = this as unknown as Stuff;
    // ⭐ Load on use: the pit's water froze IN the pit, and a thaw since is
    // brought current by the read that needs it — the ice goes back to
    // water before anything is weighed.
    for (const c of this.getContents()) {
      if (MixinApi.isThermal(c)) c.reconcilePhase();
    }
    const pieces = this.getContents().filter((c) => MixinApi.isTangible(c)) as Stuff[];
    const ice = pieces.find((p) => MixinApi.isTangible(p) && p.getMaterial()?.hasTag('frozen') === true);
    if (ice !== undefined) {
      return {
        ok: false,
        reason: 'frozen',
        line: Mml.compose`${Mml.thing(self)} is frozen: ${Mml.thing(ice)} is set in it. Nothing treads until it thaws.`,
      };
    }
    if (pieces.length === 0) {
      return {
        ok: false,
        reason: 'empty',
        line: Mml.compose`${Mml.thing(self)} has no clay in it. Put the clay and whatever you mean to temper it with in first.`,
      };
    }
    // ⭐ Only what treading can work in: plastic clay — green ware included,
    // ruined or not, which is how a slumped or burst piece is RECLAIMED
    // (B99) — and loose granular openers (sand, grog, breeze). A fired pot,
    // a stone or a tool cannot be trodden into clay; a fired piece broken to
    // sherds goes to the millstone and comes back as grog.
    const hard = pieces.find((p) => {
      const mat = MixinApi.isTangible(p) ? p.getMaterial() : null;
      return mat === null || !(mat.hasTag('plastic') || mat.hasTag('granular'));
    });
    if (hard !== undefined) {
      return {
        ok: false,
        reason: 'not-treadable',
        line: Mml.compose`${Mml.thing(hard)} will not tread into clay. Take it out — what is fired must be broken and ground to grog first.`,
      };
    }
    // Clay is trodden, never stirred (B101).
    const wrong = this.workRefusal(req.verb);
    if (wrong !== null) return wrong;
    if (!(this.waterLitres() > 0)) {
      return {
        ok: false,
        reason: 'no-water',
        line: Mml.compose`The clay in ${Mml.thing(self)} is dry. It wants water before it will come to the window.`,
      };
    }
    const giver = req.actor;
    const minutes = dial('ceramics.temper.minutes', 20);
    return {
      ok: true,
      durationMs: minutes * 60_000,
      // ⚠ Hard, but a rested body can do it: the whole act is charged up
      // front, and 450 W for twenty minutes was ~120 % of a full reserve
      // (the ceramics drive). 360 W costs about half of it.
      effortW: 360,
      beginSelf: Mml.compose`You wet the clay in ${Mml.thing(self)} and get in, treading it and turning it over with the spade.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} treads the clay in ${Mml.thing(self)}.`,
      onComplete: () => {
        void this.temper(giver);
      },
    };
  }

  /**
   * Compounding, with the water held back: lift the pit's water out of the
   * fold, combine the solids by mass, carry the heap's weathering into the
   * tempered clay, wet it to the window, and put back what the tread did not
   * take up.
   */
  private async temper(giver: Stuff): Promise<void> {
    const waterMat = this.getBulkMaterial('interior');
    const waterL = this.waterLitres();
    const payload = this.getBulkPayload('interior');
    let weathered = 0;
    let weighed = 0;
    for (const c of this.getContents()) {
      const piece = c as unknown as Stuff;
      if (!MixinApi.isTangible(piece)) continue;
      const kg = piece.getMass().rawValue();
      if (piece instanceof Clay) {
        weathered += piece.getWeatheredDays() * kg;
        weighed += kg;
      }
    }
    this.setBulkAmount('interior', Quantity.of(0, 'L'));
    this.setBulkMaterial('interior', null);
    let out: Awaited<ReturnType<TemperPit['compound']>> | null = null;
    try {
      out = await this.compound(giver, 'knead');
    } finally {
      // ⚠ The water goes back whatever happened to the compounding.
      const usedL =
        out !== null && out.ok
          ? Math.min(waterL, out.massKg * dial('ceramics.temper.waterLPerKg', 0.05))
          : 0;
      if (waterMat !== null && waterL - usedL > 0) {
        this.setBulkMaterial('interior', waterMat);
        this.setBulkAmount('interior', Quantity.of(waterL - usedL, 'L'));
        if (payload !== null) this.setBulkPayload('interior', payload);
      }
    }
    if (!out.ok || out.product === null) return;
    const clay = out.product;
    if (clay instanceof Clay) {
      if (weighed > 0) clay.setWeatheredDays(weathered / weighed);
      // ⭐ At the window: plastic, as wet as clay is.
      clay.setWaterState({ moisture: 1, solute: 0 });
    }
    if (!giver.isDestroyed() && MixinApi.isAdvancing(giver) && this.discipline !== '') {
      await giver.creditDeed({ discipline: this.discipline, difficulty: 'standard', outcome: 'success' });
    }
  }
}
