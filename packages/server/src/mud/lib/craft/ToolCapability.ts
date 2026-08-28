/**
 * ToolCapability — the vocabulary of capabilities a tool can offer and a
 * recipe can require.
 *
 * Like "weapon" and "tool" themselves, a capability is a **role**, not a
 * kind: a recipe requires "a shaker" (a capability), and any present
 * `Tangible` that offers it satisfies the slot — the constrained-slot idea
 * (inputs by category, tools by capability) applied to the capital side of
 * control.
 *
 * v1 authors only need a couple of these (the bar's shaker / mixing-glass);
 * the small vocabulary is seeded ahead so recipes across domains can require
 * by kind without a schema change. Closed checklist (validated on author),
 * distinct from Material's open tag set.
 */

import { Grade } from './Grade';

/** The known tool capabilities. */
export const TOOL_CAPABILITIES = [
  'shaker',
  'strainer',
  'muddler',
  'mixing-glass',
  'striking',
  'anvil',
  'whetstone',
  'mending',
  'pot',
  'watering',
  // The bar's stations: the citrus press (`press` recipes) and the keg tap
  // (`pint`). A muddler confers `muddle`; the rest are recipe-side kinds.
  'juicer',
  'tap',
  // The distiller's station (trade-distilling's `Still`) — no recipe
  // names it yet; the distillery build's.
  'still',
] as const;

/** A tool capability — one of {@link TOOL_CAPABILITIES}. */
export type ToolCapability = (typeof TOOL_CAPABILITIES)[number];

/**
 * Where a kind's conferred verbs light up: `reachable` = the tool
 * affords from the room or a pack (environment + inventory buckets);
 * `carried` = only from a pack (inventory bucket — the whetstone's
 * personal-capital rule as a data value).
 */
export type CapabilityPlacement = 'reachable' | 'carried';

/** A kind's definition — the verb family it confers + its placement. */
export interface CapabilityKindDef {
  /** `cmd/` YAML keys the kind confers (empty = recipe-side kind). */
  verbs: readonly string[];
  placement: CapabilityPlacement;
}

/**
 * A parameterized capability entry — how a tool variant is authored as
 * pure instance data (kit → machine, whetstone → grinding wheel). A
 * bare kind string is shorthand for the defaulted spec.
 */
export interface CapabilitySpec {
  kind: string;
  /** Work-rate multiplier — paces the conferring kind's engaged steps
   * (clamped {@link ToolCapabilities.RATE_MIN}–{@link ToolCapabilities.RATE_MAX}
   * at read). Default 1. */
  rate?: number;
  /** A Grade band embedded in the capital — floors the outcome grade of
   * work done with this instrument. Default none. */
  control?: string;
  /** Per-entry override of the kind's default placement (the grinding
   * wheel: `whetstone` kind, `reachable` placement). */
  placement?: CapabilityPlacement;
}

/**
 * The capability → verb-family table: each kind's definition, keyed by
 * the closed vocabulary. The tool that does the work carries its
 * working verbs (the instrument-conferred model — see
 * command-spec.md § who affords a verb); `ToolMixin` derives its
 * `InstanceContributor` buckets from this table over an instance's
 * authored `capabilities`, so a tool variant is pure seed data.
 * Recipe-side kinds (`striking`/`strainer`/`muddler`) confer nothing —
 * they are requirements, not verb sources.
 */
const BAR_VESSEL_VERBS = [
  'platform/cmd/crafting/pour.yaml',
  'platform/cmd/crafting/stir.yaml',
  'platform/cmd/crafting/strain.yaml',
  'platform/cmd/crafting/garnish.yaml',
  'platform/cmd/crafting/serve.yaml',
  'platform/cmd/crafting/mix.yaml',
] as const;

const CAPABILITY_TABLE: Record<ToolCapability, CapabilityKindDef> = {
  shaker: { verbs: BAR_VESSEL_VERBS, placement: 'reachable' },
  'mixing-glass': { verbs: BAR_VESSEL_VERBS, placement: 'reachable' },
  pot: {
    verbs: [
      'platform/cmd/crafting/pour.yaml',
      'platform/cmd/crafting/stir.yaml',
      'platform/cmd/crafting/heat.yaml',
      'platform/cmd/crafting/plate.yaml',
      'platform/cmd/crafting/cook.yaml',
    ],
    placement: 'reachable',
  },
  anvil: {
    verbs: [
      'platform/cmd/crafting/hammer.yaml',
      'platform/cmd/crafting/quench.yaml',
      'platform/cmd/crafting/forge.yaml',
      'platform/cmd/crafting/repair.yaml',
      'platform/cmd/crafting/salvage.yaml',
    ],
    placement: 'reachable',
  },
  mending: {
    verbs: ['platform/cmd/crafting/repair.yaml', 'platform/cmd/crafting/salvage.yaml'],
    placement: 'reachable',
  },
  whetstone: { verbs: ['platform/cmd/crafting/sharpen.yaml'], placement: 'carried' },
  // The first non-crafting consumer of the instrument-confers-verbs rule:
  // a watering can in your pack affords `water`. `carried` is the
  // whetstone's personal-capital rule as data — a can on the floor confers
  // nothing.
  watering: { verbs: ['platform/cmd/bulk/water.yaml'], placement: 'carried' },
  striking: { verbs: [], placement: 'reachable' },
  strainer: { verbs: [], placement: 'reachable' },
  muddler: { verbs: ['platform/cmd/crafting/muddle.yaml'], placement: 'reachable' },
  juicer: { verbs: [], placement: 'reachable' },
  tap: { verbs: [], placement: 'reachable' },
  still: { verbs: [], placement: 'reachable' },
};

/**
 * The capability vocabulary holder — a thin static surface (the concept this
 * module owns) rather than a free-floating predicate function.
 */
export class ToolCapabilities {
  /** The full vocabulary. */
  public static readonly ALL: readonly ToolCapability[] = TOOL_CAPABILITIES;

  /** Narrowing predicate for a string against the vocabulary. */
  public static isCapability(s: string): s is ToolCapability {
    return (TOOL_CAPABILITIES as readonly string[]).includes(s);
  }

  /** The kind's table definition (verb family + placement), or null. */
  public static definitionOf(kind: string): CapabilityKindDef | null {
    return ToolCapabilities.isCapability(kind)
      ? CAPABILITY_TABLE[kind]
      : null;
  }

  /** The work-rate clamp band — data can never zero a duration. */
  public static readonly RATE_MIN = 0.25;
  public static readonly RATE_MAX = 10;

  /**
   * Validate one authored capability entry (either form). Throws with
   * the offending detail; the tool setter is the seed's validation
   * gate (setter-first hydration).
   */
  public static validateEntry(entry: string | CapabilitySpec): void {
    const kind = typeof entry === 'string' ? entry : entry.kind;
    if (!ToolCapabilities.isCapability(kind)) {
      throw new RangeError(
        `ToolCapabilities.validateEntry: unknown capability '${kind}'`,
      );
    }
    if (typeof entry === 'string') return;
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
  }
}
