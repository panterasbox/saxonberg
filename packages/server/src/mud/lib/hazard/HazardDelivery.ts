/**
 * HazardDelivery — the pure `Channel × energy × site → InflictSpec`
 * value-object (the `WeaponProfile` / `Construction` category).
 *
 * A hazard's *delivery* is the shape of the harm it inflicts when it
 * springs: what {@link Channel} it delivers (a spike's `point`, a scythe's
 * `edge`, an electrified floor's `shock`), how hard (`energy`), where it
 * lands (a site picked from `siteSelector` against the mover's anatomy —
 * the `GlassAlley` FOOT_SITES pattern generalized), and — for a dart or a
 * poisoned needle — an optional {@link ToxinTag} injected past digestion.
 *
 * {@link toInflictSpec} produces the exact discriminated `InflictSpec` the
 * gated `ConditionApi.inflict` consumes — an {@link EnergyInflictSpec} for a
 * mechanical channel (the covering stack mitigates armor **for free**) or a
 * {@link ShockInflictSpec} for `shock` (the current skips the covering fold;
 * the delivery's `energy` scalar is read as amperes). It returns `null`
 * when the mover has no matching anatomy (a non-biped over a foot-spike
 * takes no wound — the graceful `GlassAlley` no-op).
 *
 * **The `range` field is a reserved seam.** v1 delivers `'contact'` only —
 * the trap harms whoever physically meets it. `'ranged'` (a dart-thrower
 * that strikes across a room) is a future build; the field is here so the
 * shape is stable, but nothing reads a non-`'contact'` value yet.
 *
 * Pure + deterministic (no `Math.random`): given a mover's anatomy the
 * spec is fixed. The `Grade` / `Channel` value-object precedent — a data
 * carrier with one projection method, no Stuff, no state.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Channel } from '../material/Channel';
import type { ToxinTag } from '../metabolism/Metabolic';
import type { InflictSpec } from '../../api/condition';
import { MixinApi } from '../../api/mixin';
import { Quantity } from '../quantity';

/**
 * The delivery **range**.
 *
 * `'contact'` — the trap harms whoever physically meets it. `'ranged'` —
 * the hazard is delivered ACROSS a band gap: a thrown flask that breaks
 * on arrival, a dart-thrower that strikes from the far wall. The
 * distinction matters because a ranged delivery has already found its
 * victim by the time it resolves, so walking into where it landed is not
 * what springs it.
 *
 * The seam was reserved by the trap build for exactly this one.
 */
export const HAZARD_RANGES = ['contact', 'ranged'] as const;

/** One of {@link HAZARD_RANGES}. */
export type HazardRange = (typeof HAZARD_RANGES)[number];

/** Construction options for a {@link HazardDelivery}. */
export interface HazardDeliveryOptions {
  /** The mechanism channel delivered (edge / point / blunt / shock). */
  channel: Channel;
  /**
   * The incident magnitude — energy (J-ish scalar) for a mechanical
   * channel (attenuated inward through the covering stack), or the current
   * (A) for `shock` (the circuit was already resolved; skips the fold).
   */
  energy: number;
  /**
   * Ordered candidate `body.*` part keys — the first the mover actually
   * has is where the wound lands (a biped's foot over a floor-spike). An
   * empty match set = no wound (a non-matching anatomy).
   */
  siteSelector: string[];
  /**
   * An optional toxin dose injected on a spring (a poisoned dart). Rides
   * the metabolism toxin-burden seam past digestion — see
   * {@link HazardMixin.resolveTraversal}.
   */
  toxin?: ToxinTag;
  /** The delivery range — `'contact'` (met in place) or `'ranged'`
   * (delivered across a band gap). Defaults to `'contact'`. */
  range?: HazardRange;
}

export class HazardDelivery {
  /** The mechanism channel this hazard delivers. */
  public readonly channel: Channel;
  /** The incident magnitude (energy for mechanical, amperes for shock). */
  public readonly energy: number;
  /** Ordered candidate part keys — first-match wins. */
  public readonly siteSelector: readonly string[];
  /** An optional injected toxin dose (a poisoned dart). */
  public readonly toxin?: ToxinTag;
  /** The delivery range — v1 always `'contact'` (reserved seam). */
  public readonly range: HazardRange;

  constructor(opts: HazardDeliveryOptions) {
    this.channel = opts.channel;
    this.energy = opts.energy;
    this.siteSelector = [...opts.siteSelector];
    this.toxin = opts.toxin;
    // Reserved seam: only 'contact' is honored in v1.
    this.range = opts.range ?? 'contact';
  }

  /**
   * Is this delivered across a band gap rather than met in place?
   *
   * The one question the traversal path asks: a ranged delivery has
   * already found its victim when it resolved, so the puddle it left is
   * not a trap that springs on the next person through. (A LINGERING
   * residue that does harm the next person is a real thing and a real
   * feature — it just needs a lifetime model hazards do not have yet, and
   * it defers to the wave that builds one.)
   */
  isRanged(): boolean {
    return this.range === 'ranged';
  }

  /**
   * Resolve the anatomical site this delivery lands on: the first entry of
   * `siteSelector` the mover actually has (the `GlassAlley` first-match
   * scan). Returns `null` for a non-wound-able mover or one whose anatomy
   * matches no candidate — the graceful "no cut" no-op.
   */
  public resolveSite(mover: Stuff): string | null {
    if (!MixinApi.isVitals(mover)) return null;
    for (const key of this.siteSelector) {
      if (mover.getPart(key) != null) return key;
    }
    return null;
  }

  /**
   * Build the `InflictSpec` this delivery produces against `mover` — a
   * {@link ShockInflictSpec} for the `shock` channel (energy read as
   * amperes, the fold skipped), else an {@link EnergyInflictSpec} for a
   * mechanical channel (the covering stack mitigates armor for free).
   * `null` when no site resolves (no matching anatomy).
   */
  public toInflictSpec(mover: Stuff): InflictSpec | null {
    const site = this.resolveSite(mover);
    if (site === null) return null;
    const channel = this.channel;
    if (channel === 'shock') {
      return { mechanism: 'shock', site, current: Quantity.of(this.energy, 'A') };
    }
    // Mechanical channel — edge / point / blunt, all valid non-shock
    // insult kinds. The covering stack resolves severity + type.
    return { mechanism: channel, site, energy: this.energy };
  }

  /** True iff this delivery injects a toxin on a spring. */
  public hasToxin(): boolean {
    return this.toxin != null;
  }

  /** The injected toxin dose, or `undefined`. */
  public getToxin(): ToxinTag | undefined {
    return this.toxin;
  }

  /**
   * Normalize a raw authored value (a plain seed object, or an already-
   * constructed instance) into a {@link HazardDelivery}. The
   * `HazardMixin.setDelivery` hydration entry point.
   */
  public static from(value: HazardDelivery | HazardDeliveryOptions): HazardDelivery {
    return value instanceof HazardDelivery ? value : new HazardDelivery(value);
  }

  /** Plain-object projection for persistence capture (round-trips via {@link from}). */
  public toJSON(): HazardDeliveryOptions {
    return {
      channel: this.channel,
      energy: this.energy,
      siteSelector: [...this.siteSelector],
      ...(this.toxin ? { toxin: this.toxin } : {}),
      range: this.range,
    };
  }
}
