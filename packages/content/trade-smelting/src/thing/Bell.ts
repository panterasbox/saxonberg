/**
 * Bell — ⭐ a cast bell (ceramics S19): its NOTE follows from its size and
 * its alloy, and rung, it carries.
 *
 * The pitch is derived, never authored: `smelting.bell.pitchRefHz` for a
 * kilogram of bell bronze, falling as the cube root of the mass (a bell
 * eight times as heavy is an octave lower — the shape scales with size), and
 * moved by the metal: the square root of its stiffness over its weight,
 * read as hardness over density against bell bronze's. So a hand bell cast
 * in a flask rings high and bright, a great bell out of the foundry's pit
 * booms low, and the same shape in pewter is a dull thud.
 *
 * `ring` (the platform's, D8) tells it: the THING answers how it sounds
 * ({@link Bell.ringSound}) — a named note and how loud, which the acoustic
 * walk carries into the next places. A crack dulls it to a clank (M5).
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { RingableMixin } from '@saxonberg/server/mud/lib/perception/Ringable';
import { AudibleMixin } from '@saxonberg/server/mud/lib/perception/Audible';
import { AppApi } from '@saxonberg/server/mud/api/app';
import type { RingSound } from '@saxonberg/server/mud/lib/material/Integrity';

/** Bell bronze — the reference metal: hardness ÷ density, MPa per kg/m³. */
const BELL_BRONZE_STIFFNESS = 250 / 8800;
/** The note names, from C. */
const NOTES = ['C', 'C sharp', 'D', 'E flat', 'E', 'F', 'F sharp', 'G', 'A flat', 'A', 'B flat', 'B'];

function pitchRefHz(): number {
  try {
    const raw = AppApi.setting('smelting.bell.pitchRefHz');
    const n = raw == null || raw === '' ? NaN : Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 900;
  } catch {
    return 900;
  }
}

/**
 * ⭐ Ringable (review R2-D4): a bell is a SIGNAL — struck, it sounds from
 * itself through the audible system, and whoever listens for a bell (the
 * curfew, a ferryman) knows it rang.
 */
export default class Bell extends RingableMixin(AudibleMixin(CraftedMixin(ThermalMixin(Good)))) {
  /**
   * ⭐ The bell's fundamental, Hz — by its mass and its metal. `0` when it
   * is not a metal at all (a wooden bell is a clapper).
   */
  public pitchHz(): number {
    const mat = this.getMaterial();
    const kg = this.getMass().rawValue();
    if (mat === null || !mat.hasTag('metal') || !(kg > 0)) return 0;
    const density = mat.getDensity().rawValue();
    const hardness = mat.getHardness().rawValue();
    const stiffness = density > 0 && hardness > 0 ? hardness / density : BELL_BRONZE_STIFFNESS;
    return pitchRefHz() * Math.pow(kg, -1 / 3) * Math.sqrt(stiffness / BELL_BRONZE_STIFFNESS);
  }

  /** The named note nearest the pitch, with its octave: `a low D`, `a high E`. */
  public noteName(): string {
    const f = this.pitchHz();
    if (!(f > 0)) return 'no note at all';
    const n = Math.round(69 + 12 * Math.log2(f / 440));
    const name = NOTES[((n % 12) + 12) % 12]!;
    const octave = Math.floor(n / 12) - 1;
    const where =
      octave >= 6 ? 'a high' : octave >= 4 ? 'a clear' : octave >= 3 ? 'a deep' : 'a very deep';
    return `${where} ${name}`;
  }

  /**
   * @hook ⭐ How the bell sounds, rung: its note, and loud by its mass — a
   * hand bell across a room, a great bell over the streets. A flaw (a crack,
   * a casting fault) dulls it to a clank.
   */
  public override ringSound(): RingSound {
    const mat = this.getMaterial();
    if (mat === null || !mat.hasTag('metal')) return super.ringSound();
    const kg = Math.max(0.05, this.getMass().rawValue());
    // ⭐ A hand bell rings at ~80–90 dB a metre off, a church bell at 110–120:
    // 85 + 10·log₁₀(kg) gives ~82 dB for a half-kilo hand bell and ~106 dB
    // for the 120 kg curfew bell. At 60 + … the curfew bell died two places
    // short of the wharf (−20 dB a place, a 10 dB floor — the ceramics drive).
    const db = 85 + 10 * Math.log10(kg);
    if (this.getFlaws().length > 0) {
      return {
        description: `a dull, cracked clank where ${this.noteName()} should be`,
        character: 'clank',
        db: db - 10,
        rings: false,
      };
    }
    const hum = kg >= 50 ? ' that you feel in your chest, and that hums on long after' : ' that hangs in the air';
    return { description: `a bell rings ${this.noteName()}${hum}`, character: 'bell', db, rings: true };
  }
}
