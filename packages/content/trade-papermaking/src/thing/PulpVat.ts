/**
 * PulpVat — the vat the vatman works at (paper W2): pulp hanging in water,
 * kept stirred, and a mould dipped in it lifts a sheet.
 *
 * ⭐ The BATH affords `dip` (the platform's verb): `dip mould in vat` lays a
 * wet sheet on the mould's wire. Its COLOR is the vat's water: the vat
 * reads the river it stands on, and a persistent load in it — iron off the
 * mine at the headwaters — makes brown paper. Authored nowhere: a second
 * mill on cleaner water makes white. Its EVENNESS is the vatman's hand —
 * their papermaking band at the dip.
 */

import CompoundingVessel from '@saxonberg/server/mud/platform/thing/CompoundingVessel';
import { DipBathMixin, type DipRequest } from '@saxonberg/server/mud/lib/craft/DipBath';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Placing } from '@saxonberg/server/mud/lib/spatial/Placing';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Sheet from '@saxonberg/server/mud/platform/thing/Sheet';
import WatercourseCatalogue, { WATERCOURSE_CATALOGUE_PATH } from '@saxonberg/content-water/src/idea/WatercourseCatalogue';
import PaperMould from './PaperMould';
import Stamper from './Stamper';

/** Litres of stuff a sheet takes off the vat. */
const SHEET_LITRES = 1;
/** A persistent load above this in the vat's water makes brown paper. */
const BROWN_AT = 0.05;
/** The hand's evenness, by band. */
const EVENNESS: Readonly<Record<CompetenceBandName, string>> = {
  untrained: 'cloudy and uneven, thick at one edge',
  novice: 'a little cloudy against the light',
  competent: 'even enough',
  proficient: 'close and even',
  expert: 'as even as a sheet can be lifted, with a fine laid look',
};

export default class PulpVat extends DipBathMixin(CompoundingVessel) {
  static fieldMeta: FieldMeta = {
    reachRef: { persistent: true, authorable: true },
    stamper: { persistent: true, authorable: true, ref: 'identity:relation' },
    sheetTemplate: { persistent: true, authorable: true, authorPicker: 'Template' },
  };

  /** ⭐ The water the vat is filled from — a reach on the river. */
  public reachRef = '';
  /** The stamper that beats into this vat. */
  public stamper = '';
  /** The row a lifted sheet is (a waterleaf sheet). */
  public sheetTemplate = '';

  /** Pulp from the stamper. */
  public addPulp(litres: number): void {
    const self = this as unknown as Stuff;
    if (!MixinApi.isBulkable(self) || !(litres > 0)) return;
    const have = self.getBulkAmount('interior').rawValue();
    const cap = self.getBulkCapacity('interior')?.rawValue() ?? Infinity;
    self.setBulkAmount('interior', Quantity.of(Math.min(cap, have + litres), 'L'));
  }

  /** ⭐ The color the vat's water gives a sheet. */
  public async waterColor(): Promise<'white' | 'brown'> {
    if (this.reachRef === '') return 'white';
    const catalogue = await StuffApi.singleton<Stuff>(WATERCOURSE_CATALOGUE_PATH).catch(() => null);
    if (!(catalogue instanceof WatercourseCatalogue)) return 'white';
    const reading = await catalogue.contaminationAt(this.reachRef, WorldClockApi.getNow().rawValue()).catch(() => null);
    return (reading?.byKind.persistent ?? 0) > BROWN_AT ? 'brown' : 'white';
  }

  private async settleStamper(): Promise<void> {
    if (this.stamper === '') return;
    const s = StuffApi.findByTemplatePath<Stuff>(this.stamper);
    if (s instanceof Stamper) await s.beatInto(this as unknown as Stuff & PulpVat);
  }

  public override async dipPlanFor(req: DipRequest): Promise<ActPlan | ActRefusal | null> {
    const self = this as unknown as Stuff;
    const mould = req.target;
    if (mould === null) return null;
    if (!(mould instanceof PaperMould)) {
      return { ok: false, reason: 'not-a-mould', line: Mml.compose`You lift sheets out of ${Mml.thing(self)} on a paper mould, not ${Mml.thing(mould)}.` };
    }
    if (mould.sheetOnWire() !== null) {
      return { ok: false, reason: 'mould-full', line: Mml.compose`There is a wet sheet on ${Mml.thing(mould)} already — couch it first.` };
    }
    await this.settleStamper();
    if (!MixinApi.isBulkable(self) || self.getBulkAmount('interior').rawValue() + 1e-9 < SHEET_LITRES) {
      return { ok: false, reason: 'no-pulp', line: Mml.compose`There is not enough stuff in ${Mml.thing(self)} to lift a sheet. The stamper makes it.` };
    }
    const actor = req.actor;
    const band: CompetenceBandName = MixinApi.isAdvancing(actor) ? await actor.competenceBandFor('papermaking') : 'untrained';
    const color = await this.waterColor();
    return {
      ok: true,
      durationMs: 20_000,
      effortW: 90,
      beginSelf: Mml.compose`You dip ${Mml.thing(mould)} into ${Mml.thing(self)} and lift it level, shaking the wire so the fibres lie every way at once.`,
      beginPeers: Mml.compose`${Mml.actor(actor)} dips a mould into ${Mml.thing(self)} and lifts it, streaming.`,
      onComplete: async () => {
        if (!MixinApi.isBulkable(self)) return undefined;
        const have = self.getBulkAmount('interior').rawValue();
        if (have + 1e-9 < SHEET_LITRES) return { ok: false, reason: 'no-pulp', line: Mml.compose`The vat ran short before the sheet formed.` };
        self.setBulkAmount('interior', Quantity.of(have - SHEET_LITRES, 'L'));
        const sheet = await StuffApi.clone<Stuff>(this.sheetTemplate || '/platform/thing/sheet');
        if (!(sheet instanceof Sheet)) return undefined;
        sheet.formAt(color, EVENNESS[band] ?? EVENNESS.untrained);
        ContainmentApi.move(sheet, mould as unknown as Stuff & Placing, 'on');
        return undefined;
      },
    };
  }
}
