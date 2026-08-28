/**
 * GlowlightMote — the glowlight spell's bound emitter, the LOCUS its
 * `emit-field` row names: a tiny `LightSourceMixin(Thing)` conjured into
 * the caster's scene and held up by a `SustainedEffect` on the caster
 * (realized by pull — flux on while active, 0 while dormant in a
 * suppression field, destructed on release). Light only, deliberately
 * no heat — the sim decouples them (the Light-split-from-Fire carve), so
 * a glowlight warms nothing and never ignites anything.
 *
 * The arcane library's, not arcana's: nothing but the glowlight row
 * names it (D3 — a class only one pack's own rows name is that pack's).
 * Cloned from `/stuff/thing/magic/glowlight-mote` by the emit-field
 * executor, which clones whatever `locus:` the row says; its flux is
 * written only by the sustained-effect reconcile arm.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { LightSourceMixin } from '@saxonberg/server/mud/lib/perception/LightSource';

const GlowlightMoteBase = LightSourceMixin(Thing);

export default class GlowlightMote extends GlowlightMoteBase {}
