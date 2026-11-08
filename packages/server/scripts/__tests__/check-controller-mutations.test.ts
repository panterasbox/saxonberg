/** `lint:controller-mutations` seen to FAIL: a mutator call on a world object IS found. */

import { describe, expect, it } from "vitest";
import { parseTs } from "../pack-roots";
import { CONTROLLER_MUTATIONS_CEILING, census, mutationsIn } from "../check-controller-mutations";

const scan = (src: string) => mutationsIn(parseTs("/x.ts", src)).map((m) => m.call);

describe("the classifier", () => {
  it("FINDS a setter and a mutator on a world object", () => {
    expect(scan(`stack.setQuantity(3);\nsoil.addNitrogen(1);\nwound.getSeverity();`)).toEqual([
      "stack….setQuantity(",
      "soil….addNitrogen(",
    ]);
  });

  it("FINDS the slate's bare writers (`soil`)", () => {
    expect(scan(`garment.soil("mud", 2);`)).toEqual(["garment….soil("]);
  });

  it("orchestration through an Api, the controller itself and the envelope are not counted", () => {
    expect(scan(`ContainmentApi.move(a, b);\nthis.setThing(1);\nctx.note({});\nmap.set(k, v);`)).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("at or below the ceiling, above zero", () => {
    const n = census().length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(CONTROLLER_MUTATIONS_CEILING);
  });
});
