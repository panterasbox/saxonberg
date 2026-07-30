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
  'crafting/pour.yaml',
  'crafting/stir.yaml',
  'crafting/strain.yaml',
  'crafting/garnish.yaml',
  'crafting/serve.yaml',
  'crafting/mix.yaml',
] as const;

const CAPABILITY_TABLE: Record<ToolCapability, CapabilityKindDef> = {
  shaker: { verbs: BAR_VESSEL_VERBS, placement: 'reachable' },
  'mixing-glass': { verbs: BAR_VESSEL_VERBS, placement: 'reachable' },
  pot: {
    verbs: [
      'crafting/pour.yaml',
      'crafting/stir.yaml',
      'crafting/heat.yaml',
      'crafting/plate.yaml',
      'crafting/cook.yaml',
    ],
    placement: 'reachable',
  },
  anvil: {
    verbs: [
      'crafting/hammer.yaml',
      'crafting/quench.yaml',
      'crafting/forge.yaml',
      'crafting/repair.yaml',
      'crafting/salvage.yaml',
    ],
    placement: 'reachable',
  },
  mending: {
    verbs: ['crafting/repair.yaml', 'crafting/salvage.yaml'],
    placement: 'reachable',
  },
  whetstone: { verbs: ['crafting/sharpen.yaml'], placement: 'carried' },
  striking: { verbs: [], placement: 'reachable' },
  strainer: { verbs: [], placement: 'reachable' },
  muddler: { verbs: [], placement: 'reachable' },
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
}
