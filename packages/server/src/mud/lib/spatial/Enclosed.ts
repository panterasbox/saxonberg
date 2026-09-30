/**
 * Enclosed — ⭐⭐⭐ **what physically bounds a space, and what it is made
 * of.** A stone wall, a plank partition, a post-and-rail fence, a
 * quickset hedge, a hurdle: one declaration, because they are one fact
 * about the world and only the numbers differ.
 *
 * ```yaml
 * enclosure:
 *   material: /stuff/idea/material/rock/granite
 *   thicknessM: 0.45
 * ```
 *
 * ⚠ The author names a REAL material and how thick it is. The
 * conductivity, the density and the specific heat are that material's
 * row's, and nobody types them twice. *You cannot author
 * "well-insulated" or "stock-proof"; you author granite and the physics
 * decides.*
 *
 * ## ⭐⭐ Why this is its own mixin, and why it is called an ENCLOSURE
 *
 * It shipped as `fabric:` on `Location` in the envelope build, moved onto
 * `AtmosphericMixin` at review, and landed here — and each move was
 * about the same question getting a better answer.
 *
 * **Why not on `Location`.** `AtmosphericMixin` composes *inside*
 * `Location`, so it could only reach the declaration through an
 * optional-member cast. A mixin narrowing its own `this` is the host
 * being wrong.
 *
 * **Why not on `AtmosphericMixin` either.** That was "the mixin that
 * consumes it owns it", which holds only while there is one consumer.
 * There is about to be a second: **pens.** `trade-ranching` keeps
 * animals, and a pen is an enclosure whose interesting question is not
 * heat at all — it is whether the stock gets out. An atmosphere mixin
 * owning a fence is the same category error one rung up.
 *
 * ⭐ **Why "enclosure" and not "walls" or "fabric".** *Fabric* is the
 * correct UK building-physics term (*fabric heat loss*) and collides with
 * `lib/material/Construction.ts`, where `FabricSpec` means **cloth**.
 * *Walls* is plain but untrue: **a fence is not a wall**, and a pen is
 * mostly fences. *Shell* is `holding.md`'s word for a dwelling's
 * condition and weathering, which `structure-slate` plans to generalize —
 * a live collision in the same domain. **Enclosure** is the only word
 * that covers drystone, palings, hedge and hurdle without lying, and it
 * is *also* the technical term on the thermal side (a *building
 * enclosure*). One word, both consumers.
 *
 * ## The two rungs, and the second always answers
 *
 *   1. the scope's own `enclosure:`;
 *   2. its class's {@link Enclosed.enclosureDefaults} hook, whose
 *      terminal here is the universe default — and which a `Vessel`
 *      overrides with its own material, because a vessel IS matter.
 *
 * ## ⚠ What is NOT here, and what will add it
 *
 * **No `heightM`.** Containment is what wants it — a drystone wall at
 * 1.2 m holds sheep and at 0.6 m does not — and nothing reads it yet:
 * `ranching.md` is explicit that *"containment holds **position**"*, so
 * today an animal is in the pen because `getContainer()` says so. The
 * field arrives with the build that reads it; the vocabulary is additive
 * and there are no migrations.
 *
 * **No `roofed`.** Derivable, and already derived: a pen is open to the
 * sky and a byre is not, which is what `BiomeApi.isSkyExposed` answers.
 * Authoring it would let a row disagree with its own biome.
 *
 * **No `form`** (drystone · palings · hedge · hurdle). The same oak is a
 * plank wall or a post-and-rail fence depending on how it is worked, and
 * `Construction.ts` is the shipped precedent for exactly that — *a
 * material worked into a form, with a per-channel response profile*,
 * whose docstring says the reusable thing is the **pattern** rather than
 * one flat enum. A third vocabulary on that shape is where enclosure
 * forms belong, when something reads them.
 */

import type { Quantity } from '../quantity';

/**
 * ⭐ The authored half — two keys and no more.
 *
 * ⚠ The vocabulary is CLOSED and `lint:envelope` clause (e) holds it
 * shut: there is no `uPerM2`, no `insulation:`, no `stockProof:`, and no
 * way to type one. Every one of those is an EFFECT, and an authored
 * effect is a wall that is good at keeping heat in for no reason anybody
 * can be told.
 */
export interface EnclosureSpec {
  /** A `Material` template path — what the wall or fence is made of. */
  material?: string;
  /** How thick, in metres. Defaults to `enclosure.defaultThicknessM`. */
  thicknessM?: number;
}

/** What {@link Enclosed.enclosureDefaults} answers. */
export interface EnclosureDefaults {
  materialPath: string;
  thicknessM: number;
}

/**
 * What the ladder resolved to, cached transiently on the host. Every
 * number is read off a `Material` row; none of it is authored as an
 * effect.
 */
export interface ResolvedEnclosure {
  /** Thermal conductivity, W/(m·K). Floored above zero. */
  kWmK: number;
  /** Density, kg/m³. */
  rhoKgM3: number;
  /** Specific heat, J/(kg·K). */
  cJkgK: number;
  /** Thickness, m. */
  thicknessM: number;
  /** The `Material` template path this resolved to — what `feel` names. */
  materialPath: string;
}

/**
 * The shape a host that declares an enclosure answers.
 *
 * ⚠⚠ **There is no `EnclosedMixin`, and that is TypeScript's ruling
 * rather than a design choice.** It was written — `AtmosphericMixin`
 * constraining its base to this interface, `HidingMixin` over
 * `Concealable` being the shipped precedent — and adding one more layer
 * to `Location`'s composition **pushed the chain past TS's inference
 * depth**. It degraded silently: `SlottableMixin<MixinConstructor<Stuff>>`
 * appeared in the errors, meaning the generic had been instantiated with
 * its own CONSTRAINT instead of the real base, `Vessel` stopped being a
 * `Stuff`, and 835 errors landed in content packs that never mention an
 * enclosure.
 *
 * ⭐ So the concept keeps its own module and its own vocabulary — which
 * is what a second consumer needs to import — and `AtmosphericMixin`
 * implements it for now. Nothing is lost today: every host that declares
 * an enclosure is a `Location` or a `Vessel`, and both are already
 * Atmospheric. **The extraction becomes worth its cost when a host
 * appears that is neither** — a carried hurdle, a field gate — and at
 * that point the types do not move, only the implementation does.
 */
export interface Enclosed {
  /** What this scope's row says it is bounded by, or `null`. */
  getEnclosure(): EnclosureSpec | null;
  setEnclosure(value: EnclosureSpec | null): void;
  /**
   * What a scope of this KIND is bounded by, when its row says nothing.
   *
   * @hook Override where the class knows its own construction — a cellar
   *   cut into rock, a glasshouse, a tent, a ship's hull, or a `Vessel`,
   *   which IS matter and answers with its own material. The row still
   *   wins: an `enclosure:` on the row beats this, and this beats the
   *   universe default.
   */
  enclosureDefaults(): EnclosureDefaults;
  /** The resolved material properties of this enclosure. */
  resolveEnclosure(): ResolvedEnclosure;
}
