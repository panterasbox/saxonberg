import { describe, it, expect } from "vitest";
import { CombatTerms, DEFAULT_TERMS, type TermsProposal } from "../CombatTerms";

const nonLethal: TermsProposal = {
  lethality: "non-lethal",
  stopCondition: "yield",
  stakes: "",
};
const lethal: TermsProposal = {
  lethality: "lethal",
  stopCondition: "death",
  stakes: "",
};

describe("CombatTerms.reconcile", () => {
  it("agrees silently when both sides want non-lethal", () => {
    const r = CombatTerms.reconcile(nonLethal, nonLethal);
    expect(r.status).toBe("agreed");
  });

  it("conflicts when lethal meets non-lethal (the prompt trigger)", () => {
    const r = CombatTerms.reconcile(lethal, nonLethal);
    expect(r.status).toBe("conflict");
  });

  it("folds to the milder stop-condition when lethality agrees", () => {
    const r = CombatTerms.reconcile(
      { ...nonLethal, stopCondition: "incapacitation" },
      { ...nonLethal, stopCondition: "first-blood" },
    );
    expect(r.status).toBe("agreed");
    if (r.status === "agreed") {
      expect(r.terms.stopCondition).toBe("first-blood");
    }
  });

  it("clamps a non-lethal fight away from a death terminus", () => {
    const terms = CombatTerms.agreed(
      "p1",
      { lethality: "non-lethal", stopCondition: "death", stakes: "" },
      true,
    );
    expect(terms.stopCondition).toBe("incapacitation");
    expect(terms.isLethalAuthorized()).toBe(false);
  });

  it("carries the consent flag and initiator", () => {
    const terms = CombatTerms.agreed("p1", lethal, false);
    expect(terms.initiator).toBe("p1");
    expect(terms.consented).toBe(false);
    expect(terms.isLethalAuthorized()).toBe(true);
  });

  it("default terms are a frictionless non-lethal scuffle", () => {
    expect(DEFAULT_TERMS.lethality).toBe("non-lethal");
  });
});
