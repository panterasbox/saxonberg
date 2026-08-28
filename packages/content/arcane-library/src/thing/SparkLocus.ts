/**
 * SparkLocus — the spark spell's transient energized locus, the LOCUS
 * its shock `inject-channel` row names: a tiny `EnergizedMixin(Thing)`
 * the shock executor clones into the target's scene, sets to the
 * spell's authored potential, runs the REAL conduction walk from
 * (`ElectricityApi.conduct` — shared pools bridge, ground sinks, the
 * caster's own body is in the graph), and destructs.
 *
 * The locus exists for one resolution only — magic imposes a real
 * potential and real physics does the rest (the caster-obeys-own-physics
 * invariant falls out of the graph, never a special case). The arcane
 * library's, not arcana's: only the spark row names it (D3).
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { EnergizedMixin } from '@saxonberg/server/mud/lib/electricity/Energized';

const SparkLocusBase = EnergizedMixin(Thing);

export default class SparkLocus extends SparkLocusBase {}
