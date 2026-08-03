/**
 * RadioactiveMaterial — concrete `Material` subclass composing
 * `RadioactiveMixin`.
 *
 * The pattern: capability mixins layer on `Material` as a subclass
 * declaration. A template authoring uranium uses
 * `class: /obj/material/RadioactiveMaterial` to opt in. Plain
 * Materials (iron, copper, oak) stay on
 * `class: /obj/material/Material` — they don't carry the
 * radioactivity fields at all.
 *
 * Future capability mixins (`SuperconductorMixin`,
 * `PiezoelectricMixin`, …) compose the same way: one new subclass per
 * mixin, named after the capability + `Material`. When a Material
 * needs more than one capability mixin, compose them in the subclass
 * definition (`class TwoMix extends FooMixin(BarMixin(Material)) {}`).
 */
import { RadioactiveMixin } from '../lib/material/Radioactive';
import Material from '../lib/material/Material';

export class RadioactiveMaterial extends RadioactiveMixin(Material) {}
