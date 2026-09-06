/**
 * DispositionEntry — the ledger row Document. Asserts the collection name,
 * the persistent-field set, and the defaults.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from "vitest";
import DispositionEntry from "../DispositionEntry";
import { Collections } from "../../../../backend/PersistenceManager";
import { MixinApi } from "../../../api/mixin";

describe("DispositionEntry", () => {
  it("targets the disposition_events collection", () => {
    expect(DispositionEntry.collectionName).toBe(
      Collections.DispositionEvents
    );
    expect(Collections.DispositionEvents).toBe("disposition_events");
  });

  it("persists owner/kind/when/disposition/valence/tags/archetype", () => {
    expect(MixinApi.getAllPersistentFields(DispositionEntry)).toEqual([
      "owner",
      "kind",
      "when",
      "disposition",
      "valence",
      "tags",
      // ⭐ Which archetype minted a claim row. `kind` separates authored
      // from earned; it does NOT separate an archetype claim from a
      // deviation claim, and `deviation = derived − baseline` is
      // uncomputable without knowing the baseline.
      "archetype",
    ]);
  });

  it("defaults to a deed with neutral fields", () => {
    const e = new DispositionEntry();
    expect(e.owner).toBe("");
    expect(e.kind).toBe("deed");
    expect(e.when).toBeNull();
    expect(e.disposition).toBe("");
    expect(e.valence).toBe(0);
    expect(e.tags).toEqual([]);
  });
});
