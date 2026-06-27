import { describe, it, expect } from "vitest";
import {
  DialogueTreeSchema,
  EFFECT_VERBS,
  GUARD_OPS,
  type DialogueTree,
} from "../tree";

/** A small, fully-valid tree exercising every guard/effect feature. */
function validTree(): DialogueTree {
  return {
    entry: [
      {
        node: "warm",
        guard: [{ fact: "regard", op: "gte", value: 20 }],
      },
      { node: "neutral" },
    ],
    nodes: {
      warm: {
        beat: "Good to see you again!",
        choices: [
          {
            line: "Likewise.",
            to: "neutral",
            effects: [{ verb: "regard", delta: 2 }],
          },
        ],
      },
      neutral: {
        beat: "What can I do for you?",
        choices: [
          {
            line: "Just looking.",
            guard: [{ fact: "trait:sociability", op: "gt", value: 0 }],
            to: "bye",
            effects: [{ verb: "set-state", key: "browsed", value: true }],
          },
          {
            line: "Tell me about the hour.",
            guard: [{ fact: "time:hour", op: "lt", value: 12 }],
            effects: [{ verb: "say", line: "It's still morning." }, { verb: "end" }],
          },
          {
            line: "Got a state secret?",
            guard: [{ fact: "state:browsed", op: "eq", value: true }],
            effects: [{ verb: "goto", node: "warm" }],
          },
        ],
      },
      bye: {
        beat: "Take care.",
        terminal: true,
      },
    },
  };
}

describe("DialogueTreeSchema.validate", () => {
  it("accepts a fully-valid tree", () => {
    expect(DialogueTreeSchema.validate(validTree())).toEqual([]);
  });

  it("rejects a dangling choice.to target", () => {
    const tree = validTree();
    tree.nodes.warm!.choices![0]!.to = "nowhere";
    const errors = DialogueTreeSchema.validate(tree);
    expect(errors.some((e) => e.includes("'nowhere' has no matching node"))).toBe(
      true,
    );
  });

  it("rejects a dangling entry node", () => {
    const tree = validTree();
    tree.entry[0]!.node = "ghost";
    const errors = DialogueTreeSchema.validate(tree);
    expect(errors.some((e) => e.includes("entry[0].node 'ghost'"))).toBe(true);
  });

  it("rejects an unknown effect verb", () => {
    const tree = validTree() as unknown as Record<string, unknown>;
    (tree.nodes as Record<string, { choices: { effects: unknown[] }[] }>).warm!
      .choices[0]!.effects = [{ verb: "teleport" }];
    const errors = DialogueTreeSchema.validate(tree);
    expect(
      errors.some((e) => e.includes("'teleport' is not a registered effect")),
    ).toBe(true);
  });

  it("rejects an unknown guard fact", () => {
    const tree = validTree() as unknown as Record<string, unknown>;
    (
      tree.nodes as Record<string, { choices: { guard: unknown[] }[] }>
    ).neutral!.choices[0]!.guard = [{ fact: "wealth", op: "gt", value: 0 }];
    const errors = DialogueTreeSchema.validate(tree);
    expect(
      errors.some((e) => e.includes("'wealth' is not a recognized fact")),
    ).toBe(true);
  });

  it("rejects an unknown trait axis but accepts a real one", () => {
    const bad = validTree();
    bad.nodes.neutral!.choices![0]!.guard = [
      { fact: "trait:charisma", op: "gt", value: 0 },
    ];
    expect(
      DialogueTreeSchema.validate(bad).some((e) =>
        e.includes("'trait:charisma'"),
      ),
    ).toBe(true);

    const good = validTree();
    good.nodes.neutral!.choices![0]!.guard = [
      { fact: "trait:honesty", op: "gt", value: 0 },
    ];
    expect(DialogueTreeSchema.validate(good)).toEqual([]);
  });

  it("rejects an unknown guard operator", () => {
    const tree = validTree();
    tree.entry[0]!.guard = [
      { fact: "regard", op: "approx" as never, value: 1 },
    ];
    const errors = DialogueTreeSchema.validate(tree);
    expect(errors.some((e) => e.includes("'approx' is not a recognized"))).toBe(
      true,
    );
  });

  it("rejects a goto effect pointing at a missing node", () => {
    const tree = validTree();
    tree.nodes.neutral!.choices![2]!.effects = [
      { verb: "goto", node: "void" },
    ];
    const errors = DialogueTreeSchema.validate(tree);
    expect(errors.some((e) => e.includes("goto requires an existing"))).toBe(
      true,
    );
  });

  it("tolerates malformed input with structured errors, never throwing", () => {
    expect(DialogueTreeSchema.validate(null)).toEqual(["tree must be an object"]);
    expect(DialogueTreeSchema.validate(42)).toEqual(["tree must be an object"]);
    expect(DialogueTreeSchema.validate({})).toEqual(
      expect.arrayContaining([
        "tree.nodes must be an object keyed by node id",
        "tree.entry must be a non-empty array",
      ]),
    );
    expect(
      DialogueTreeSchema.validate({ entry: [], nodes: {} }).some((e) =>
        e.includes("non-empty array"),
      ),
    ).toBe(true);
  });

  it("exposes stable vocabularies", () => {
    expect(EFFECT_VERBS).toContain("regard");
    expect(EFFECT_VERBS).toContain("set-state");
    expect(GUARD_OPS).toContain("gte");
  });
});
