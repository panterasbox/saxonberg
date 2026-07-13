/**
 * Bench — a public sittable seat.
 *
 * A thin reuse of {@link Chair}: same `Postured + Slotted + Detailed`
 * composition (a posture-bearing `sit` slot, authored per-seed), a
 * distinct class so seeds can reference `/obj/Bench` and give it bench
 * prose and (via a higher-capacity `sit` slot spec) seat more than one.
 */

import Chair from './Chair';

export default class Bench extends Chair {}
