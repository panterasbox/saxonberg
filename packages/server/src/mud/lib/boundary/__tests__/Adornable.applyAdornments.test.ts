import { describe, it, expect, afterEach, vi } from "vitest";
import CartesianLocation from "../../location/CartesianLocation";
import Thing from "../../stuff/Thing";
import { AdornmentMixin } from "../Adornment";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { makeStuff } from "../../security/__tests__/test-setup";

/**
 * AdornableMixin.applyAdornments — the declarative Phase-2 seam that
 * clones adornment templates and attaches them as fixtures (the
 * `applyExits` / `applyPopulates` precedent). The clone is stubbed so
 * the applier's own logic (clone -> guard -> addFixture) is exercised
 * without the Mongo template harness; the end-to-end seed path is
 * covered by the lounge integration tests.
 */

class TestFixture extends AdornmentMixin(Thing) {}

describe("AdornableMixin.applyAdornments", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("registers `adornments` as an instruction field (Hydrator Phase-2 dispatch)", () => {
    expect(MixinApi.getAllInstructionFields(CartesianLocation)).toContain(
      "adornments"
    );
  });

  it("clones each spec and attaches it as a fixture, stamping adornedTo", async () => {
    const loc = makeStuff(() => new CartesianLocation());
    const fx = makeStuff(() => new TestFixture());
    const clone = vi
      .spyOn(StuffApi, "clone")
      .mockResolvedValue(fx as never);

    await loc.applyAdornments([
      { template: "/test/neon", slot: "sign:left" },
    ]);

    expect(clone).toHaveBeenCalledWith("/test/neon");
    expect(loc.hasFixture(fx)).toBe(true);
    expect(fx.getAdornedTo()).toBe(loc);
  });

  it("accepts a bare path string (auto-slot)", async () => {
    const loc = makeStuff(() => new CartesianLocation());
    const fx = makeStuff(() => new TestFixture());
    vi.spyOn(StuffApi, "clone").mockResolvedValue(fx as never);

    await loc.applyAdornments(["/test/neon"]);

    expect(loc.getFixtures()).toContain(fx);
  });

  it("throws when a template does not compose AdornmentMixin", async () => {
    const loc = makeStuff(() => new CartesianLocation());
    const notFixture = makeStuff(() => new Thing());
    vi.spyOn(StuffApi, "clone").mockResolvedValue(notFixture as never);

    await expect(loc.applyAdornments(["/test/plain"])).rejects.toThrow(
      /not an[\s\S]*Adornment/
    );
  });

  it("tolerates a non-array spec as a no-op", async () => {
    const loc = makeStuff(() => new CartesianLocation());
    await expect(
      loc.applyAdornments(undefined as never)
    ).resolves.toBeUndefined();
  });
});
