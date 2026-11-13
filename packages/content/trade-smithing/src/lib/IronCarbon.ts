/**
 * IronCarbon — ⭐⭐ **what the carbon dissolved in a piece of iron makes
 * of it**, and the one copy of those facts the metal chain reads.
 *
 * The whole ferrous ladder turns on one number. Carbon lowers iron's
 * melting point, linearly toward the eutectic; below about 0.2 % the
 * metal is wrought iron that bends, in the band it is steel that a quench
 * hardens, and past austenite's limit (about 2.1 %) it is cast iron that
 * shatters under a hammer and cracks in a tub. `smelt` decides the number,
 * `hammer` and `quench` answer to it, and a bloom beats out into whichever
 * bar its carbon says it is.
 *
 * ⚠ These were copied three times (Smelt, Hammer, Quench — and Bloom kept
 * a fourth copy of the steel floor), which is the survey's rule-10 tell: a
 * fact about the METAL living in each verb that reads it. It lives here, in
 * the smithing pack's `lib/`, because every reader can import it — the
 * smelting trade depends on smithing, never the other way round.
 *
 * A value object: construct one from a piece's carbon and whether its
 * material is tagged `brittle`, and ask it.
 */

/** What a quench does to a hot, un-worked piece — its carbon decides. */
export type QuenchResponse =
  /** No carbon to trap: the piece comes out as soft as it went in. */
  | 'unchanged'
  /** Steel: the carbon is caught where it stood, and the piece is hard. */
  | 'hardened'
  /** Cast iron: a thermal shock through brittle metal breaks it in two. */
  | 'cracked';

export default class IronCarbon {
  /** The carbon a piece's makeup is read for. */
  static readonly CARBON = '/stuff/idea/material/element/carbon';
  /** Pure iron's melting point, K — the top of the liquidus line. */
  static readonly T_FE = 1811;
  /** The eutectic floor, K — carbon cannot lower the melting point past it. */
  static readonly T_EUTECTIC = 1420;
  /** Saturation: what iron that actually melted takes up. The eutectic. */
  static readonly C_SAT = 0.043;
  /** The bottom of the steel band. Below it there is nothing to harden. */
  static readonly C_STEEL_FLOOR = 0.002;
  /**
   * Austenite's limit — solid iron cannot hold more carbon in solution.
   * Above it the metal is cast: brittle, and unforgeable by anybody.
   */
  static readonly C_AUSTENITE = 0.021;

  constructor(
    private readonly carbon: number,
    private readonly brittle: boolean = false,
  ) {}

  /** The carbon fraction this reads. */
  public getCarbon(): number {
    return this.carbon;
  }

  /**
   * ⭐ The melting point of iron carrying this carbon, K. The line runs
   * from pure iron at 0 % to the eutectic at saturation — the shape of the
   * real liquidus, and the reason a bloomery can make something it cannot
   * forge.
   */
  public meltingPointK(): number {
    const kPerUnit = (IronCarbon.T_FE - IronCarbon.T_EUTECTIC) / IronCarbon.C_SAT;
    return Math.max(IronCarbon.T_EUTECTIC, IronCarbon.T_FE - kPerUnit * this.carbon);
  }

  /** Whether iron at this carbon has melted at `heldK`. */
  public meltsAt(heldK: number): boolean {
    return heldK >= this.meltingPointK();
  }

  /**
   * Cast iron — by the tag on the material OR the number on the piece.
   * Both, because they answer different questions: the tag is what the
   * recipe gather reads, and the number is what a piece carburized past the
   * band carries before anybody gave it a new material row.
   */
  public isCast(): boolean {
    return this.brittle || this.carbon >= IronCarbon.C_AUSTENITE;
  }

  /** In the steel band: enough carbon to harden, not so much it is cast. */
  public isSteel(): boolean {
    return !this.isCast() && this.carbon >= IronCarbon.C_STEEL_FLOOR;
  }

  /** What a quench does to a hot, un-worked piece of this metal. */
  public quenchResponse(): QuenchResponse {
    if (this.isCast()) return 'cracked';
    return this.isSteel() ? 'hardened' : 'unchanged';
  }
}
