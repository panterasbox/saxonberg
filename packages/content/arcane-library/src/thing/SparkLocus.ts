/**
 * SparkSource — the spark spell's transient energized locus: a tiny
 * `EnergizedMixin(Thing)` the shock executor clones into the target's
 * scene, sets to the spell's authored potential, runs the REAL
 * conduction walk from (`ElectricityApi.conduct` — shared pools bridge,
 * ground sinks, the caster's own body is in the graph), and destructs.
 *
 * The locus exists for one resolution only — magic imposes a real
 * potential and real physics does the rest (the caster-obeys-own-physics
 * invariant falls out of the graph, never a special case).
 */

import Thing from '../../../lib/stuff/Thing';
import { EnergizedMixin } from '../../../lib/electricity/Energized';

const SparkSourceBase = EnergizedMixin(Thing);

export default class SparkSource extends SparkSourceBase {}
