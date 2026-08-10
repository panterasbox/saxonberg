/**
 * GovernmentCatalogue tests — warm-from-templates over the Government leaf
 * roster, key lookup, malformed-row and malformed-seat rejection, cold
 * state, defensive copies, and singleton destruct refusal.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import GovernmentCatalogue from "../GovernmentCatalogue";
import Government from "../Government";
import { StuffApi } from "../../api/stuff";
import { ShadowApi } from "../../api/shadow";
import { Template } from "../../lib/stuff/Template";
import { makeStuff } from "../../lib/security/__tests__/test-setup";

type Loose = Record<string, unknown>;

function stubTemplates(governments: Loose[]): void {
  vi.spyOn(Template, "findDescendants").mockImplementation(
    async (basePath: string) => {
      if (basePath !== Government.TEMPLATE_PATH_PREFIX) return [];
      return governments.map((seed) => ({
        path: `${Government.TEMPLATE_PATH_PREFIX}${String(seed.key)}`,
        data: seed,
      })) as unknown as Template[];
    }
  );
}

async function warm(governments: Loose[]): Promise<GovernmentCatalogue> {
  stubTemplates(governments);
  const cat = makeStuff(() => new GovernmentCatalogue());
  await cat.postRegister();
  return cat;
}

const GOVERNMENTS: Loose[] = [
  {
    key: "terminus-realm",
    displayName: "the Realm of Terminus",
    description: "the young chartered order",
  },
  {
    key: "terminus-city",
    displayName: "the City of Terminus",
    treasury: "/domain/terminus/budget",
    departments: ["/domain/terminus/registry/business"],
    seats: [
      {
        key: "magistrate",
        label: "Magistrate of Terminus",
        department: "/domain/terminus/registry/business",
        positionKey: "magistrate",
      },
    ],
  },
  { key: "eternal-university", displayName: "the Eternal University" },
];

describe("GovernmentCatalogue", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warms the roster keyed by `key`", async () => {
    const cat = await warm(GOVERNMENTS);
    expect(cat.getGovernment("terminus-city")?.displayName).toBe(
      "the City of Terminus"
    );
    expect(cat.hasGovernment("terminus-realm")).toBe(true);
    expect(cat.allGovernments()).toHaveLength(3);
  });

  it("defaults a missing displayName to the key", async () => {
    const cat = await warm([{ key: "terminus-realm" }]);
    expect(cat.getGovernment("terminus-realm")?.displayName).toBe(
      "terminus-realm"
    );
  });

  it("drops malformed rows (no key) and malformed seats", async () => {
    const cat = await warm([
      { displayName: "no key" },
      {
        key: "terminus-city",
        seats: [
          { key: "magistrate", department: "/d/x", positionKey: "magistrate" },
          { key: "broken-no-department", positionKey: "clerk" },
          { label: "broken-no-key", department: "/d/x", positionKey: "p" },
        ],
      },
    ]);
    expect(cat.allGovernments()).toHaveLength(1);
    expect(cat.getGovernment("terminus-city")?.seats).toHaveLength(1);
    expect(cat.getGovernment("terminus-city")?.seats[0]?.key).toBe(
      "magistrate"
    );
  });

  it("defaults a seat's missing label to its key", async () => {
    const cat = await warm([
      {
        key: "terminus-city",
        seats: [
          { key: "magistrate", department: "/d/x", positionKey: "magistrate" },
        ],
      },
    ]);
    expect(cat.getGovernment("terminus-city")?.seats[0]?.label).toBe(
      "magistrate"
    );
  });

  it("degrades to empty in the cold (un-warmed) state", () => {
    const cat = makeStuff(() => new GovernmentCatalogue());
    expect(cat.getGovernment("terminus-city")).toBeNull();
    expect(cat.hasGovernment("terminus-city")).toBe(false);
    expect(cat.allGovernments()).toEqual([]);
  });

  it("returns defensive copies callers can't mutate", async () => {
    const cat = await warm(GOVERNMENTS);
    const g = cat.getGovernment("terminus-city")!;
    g.departments.push("/mutated");
    g.seats[0]!.label = "mutated";
    const again = cat.getGovernment("terminus-city")!;
    expect(again.departments).toEqual(["/domain/terminus/registry/business"]);
    expect(again.seats[0]!.label).toBe("Magistrate of Terminus");
  });

  it("refuses to be destructed", async () => {
    const cat = await warm(GOVERNMENTS);
    expect(cat.canDestruct().ok).toBe(false);
  });
});
