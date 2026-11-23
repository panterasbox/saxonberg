/**
 * check-wire-content unit tests — the classifier (a locality path, the
 * testbed, a firm, a comment) and the restart-copy rule, plus the live
 * census sitting at or under its ceiling (the invariant, not the number —
 * lint-family.md ratchet lesson 2).
 */

import { describe, expect, it } from "vitest";
// ⚠ The classifier's subject IS a locality path, so the fixtures below are
// built from parts: a literal would make this kernel test name shipped
// content (lint:test-content), which it does not.
const W = "/world";

import {
  WIRE_CONTENT_CEILING,
  census,
  placeholderIn,
  restartCopyIn,
  stripComments,
} from "../check-wire-content";

describe("placeholderIn", () => {
  it("finds a locality path in code", () => {
    expect(placeholderIn(`const BAR = '${W}/terminus/market/square';`)).toMatch(/terminus/);
  });

  it("finds a firm", () => {
    expect(placeholderIn("hand(s, '/corpo/goodkin/thing/coin');")).toMatch(/goodkin/);
  });

  it("⭐ the testbed is the suite's own and is not placeholder", () => {
    expect(placeholderIn("const PLAZA = '/world/testbed/location/plaza';")).toBeNull();
    expect(placeholderIn("committees: ['/world/testbed']")).toBeNull();
  });

  it("does not take a name that merely starts with testbed", () => {
    expect(placeholderIn(`const X = '${W}/testbedlam/x';`)).not.toBeNull();
  });

  it("a comment that says where a drive used to stand is not a dependency", () => {
    const src = [
      `/** Used to stand at ${W}/terminus/market. */`,
      "// and /corpo/goodkin's counter",
      `const P = '/world/testbed/location/plaza'; // not ${W}/lounge any more`,
    ].join("\n");
    expect(placeholderIn(src)).toBeNull();
  });

  it("keeps a URL (no space before the slashes)", () => {
    expect(stripComments(`fetch('http://x${W}/terminus')`)).toContain(`${W}/terminus`);
  });
});

describe("restartCopyIn", () => {
  it("refuses an import of the runner's boot or stop", () => {
    expect(restartCopyIn("import { bootOwnedWorld, WIRE_PORT } from '../src/runner/boot';")).toMatch(/bootOwnedWorld/);
    expect(restartCopyIn("import { stopOwnedWorld } from '../src/runner/boot';")).toMatch(/stopOwnedWorld/);
  });

  it("allows the log and port reads", () => {
    expect(restartCopyIn("import { WIRE_LOG, WIRE_PORT } from '../src/runner/boot';")).toBeNull();
  });

  it("refuses a file that names the preflight", () => {
    expect(restartCopyIn("spawnSync('node', ['scripts/dev-preflight.mjs'])")).toMatch(/preflight/);
  });

  it("a comment naming the old shape is history, not a copy", () => {
    expect(restartCopyIn("// ⚠ No `afterAll(stopOwnedWorld)` here; dev-preflight killed it")).toBeNull();
  });
});

describe("the live census", () => {
  it("⭐ is at or under its ceiling, with no restart copies", () => {
    const { naming, restarts } = census();
    expect(naming.length).toBeLessThanOrEqual(WIRE_CONTENT_CEILING);
    expect(restarts).toEqual([]);
  });
});
