/**
 * The civics flagship, end-to-end over the ACTUAL authored seeds: parse
 * the shipped Locality + Government + content YAML from disk (no stub
 * data), wire the catalogue and the coverage index from it, and prove
 * the three-tier chain — a dorm address resolves [eternal-university,
 * terminus-city, terminus-realm], the terminal resolves [terminus-city,
 * terminus-realm] (sparse inheritance on real content), the clerk holds
 * the Magistrate seat via the authored roster, the clerk's domicile
 * chain reads [city, realm], and the narnia roster stays untouched. Any
 * key/address mismatch between the seed files fails here.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { parse } from "yaml";
import { GovernmentApi } from "../../../api/government";
import { AddressApi } from "../../../api/address";
import GovernmentCatalogue from "../../GovernmentCatalogue";
import Government from "../../Government";
import AddressRegistry from "../../AddressRegistry";
import Locality from "../../Locality";
import { NPC } from "../../../lib/npc/NPC";
import { StuffApi } from "../../../api/stuff";
import { ShadowApi } from "../../../api/shadow";
import { Template } from "../../../lib/stuff/Template";
import {
  makeStuffAtPath,
} from "../../../lib/security/__tests__/test-setup";

type Loose = Record<string, unknown>;

const seedsRoot = fileURLToPath(new URL("../../../seeds", import.meta.url));

function seedData(relative: string): Loose {
  const doc = parse(readFileSync(`${seedsRoot}/${relative}`, "utf8")) as {
    data?: Loose;
  };
  return doc.data ?? {};
}

/** The shipped Locality roster (every seeds/lib/address leaf). */
const LOCALITY_SEEDS = [
  "obj/Locality/narnia.yaml",
  "obj/Locality/cair-paravel.yaml",
  "obj/Locality/lantern-waste.yaml",
  "obj/Locality/terminus.yaml",
  "obj/Locality/terminus-city.yaml",
  "obj/Locality/eternal-campus.yaml",
];

const GOVERNMENT_SEEDS = [
  "obj/Government/terminus-realm.yaml",
  "obj/Government/terminus-city.yaml",
  "obj/Government/eternal-university.yaml",
];

const CLERK_PATH = "/domain/terminus/registry/clerk";

async function wireFromSeeds(): Promise<void> {
  makeStuffAtPath(() => new AddressRegistry(), "/obj/AddressRegistry");

  for (const file of LOCALITY_SEEDS) {
    const data = seedData(file);
    const loc = makeStuffAtPath(() => {
      const l = new Locality();
      l.setName(String(data.name ?? ""));
      l.setAddress(String(data._address ?? ""));
      l.setGovernmentKey(
        typeof data._governmentKey === "string" ? data._governmentKey : null
      );
      return l;
    }, `/obj/Locality/${file.split("/").pop()!.replace(".yaml", "")}`);
    AddressApi.registerLocality(loc);
  }

  const governments = GOVERNMENT_SEEDS.map((file) => seedData(file));
  vi.spyOn(Template, "findDescendants").mockImplementation(
    async (basePath: string) => {
      if (basePath !== Government.TEMPLATE_PATH_PREFIX) return [];
      return governments.map((data) => ({
        path: `${Government.TEMPLATE_PATH_PREFIX}${String(data.key)}`,
        data,
      })) as unknown as Template[];
    }
  );
  // The Registry business template row, exactly as authored.
  const business = seedData("domain/terminus/registry/business.yaml");
  vi.spyOn(Template, "findByPath").mockImplementation(
    async (path: string) => {
      if (path !== "/domain/terminus/registry/business") return null;
      return { path, data: business } as unknown as Template;
    }
  );

  const cat = makeStuffAtPath(
    () => new GovernmentCatalogue(),
    "/obj/GovernmentCatalogue"
  );
  await cat.postRegister();
}

describe("the civics flagship (authored seeds, end-to-end)", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    await wireFromSeeds();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("a dorm address resolves the three-deep chain", () => {
    // The address the duncan-hall room seeds declare.
    const dorm = seedData("domain/eternal/duncan-hall/dormroom.yaml");
    expect(dorm._address).toBe("terminus/city/campus/duncan-hall");
    const chain = GovernmentApi.governmentChainAt(String(dorm._address));
    expect(chain.map((g) => g.key)).toEqual([
      "eternal-university",
      "terminus-city",
      "terminus-realm",
    ]);
    expect(chain.map((g) => g.displayName)).toEqual([
      "the Eternal University",
      "the City of Terminus",
      "the Realm of Terminus",
    ]);
  });

  it("the terminal resolves [city, realm] — sparse inheritance on real content", () => {
    const gate = seedData("domain/terminus/terminal/arrival-gate.yaml");
    expect(gate._address).toBe("terminus/city/arrival-gate");
    const chain = GovernmentApi.governmentChainAt(String(gate._address));
    expect(chain.map((g) => g.key)).toEqual(["terminus-city", "terminus-realm"]);
  });

  it("the Registry office sits under the city, and its exits pair with the gate", () => {
    const office = seedData("domain/terminus/registry/office.yaml");
    expect(office._address).toBe("terminus/city/civic/registry");
    expect(
      GovernmentApi.governmentAt(String(office._address))?.key
    ).toBe("terminus-city");
    // The cross-zone exit pair, declared on both sides.
    const exits = office.exits as Record<string, { destination: string }>;
    expect(exits.west!.destination).toBe(
      "/domain/terminus/terminal/arrival-gate"
    );
    const gate = seedData("domain/terminus/terminal/arrival-gate.yaml");
    const gateExits = gate.exits as Record<string, { destination: string }>;
    expect(gateExits.east!.destination).toBe(
      "/domain/terminus/registry/office"
    );
  });

  it("the clerk holds the Magistrate seat via the authored roster", async () => {
    const clerk = makeStuffAtPath(() => new NPC(), CLERK_PATH);
    await expect(
      GovernmentApi.holdsSeat(clerk, "terminus-city", "magistrate")
    ).resolves.toBe(true);
    // And the registrar's counter, the double-hat.
    const seats = await GovernmentApi.seatsOf("terminus-city");
    expect(seats).toHaveLength(1);
    expect(seats[0]!.holder).toBe(CLERK_PATH);
  });

  it("the clerk's authored domicile resolves [city, realm]", () => {
    const clerkSeed = seedData("domain/terminus/registry/clerk.yaml");
    const clerk = makeStuffAtPath(() => {
      const n = new NPC();
      n.setDomicileAddress(String(clerkSeed._domicileAddress));
      return n;
    }, CLERK_PATH);
    expect(GovernmentApi.residentOf(clerk).map((g) => g.key)).toEqual([
      "terminus-city",
      "terminus-realm",
    ]);
  });

  it("the city's treasury and departments point at shipped substrate paths", () => {
    const city = GovernmentApi.getGovernment("terminus-city")!;
    expect(city.treasury).toBe("/domain/terminus/budget");
    expect(city.departments).toEqual(["/domain/terminus/registry/business"]);
    // The realm and university stay thin — identity + jurisdiction only.
    expect(GovernmentApi.getGovernment("terminus-realm")!.seats).toEqual([]);
    expect(
      GovernmentApi.getGovernment("eternal-university")!.departments
    ).toEqual([]);
  });

  it("the narnia roster stays untouched — no shipped government keys", () => {
    expect(GovernmentApi.governmentChainAt("narnia/castle/closet")).toEqual(
      []
    );
    // And the shipped narnia Locality seeds declare no government.
    for (const file of [
      "obj/Locality/narnia.yaml",
      "obj/Locality/cair-paravel.yaml",
      "obj/Locality/lantern-waste.yaml",
    ]) {
      expect(seedData(file)._governmentKey).toBeUndefined();
    }
  });
});
