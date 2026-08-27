/**
 * GlowlightOrb — the glowlight spell's bound emitter: a tiny
 * `LightSourceMixin(Thing)` conjured into the caster's scene and held up
 * by a `SustainedEffect` on the caster (realized by pull — flux on while
 * active, 0 while dormant in a suppression field, destructed on release).
 * Light only, deliberately no heat — the sim decouples them (the
 * Light-split-from-Fire carve), so a glowlight warms nothing and never
 * ignites anything.
 *
 * Cloned from `/stuff/thing/magic/GlowlightOrb` by the emit-field executor; its
 * flux is written only by the sustained-effect reconcile arm.
 */

import Thing from '../../../lib/stuff/Thing';
import { LightSourceMixin } from '../../../lib/perception/LightSource';

const GlowlightOrbBase = LightSourceMixin(Thing);

export default class GlowlightOrb extends GlowlightOrbBase {}
