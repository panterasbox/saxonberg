/**
 * The boundary vocabulary — the closed list of CHANNELS a way passes, and
 * the side tag of a boundary's two sides.
 *
 * ⭐ A `Boundary` is the one thing that stands in a way between two
 * places; each place's exit is a SIDE of it. What it lets through is a
 * table of numbers per channel, one table while it is open and one while
 * it is shut — DATA on the row, read by one method
 * (`Boundary.transmissivity`). This file used to hold five conduit
 * interfaces a boundary class implemented by hand (and two more files for
 * sound and smell); the table replaced them (boundary build, 2026-11).
 *
 * ⚠ **The vocabulary is CLOSED.** An unknown channel key on a row throws at
 * hydrate. `water` is deliberately absent: no walk reads a way's water
 * today, and the rule is *a channel exists where a reader exists* — the
 * first reader (an ice hole, a flooded hatch) adds it here.
 */

/** Side tag for a boundary's two sides — A is the side attached first. */
export type BoundarySide = 'A' | 'B';

/** What crosses a way. */
export type BoundaryChannel = 'movement' | 'light' | 'sight' | 'sound' | 'smell';

/** The closed list, for validation. */
export const BOUNDARY_CHANNELS: readonly BoundaryChannel[] = [
  'movement',
  'light',
  'sight',
  'sound',
  'smell',
];

/** One state's pass-through, 0..1 per channel; an absent channel keeps the kind's default. */
export type ChannelValues = Partial<Record<BoundaryChannel, number>>;

/** The two tables — while the boundary is open, and while it is shut. */
export interface ChannelTable {
  open: ChannelValues;
  shut: ChannelValues;
}

/**
 * The size of the hole a boundary fills, in metres. Inside a zone it must
 * fit the shared face of the two cells (`Location.addExit`); across zones
 * it is free.
 */
export interface BoundaryOpening {
  width: number;
  height: number;
}
