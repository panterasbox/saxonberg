/** `lint:mixin-files` seen to FAIL: a factory in a file not named for it IS found. */

import { describe, expect, it } from "vitest";
import { MIXIN_FILES_CEILING, census, misfiled } from "../check-mixin-files";

describe("the classifier", () => {
  it("FINDS a factory in a file not named for it, and a second factory sharing a file", () => {
    const src = `export function HeldGoodsMixin<T>(B: T) {}\nexport function ConsignmentShelfMixin(B) {}`;
    expect(misfiled("/lib/retail/Consignment.ts", src)).toEqual(["HeldGoodsMixin", "ConsignmentShelfMixin"]);
  });

  it("the same factory in its own file is clean", () => {
    expect(misfiled("/lib/retail/HeldGoods.ts", `export function HeldGoodsMixin<T>(B: T) {}`)).toEqual([]);
  });

  it("a factory named only in a comment is not a factory", () => {
    expect(misfiled("/lib/x/Y.ts", `// export function ZMixin(B) {}`)).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("at or below the ceiling", () => {
    expect(census().length).toBeLessThanOrEqual(MIXIN_FILES_CEILING);
  });
});
