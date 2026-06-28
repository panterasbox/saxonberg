/**
 * SocialLogic Phase 2 — the display-lensing occupant formatter
 * (`SocialApi.composeOccupants`). Exercises the density tiers, similarity
 * grouping, the `social.verbosity` modulation, the boosted lift + color
 * attribute, and the targetable (mudq-seeded) collapsed line.
 *
 * The occupant block is resolved eagerly for a single known viewer (the
 * Phase-2 deviation), so the returned `Mml` is fully materialized — tests
 * assert on its `toString()` markup directly. RecognitionApi /
 * GroupApi / MixinApi / ShellApi are stubbed so the formatter is exercised
 * without a live world; occupants are in-memory hosts carrying their own
 * display / species / worn-feature / membership state.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SocialApi } from "../../../api/social";
import { GroupApi } from "../../../api/group";
import { RecognitionApi } from "../../../api/recognition";
import { PlayerApi } from "../../../api/player";
import { MixinApi } from "../../../api/mixin";
import { ShellApi } from "../../../api/shell";
import { StuffApi } from "../../../api/stuff";
import { Idea } from "../../../lib/stuff/Idea";
import { NotifyPolicyMixin } from "../../../lib/social/NotifyPolicy";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../lib/security/__tests__/test-setup";

class NotifyHost extends NotifyPolicyMixin(Idea) {
  getPlayerId(): string {
    return "viewer";
  }
}

/**
 * An in-memory occupant. Carries the state the stubbed Recognition / Group
 * APIs read back: the viewer-aware display name, the species + plural form
 * (for grouped lines), the worn feature, recognition, and managed-group
 * membership.
 */
class Occupant extends Idea {
  display = "someone";
  speciesName: string | null = null;
  pluralForm = "";
  feature: string | null = null;
  recognized = true;
  groups = new Set<string>();

  getSpecies(): { getCommonNames(): string[] } | null {
    return this.speciesName
      ? { getCommonNames: () => [this.speciesName!] }
      : null;
  }
  getPluralForm(): string {
    return this.pluralForm;
  }
}

let occCounter = 0;
function makeOccupant(init: Partial<Occupant>): Occupant {
  const path = `/obj/Avatar/occ-${occCounter++}`;
  const o = makeStuffAtPath(() => new Occupant(), path);
  Object.assign(o, init);
  return o;
}

function makeDwarf(n: number): Occupant {
  return makeOccupant({
    display: `dwarf ${n}`,
    speciesName: "dwarf",
    pluralForm: "dwarves",
    feature: "red robes",
    recognized: false, // a stranger → strangers baseline (feature-string)
  });
}

let verbosity: string | undefined;

beforeEach(() => {
  StuffApi.clearAll();
  occCounter = 0;
  verbosity = undefined;

  vi.spyOn(PlayerApi, "isAvatarStuff").mockImplementation(
    (o: unknown) => (o as { getPlayerId?: unknown }).getPlayerId !== undefined,
  );
  vi.spyOn(MixinApi, "isOrganism").mockImplementation(
    (o: unknown): o is never => o instanceof Occupant,
  );
  vi.spyOn(GroupApi, "isMember").mockImplementation(
    async (pid: string, ref: string) => {
      const occ = StuffApi.findByTemplatePath(pid) as Occupant | null;
      return occ instanceof Occupant ? occ.groups.has(ref) : false;
    },
  );
  vi.spyOn(RecognitionApi, "recognizes").mockImplementation(
    (_v: unknown, subject: unknown) =>
      subject instanceof Occupant ? subject.recognized : true,
  );
  vi.spyOn(RecognitionApi, "describe").mockImplementation(
    (_v: unknown, t: unknown) =>
      t instanceof Occupant ? t.display : "someone",
  );
  vi.spyOn(RecognitionApi, "salientFeatures").mockImplementation(
    (t: unknown) => {
      if (!(t instanceof Occupant)) return "someone";
      const stem = t.speciesName ? `a ${t.speciesName}` : "someone";
      return t.feature ? `${stem} wearing ${t.feature}` : stem;
    },
  );
  vi.spyOn(ShellApi, "resolveSetting").mockImplementation(
    (_h: unknown, key: string) =>
      key === "social.verbosity"
        ? (verbosity as unknown as undefined)
        : undefined,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function makeViewer(): NotifyHost {
  return makeStuff(() => new NotifyHost());
}

describe("composeOccupants — density tiers", () => {
  it("<10: every occupant rendered individually (strangers full, not grouped)", async () => {
    const v = makeViewer();
    const dwarves = [makeDwarf(1), makeDwarf(2), makeDwarf(3)];
    const out = (await SocialApi.composeOccupants(v, dwarves, 5)).toString();
    // Each stranger gets its own <name> line, no mudq grouped handle.
    expect(out).toContain("dwarf 1");
    expect(out).toContain("dwarf 2");
    expect(out).not.toContain("mudq:");
  });

  it("30–100: strangers aggregate to a similarity-grouped count", async () => {
    const v = makeViewer();
    const dwarves = Array.from({ length: 12 }, (_, i) => makeDwarf(i));
    const out = (await SocialApi.composeOccupants(v, dwarves, 50)).toString();
    expect(out).toContain("12 dwarves in red robes");
    expect(out).toContain("mudq:dwarves in red robes");
    // The individual names are collapsed away.
    expect(out).not.toContain("dwarf 1<");
  });

  it("10–30: a recognized everyone-else occupant stays named while strangers do not group", async () => {
    const v = makeViewer();
    const known = makeOccupant({ display: "Bob", recognized: true });
    const dwarves = [makeDwarf(1), makeDwarf(2)];
    const out = (
      await SocialApi.composeOccupants(v, [known, ...dwarves], 20)
    ).toString();
    expect(out).toContain("Bob"); // everyone-else → named at this tier
    expect(out).not.toContain("mudq:"); // strangers not grouped yet at 10–30
  });

  it(">100: even recognized everyone-else occupants collapse; only boosted survive named", async () => {
    const v = makeViewer();
    // Three recognized, groupable (species+feature) everyone-else occupants.
    const crowd = Array.from({ length: 3 }, () =>
      makeOccupant({
        display: "Bob",
        recognized: true,
        speciesName: "human",
        pluralForm: "humans",
        feature: "grey cloaks",
      }),
    );
    const out = (await SocialApi.composeOccupants(v, crowd, 150)).toString();
    expect(out).toContain("3 humans in grey cloaks");
    expect(out).not.toContain("Bob");
  });
});

describe("composeOccupants — similarity grouping", () => {
  it("groups by (species, feature) into 'N <species> in <feature>'", async () => {
    const v = makeViewer();
    const dwarves = Array.from({ length: 4 }, (_, i) => makeDwarf(i));
    const out = (await SocialApi.composeOccupants(v, dwarves, 50)).toString();
    expect(out).toContain("4 dwarves in red robes");
  });

  it("falls back to '(N others present)' when no groupable tuple is shared", async () => {
    const v = makeViewer();
    // Strangers with a species but NO worn feature → no shared tuple.
    const featureless = Array.from({ length: 3 }, () =>
      makeOccupant({
        speciesName: "dwarf",
        pluralForm: "dwarves",
        feature: null,
        recognized: false,
      }),
    );
    const out = (
      await SocialApi.composeOccupants(v, featureless, 50)
    ).toString();
    expect(out).toContain("(3 others present)");
    expect(out).toContain("mudq:others");
    expect(out).not.toContain("in red robes");
  });
});

describe("composeOccupants — social.verbosity modulation", () => {
  it("minimal shifts one tier more aggressive (groups strangers at 10–30)", async () => {
    const v = makeViewer();
    const dwarves = Array.from({ length: 5 }, (_, i) => makeDwarf(i));

    verbosity = "standard";
    const std = (await SocialApi.composeOccupants(v, dwarves, 20)).toString();
    expect(std).not.toContain("mudq:"); // not grouped at 10–30 standard

    verbosity = "minimal";
    const min = (await SocialApi.composeOccupants(v, dwarves, 20)).toString();
    expect(min).toContain("5 dwarves in red robes"); // grouped one tier up
  });

  it("verbose disables collapse entirely even past 100", async () => {
    const v = makeViewer();
    const dwarves = Array.from({ length: 6 }, (_, i) => makeDwarf(i));
    verbosity = "verbose";
    const out = (await SocialApi.composeOccupants(v, dwarves, 150)).toString();
    expect(out).not.toContain("mudq:");
    expect(out).toContain("dwarf 0");
    expect(out).toContain("dwarf 5");
  });
});

describe("composeOccupants — boosted lift + color", () => {
  it("a boosted friend is full-named with its color attribute at every tier", async () => {
    const v = makeViewer();
    SocialApi.setRule(v, "managed:vip", {
      boostInDense: true,
      color: "teal",
      nameRendering: "name",
    });
    for (const size of [5, 20, 50, 150]) {
      const friend = makeOccupant({
        display: "Gimli",
        recognized: true,
        groups: new Set(["managed:vip"]),
      });
      const strangers = Array.from({ length: 4 }, (_, i) => makeDwarf(i));
      const out = (
        await SocialApi.composeOccupants(v, [friend, ...strangers], size)
      ).toString();
      expect(out, `size ${size}`).toContain('color="teal"');
      expect(out, `size ${size}`).toContain("Gimli");
      // Boosted name precedes any collapsed grouped handle.
      if (out.includes("mudq:")) {
        expect(out.indexOf("Gimli")).toBeLessThan(out.indexOf("mudq:"));
      }
    }
  });
});

describe("composeOccupants — aggregate stays targetable", () => {
  it("the collapsed line carries a resolvable mudq MQL seed", async () => {
    const v = makeViewer();
    const dwarves = Array.from({ length: 8 }, (_, i) => makeDwarf(i));
    const out = (await SocialApi.composeOccupants(v, dwarves, 50)).toString();
    // A <link href="mudq:..."> handle, not a dead string.
    expect(out).toMatch(/<link href="mudq:dwarves in red robes">/);
    expect(out).toContain("8 dwarves in red robes");
  });
});
