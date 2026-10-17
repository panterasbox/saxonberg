/**
 * RoomHeatExchange — ⭐ one term a room's envelope folds into its steady
 * state: a fixed power, and a conductance to an anchor temperature.
 *
 * `T_ss = (U·T_out + Σ fixedW + driveW + Σ G_j·anchor_j) / (U + Σ G_j)`,
 * `τ = C / (U + Σ G_j)` — the coupled solve in closed form, no iteration.
 *
 * ⚠⚠ DROP AT MERGE — owned by storage-and-ice (its D5/W2). This is a
 * byte-compatible copy of the owner's published shape, so the rubber
 * build's two term kinds — the sun through a transparent face (a
 * `fixedW`) and a neighbour of the same building through an interior
 * face (`conductanceWperK` to the neighbour's temperature) — ride the
 * protocol from the start. When rubber merges master over ice, this file
 * is deleted for ice's and rubber's terms fold into ice's
 * `envelopeSteadyStateK`.
 */
export interface RoomHeatExchange {
  /** A fixed power into the room, W (negative pulls heat out). */
  fixedW: number;
  /** A conductance to {@link anchorK}, W/K. */
  conductanceWperK: number;
  /** The temperature the conductance pulls toward, K. */
  anchorK: number;
}

/** An occupant that pushes heat into, or pulls it out of, its room. */
export interface RoomHeatExchanging {
  roomHeatExchange(): RoomHeatExchange;
}
