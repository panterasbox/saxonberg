/**
 * ControlStructure — **the axis is CONTROLLED, not man-made**.
 *
 * A dam, a headgate, a weir and a sluice are one thing: a structure on
 * a reach with a **setting** that decides how much water passes. That
 * is what actually distinguishes a canal from a creek and a reservoir
 * from a lake — not who dug it.
 *
 * ⭐ **This is the most consequential object in the subsystem**, for
 * two reasons the requirements name:
 *
 *  - it converts flow **variability** into flow **reliability**, which
 *    is the most consequential fact about water infrastructure in
 *    history;
 *  - it makes the watershed **political**, because whoever holds the
 *    dam holds everyone below.
 *
 * It also makes hydro dispatchable, which is the difference between a
 * generator and a power station.
 *
 * ## Two axes of control, one field
 *
 * `passFraction` redistributes flow in **time** — hold the freshet back
 * in May, let it down in August. `divertsTo` redistributes it in
 * **space** — send what is held into a canal instead. A structure can
 * do either or both, and a canal is simply *a watercourse with a
 * control at its head*.
 *
 * What origin changes is **legal, not physical**: a natural course is a
 * commons allocated by law; a built work is sunk capital allocated by
 * its builder; and where the users collectively own the works, that is
 * an irrigation district. None of those is a different object.
 *
 * See [docs/subsystems/watershed.md].
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/**
 * What shape of control it is.
 *
 * ⚠ Presentation and authoring convenience only — **no behaviour reads
 * this**. A dam holds water back because its `passFraction` is low and
 * its `headM` is high, not because somebody typed `dam`.
 */
export type ControlKind = 'dam' | 'headgate' | 'weir' | 'sluice';

/** What a control did to the water arriving at it. */
export interface ControlSplit {
  /** Cubic metres per second continuing down the same course. */
  passedM3S: number;
  /** Cubic metres per second sent to {@link ControlStructure.divertsTo}. */
  divertedM3S: number;
  /** Watts generated on the way through, or 0 without a head. */
  generatedW: number;
}

const ControlStructureBase = DetailedMixin(Thing);

export default class ControlStructure extends ControlStructureBase {
  static fieldMeta: FieldMeta = {
    controlKind: { persistent: true, authorable: true },
    reachRef: { persistent: true, authorable: true },
    passFraction: { persistent: true, authorable: true },
    divertsTo: { persistent: true, authorable: true },
    headM: { persistent: true, authorable: true },
    generates: { persistent: true, authorable: true },
    ownerRef: { persistent: true, authorable: true },
  };

  /** Presentation only — see {@link ControlKind}. */
  public controlKind: ControlKind = 'weir';

  /** The reach it sits on. */
  public reachRef = '';

  /**
   * The fraction of arriving flow that continues down the same course,
   * `0..1`. Everything else is held or diverted.
   *
   * **1 is a weir** — it measures and does not decide. **0 is a closed
   * gate.** The default is 1, because a structure nobody has set should
   * change nothing.
   */
  public passFraction = 1;

  /**
   * The reach the withheld share is sent to — a canal's head — or `''`
   * for a structure that holds water rather than moving it.
   *
   * ⭐ This one field is the difference between redistributing flow in
   * **space** and redistributing it in **time**.
   */
  public divertsTo = '';

  /**
   * Metres of fall the structure commands, for generation.
   *
   * ⚠ **Fixed per structure, at construction** (plan § P0). A dam's
   * head is a fact about the dam, not a live elevation lookup, so the
   * runtime read is one multiply.
   */
  public headM = 0;

  /** Whether a turbine is fitted. A dam without one is still a dam. */
  public generates = false;

  /** Who holds it — group / business / office ref. Opaque here. */
  public ownerRef = '';

  public getControlKind(): ControlKind {
    return this.controlKind;
  }
  public setControlKind(value: ControlKind): void {
    this.controlKind =
      value === 'dam' || value === 'headgate' || value === 'sluice'
        ? value
        : 'weir';
  }

  public getReachRef(): string {
    return this.reachRef;
  }
  public setReachRef(value: string): void {
    this.reachRef = value;
  }

  public getPassFraction(): number {
    return this.passFraction;
  }
  public setPassFraction(value: number): void {
    this.passFraction = !Number.isFinite(value)
      ? 1
      : Math.min(1, Math.max(0, value));
  }

  public getDivertsTo(): string {
    return this.divertsTo;
  }
  public setDivertsTo(value: string): void {
    this.divertsTo = value;
  }

  public getHeadM(): number {
    return this.headM;
  }
  public setHeadM(value: number): void {
    this.headM = Number.isFinite(value) && value > 0 ? value : 0;
  }

  public isGenerating(): boolean {
    return this.generates;
  }
  public setGenerates(value: boolean): void {
    this.generates = value === true;
  }

  public getOwnerRef(): string {
    return this.ownerRef;
  }
  public setOwnerRef(value: string): void {
    this.ownerRef = value;
  }

  /**
   * Split the flow arriving at this structure.
   *
   * The withheld share goes to {@link divertsTo} when there is one
   * (space) and is simply held back when there is not (time). Both are
   * the same arithmetic; what differs is where the water ends up, which
   * is the whole of the distinction.
   */
  public split(arrivingM3S: number): ControlSplit {
    const arriving = Math.max(0, arrivingM3S);
    const passed = arriving * this.passFraction;
    const withheld = arriving - passed;
    return {
      passedM3S: passed,
      divertedM3S: this.divertsTo === '' ? 0 : withheld,
      generatedW: this.generationW(arriving),
    };
  }

  /**
   * What this control takes out of its reach — the withheld share.
   *
   * ⭐ **This is how a headgate becomes a diversion somebody downstream
   * feels.** Held water and diverted water are the same withdrawal as
   * far as everyone below is concerned; where it went is the
   * structure's business and their loss either way.
   */
  public withdrawalM3S(naturalM3S: number): number {
    const arriving = Math.max(0, naturalM3S);
    return arriving * (1 - this.passFraction);
  }

  /**
   * ⭐ `ρ·g·Δh·Q·η` — **hydro output, and it rises and falls with flow**.
   *
   * The third appearance of one equation, and the direction that pays:
   * a pump reads it as a bill, a tower reads it as a deferred bill, and
   * a turbine reads it as income. Water falling makes power; water
   * rising costs it.
   *
   * Generation is on the **arriving** flow rather than the passed
   * share, because the water goes through the machine whether it
   * continues downstream or into a canal — and because a dam that
   * generated less when it diverted more would make the two axes of
   * control interfere for no physical reason.
   */
  public generationW(flowM3S: number): number {
    if (!this.generates || this.headM <= 0 || flowM3S <= 0) return 0;
    const rho = BiomeApi.densityOf('water').rawValue();
    const g = BiomeApi.getRootBiome().getDefaultGravity()?.rawValue() ?? 9.81;
    const eta = Math.min(
      1,
      Math.max(0.05, dial(AppSettingKeys.waterTurbineEfficiency, 0.85)),
    );
    return rho * g * this.headM * flowM3S * eta;
  }
}

/** Numeric AppSetting read with a seeded-literal fallback. */
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
