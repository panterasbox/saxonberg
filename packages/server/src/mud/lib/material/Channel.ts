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
 * `crush` (structural / destructibility), `heat`/`cold` (thermal), and
 * `corrosion` (environmental) each join when their consumer lands, each
 * defaulting sensibly in the response tables. Until then harm's `thermal`
 * and `tearing` insults take a magnitude-only passthrough (see
 * `docs/subsystems/materials-response.md`), NOT a channel.
 *
 * The `Grade` / `ToolCapability` / `WeatherType` value-object precedent:
 * a closed vocabulary tuple + type + a thin static holder. No behavior
 * here — behavior lives on `MaterialApi` (the response function) and on
 * `Construction` (the per-domain profile tables).
 */

/** The known mechanism channels. v1 is edge / point / blunt. */
export const CHANNELS = ['edge', 'point', 'blunt'] as const;

/** A mechanism channel — one of {@link CHANNELS}. */
export type Channel = (typeof CHANNELS)[number];

/**
 * The channel vocabulary holder — a thin static surface (the concept this
 * module owns) rather than a free-floating predicate function (the
 * `ToolCapabilities` shape).
 */
export class Channels {
  /** The full vocabulary. */
  public static readonly ALL: readonly Channel[] = CHANNELS;

  /** Narrowing predicate for a string against the vocabulary. */
  public static isChannel(s: string): s is Channel {
    return (CHANNELS as readonly string[]).includes(s);
  }
}
