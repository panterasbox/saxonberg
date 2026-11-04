/**
 * Stamper — the papermill's beating engine (paper W2, D26): heavy wooden
 * stocks lifted by cams on a shaft the race turns, falling on rags in a
 * trough until the cloth is fibre again.
 *
 * ⭐ A machine you ENGAGE, not a thing you beat by hand: `put rags in
 * stamper`, `switch on stamper`, and the rags go to pulp in the vat it feeds
 * over game-hours, at a rate the RACE sets — `ρ·g·Δh·Q·η` from the race it
 * names (`powerFrom`), the grist mill's reading. A dry spell shorts the race
 * and the beat slows; nobody authored that.
 *
 * Only CLEAN rags beat: a paint rag's oil would foul the stuff (the mill
 * does not buy them either). Reconciled when read — the vat settles its
 * stamper before every dip — never on a tick.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { SwitchableMixin } from '@saxonberg/server/mud/lib/boundary/Switchable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import Rag from '@saxonberg/server/mud/platform/thing/Rag';
import ControlStructure from '@saxonberg/content-water/src/thing/ControlStructure';
import WatercourseCatalogue, { WATERCOURSE_CATALOGUE_PATH } from '@saxonberg/content-water/src/idea/WatercourseCatalogue';
import type PulpVat from './PulpVat';

/** Kilograms of rag a kilowatt-hour on the shaft beats to pulp. */
const KG_PER_KWH = 0.3;
/** Litres of pulp (fibre hanging in water) a kilogram of rag makes. */
const LITRES_PER_KG = 30;

const SWITCH = ['platform/cmd/device/switch.yaml'];

export default class Stamper extends SwitchableMixin(ContainerMixin(Good)) {
  static fieldMeta: FieldMeta = {
    powerFrom: { persistent: true, authorable: true, ref: 'identity:relation' },
    beatSinceS: { persistent: true, runtimeState: true },
    stoppedAtS: { persistent: true, runtimeState: true },
  };

  /** `switch on stamper` — the machine affords its own switch. */
  static commandContributions: CommandContributions = {
    self: [],
    peers: SWITCH,
    environment: SWITCH,
  };

  /** ⭐ The race that drives the shaft, by path — a works on the river. */
  public powerFrom = '';
  /** Game-seconds the beat was last banked to. */
  public beatSinceS = 0;
  /** When it was switched off; 0 = running (or never run). */
  public stoppedAtS = 0;

  private nowS(): number {
    return WorldClockApi.getNow().rawValue();
  }

  public override switchOn(): void {
    if (!this.isOn()) {
      this.beatSinceS = this.nowS();
      this.stoppedAtS = 0;
    }
    super.switchOn();
  }

  public override switchOff(): void {
    if (this.isOn()) this.stoppedAtS = this.nowS();
    super.switchOff();
  }

  /** Watts the race puts on the shaft now; 0 = nothing driving it. */
  public async powerW(): Promise<number> {
    if (this.powerFrom === '') return 0;
    const race = StuffApi.findByTemplatePath<Stuff>(this.powerFrom);
    if (!(race instanceof ControlStructure)) return 0;
    const catalogue = await StuffApi.singleton<Stuff>(WATERCOURSE_CATALOGUE_PATH).catch(() => null);
    if (!(catalogue instanceof WatercourseCatalogue)) return 0;
    const reading = await catalogue.flowAt(race.getReachRef(), this.nowS()).catch(() => null);
    return reading === null ? 0 : race.generationW(reading.m3s);
  }

  /** The clean rags in the trough. */
  public rags(): Rag[] {
    return this.getContents().filter((c): c is Rag => c instanceof Rag && c.oilCoats().length === 0);
  }

  /**
   * ⭐ Bank the beat since it was last read: clean rags out of the trough,
   * pulp into `vat`, as much as the race's power for the hours it ran
   * allows. Returns kilograms beaten.
   */
  public async beatInto(vat: Stuff & PulpVat): Promise<number> {
    const end = this.isOn() ? this.nowS() : this.stoppedAtS;
    if (!(end > this.beatSinceS)) return 0;
    const hours = (end - this.beatSinceS) / 3600;
    this.beatSinceS = end;
    const capacityKg = ((await this.powerW()) / 1000) * hours * KG_PER_KWH;
    let left = capacityKg;
    let beaten = 0;
    for (const rag of this.rags()) {
      if (left <= 0) break;
      const self = rag as unknown as Stuff;
      const unitKg = MixinApi.isTangible(self) ? self.getMass().rawValue() : 0.05;
      const n = Math.min(rag.getQuantity(), Math.floor((left + 1e-9) / unitKg));
      if (n < 1) break;
      if (n >= rag.getQuantity()) StuffApi.destruct(self);
      else rag.setQuantity(rag.getQuantity() - n);
      left -= n * unitKg;
      beaten += n * unitKg;
    }
    if (beaten > 0) vat.addPulp(beaten * LITRES_PER_KG);
    return beaten;
  }

  /** What `look` says of the machine. */
  public override getLongDescription(): string {
    const base = super.getLongDescription();
    const kg = this.rags().reduce((n, r) => n + r.getQuantity() * 0.05, 0);
    const state = this.isOn() ? 'The stocks are rising and falling, thudding into the trough.' : 'The stocks stand idle.';
    const trough = kg > 0 ? ` There are rags in the trough, about ${kg.toFixed(1)} kg.` : ' The trough is empty.';
    return `${base.trimEnd()}\n${state}${trough}`;
  }
}
