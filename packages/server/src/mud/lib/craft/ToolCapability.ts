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
] as const;

/** A tool capability — one of {@link TOOL_CAPABILITIES}. */
export type ToolCapability = (typeof TOOL_CAPABILITIES)[number];

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
}
