/**
 * script parser tests — the tokenizer + recursive-descent parser.
 *
 * Cover: the bare-command msh fast path (byte-identical, incl. `( )` /
 * `$` / emote sigils riding through unchanged), statement separators
 * (the deliberate bash-rule `;` change), standalone blocks + nesting,
 * the `:{N unit}`-vs-`{block}` attachment disambiguation, the
 * pipe-shaped `Pipeline` node (built even though single-stage only),
 * the AST per production, and the `format()` round-trip.
 */

import { describe, it, expect } from "vitest";
import script from "../script";
import msh from "../msh";
import type { ParserContext } from "../../../../api/command";
import type { Script, Command } from "../../../script/ast";
import { ScriptApi } from "../../../../api/script";

// msh ignores the ParserContext; a minimal stub suffices.
const ctx = {
  commandGiver: {} as unknown,
  location: null,
  available: [],
} as unknown as ParserContext;

/** Parse and assert the script arm, returning the AST. */
function parseScript(text: string): Script {
  const result = script.parse(text, ctx);
  if (result instanceof Promise) throw new Error("unexpected async parse");
  if (!result.script) {
    throw new Error(
      `expected script AST, got ${JSON.stringify(result)} for: ${text}`,
    );
  }
  return result.script.ast;
}

/** The single command of a single-statement script. */
function soleCommand(ast: Script): Command {
  expect(ast.statements).toHaveLength(1);
  const pipeline = ast.statements[0]!;
  expect(pipeline.commands).toHaveLength(1);
  return pipeline.commands[0]!;
}

describe("script parser — bare-command fast path", () => {
  const corpus = [
    "look",
    "get the red ball",
    'say "hello world"',
    "go north",
    "inventory",
    "get (rose, daisy)", // MQL parens ride msh as words
    "pour gin $brand into shaker", // $ rides expandVariables
    "add water:{2 cups}", // glued MQL quantity
    "look --peek at rose",
  ];

  for (const text of corpus) {
    it(`delegates "${text}" to msh byte-identically`, () => {
      const fromScript = script.parse(text, ctx);
      const fromMsh = msh.parse(text, ctx);
      expect(fromScript).toEqual(fromMsh);
      // It is the parsed arm, not the script arm.
      expect((fromScript as { script?: unknown }).script).toBeUndefined();
    });
  }

  it("preserves the ;emote sigil through msh (emotePrefixed)", () => {
    const result = script.parse(";wave", ctx);
    expect((result as { parsed?: { emotePrefixed?: boolean } }).parsed
      ?.emotePrefixed).toBe(true);
  });

  it("preserves the :emote sigil through msh (emotePrefixed)", () => {
    const result = script.parse(":smile", ctx);
    expect((result as { parsed?: { emotePrefixed?: boolean } }).parsed
      ?.emotePrefixed).toBe(true);
  });

  it("leaves `|` reserved: a bare pipeline is msh's NYI error", () => {
    const result = script.parse("chest contents | where weapon", ctx);
    expect((result as { error?: string }).error).toBeDefined();
  });
});

describe("script parser — statement separators", () => {
  it("splits on top-level `;` into multiple statements", () => {
    const ast = parseScript("pour gin into shaker; stir; strain into glass");
    expect(ast.statements).toHaveLength(3);
    expect(ast.statements[0]!.commands[0]!.word).toBe("pour");
    expect(ast.statements[1]!.commands[0]!.word).toBe("stir");
    expect(ast.statements[2]!.commands[0]!.word).toBe("strain");
  });

  it("splits on newline into multiple statements", () => {
    const ast = parseScript("stir\nshake");
    expect(ast.statements).toHaveLength(2);
    expect(ast.statements[1]!.commands[0]!.word).toBe("shake");
  });

  it("drops empty statements from a trailing separator", () => {
    const ast = parseScript("stir; strain;");
    expect(ast.statements).toHaveLength(2);
  });

  it("the deliberate bash rule: unquoted `;` separates", () => {
    const ast = parseScript("say a; b");
    expect(ast.statements).toHaveLength(2);
    expect(ast.statements[0]!.commands[0]!.word).toBe("say");
    expect(ast.statements[1]!.commands[0]!.word).toBe("b");
  });

  it("the deliberate bash rule: a quoted `;` stays literal (one command)", () => {
    const result = script.parse('say "a; b"', ctx);
    // No top-level separator → fast path → a single parsed command.
    expect((result as { parsed?: unknown }).parsed).toBeDefined();
    expect((result as { script?: unknown }).script).toBeUndefined();
  });
});

describe("script parser — blocks", () => {
  it("parses a standalone block as a Block arg holding a parsed body", () => {
    const ast = parseScript("if (warm) { add ice }");
    const cmd = soleCommand(ast);
    expect(cmd.word).toBe("if");
    expect(cmd.args).toHaveLength(2);
    expect(cmd.args[0]).toEqual({ kind: "expr", source: "warm" });
    const block = cmd.args[1]!;
    if (block.kind !== "block") throw new Error("expected block");
    expect(block.body.statements).toHaveLength(1);
    expect(block.body.statements[0]!.commands[0]!.word).toBe("add");
  });

  it("parses a multi-statement block body (parsed once, recursively)", () => {
    const ast = parseScript("each (glass on bar) { collect it; wash it }");
    const cmd = soleCommand(ast);
    expect(cmd.word).toBe("each");
    const block = cmd.args[1]!;
    if (block.kind !== "block") throw new Error("expected block");
    expect(block.body.statements).toHaveLength(2);
    expect(block.body.statements[0]!.commands[0]!.word).toBe("collect");
    expect(block.body.statements[1]!.commands[0]!.word).toBe("wash");
  });

  it("disambiguates glued `:{N unit}` (word) from a standalone `{block}`", () => {
    // Glued quantity → one literal word with inner space intact.
    const glued = parseScript("add water:{2 cups}; stir");
    const addCmd = glued.statements[0]!.commands[0]!;
    expect(addCmd.args).toEqual([{ kind: "literal", value: "water:{2 cups}" }]);

    // Whitespace-delimited `{ … }` → a block arg.
    const standalone = parseScript("serve x { stir }");
    const serveCmd = soleCommand(standalone);
    expect(serveCmd.args[0]).toEqual({ kind: "literal", value: "x" });
    expect(serveCmd.args[1]!.kind).toBe("block");
  });

  it("reports an unbalanced block as a parse error", () => {
    const result = script.parse("if (x) { stir", ctx);
    expect((result as { error?: string }).error).toBeDefined();
  });
});

describe("script parser — args + pipeline node", () => {
  it("classifies $name as a VarRef and (expr) as an Expr", () => {
    const ast = parseScript("pour gin $brand into shaker; stir");
    const pour = ast.statements[0]!.commands[0]!;
    expect(pour.args).toEqual([
      { kind: "literal", value: "gin" },
      { kind: "var", name: "brand" },
      { kind: "literal", value: "into" },
      { kind: "literal", value: "shaker" },
    ]);
  });

  it("supports ${name} brace form", () => {
    const ast = parseScript("pour ${house-gin}; stir");
    expect(ast.statements[0]!.commands[0]!.args).toEqual([
      { kind: "var", name: "house-gin" },
    ]);
  });

  it("builds the pipe-shaped Pipeline node (single-stage execution only)", () => {
    const ast = parseScript("stir | strain; pour");
    expect(ast.statements).toHaveLength(2);
    expect(ast.statements[0]!.commands).toHaveLength(2);
    expect(ast.statements[0]!.commands[0]!.word).toBe("stir");
    expect(ast.statements[0]!.commands[1]!.word).toBe("strain");
  });
});

describe("script parser — format round-trip", () => {
  const sources = [
    "pour gin into shaker; stir; strain into glass",
    "if (warm) { add ice }",
    "each (glass on bar) { collect it; wash it }",
    "pour gin $brand into shaker; stir",
    "stir | strain; pour",
  ];

  for (const src of sources) {
    it(`parse(format(parse t)) ≡ parse(t) for "${src}"`, () => {
      const ast1 = parseScript(src);
      const formatted = ScriptApi.format(ast1);
      const ast2 = parseScript(formatted);
      expect(ast2).toEqual(ast1);
    });
  }
});
