/**
 * Block tests — the keystone value-object holds its parsed body and
 * captured lexical scope, and is inert (no execution surface of its
 * own).
 */

import { describe, it, expect } from "vitest";
import { Block } from "../Block";
import { Scope } from "../Scope";
import type { Script } from "../ast";
import { SCRIPT_ABORT_REASONS } from "../AbortReason";

describe("Block", () => {
  const body: Script = {
    kind: "script",
    statements: [
      { kind: "pipeline", commands: [{ kind: "command", word: "stir", args: [] }] },
    ],
  };

  it("holds its parsed body", () => {
    const block = new Block(body, new Scope());
    expect(block.getBody()).toBe(body);
  });

  it("captures the lexical scope it was defined in", () => {
    const captured = new Scope();
    captured.define("brand", "Vionne");
    const block = new Block(body, captured);
    expect(block.getCapturedScope()).toBe(captured);
    expect(block.getCapturedScope().get("brand")).toBe("Vionne");
  });
});

describe("AbortReason vocabulary", () => {
  it("registers the script-specific reasons plus the reused engagement ones", () => {
    expect(SCRIPT_ABORT_REASONS).toContain("barge-in");
    expect(SCRIPT_ABORT_REASONS).toContain("step-declined");
    expect(SCRIPT_ABORT_REASONS).toContain("resource-limit");
    // Reused (not re-declared) from the engagement registry.
    expect(SCRIPT_ABORT_REASONS).toContain("host-destroyed");
    expect(SCRIPT_ABORT_REASONS).toContain("cancelled");
  });
});
