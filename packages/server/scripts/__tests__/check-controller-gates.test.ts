/** `lint:controller-gates` seen to FAIL: a permission decided in a controller IS found. */

import { describe, expect, it } from "vitest";
import { CONTROLLER_GATES_CEILING, census, scanControllerGates } from "../check-controller-gates";

describe("the classifier", () => {
  it("FINDS each permission predicate", () => {
    const src = [
      "if (!(await AccessApi.can(giver, 'write', room))) return;",
      "if (!CompactApi.holdsOffice(giver, 'x')) return;",
      "const seat = AppApi.seatFor(giver);",
      "if (!board.isAudienceMemberOf(giver)) return;",
      "if (!lock.opensFor(giver)) return;",
      "if (thing.getOwner() !== giver.getPlayerId()) return;",
    ].join("\n");
    expect(scanControllerGates(src).map((f) => f.name)).toEqual([
      "AccessApi.can*",
      "CompactApi.holdsOffice",
      "AppApi.seatFor",
      "isAudienceMemberOf",
      "opensFor",
      "owner-vs-player",
    ]);
  });

  it("a comment is not a gate", () => {
    expect(scanControllerGates("// AccessApi.can(giver, 'write', room)\n/* lock.opensFor(x) */")).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("at the ceiling", () => {
    expect(census().length).toBe(CONTROLLER_GATES_CEILING);
  });
});
