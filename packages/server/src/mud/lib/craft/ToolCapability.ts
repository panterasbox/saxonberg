/**
 * ToolCapability — a capability a tool can offer and a recipe can require.
 *
 * Like "weapon" and "tool" themselves, a capability is a **role**, not a
 * kind: a recipe requires "a shaker" (a capability), and any present
 * `Tangible` that offers it satisfies the slot — the constrained-slot idea
 * (inputs by category, tools by capability) applied to the capital side of
 * control.
 *
 * **The vocabulary is open.** A capability is any non-empty string a
 * recipe's `toolCapabilities` and a tool row's `capabilities` agree on —
 * the same open-tag contract as Material's tags. The kernel keeps no
 * list: a trade pack that ships a still and the recipes that need one
 * names `still` on both sides and nothing in the kernel changes (the
 * libations build's rule — a pack never needs a kernel LIST edit).
 *
 * **The verbs a tool confers — and the WORKING it performs — are the tool
 * row's own data**, never a kernel table's: `capabilities: [{ kind: shaker, verbs: [...] }]`. The
 * tool that does the work carries its working verbs (the
 * instrument-conferred model — command-spec.md § who affords a verb), and
 * a verb lives in the pack whose content affords it, so the kernel can
 * never name a trade's view.
 */

import { Grade } from './Grade';
import { Techniques, type TechniqueSpec } from './Technique';

/**
 * Where a capability's conferred verbs light up: `reachable` = the tool
 * affords from the room or a pack (environment + peers buckets);
 * `carried` = only from a pack (environment bucket — the whetstone's
 * personal-capital rule as a data value). Default `reachable`.
 */
export type CapabilityPlacement = 'reachable' | 'carried';

/**
 * A parameterized capability entry — how a tool variant is authored as
 * pure instance data (kit → machine, whetstone → grinding wheel). A
 * bare kind string is shorthand for the defaulted spec (no verbs, rate 1,
 * no control floor, `reachable`).
 */
export interface CapabilitySpec {
  kind: string;
  /** The command-view keys this entry confers on whoever can use the
   * tool (`trade/hospitality/cmd/crafting/strain.yaml`,
   * `platform/cmd/bulk/water.yaml`). Empty/absent = a recipe-side kind:
   * a requirement, not a verb source. */
  verbs?: string[];
  /** Work-rate multiplier — paces the conferring kind's engaged steps
   * (clamped {@link ToolCapabilities.RATE_MIN}–{@link ToolCapabilities.RATE_MAX}
   * at read). Default 1. */
  rate?: number;
  /** A Grade band embedded in the capital — floors the outcome grade of
   * work done with this instrument. Default none. */
  control?: string;
  /** Where the verbs light up. Default `reachable`. */
  placement?: CapabilityPlacement;
  /**
   * The **working this instrument performs**, and what it does to the
   * output — `{ name, chillK?, dilutionL?, aerated?, priority? }`. The
   * shaker is what makes a drink shaken and the shaker is what knows
   * shaking chills 8 K; the kernel keeps no technique table, so a pack
   * that ships a churn names `churned` here and changes nothing in the
   * kernel. Absent = this instrument names no working.
   */
  technique?: TechniqueSpec;
}

/**
 * The capability contract holder — a thin static surface (the concept
 * this module owns) rather than a free-floating predicate function.
 */
export class ToolCapabilities {
  /** The work-rate clamp band — data can never zero a duration. */
  public static readonly RATE_MIN = 0.25;
  public static readonly RATE_MAX = 10;

  /** The default placement of an entry that authors none. */
  public static readonly DEFAULT_PLACEMENT: CapabilityPlacement = 'reachable';

  /** A well-formed capability name: a non-empty kebab token. */
  public static isCapabilityName(s: unknown): s is string {
    return typeof s === 'string' && /^[a-z][a-z0-9-]*$/.test(s);
  }

  /**
   * Validate one authored capability entry (either form). Throws with
   * the offending detail; the tool setter is the seed's validation
   * gate (setter-first hydration).
   */
  public static validateEntry(entry: string | CapabilitySpec): void {
    const kind = typeof entry === 'string' ? entry : entry?.kind;
    if (!ToolCapabilities.isCapabilityName(kind)) {
      throw new RangeError(
        `ToolCapabilities.validateEntry: bad capability name '${String(kind)}'`,
      );
    }
    if (typeof entry === 'string') return;
    if (entry.verbs !== undefined) {
      if (
        !Array.isArray(entry.verbs) ||
        entry.verbs.some((v) => typeof v !== 'string' || !v.endsWith('.yaml'))
      ) {
        throw new RangeError(
          `ToolCapabilities.validateEntry: verbs for '${kind}' must be command-view keys ('<root>/cmd/<category>/<verb>.yaml')`,
        );
      }
    }
    if (entry.rate !== undefined) {
      if (!Number.isFinite(entry.rate) || entry.rate <= 0) {
        throw new RangeError(
          `ToolCapabilities.validateEntry: bad rate '${entry.rate}' for '${kind}'`,
        );
      }
    }
    if (entry.control !== undefined && !Grade.isBand(entry.control)) {
      throw new RangeError(
        `ToolCapabilities.validateEntry: unknown control band '${entry.control}' for '${kind}'`,
      );
    }
    if (
      entry.placement !== undefined &&
      entry.placement !== 'reachable' &&
      entry.placement !== 'carried'
    ) {
      throw new RangeError(
        `ToolCapabilities.validateEntry: unknown placement '${entry.placement}' for '${kind}'`,
      );
    }
    if (entry.technique !== undefined) {
      const t = entry.technique;
      if (!t || !Techniques.isTechniqueName(t.name)) {
        throw new RangeError(
          `ToolCapabilities.validateEntry: bad technique name '${String(t?.name)}' for '${kind}'`,
        );
      }
      for (const [f, v] of [
        ['chillK', t.chillK],
        ['dilutionL', t.dilutionL],
        ['priority', t.priority],
      ] as const) {
        if (v !== undefined && (!Number.isFinite(v) || v < 0)) {
          throw new RangeError(
            `ToolCapabilities.validateEntry: bad technique ${f} '${String(v)}' for '${kind}'`,
          );
        }
      }
      if (t.aerated !== undefined && typeof t.aerated !== 'boolean') {
        throw new RangeError(
          `ToolCapabilities.validateEntry: technique aerated must be a boolean for '${kind}'`,
        );
      }
    }
  }
}
