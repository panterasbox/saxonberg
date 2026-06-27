/**
 * Discipline tests — field defaults, setter validation, and the
 * defensive-copy read surface.
 */

import { describe, it, expect, beforeEach } from "vitest";
import Discipline, { DISCIPLINE_CHANNELS } from "../Discipline";
import { StuffApi } from "../../../api/stuff";
import { ShadowApi } from "../../../api/shadow";
import { makeStuff } from "../../security/__tests__/test-setup";

const newDiscipline = (): Discipline => makeStuff(() => new Discipline());

describe("Discipline", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  it("defaults to an empty skill node", () => {
    const d = newDiscipline();
    expect(d.getKey()).toBe("");
    expect(d.getChannel()).toBe("skill");
    expect(d.getRequires()).toEqual([]);
    expect(d.getSpecializes()).toEqual([]);
    expect(d.getSynergizes()).toEqual([]);
    expect(d.getConferrals()).toEqual([]);
  });

  it("exposes the three learning channels", () => {
    expect([...DISCIPLINE_CHANNELS]).toEqual([
      "skill",
      "knowledge",
      "conditioning",
    ]);
  });

  it("setKey rejects an empty key", () => {
    const d = newDiscipline();
    expect(() => d.setKey("")).toThrow(TypeError);
    d.setKey("mixology");
    expect(d.getKey()).toBe("mixology");
  });

  it("setChannel rejects an unknown channel", () => {
    const d = newDiscipline();
    expect(() => d.setChannel("vibes" as never)).toThrow(TypeError);
    d.setChannel("conditioning");
    expect(d.getChannel()).toBe("conditioning");
  });

  it("setLabel rejects an empty label", () => {
    const d = newDiscipline();
    expect(() => d.setLabel("")).toThrow(TypeError);
  });

  it("edge + conferral readers return defensive copies", () => {
    const d = newDiscipline();
    d.requires = ["recipe-knowledge"];
    d.conferrals = [{ band: "competent", verbs: ["flourish"] }];

    const reqs = d.getRequires();
    reqs.push("tampered");
    expect(d.getRequires()).toEqual(["recipe-knowledge"]);

    const conf = d.getConferrals();
    conf[0]!.verbs.push("tampered");
    expect(d.getConferrals()[0]!.verbs).toEqual(["flourish"]);
  });

  it("declares its persistent fields", () => {
    expect(Discipline.persistentFields).toContain("key");
    expect(Discipline.persistentFields).toContain("channel");
    expect(Discipline.persistentFields).toContain("conferrals");
  });
});
