/**
 * Sprinkler — ⭐⭐ **rain in a circle** (water supply, the review: sprinklers
 * are core to farming). A good you set down on a garden or a field, couple
 * to a tap with a hose (`tie hose to tap`, `tie hose to sprinkler`) and
 * `open` — by an amount, like a gate (`open sprinkler to a quarter`).
 *
 * ⭐ Everything it does derives:
 *  - **Flow and throw are the outlet's HEAD.** Water leaves a nozzle as
 *    through an orifice, `Q = Cd·A·√(2gh)`, and is thrown about as far as
 *    half its head, up to the rose's reach: twenty metres of main throws it
 *    eight metres round; a district tank's three dribbles it a metre and a
 *    half. A ditch has no head at all — a sprinkler on one needs a pump.
 *  - **It draws on the outlet's own supply**, at its rank's share in a
 *    shortage: a tank it runs from goes down.
 *  - **What lands is the weather's** — the same wind drift and noon heat an
 *    overhead inlet loses to (`Soil.landedOpenSeconds`).
 *  - **What it reaches is what the rain reaches** (`Irrigating`): the
 *    ground it stands on, over the circle it throws, and the beds beside it
 *    by the sky each catches — never a pot, which catches no rain. What the
 *    soil cannot take stands on it; whatever lies or stands in the spray
 *    gets wet.
 *
 * ⚠ On a tract divided into fields it waters the whole tract, its fields by
 * area: setting it on ONE field wants a field that can hold a thing (the
 * irrigation slate's follow-up). The hose's coupling is runtime, as a
 * line's end is — a restart leaves the hose lying where it was, to be
 * coupled again.
 */

import Good from '../../lib/stuff/Good';
import { SealableMixin } from '../../lib/spatial/Sealable';
import { ThrottleableMixin } from '../../lib/spatial/Throttleable';
import { IrrigatingMixin } from '../../lib/husbandry/Irrigating';
import { MixinApi } from '../../api/mixin';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { MarkupAugmenter } from '../../api/mml';
import type { CommandContributions } from '../../api/command';
import type WaterFixture from './WaterFixture';
import type WaterHose from './WaterHose';

/** The discharge coefficient of a small round nozzle. */
const NOZZLE_CD = 0.62;
/** Gravity, m/s². */
const G = 9.81;
/** What the soil keeps of what lands from overhead (the inlet's own share). */
const OVERHEAD_KEEP = 0.85;
/** How far a spray carries, per metre of head, before the rose's reach caps it. */
const THROW_PER_HEAD_M = 0.5;

/** ⭐ What a look tells: whether a hose is coupled, and whether it is running. */
function sprinklerAugmenter(text: string, host: Stuff): string {
  if (!(host instanceof Sprinkler)) return text;
  const outlet = host.feed();
  const line =
    outlet === null
      ? 'No hose is coupled to it.'
      : host.getOpening() <= 0
        ? `A hose runs to it from ${outlet.getPresentation()}; its valve is shut.`
        : `A hose runs to it from ${outlet.getPresentation()}, and it is throwing water round.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

const SprinklerBase = IrrigatingMixin(ThrottleableMixin(SealableMixin(Good)));

export default class Sprinkler extends SprinklerBase {
  static markupAugmenters: MarkupAugmenter[] = [sprinklerAugmenter];

  /** ⭐ It is opened and shut where it stands, by an amount (`open sprinkler to a quarter`). */
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/boundary/open.yaml', 'platform/cmd/boundary/close.yaml'],
  };

  static fieldMeta: FieldMeta = {
    nozzleMm: { persistent: true, authorable: true },
    maxThrowM: { persistent: true, authorable: true },
    irrigationStamp: { persistent: true, runtimeState: true },
  };

  /** The nozzle's bore, mm — what decides the flow at a head. */
  public nozzleMm = 6;
  /** The furthest the rose throws, m, however hard it is driven. */
  public maxThrowM = 8;
  /** When its water was last let fall, game s; `null` = never. */
  public irrigationStamp: number | null = null;

  /** The hose coupled to it — runtime, as a line's end is. */
  private _hose: WaterHose | null = null;
  /** True while a settle runs: two grounds asking at once count it once. */
  private _settling = false;

  public getHose(): WaterHose | null {
    if (this._hose !== null && (this._hose as unknown as Stuff).isDestroyed()) this._hose = null;
    return this._hose;
  }

  /** The hose's own act: it couples to this sprinkler, or lets go of it. */
  public setHose(hose: WaterHose | null): void {
    this._hose = hose;
  }

  /** The outlet its hose is coupled to, or `null`. */
  public feed(): WaterFixture | null {
    return this.getHose()?.getOutlet() ?? null;
  }

  /** Litres a second it throws at `headM` of head, at a rank's `share`. */
  public flowLps(headM: number, share = 1): number {
    if (!(headM > 0)) return 0;
    const r = this.nozzleMm / 2000;
    return 1000 * NOZZLE_CD * Math.PI * r * r * Math.sqrt(2 * G * headM) * Math.max(0, Math.min(1, share));
  }

  /** How far round it throws at `headM`, m. */
  public throwM(headM: number): number {
    return Math.max(0, Math.min(this.maxThrowM, THROW_PER_HEAD_M * headM));
  }

  /** What it passes fully open, m³/s — its feed's pressure through its nozzle. */
  public override async passingCapM3S(_nowS: number): Promise<number | null> {
    const outlet = this.feed();
    if (outlet === null) return 0;
    await outlet.settleBulk('interior');
    const p = outlet.pressureNow();
    return p === null ? 0 : this.flowLps(p.headM, p.share) / 1000;
  }

  /**
   * ⭐ Let fall what ran since the last settle: the open seconds × the flow
   * its feed's head drives, drawn from the feed's supply, weighed by the
   * weather that let it land, and spread as rain over its circle.
   */
  public override async settleIrrigation(nowS: number): Promise<void> {
    if (this._settling) return;
    const from = this.irrigationStamp;
    if (from === null || !(nowS > from)) {
      if (from === null) this.irrigationStamp = nowS;
      return;
    }
    // Claim the window before anything awaits.
    this.irrigationStamp = nowS;
    this._settling = true;
    try {
      const patch = this.getContainer() as Stuff | null;
      const outlet = this.feed();
      if (patch === null || outlet === null) return;
      const openS = this.openingTrajectory(from, nowS).integrate((v) => v, 4);
      if (!(openS > 0)) return;
      await outlet.settleBulk('interior');
      const p = outlet.pressureNow();
      if (p === null) return;
      const thrownL = openS * this.flowLps(p.headM, p.share);
      const givenL = Math.min(thrownL, p.availableL);
      if (!(givenL > 0)) return;
      outlet.debitBulk('interior', givenL);
      const ground = MixinApi.isSoil(patch) ? patch : null;
      const landedS = ground !== null ? await ground.landedOpenSeconds(this, from, nowS) : openS;
      const landedL = givenL * Math.min(1, Math.max(0, landedS / openS));
      const salt = outlet.getBulkPayload('interior')?.salinityPpt;
      this.letFall(patch, landedL, this.throwM(p.headM), typeof salt === 'number' ? salt : 0);
    } finally {
      this._settling = false;
    }
  }

  /**
   * Rain in a circle of radius `throwM` over `patch`: the beds beside it
   * take their share by the sky each catches, the ground the rest; what the
   * soil cannot hold stands on it, and whatever is in the spray gets wet.
   */
  private letFall(patch: Stuff, litres: number, throwM: number, salinityPpt: number): void {
    if (!(litres > 0)) return;
    const self = this as unknown as Stuff;
    const throwArea = Math.PI * throwM * throwM;
    const ground = MixinApi.isSoil(patch) ? patch : null;
    const groundArea = ground !== null ? Math.max(0, ground.soilCatchmentAreaM2()) : 0;
    const covered = groundArea > 0 ? Math.min(throwArea, groundArea) : throwArea;
    if (!(covered > 0)) return;
    const depthMm = litres / covered; // a litre on a square metre is a millimetre
    const contents = MixinApi.isContainer(patch) ? (patch.getContents() as Stuff[]) : [];
    let left = litres;
    for (const s of contents) {
      if (s === self || !(left > 0) || !MixinApi.isSoil(s)) continue;
      const area = s.soilCatchmentAreaM2();
      if (!(area > 0)) continue; // a pot catches no rain, and no sprinkler
      const share = Math.min(left, depthMm * area);
      this.credit(s, share, salinityPpt);
      left -= share;
    }
    if (ground !== null && left > 0) {
      this.credit(ground, left * OVERHEAD_KEEP, salinityPpt);
    }
    // ⭐ Whatever lies or stands in the spray gets wet — a letter on the
    // lawn, a body standing in it.
    const wetting = Math.min(1, depthMm / 10);
    if (wetting > 0) {
      for (const s of contents) {
        if (s !== self && MixinApi.isWet(s)) s.wet(wetting);
      }
    }
  }

  /** Into a ground's soil, standing on it what it cannot take, with its salt. */
  private credit(soil: Stuff, litres: number, salinityPpt: number): void {
    if (!MixinApi.isSoil(soil) || !(litres > 0)) return;
    if (salinityPpt > 0) soil.addSoilSalt((litres * salinityPpt) / 1000);
    const took = soil.waterSoil(litres);
    if (litres - took > 0 && soil.soilAcceptsPonding()) soil.pond(litres - took);
  }
}
