/**
 * BrickClamp — ⭐⭐ **a clamp grades its bricks by where they sat**
 * (ceramics D15, S6).
 *
 * A clamp is green bricks stacked over fire channels of coal and breeze,
 * cased in old bricks and earth, lit, and left to burn for days. It is not
 * a kiln: there is no chamber at one heat. The bricks nearest the channels
 * get far more heat than the casing does, and the heat-work each one banks
 * decides what it comes out as — by the clay's own transitions, never a
 * table here:
 *
 *  - **by the fire channels** — over-burnt: vitrified, glassy at the
 *    edges, warped (clinker) — the paving brick;
 *  - **in the middle** — hard, well-burnt earthenware: the sound brick;
 *  - **in the casing** — soft, under-fired place brick, and softer still
 *    where the rain or the wind got at the skin.
 *
 * ⭐ A better SETTER narrows it: the setter's `brickmaking` band decides
 * how much of the charge ends up in the channels (`ceramics.clamp.
 * channelShare.<band>`), deterministically — fewer bad bricks, never fewer
 * failures by luck. A starved draught is a REDUCING one: the bricks come
 * out the clay's reducing twins (the blue brick).
 *
 * The positions are set when the firing starts (`onFireStart`): each stack
 * of bricks is split three ways and each part stamped with where it sits
 * (on the brick — it survives a restart mid-burn); the fire then answers
 * each body by its place (`heldTemperatureKFor`). A piece that is not a
 * stack (a pot in a pit firing) sits in the middle. It glows (it is a
 * `Firebox`) and its smoke carries its fuel's smell.
 */

import Firebox from '@saxonberg/server/mud/lib/fire/Firebox';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { SmellSourceMixin } from '@saxonberg/server/mud/lib/perception/SmellSource';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AppApi } from '@saxonberg/server/mud/api/app';
import Brick, { type ClampPosition } from './Brick';

/** Where a piece sat in the clamp. */
type Position = Exclude<ClampPosition, ''>;

/** A piece that remembers where it sat (a `Brick`). */
interface Positioned {
  getClampPosition(): ClampPosition;
  setClampPosition(value: ClampPosition): void;
}

/** The share of the charge a setter's band leaves by the fire channels. */
const CHANNEL_SHARE: Readonly<Record<string, number>> = {
  untrained: 0.35,
  novice: 0.3,
  competent: 0.22,
  proficient: 0.16,
  expert: 0.12,
};

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** A brick that can be set in a clamp — this pack's own class (no probe). */
function positioned(body: Stuff): (Stuff & Positioned) | null {
  return body instanceof Brick ? (body as unknown as Stuff & Positioned) : null;
}

/** A burning clamp's smoke, ppm at the clamp — it carries to the next places. */
const CLAMP_SMOKE_PPM = 400;

const BrickClampBase = SmellSourceMixin(ContainerMixin(Firebox));

export default class BrickClamp extends BrickClampBase {
  static fieldMeta: FieldMeta = {
    setBy: { persistent: true, runtimeState: true },
    skinWindMs: { persistent: true, runtimeState: true },
  };

  /** Who set the clamp (the firer of record), an identity path. */
  public setBy = '';
  /** The wind over the clamp when it was lit, m/s — it cools the skin. */
  public skinWindMs = 0;

  /**
   * ⭐ A burning clamp smells of what it burns, and the smoke carries to the
   * places around it (the requirement: *its smoke carries*). Derived from
   * the fire, never stored: a cold clamp smells of nothing (the ceramics
   * browser walk — `smell` beside a burning clamp found no smoke at all).
   */
  public override getEmittedConcentration(): Quantity<'ppm'> {
    return Quantity.of(this.isLit() ? CLAMP_SMOKE_PPM : 0, 'ppm');
  }

  /** `coal smoke`, `wood smoke` — named by the fuel in the bed. */
  public override getOdorIdentity(): string {
    if (!this.isLit()) return '';
    const fuel = this.fuelMaterials()[0]?.getName().toLowerCase() ?? '';
    return fuel ? `${fuel} smoke` : 'smoke';
  }

  /** Where a body sits in the clamp; `middle` for anything not set. */
  public positionOf(body: Stuff): Position {
    const p = positioned(body)?.getClampPosition() ?? '';
    return p === '' ? 'middle' : p;
  }

  /**
   * ⭐ Set the charge into its positions: split every stack three ways by
   * the setter's competence — a channel share, a fixed skin, the middle.
   */
  public override async onFireStart(by: Stuff | null): Promise<void> {
    const band =
      by !== null && MixinApi.isAdvancing(by) ? await by.competenceBandFor('brickmaking') : 'novice';
    const channelShare = dial(`ceramics.clamp.channelShare.${band}`, CHANNEL_SHARE[band] ?? 0.3);
    const skinShare = dial('ceramics.clamp.skinShare', 0.25);
    for (const c of [...this.getContents()]) {
      const piece = c as Stuff;
      const pos = positioned(piece);
      if (piece.isDestroyed() || pos === null) continue;
      // ⭐ Set ONCE: lighting starts the firing and `fire` continues it, and
      // a brick already set keeps its place (a second call would split the
      // middle again).
      if (pos.getClampPosition() !== '') continue;
      pos.setClampPosition('middle');
      if (!MixinApi.isStackable(piece) || piece.getQuantity() < 3) continue;
      const q = piece.getQuantity();
      const nChannel = Math.max(1, Math.round(q * channelShare));
      const nSkin = Math.max(1, Math.round(q * skinShare));
      if (nChannel + nSkin >= q) continue;
      const channel = await piece.split(nChannel);
      const skin = await piece.split(nSkin);
      positioned(channel)?.setClampPosition('channel');
      positioned(skin)?.setClampPosition('skin');
    }
    this.setBy = by?.getIdentityPath() ?? '';
    this.skinWindMs = await this.windOverMe();
  }

  /** The wind over the clamp now, m/s — `0` where the place reads none. */
  private async windOverMe(): Promise<number> {
    const room = this.getContainer() as Stuff | null;
    if (room === null || !MixinApi.isAtmospheric(room)) return 0;
    try {
      const ms = (await room.getWind()).rawValue();
      return Number.isFinite(ms) && ms > 0 ? ms : 0;
    } catch {
      // A place whose air resolves to nothing (no biome loaded) is still.
      return 0;
    }
  }

  /**
   * ⭐ The heat a brick gets is where it sat: by the channels hotter than
   * the burn, in the casing cooler — and cooler again for the rain the
   * skin has taken and the wind across it.
   */
  public override heldTemperatureKFor(body: Stuff): number {
    const held = this.getHeldTemperatureK();
    switch (this.positionOf(body)) {
      case 'channel':
        return held * dial('ceramics.clamp.channelFactor', 1.25);
      case 'skin': {
        const rain = MixinApi.isWet(this as unknown as Stuff) ? this.getWetness() : 0;
        const k =
          held * dial('ceramics.clamp.skinFactor', 0.9) -
          rain * dial('ceramics.clamp.rainK', 100) -
          this.skinWindMs * dial('ceramics.clamp.windKPerMs', 6);
        return Math.max(0, k);
      }
      default:
        return held;
    }
  }
}
