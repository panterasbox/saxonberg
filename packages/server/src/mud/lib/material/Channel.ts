/**
 * Channel — the mechanism-channel vocabulary.
 *
 * A **channel** is the single shared interface a blow transacts over: a
 * weapon's *delivery*, an armor's *resistance*, and a tissue's *failure*
 * all speak the same closed vocabulary. v1 ships three physical channels —
 * **`edge`** (a cutting line), **`point`** (a concentrated tip), **`blunt`**
 * (a spread impact). The materials-response function reads a channel from
 * one side of a blow and resolves it into the other; nothing "damage-type"
 * about it — the channel is the *shape of the force*, not a noun bolted on.
 *
 * **Additively growable.** The set is closed but grows by adding columns:
 * `crush` (structural / destructibility), `cold` (thermal), and
 * `corrosion` (environmental) each join when their consumer lands, each
 * defaulting sensibly in the response tables. `tearing` still takes a
 * magnitude-only passthrough (see `docs/subsystems/materials-response.md`),
 * NOT a channel.
 *
 * **`shock` is the first non-mechanical channel; `heat` is the second.**
 * Each joins the vocabulary (a source *delivers* it, a body *fails* under
 * it, `Channels.isChannel` accepts it) but neither resolves by the mechanical
 * energy-attenuate fold: `shock` resolves by circuit (`I = V/R`, reading
 * conductivity), and `heat` resolves by **insulation** (a covering attenuates
 * heat by its material's `thermalConductivity` inverted + its layer depth —
 * leather/padding turns a burn, plate conducts it) into a tissue `burn`. So
 * the **mechanical** channels (edge/point/blunt) are their own closed subtype
 * {@link MECHANICAL_CHANNELS} — the `Construction` shape tables and the
 * hardness/toughness fold key on *that* — and the **thermal** channel(s) are
 * {@link THERMAL_CHANNELS}, resolving through their own insulation branch on
 * `MaterialApi`. The split keeps `Construction` honestly mechanical and lets
 * each non-mechanical channel live only where its own physics reads it. The
 * `heat` channel retired the old magnitude-only `'thermal'` passthrough.
 *
 * The `Grade` / `ToolCapability` / `WeatherType` value-object precedent:
 * a closed vocabulary tuple + type + a thin static holder. No behavior
 * here — behavior lives on `MaterialApi` (the response function) and on
 * `Construction` (the per-domain profile tables).
 */

/**
 * The known mechanism channels. v1 is edge / point / blunt (mechanical) +
 * shock (electrical). Adding a channel here makes it `isChannel`-visible;
 * whether it also folds through the mechanical response tables is the
 * separate {@link MECHANICAL_CHANNELS} question.
 */
export const CHANNELS = ['edge', 'point', 'blunt', 'shock', 'heat'] as const;

/** A mechanism channel — one of {@link CHANNELS}. */
export type Channel = (typeof CHANNELS)[number];

/**
 * The **mechanical** channels — the ones whose blow resolves through the
 * `response = f(mechanism, material, construction)` energy-attenuate fold
 * (hardness/toughness height, `Construction` shape tables). The proper
 * subset the materials-response engine keys on; `shock` is deliberately
 * absent (it resolves by circuit, not by fold).
 */
export const MECHANICAL_CHANNELS = ['edge', 'point', 'blunt'] as const;

/** A mechanical channel — one of {@link MECHANICAL_CHANNELS}. */
export type MechanicalChannel = (typeof MECHANICAL_CHANNELS)[number];

/**
 * The **thermal** channels — the ones whose blow resolves through the
 * heat-*insulation* branch on `MaterialApi` (a covering attenuates heat by
 * its material's `thermalConductivity` inverted + layer depth) into a tissue
 * `burn`, NOT the hardness/toughness mechanical fold. v1 is just `heat`;
 * `cold` joins here when its consumer lands. The gate the heat-resolution
 * code uses to prove a channel takes the insulation branch.
 */
export const THERMAL_CHANNELS = ['heat'] as const;

/** A thermal channel — one of {@link THERMAL_CHANNELS}. */
export type ThermalChannel = (typeof THERMAL_CHANNELS)[number];

/**
 * The channel vocabulary holder — a thin static surface (the concept this
 * module owns) rather than a free-floating predicate function (the
 * `ToolCapabilities` shape).
 */
export class Channels {
  /** The full vocabulary. */
  public static readonly ALL: readonly Channel[] = CHANNELS;

  /** The mechanical-only subset (the response-fold domain). */
  public static readonly MECHANICAL: readonly MechanicalChannel[] =
    MECHANICAL_CHANNELS;

  /** The thermal-only subset (the heat-insulation domain). */
  public static readonly THERMAL: readonly ThermalChannel[] = THERMAL_CHANNELS;

  /** Narrowing predicate for a string against the full vocabulary. */
  public static isChannel(s: string): s is Channel {
    return (CHANNELS as readonly string[]).includes(s);
  }

  /**
   * Narrowing predicate for a string against the mechanical subset — the
   * gate the response-fold code uses to prove a channel folds through the
   * `Construction` tables before indexing them.
   */
  public static isMechanicalChannel(s: string): s is MechanicalChannel {
    return (MECHANICAL_CHANNELS as readonly string[]).includes(s);
  }

  /**
   * Narrowing predicate for the thermal subset — the gate the heat-resolution
   * code uses to prove a channel takes the insulation branch (not the
   * mechanical fold, not the shock circuit) before resolving it.
   */
  public static isThermalChannel(s: string): s is ThermalChannel {
    return (THERMAL_CHANNELS as readonly string[]).includes(s);
  }
}
