/**
 * IceReading — `measure ice` / `analyze ice`: how thick the ice is where
 * you stand, and what grade (storage-and-ice D19). The channel reads the
 * room's floor — the water pack's ice sheet — patch by patch (`measure ice
 * scraped`, `measure ice marked`).
 *
 * `measure` is the spud's: a hole chopped and the depth read, bracketed to
 * the reader's ice-harvesting, with the grade. `analyze` is the eye: in
 * words — open, would not bear you, solid enough to walk on — finer with
 * competence. The ice is the truth; the reading is what you can tell.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import IceSheet from '@saxonberg/content-water/src/thing/IceSheet';
import type { IceRecord } from '@saxonberg/content-water/src/idea/WatercourseCatalogue';

/**
 * What the sheet would bear, in words — the same rule of thumb the help
 * and the catalogue state (bearing ∝ h²: ~6 cm a person, 14 a horse of
 * ~490 kg, 20 a loaded cart).
 */
function bearsWords(kg: number): string {
  if (kg >= 1000) return 'a loaded cart';
  if (kg >= 490) return 'a horse';
  if (kg >= 80) return 'a person';
  return 'nothing heavier than a dog';
}

function gradeWords(ice: IceRecord): string {
  return ice.quality === 'snow-ice' ? 'white snow-ice' : 'clear black ice';
}

export default class IceReading extends Reading {
  /** The sheet underfoot and the patch named, or why not. */
  private sheetAndPatch(ctx: CommandContext, place: Stuff | null, param: string) {
    const floor = (place ? (MixinApi.isAdornable(place) ? place.getFloor() : null) : null);
    if (!(floor instanceof IceSheet)) {
      this.decline(ctx, Mml.compose`There is no ice here to read.`, 'no-ice');
      return null;
    }
    const patch = floor.patchByWord(param || 'field');
    if (patch === null) {
      this.decline(ctx, Mml.compose`There is no ${param} patch on the ice.`, 'no-patch');
      return null;
    }
    const ice = floor.iceOf(patch);
    if (ice === null) {
      this.decline(ctx, Mml.compose`The ice is hard to read yet.`, 'unread');
      return null;
    }
    return { sheet: floor, patch, ice };
  }

  protected override async measure(
    ctx: CommandContext,
    subject: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const place = subject ?? this.placeOf(this.actorOf(ctx));
    const read = this.sheetAndPatch(ctx, place, param);
    if (read === null) return;
    const { ice, patch } = read;
    const where = patch.kind === 'field' ? 'the field' : `the ${patch.kind} patch`;
    if (ice.thicknessM <= 0.005) {
      this.report(ctx, Mml.compose`You put the spud down through ${where} and hit nothing but water.`);
      return;
    }
    const seed = this.seedFor(this.actorOf(ctx), place, `${param}|${patch.id}`);
    const fig = this.bracketed(Quantity.of(ice.thicknessM * 100, 'cm'), band, seed);
    this.report(
      ctx,
      Mml.compose`You chop through ${where} and read the ice at ${fig} of ${gradeWords(ice)}${ice.rotting ? ', and rotten' : ''}.`,
    );
  }

  protected override async analyze(
    ctx: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _hand: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    const place = subject ?? this.placeOf(this.actorOf(ctx));
    const read = this.sheetAndPatch(ctx, place, param);
    if (read === null) return;
    const { ice } = read;
    if (ice.thicknessM <= 0.005) {
      this.report(ctx, Mml.compose`It is open water.`);
      return;
    }
    if (!CompetenceBand.atOrAbove(band, 'competent')) {
      this.report(ctx, Mml.compose`It is ice. Whether it would hold you, you cannot tell by looking.`);
      return;
    }
    const judgement = ice.rotting
      ? 'it is rotten — honeycombed and dark'
      : ice.bearsKg >= 80
        ? 'it looks solid enough to walk on'
        : 'it would not bear you';
    if (!CompetenceBand.atOrAbove(band, 'proficient')) {
      this.report(ctx, Mml.compose`It is ${gradeWords(ice)}; ${judgement}.`);
      return;
    }
    this.report(ctx, Mml.compose`It is ${gradeWords(ice)}; ${judgement} — it would bear ${bearsWords(ice.bearsKg)}.`);
  }
}
