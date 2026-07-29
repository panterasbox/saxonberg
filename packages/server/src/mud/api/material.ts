/**
 * MaterialApi — facade for material-world queries on any Stuff.
 *
 * The "material world" counterpart to ZoneApi/ContainmentApi on the
 * spatial side. Today the API houses one cluster:
 *
 *   - **Per-Material classification queries** (`compositionOf`,
 *     `containsElement`, `findByTag`, `findByElement`) — educational
 *     surfaces that walk a material's tags / composition / chemistry
 *     to answer "what kind of material is this" / "what's it made of"
 *     / "is this iron in here somewhere" questions.
 *
 * Future surface lands as consumers do: `weightOf(stuff)` (density ×
 * volume once volume is modeled), `damageResistance(stuff,
 * damageType, detailKey?)` (combat), `flammabilityOf(stuff,
 * detailKey?)` (fire propagation), `canConduct(stuff, kind)`
 * (electrical/thermal puzzles). Each earns a method when its consumer
 * arrives.
 *
 * This Api is a thin, security-gated forwarding shell: the logic lives
 * in the hot-reloadable {@link MaterialLogic} singleton at
 * `/obj/api/material`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/material` reloads it.
 */

import type Material from '../lib/material/Material';
import type { CompositionEntry } from '../lib/material/Material';
import type { Channel } from '../lib/material/Channel';
import type { Construction } from '../lib/material/Construction';
import type { Grade } from '../lib/craft/Grade';
import type { TraumaType } from '../lib/vitals/Condition';
import type { Quantity } from '../lib/quantity';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { MaterialLogic } from '../obj/api/MaterialLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

// kg + kg/m³ tag tables live in `mud/config/quantity-tags.yaml`
// and load at boot via `QuantityApi.loadTagTables`. Material doesn't
// register them locally anymore.

const LOGIC_PATH = '/obj/api/material';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/MaterialLogic', import.meta.url)
);

/** Resolve the HMR-able MaterialLogic singleton (sync). */
function logic(): MaterialLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'MaterialLogic'
      ) as typeof MaterialLogic | null) ?? MaterialLogic)()
  );
}

/**
 * Recursive composition expansion. `direct` is the material's own
 * composition entries (one level). `flat` is the recursive walk down
 * to leaf elements / unmodeled bottoms, expressed as element-symbol
 * → cumulative weight fraction.
 *
 * A mixture of mixtures resolves to atomic-symbol fractions — useful
 * for "does this contain iron?" queries that don't care about the
 * intermediate alloy.
 */
export interface MaterialComposition {
  /** The material whose composition is being expanded. */
  material: Material;
  /** Direct constituents (one level). */
  direct: CompositionEntry[];
  /**
   * Element symbol → cumulative weight fraction across the recursive
   * expansion. Only present for materials that bottom out in elements
   * with a `chemistry.symbol`. Mixtures whose components lack chemistry
   * data contribute their direct entries to `direct` but not to
   * `flat`.
   */
  flat: Record<string, number>;
}

// ---------- the materials-response function (three-axis) ----------

/**
 * The qualitative outcome of a blow — a small ordinal band the legibility
 * surface renders and the `inflict` outcome can be classified into. Coarse
 * on purpose (Settled 11 — "bands make the target forgiving"): the exact
 * severity number is never player-facing.
 */
export const OUTCOME_BANDS = ['turned', 'grazes', 'bites', 'bites-deep'] as const;
/** An outcome band — one of {@link OUTCOME_BANDS}. */
export type OutcomeBand = (typeof OUTCOME_BANDS)[number];

/** One layer's attenuation result: what energy passes inward, on which channel. */
export interface AttenuationResult {
  /** Residual energy passing inward to the next layer / tissue. */
  residualEnergy: number;
  /** The channel the residual arrives on (unchanged in v1). */
  channel: Channel;
}

/** The tissue meeting's verdict — a trauma type + magnitude, or null (deflected). */
export interface TraumaResolution {
  /** Which trauma the residual produces at the tissue. */
  type: TraumaType;
  /** The wound severity magnitude. */
  severity: number;
}

export class MaterialApi {
  // The `materialOf` read-wrapper was removed: the read lives on the
  // object itself — narrow with `MixinApi.isTangible(stuff)` and call
  // `stuff.getMaterial(detailKey)` directly.

  /**
   * Recursively expand `material`'s composition. `direct` is one
   * level; `flat` aggregates leaf-element weight fractions. Pure
   * elements with a `chemistry.symbol` contribute their full mass to
   * their own symbol (so iron returns `{ Fe: 1 }`); mixtures
   * recursively expand.
   *
   * Cycle-guarded: a composition reference back to an ancestor
   * truncates the walk at that node (defensive — well-formed content
   * shouldn't produce cycles).
   */
  public static compositionOf(material: Material): MaterialComposition {
    return logic().compositionOf(material);
  }

  /**
   * Does `material` contain `elementSymbol` anywhere in its
   * recursive composition? Walks the same expansion as
   * `compositionOf` and consults the leaf elements' `chemistry.symbol`.
   */
  public static containsElement(
    material: Material,
    elementSymbol: string
  ): boolean {
    return logic().containsElement(material, elementSymbol);
  }

  /**
   * Every registered Material that carries `tag`. Tag matching is
   * exact-string. The result reflects the runtime singleton index;
   * Materials that haven't been cloned yet aren't there.
   */
  public static findByTag(tag: string): Material[] {
    return logic().findByTag(tag);
  }

  /**
   * Every registered Material whose recursive composition contains
   * the element identified by `symbol`. Combines `compositionOf` +
   * `containsElement` over the index.
   */
  public static findByElement(symbol: string): Material[] {
    return logic().findByElement(symbol);
  }

  // ---------- materials-response (the three-axis response function) ----------

  /**
   * Attenuate one blow through **one armor layer**. Reads the layer's
   * construction profile (the qualitative token → an AppSettings base
   * fraction — the shape-vs-magnitude split), scales that height by the
   * layer material's hardness/toughness and by its `grade × condition`, and
   * returns the residual energy passing inward. A non-armor (weapon)
   * construction passes the energy through unchanged. The per-layer half of
   * the outside-in covering-stack fold.
   */
  /**
   * The `grade × condition` height scalar (Settled-4: quality scales
   * height, never shape) — the ONE formula both the covering-stack fold
   * and combat's instrument-delivery scale consume. Grade lerps within
   * the `response.grade.*` bounds across the five bands; condition lerps
   * within `[response.condition.min, 1]`.
   */
  public static gradeConditionScale(grade?: Grade, condition?: number): number {
    return logic().gradeConditionScale(grade, condition);
  }

  public static attenuate(
    channel: Channel,
    energy: number,
    material: Material | null,
    construction: Construction,
    grade?: Grade,
    condition?: number,
  ): AttenuationResult {
    return logic().attenuate(
      channel,
      energy,
      material,
      construction,
      grade,
      condition,
    );
  }

  /**
   * Resolve the residual energy meeting tissue into a trauma — the tail of
   * a blow. `edge → laceration`, `point → puncture`, `blunt → fracture`
   * (a boned part at/above the fracture threshold) else `contusion`.
   * Returns `null` when the residual is below the no-wound threshold (the
   * blow was turned). Both severity AND type derive here — the single
   * chokepoint harm reads.
   */
  public static resolveTrauma(
    channel: Channel,
    energy: number,
    tissueMaterial: Material | null,
    partHasBone: boolean,
  ): TraumaResolution | null {
    return logic().resolveTrauma(channel, energy, tissueMaterial, partHasBone);
  }

  /**
   * The legibility preview — "what would this do?". For an **armor**
   * construction: a canonical reference blow on `channel`, attenuated
   * through the piece then met at tissue, banded. For a **weapon-delivery**
   * construction: the blow it delivers on `channel`, banded (or `turned`
   * when the form delivers nothing there). Runs the SAME functions as
   * `attenuate` / `resolveTrauma`, so a preview band always matches the
   * resolved `inflict` outcome for identical inputs.
   */
  public static previewBand(
    channel: Channel,
    material: Material | null,
    construction: Construction,
    grade?: Grade,
    condition?: number,
  ): OutcomeBand {
    return logic().previewBand(
      channel,
      material,
      construction,
      grade,
      condition,
    );
  }

  /** Band a resolved severity (or `null` = deflected). The shared classifier
   * the preview and `inflict` both use. */
  public static severityToBand(severity: number | null): OutcomeBand {
    return logic().severityToBand(severity);
  }

      // ---------- electricity (the Ohm's-law circuit primitives) ----------

  /**
   * `I = V/R` — the current through a path. The honest, scale-invariant
   * primitive: the shock, the stun baton, and the deferred substation all
   * resolve through this one formula. Resistance is floored (an
   * `electricity.*` dial) to dodge divide-by-zero.
   */
  public static ohmsCurrent(
    voltage: Quantity<'V'>,
    resistance: Quantity<'Ω'>,
  ): Quantity<'A'> {
    return logic().ohmsCurrent(voltage, resistance);
  }

  /**
   * `P = I²R` — the Joule (resistive) loss / heating term. Ships now as the
   * honest formula; the Joule→fire coupling (current heats water, ignites
   * oil) is a named post-v1 consumer, so nothing reads it for harm yet.
   */
  public static jouleHeat(
    current: Quantity<'A'>,
    resistance: Quantity<'Ω'>,
  ): Quantity<'W'> {
    return logic().jouleHeat(current, resistance);
  }

  /**
   * A body's contact-to-contact resistance, read from its flesh
   * conductivity through a nominal internal-path geometry (dial). A `wet`
   * body divides by the wet-skin factor (~100×) — the real reason water is
   * deadly. Falls back to the dry-skin dial when the body carries no
   * conductivity material.
   */
  public static bodyResistance(
    material: Material | null,
    wet: boolean,
  ): Quantity<'Ω'> {
    return logic().bodyResistance(material, wet);
  }

  /**
   * The series resistance one material contributes at a contact / covering
   * node (`R = (L/A)/σ`). A conductor → ~0; an insulator (or unknown
   * material) → a large-but-finite ceiling (an open break). The per-layer
   * half of the covering-stack series sum — the armor inversion's engine.
   */
  public static contactResistance(material: Material | null): Quantity<'Ω'> {
    return logic().contactResistance(material);
  }

  /**
   * The covering stack's total series resistance — the outside-in sum of
   * each layer's `contactResistance`. Shock adds resistances (it does NOT
   * subtract energy like the mechanical fold): steel barely raises the sum,
   * rubber/leather collapses the current. The armor inversion falls out of
   * conductivity alone — no `isElectrical` narrowing.
   */
  public static seriesResistanceOfCoveringStack(
    materials: ReadonlyArray<Material | null>,
  ): Quantity<'Ω'> {
    return logic().seriesResistanceOfCoveringStack(materials);
  }

  /**
   * Map a current through a body to the local contact trauma — a `burn`
   * whose severity scales with current above the burn threshold, or `null`
   * below it (perception / tingle only). The whole-body outcomes (let-go /
   * tetany / fibrillation → arrest) are the vitals coupling's job.
   */
  public static resolveShock(
    current: Quantity<'A'>,
  ): TraumaResolution | null {
    return logic().resolveShock(current);
  }

  /**
   * Boot-time roster warm: stand up every authored `/lib/material/**`
   * Material as a live singleton so the sync resolve-on-read seams
   * (`Tangible.getMaterial`, bulk slot materials, autoignition,
   * composition expansion) hit from the first frame of live play —
   * nothing else ever stood materials up in a running server. Called
   * once from `AppBootstrap.run` after the seeders. Returns the count.
   */
  public static boot(): Promise<number> {
    return logic().boot();
  }
}

SecurityApi.decorateApiClass(MaterialApi);
