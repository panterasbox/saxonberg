/**
 * RoomHeatExchange — ⭐⭐ **what an occupant does to the air of the room it
 * stands in**, as one shape with two implementers (storage-and-ice D5).
 *
 * A hearth pushes a fixed power in (`fixedW`); a stack of melting ice pulls
 * heat out through its packing toward its own melting point — a
 * conductance (`conductanceWperK`) to an anchor temperature (`anchorK`).
 * The envelope folds both into ONE closed-form steady state
 * (`AtmosphericMixin.envelopeSteadyStateK`):
 *
 * ```
 * T_ss = (U·T_out + ΣfixedW + driveW + ΣG·anchor) / (U + ΣG)
 * τ    = C / (U + ΣG)
 * ```
 *
 * which is the coupled solve of a cold mass behind its insulation, exact
 * for piecewise-constant inputs and with no iteration.
 *
 * Read BY SHAPE: an occupant exchanges heat iff it answers
 * `roomHeatExchange()`. `SpaceHeatingMixin` answers `{fixedW: its output,
 * conductance 0}`; `StoreMixin` answers `{fixedW 0, conductance through its
 * packing to 273.15 K}` while any line is at its plateau.
 */

/** One occupant's contribution to its room's heat budget. */
export interface RoomHeatExchange {
  /** Power pushed into the room regardless of its temperature, W (≥ 0 for a fire). */
  fixedW: number;
  /** Conductance from the room's air to `anchorK`, W/K (≥ 0). */
  conductanceWperK: number;
  /** The temperature the conductance pulls toward, K (ignored when conductance is 0). */
  anchorK: number;
}

/** An occupant that exchanges heat with the room it stands in. */
export interface RoomHeatExchanging {
  roomHeatExchange(): RoomHeatExchange;
}
