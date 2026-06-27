/**
 * tree.ts — the declarative authoring format for the branching-tree
 * dialogue responder, plus its structural validator.
 *
 * A *tree* is the `config` blob of an NPC's `tree-dialogue`
 * `BehaviorSpec` (see `docs/subsystems/behavior.md`). It is **pure
 * declarative data** persisted inside the NPC template's
 * `data.behaviors[].config` in the existing `domain` collection — never
 * a Stuff, never its own collection or Document (npc-dialogue
 * requirements, constraint 7). The interfaces here describe that blob's
 * shape; at runtime the `tree-dialogue` brain reads `spec.config` (a
 * live plain object) and treats it as a {@link DialogueTree}.
 *
 * Because `config` is typed `Record<string, unknown>`, the shape is NOT
 * TS-checked at hydration — {@link DialogueTreeSchema.validate} is the
 * only structural guard. It runs at the CMS save-gate (so a dangling
 * node target or an unknown effect verb is caught at author time, not
 * at conversation time) and again defensively when a conversation
 * opens.
 *
 * NOT an expression language: guards are structured `{fact, op, value}`
 * predicates over a fixed fact namespace and effects are a small
 * registered verb set — both pure data, both extensible by future
 * builds (quest, advancement) without reopening the format. Computed
 * predicates / scripted beats wait for the scripting build.
 */

import { DISPOSITION_AXES } from "../trait/Disposition";

/** A whole tree — the `tree-dialogue` brain spec's `config`. */
export interface DialogueTree {
  /** Guard-selected root; the first entry whose guards all pass wins. */
  entry: DialogueEntry[];
  /** Node table, keyed by node id. */
  nodes: Record<string, DialogueNode>;
}

/** A candidate root node, gated by an optional guard conjunction. */
export interface DialogueEntry {
  /** Node id; must exist in {@link DialogueTree.nodes}. */
  node: string;
  /** All must pass (AND). Empty / absent ⇒ always eligible. */
  guard?: DialogueGuard[];
}

/** One node: the NPC's spoken beat plus the player's response choices. */
export interface DialogueNode {
  /** The NPC's spoken line for this node (absent ⇒ silent node). */
  beat?: string;
  /** Player responses, guard-filtered at render time. */
  choices?: DialogueChoice[];
  /** Reaching this node ends the conversation. */
  terminal?: boolean;
}

/** One player response. */
export interface DialogueChoice {
  /** What the PLAYER's character speaks aloud when this is picked. */
  line: string;
  /** Hide the choice unless all guards pass (AND). */
  guard?: DialogueGuard[];
  /** Target node id; required unless an `end`/`goto` effect drives flow. */
  to?: string;
  /** Effects applied in order on pick. */
  effects?: DialogueEffect[];
}

/** The comparison operators a guard may use. */
export type GuardOp = "eq" | "ne" | "gt" | "gte" | "lt" | "lte";

/** The fixed comparison-operator set (validation array). */
export const GUARD_OPS = [
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
] as const satisfies readonly GuardOp[];

/**
 * The fixed guard fact namespace:
 *   - `regard`       → `RegardApi.getRegard(npc, player)`        (signed −100..100)
 *   - `trait:<axis>` → `TraitApi.positionFor(npc, axis).position` (signed −100..100)
 *   - `time:hour`    → world hour-of-day (0..23)
 *   - `state:<key>`  → ephemeral conversation scratch (this conversation only)
 */
export type GuardFact =
  | "regard"
  | `trait:${string}`
  | `time:${string}`
  | `state:${string}`;

/** A structured predicate over a {@link GuardFact}. */
export interface DialogueGuard {
  fact: GuardFact;
  op: GuardOp;
  value: string | number | boolean;
}

/**
 * The registered effect-verb set — extensible by future builds (quest,
 * advancement) without reopening the format.
 *   - `set-state` writes ephemeral conversation scratch.
 *   - `regard`    applies a regard delta NPC→player (persists, clamps).
 *   - `say`       emits an extra NPC beat.
 *   - `emote`     performs an NPC catalog emote (composes with speech).
 *   - `goto`      branches to a node.
 *   - `end`       ends the conversation.
 */
export type DialogueEffect =
  | { verb: "set-state"; key: string; value: string | number | boolean }
  | { verb: "regard"; delta: number }
  | { verb: "say"; line: string }
  | { verb: "emote"; emote: string }
  | { verb: "goto"; node: string }
  | { verb: "end" };

/** The registered effect verbs (validation array). */
export const EFFECT_VERBS = [
  "set-state",
  "regard",
  "say",
  "emote",
  "goto",
  "end",
] as const;

/** The recognized world facts under the `time:` namespace. */
const TIME_FACTS = ["hour"] as const;

/**
 * The format's structural rules. A value-object holding the parse /
 * validate operations over the {@link DialogueTree} blob (the
 * `EmoteGrammarRunner` precedent — interfaces describe the data, a
 * companion class owns the operations, satisfying lib/ export
 * discipline).
 */
export class DialogueTreeSchema {
  private constructor() {}

  /**
   * Collect every structural error in an author-supplied tree blob.
   * Returns an empty array for a valid tree. Pure — no I/O. Tolerates
   * arbitrary `unknown` input (the blob is `Record<string, unknown>`
   * at hydration) and never throws.
   *
   * Checks: a present, object-shaped `nodes` table and `entry` list;
   * every `entry[].node` and every `choice.to` resolves to a declared
   * node; every guard names a recognized fact + operator; every effect
   * names a registered verb. Terminal reachability is NOT enforced —
   * `terminal` is a per-node flag and an authored leave path is valid.
   */
  static validate(tree: unknown): string[] {
    const errors: string[] = [];
    if (!isRecord(tree)) {
      return ["tree must be an object"];
    }

    const nodes = tree.nodes;
    if (!isRecord(nodes)) {
      errors.push("tree.nodes must be an object keyed by node id");
    }
    const nodeIds: ReadonlySet<string> = isRecord(nodes)
      ? new Set(Object.keys(nodes))
      : new Set<string>();

    const entry = tree.entry;
    if (!Array.isArray(entry) || entry.length === 0) {
      errors.push("tree.entry must be a non-empty array");
    } else {
      entry.forEach((e, i) => {
        if (!isRecord(e) || typeof e.node !== "string") {
          errors.push(`entry[${i}] must have a string 'node'`);
          return;
        }
        if (!nodeIds.has(e.node)) {
          errors.push(`entry[${i}].node '${e.node}' has no matching node`);
        }
        DialogueTreeSchema.validateGuards(e.guard, `entry[${i}]`, errors);
      });
    }

    if (isRecord(nodes)) {
      for (const [id, node] of Object.entries(nodes)) {
        DialogueTreeSchema.validateNode(node, id, nodeIds, errors);
      }
    }

    return errors;
  }

  private static validateNode(
    node: unknown,
    id: string,
    nodeIds: ReadonlySet<string>,
    errors: string[],
  ): void {
    if (!isRecord(node)) {
      errors.push(`nodes.${id} must be an object`);
      return;
    }
    if (node.beat !== undefined && typeof node.beat !== "string") {
      errors.push(`nodes.${id}.beat must be a string`);
    }
    if (node.choices !== undefined) {
      if (!Array.isArray(node.choices)) {
        errors.push(`nodes.${id}.choices must be an array`);
      } else {
        node.choices.forEach((c, i) =>
          DialogueTreeSchema.validateChoice(c, id, i, nodeIds, errors),
        );
      }
    }
  }

  private static validateChoice(
    choice: unknown,
    nodeId: string,
    index: number,
    nodeIds: ReadonlySet<string>,
    errors: string[],
  ): void {
    const where = `nodes.${nodeId}.choices[${index}]`;
    if (!isRecord(choice)) {
      errors.push(`${where} must be an object`);
      return;
    }
    if (typeof choice.line !== "string" || choice.line.length === 0) {
      errors.push(`${where}.line must be a non-empty string`);
    }
    if (choice.to !== undefined) {
      if (typeof choice.to !== "string") {
        errors.push(`${where}.to must be a string node id`);
      } else if (!nodeIds.has(choice.to)) {
        errors.push(`${where}.to '${choice.to}' has no matching node`);
      }
    }
    DialogueTreeSchema.validateGuards(choice.guard, where, errors);
    DialogueTreeSchema.validateEffects(choice.effects, where, nodeIds, errors);
  }

  private static validateGuards(
    guards: unknown,
    where: string,
    errors: string[],
  ): void {
    if (guards === undefined) return;
    if (!Array.isArray(guards)) {
      errors.push(`${where}.guard must be an array`);
      return;
    }
    guards.forEach((g, i) => {
      const at = `${where}.guard[${i}]`;
      if (!isRecord(g)) {
        errors.push(`${at} must be an object`);
        return;
      }
      if (typeof g.fact !== "string" || !isKnownFact(g.fact)) {
        errors.push(`${at}.fact '${String(g.fact)}' is not a recognized fact`);
      }
      if (typeof g.op !== "string" || !GUARD_OPS.includes(g.op as GuardOp)) {
        errors.push(`${at}.op '${String(g.op)}' is not a recognized operator`);
      }
      const v = g.value;
      if (
        typeof v !== "string" &&
        typeof v !== "number" &&
        typeof v !== "boolean"
      ) {
        errors.push(`${at}.value must be a string, number, or boolean`);
      }
    });
  }

  private static validateEffects(
    effects: unknown,
    where: string,
    nodeIds: ReadonlySet<string>,
    errors: string[],
  ): void {
    if (effects === undefined) return;
    if (!Array.isArray(effects)) {
      errors.push(`${where}.effects must be an array`);
      return;
    }
    effects.forEach((e, i) => {
      const at = `${where}.effects[${i}]`;
      if (!isRecord(e)) {
        errors.push(`${at} must be an object`);
        return;
      }
      const verb = e.verb;
      if (typeof verb !== "string" || !EFFECT_VERBS.includes(verb as never)) {
        errors.push(`${at}.verb '${String(verb)}' is not a registered effect`);
        return;
      }
      if (verb === "goto" && !(typeof e.node === "string" && nodeIds.has(e.node))) {
        errors.push(`${at} goto requires an existing 'node'`);
      }
      if (verb === "regard" && typeof e.delta !== "number") {
        errors.push(`${at} regard requires a numeric 'delta'`);
      }
      if (verb === "say" && typeof e.line !== "string") {
        errors.push(`${at} say requires a string 'line'`);
      }
      if (verb === "emote" && typeof e.emote !== "string") {
        errors.push(`${at} emote requires a string 'emote'`);
      }
      if (verb === "set-state" && typeof e.key !== "string") {
        errors.push(`${at} set-state requires a string 'key'`);
      }
    });
  }
}

/** Narrow an unknown to a plain keyed object. */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Whether `fact` names a recognized guard fact (namespace-checked). */
function isKnownFact(fact: string): boolean {
  if (fact === "regard") return true;
  const colon = fact.indexOf(":");
  if (colon <= 0) return false;
  const ns = fact.slice(0, colon);
  const key = fact.slice(colon + 1);
  if (key.length === 0) return false;
  switch (ns) {
    case "trait":
      return DISPOSITION_AXES.some((a) => a.key === key);
    case "time":
      return (TIME_FACTS as readonly string[]).includes(key);
    case "state":
      return true;
    default:
      return false;
  }
}
