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
 * ## ⭐⭐ The roof is a declared part (rubber build, 2026-10-17)
 *
 * This file used to say *"No `roofed`. Derivable, and already derived"*
 * — from the biome, which answered the sky with one bit. That bit is
 * leaving the biome: a place now says what is over it, the same way it
 * says what is around it.
 *
 * ```yaml
 * enclosure:                       # the walls — one layer, or a list
 *   - { material: /stuff/idea/material/wood/pine, thicknessM: 0.025 }
 *   - { material: /stuff/idea/material/organic/sawdust, thicknessM: 0.3 }
 *   - { material: /stuff/idea/material/wood/pine, thicknessM: 0.025 }
 * roof: { material: /stuff/idea/material/glass/glass, thicknessM: 0.004 }
 * ```
 *
 * Either part may be `none` — an awning has no walls, a yard inside a
 * building no roof. A list is **outermost first**; heat crosses its
 * layers in series, light passes the product of each layer's
 * transmittance, and the room sees its innermost lining. ⚠ A place that
 * authors no `roof:` is **undeclared**: the legacy biome discriminator
 * still answers for it (a sky biome ⇒ open; anything else ⇒ its walls'
 * material on five faces), and `lint:biome-sky` counts each such interior
 * until none remain. ⭐ The getters return the RAW authored form — a spec,
 * a list, `'none'`, or `null` — and that is a contract with the repair
 * build's building upkeep, which seeds its layer state from it.
 *
 * ⛔ A {@link StoreySpec} lives on a `Structure` and says only which
 * places stand on which. A structure is never made of anything: every
 * material belongs to a place.
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

/**
 * One part of a place's construction as authored: a single layer, a list
 * of layers outermost first, or `'none'` — no such part at all.
 */
export type PartSpec = EnclosureSpec | readonly EnclosureSpec[] | 'none';

/** The walls as authored (`enclosure:`). */
export type EnclosurePartSpec = PartSpec;

/** The roof as authored (`roof:`). */
export type RoofSpec = PartSpec;

/**
 * ⭐ One storey of a structure — **relations only.** Membership is the
 * longest storey `extent` prefix; `on` names the storey this one stands
 * on (absent: the ground). Whether a storey is enclosed is never authored
 * on it: it is read off its member places' own walls and roof.
 */
export interface StoreySpec {
  key: string;
  extent: string;
  on?: string;
}

/** What {@link Enclosed.enclosureDefaults} answers. */
export interface EnclosureDefaults {
  materialPath: string;
  thicknessM: number;
}

/** One resolved layer — every number read off a `Material` row. */
export interface ResolvedLayer {
  /** Thermal conductivity, W/(m·K). Floored above zero. */
  kWmK: number;
  /** Density, kg/m³. */
  rhoKgM3: number;
  /** Specific heat, J/(kg·K). */
  cJkgK: number;
  /** Thickness, m. */
  thicknessM: number;
  /** The `Material` template path this resolved to. */
  materialPath: string;
  /** `e^(−α·t)`; 0 when the material authors no `lightAbsorption`. */
  transmittance: number;
}

/**
 * What the ladder resolved to, cached transiently on the host. Every
 * number is read off a `Material` row; none of it is authored as an
 * effect.
 *
 * The flat fields describe the **innermost** layer — the skin the room
 * sees, whose heat answers within the hour — and `materialPath` is what
 * `feel` names. `layers` is the whole part, outermost first, and the
 * three derived figures are what the readers use.
 */
export interface ResolvedEnclosure {
  /** Every layer, outermost first; empty when the part is `none`. */
  layers: ResolvedLayer[];
  /** This part is `none` — no walls, or no roof. */
  none: boolean;
  /** Σ tᵢ/kᵢ — heat crosses the layers in series. m²K/W. */
  resistanceM2KW: number;
  /** Π e^(−αᵢ·tᵢ) — light passes the product (Beer–Lambert). */
  transmittance: number;
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
  /** What this scope's row says it is bounded by — raw, or `null`. */
  getEnclosure(): EnclosurePartSpec | null;
  setEnclosure(value: EnclosurePartSpec | null): void;
  /** What this scope's row says is over it — raw, or `null`. */
  getRoof(): RoofSpec | null;
  setRoof(value: RoofSpec | null): void;
  /**
   * What is over a scope of this KIND when its row says nothing — `null`
   * means *undeclared*, which hands the sky answer to the legacy biome
   * discriminator.
   *
   * @hook A `Vessel` answers its own material when it declares an
   *   interior and `'none'` when it does not (an open boat).
   */
  roofDefaults(): RoofSpec | null;
  /**
   * What a scope of this KIND is bounded by, when its row says nothing.
   *
   * @hook Override where the class knows its own construction — a cellar
   *   cut into rock, a glasshouse, a tent, a ship's hull, or a `Vessel`,
   *   which IS matter and answers with its own material. The row still
   *   wins: an `enclosure:` on the row beats this, and this beats the
   *   universe default.
   */
  enclosureDefaults(): EnclosureDefaults | 'none';
  /** The resolved material properties of this enclosure. */
  resolveEnclosure(): ResolvedEnclosure;
}
