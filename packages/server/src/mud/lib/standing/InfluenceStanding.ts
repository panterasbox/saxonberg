/**
 * InfluenceStanding — the cross-stock output shape of the influence
 * substrate: a subject's measured standing in one stock, carrying the
 * `stock` identity tag and its qualitative `band`.
 *
 * This is the **shared three-stock contract** made concrete. Every stock
 * (consumer / patron / producer) emits this same shape, read uniformly by
 * the future chamber-weighting; only the `stock` tag and the faucet that
 * produced `scalar` differ. The contract lives here at the standing/band
 * layer — never at the formula layer (patron is `concave($)`, not
 * `engagement × quality`, so a shared formula would not fit). Homed in
 * `lib/standing/` (the consumer-influence measurement substrate)
 * rather than a single-module `lib/influence/`.
 *
 * Immutable value object. `scalar` is the raw influence magnitude (host-
 * internal / reserved for the eventual ballot); `band` is the player-facing
 * representation (register D6).
 */

import { Band } from './Band';

/**
 * The three influence stocks. Only `consumer` is implemented in this build;
 * `patron` and `producer` are reserved values (their faucets are the Twitch
 * and CMS/AOP builds), returned as a defined zero standing, never a throw.
 */
export type Stock = 'consumer' | 'patron' | 'producer';

export class InfluenceStanding {
  constructor(
    public readonly subject: string,
    public readonly stock: Stock,
    public readonly scalar: number,
    public readonly band: Band
  ) {}

  /** A neutral, zero standing tagged with `stock` — the reserved-stock value. */
  static zero(subject: string, stock: Stock): InfluenceStanding {
    return new InfluenceStanding(subject, stock, 0, Band.fromScalar(0));
  }
}
