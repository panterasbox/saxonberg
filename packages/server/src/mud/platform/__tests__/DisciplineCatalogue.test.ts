/**
 * DisciplineCatalogue tests — warm-from-templates, key lookup, edge
 * readers, conferral readers, malformed-entry rejection, cold state, and
 * singleton destruct refusal.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import DisciplineCatalogue from "../idea/DisciplineCatalogue";
import Discipline from "../idea/Discipline";
import { StuffApi } from "../../api/stuff";
import { ShadowApi } from "../../api/shadow";
import { Template } from "../../lib/stuff/Template";
import { makeStuff } from "../../lib/security/__tests__/test-setup";
const DISCIPLINE_PATH_PREFIX = '/arcana/idea/Discipline/';
const DISCIPLINE_CLASS = '/platform/idea/Discipline';

type Loose = Record<string, unknown>;

function stubDisciplineTemplates(seeds: Loose[]): void {
  vi.spyOn(Template, "findByClass").mockImplementation(
    async (basePath: string) => {
      if (basePath !== DISCIPLINE_CLASS) return [];
      return seeds.map((seed) => ({
        path: `${DISCIPLINE_PATH_PREFIX}${String(seed.key)}`,
        data: seed,
      })) as unknown as Template[];
    }
  );
}

async function warmCatalogue(seeds: Loose[]): Promise<DisciplineCatalogue> {
  stubDisciplineTemplates(seeds);
  const cat = makeStuff(() => new DisciplineCatalogue());
  await cat.postRegister();
  return cat;
}

const SEED: Loose[] = [
  { key: "bartending", channel: "skill", label: "Bartending" },
  { key: "recipe-knowledge", channel: "knowledge", label: "Recipe Knowledge" },
  {
    key: "mixology",
    channel: "skill",
    label: "Mixology",
    iscedf: "1013",
    requires: ["recipe-knowledge"],
    specializes: ["bartending"],
    conferrals: [{ band: "competent", verbs: ["flourish"] }],
  },
  { key: "appraisal", channel: "skill", label: "Appraisal", synergizes: ["mixology"] },
  { key: "darts", channel: "skill", label: "Darts" },
  { key: "alcohol-tolerance", channel: "conditioning", label: "Alcohol Tolerance" },
];

describe("DisciplineCatalogue", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warms an authored descriptor keyed by `key`", async () => {
    const cat = await warmCatalogue(SEED);
    const d = cat.getDiscipline("mixology");
    expect(d?.key).toBe("mixology");
    expect(d?.channel).toBe("skill");
    expect(d?.label).toBe("Mixology");
  });

  it("carries the ISCED-F real-taxonomy anchor (defaulting to empty)", async () => {
    const cat = await warmCatalogue(SEED);
    expect(cat.getDiscipline("mixology")?.iscedf).toBe("1013");
    // Unanchored Disciplines default to '' (e.g. conditioning channels).
    expect(cat.getDiscipline("alcohol-tolerance")?.iscedf).toBe("");
  });

  it("seeds all three channels", async () => {
    const cat = await warmCatalogue(SEED);
    const channels = new Set(cat.allDisciplines().map((d) => d.channel));
    expect(channels).toEqual(new Set(["skill", "knowledge", "conditioning"]));
  });

  it("exposes all three edge kinds and a standalone leaf", async () => {
    const cat = await warmCatalogue(SEED);
    expect(cat.getRequires("mixology")).toEqual(["recipe-knowledge"]);
    expect(cat.getSpecializes("mixology")).toEqual(["bartending"]);
    expect(cat.getSynergizes("appraisal")).toEqual(["mixology"]);
    // Darts is a leaf — no edges.
    expect(cat.getRequires("darts")).toEqual([]);
    expect(cat.getSpecializes("darts")).toEqual([]);
    expect(cat.getSynergizes("darts")).toEqual([]);
  });

  it("reads band-gated conferrals off the node", async () => {
    const cat = await warmCatalogue(SEED);
    expect(cat.getConferrals("mixology")).toEqual([
      { band: "competent", verbs: ["flourish"] },
    ]);
    expect(cat.getConferrals("darts")).toEqual([]);
  });

  it("has() reflects catalog membership", async () => {
    const cat = await warmCatalogue(SEED);
    expect(cat.has("darts")).toBe(true);
    expect(cat.has("nonexistent")).toBe(false);
    expect(cat.getDiscipline("nonexistent")).toBeNull();
  });

  it("drops entries with a missing key or invalid channel", async () => {
    const cat = await warmCatalogue([
      { channel: "skill", label: "No Key" },
      { key: "bad-channel", channel: "vibes", label: "Bad Channel" },
      { key: "darts", channel: "skill", label: "Darts" },
    ]);
    expect(cat.allDisciplines().map((d) => d.key)).toEqual(["darts"]);
  });

  it("drops malformed conferral rules (unknown band)", async () => {
    const cat = await warmCatalogue([
      {
        key: "mixology",
        channel: "skill",
        label: "Mixology",
        conferrals: [
          { band: "wizard", verbs: ["x"] },
          { band: "expert", verbs: ["y"] },
        ],
      },
    ]);
    expect(cat.getConferrals("mixology")).toEqual([
      { band: "expert", verbs: ["y"] },
    ]);
  });

  it("returns defensive copies (caller mutation does not corrupt cache)", async () => {
    const cat = await warmCatalogue(SEED);
    const reqs = cat.getRequires("mixology");
    reqs.push("tampered");
    expect(cat.getRequires("mixology")).toEqual(["recipe-knowledge"]);
  });

  it("cold state (postRegister never awaited) degrades to no-such-Discipline", () => {
    const cat = makeStuff(() => new DisciplineCatalogue());
    expect(cat.getDiscipline("mixology")).toBeNull();
    expect(cat.has("mixology")).toBe(false);
    expect(cat.allDisciplines()).toEqual([]);
  });

  it("invalidateCache + re-warm picks up new templates", async () => {
    const cat = await warmCatalogue([
      { key: "darts", channel: "skill", label: "Darts" },
    ]);
    expect(cat.has("mixology")).toBe(false);
    stubDisciplineTemplates(SEED);
    cat.invalidateCache();
    await cat.postRegister();
    expect(cat.has("mixology")).toBe(true);
  });

  it("canDestruct refuses (singleton)", async () => {
    const cat = await warmCatalogue(SEED);
    const result = cat.canDestruct();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("singleton");
  });
});
