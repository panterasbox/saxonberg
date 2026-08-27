/**
 * GovernmentApi / GovernmentLogic tests — the jurisdiction chain over the
 * demonstrative roster (nested ordering, off-grid, unknown-key drop,
 * dedupe), subjectTo through an addressed room, residency via the
 * domicile field (NPC included, undomiciled empty), and holdsSeat via
 * both paths (live Employment, authored roster) with exit suppression.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GovernmentApi } from "../../../api/government";
import { AddressApi } from "../../../api/address";
import GovernmentCatalogue from "../../GovernmentCatalogue";
import Government from "../../Government";
import AddressRegistry from "../../AddressRegistry";
import Locality from "../../Locality";
import Location from "../../../lib/stuff/Location";
import { NPC } from "../../../lib/npc/NPC";
import { StuffApi } from "../../../api/stuff";
import { ShadowApi } from "../../../api/shadow";
import { Template } from "../../../lib/stuff/Template";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../lib/security/__tests__/test-setup";

type Loose = Record<string, unknown>;

class TestLocation extends Location {}

const BUSINESS = "/world/terminus/registry/business";

const GOVERNMENTS: Loose[] = [
  { key: "narnia-gov", displayName: "the Realm of Narnia" },
  { key: "castle-gov", displayName: "the Castle Seneschalsy" },
  {
    key: "terminus-city",
    displayName: "the City of Terminus",
    seats: [
      {
        key: "magistrate",
        label: "Magistrate of Terminus",
        department: BUSINESS,
        positionKey: "magistrate",
      },
    ],
  },
];

async function warmCatalogue(): Promise<void> {
  vi.spyOn(Template, "findDescendants").mockImplementation(
    async (basePath: string) => {
      if (basePath !== Government.TEMPLATE_PATH_PREFIX) return [];
      return GOVERNMENTS.map((seed) => ({
        path: `${Government.TEMPLATE_PATH_PREFIX}${String(seed.key)}`,
        data: seed,
      })) as unknown as Template[];
    }
  );
  const cat = makeStuffAtPath(
    () => new GovernmentCatalogue(),
    "/obj/GovernmentCatalogue"
  );
  await cat.postRegister();
}

function installLocality(
  path: string,
  address: string,
  governmentKey: string | null
): Locality {
  const loc = makeStuffAtPath(() => {
    const l = new Locality();
    l.setName(address);
    l.setAddress(address);
    l.setGovernmentKey(governmentKey);
    return l;
  }, path);
  AddressApi.registerLocality(loc);
  return loc;
}

/**
 * The demonstrative roster with test government keys, set on test-cloned
 * Localities only — the shipped seeds stay clean.
 * narnia → narnia-gov; narnia/castle → castle-gov;
 * narnia/castle/keep → ghost-gov (NOT cataloged — the drop case);
 * narnia/castle/tower → narnia-gov again (the dedupe case);
 * narnia/wild → no key (the sparse case).
 */
function installRoster(): void {
  installLocality("/obj/Locality/narnia", "narnia", "narnia-gov");
  installLocality("/obj/Locality/cair-paravel", "narnia/castle", "castle-gov");
  installLocality("/obj/Locality/keep", "narnia/castle/keep", "ghost-gov");
  installLocality("/obj/Locality/tower", "narnia/castle/tower", "narnia-gov");
  installLocality("/obj/Locality/lantern-waste", "narnia/wild", null);
}

describe("GovernmentApi / GovernmentLogic", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    makeStuffAtPath(() => new AddressRegistry(), "/obj/AddressRegistry");
    await warmCatalogue();
    installRoster();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves the nested chain most-local first", () => {
    const chain = GovernmentApi.governmentChainAt("narnia/castle/closet");
    expect(chain.map((g) => g.key)).toEqual(["castle-gov", "narnia-gov"]);
    expect(GovernmentApi.governmentAt("narnia/castle/closet")?.key).toBe(
      "castle-gov"
    );
  });

  it("inherits through a key-less Locality (the sparse case)", () => {
    const chain = GovernmentApi.governmentChainAt("narnia/wild/thicket");
    expect(chain.map((g) => g.key)).toEqual(["narnia-gov"]);
  });

  it("resolves off-grid to an empty chain, never throwing", () => {
    expect(GovernmentApi.governmentChainAt("elsewhere/void")).toEqual([]);
    expect(GovernmentApi.governmentAt("elsewhere/void")).toBeNull();
    expect(GovernmentApi.governmentChainAt("")).toEqual([]);
  });

  it("drops a declared key unknown to the catalogue", () => {
    const chain = GovernmentApi.governmentChainAt("narnia/castle/keep/cell");
    expect(chain.map((g) => g.key)).toEqual(["castle-gov", "narnia-gov"]);
  });

  it("dedupes a repeated key, preserving the most-local position", () => {
    const chain = GovernmentApi.governmentChainAt("narnia/castle/tower/top");
    expect(chain.map((g) => g.key)).toEqual(["narnia-gov", "castle-gov"]);
  });

  it("subjectTo resolves through an addressed room", async () => {
    const room = makeStuff(() => {
      const r = new TestLocation();
      r.setAddress("narnia/castle/closet");
      return r;
    });
    const chain = await GovernmentApi.subjectTo(room);
    expect(chain.map((g) => g.key)).toEqual(["castle-gov", "narnia-gov"]);
  });

  it("residentOf derives from the domicile field (an NPC exemplar)", () => {
    const npc = makeStuff(() => new NPC());
    npc.setDomicileAddress("narnia/castle/quarters");
    expect(GovernmentApi.residentOf(npc).map((g) => g.key)).toEqual([
      "castle-gov",
      "narnia-gov",
    ]);
    expect(GovernmentApi.domicileAddressOf(npc)).toBe(
      "narnia/castle/quarters"
    );
  });

  it("residentOf is empty for the undomiciled", () => {
    const npc = makeStuff(() => new NPC());
    expect(GovernmentApi.residentOf(npc)).toEqual([]);
    expect(GovernmentApi.domicileAddressOf(npc)).toBeNull();
  });

  it("domicile persists-until-replaced: clearing writes are ignored", () => {
    const npc = makeStuff(() => new NPC());
    npc.setDomicileAddress("narnia/castle/quarters");
    npc.setDomicileAddress("");
    npc.setDomicileAddress(null);
    expect(GovernmentApi.domicileAddressOf(npc)).toBe(
      "narnia/castle/quarters"
    );
    npc.setDomicileAddress("narnia/wild/hut");
    expect(GovernmentApi.domicileAddressOf(npc)).toBe("narnia/wild/hut");
  });

  describe("holdsSeat", () => {
    it("is true via a live active Employment record", async () => {
      const npc = makeStuff(() => new NPC());
      npc.employments = [
        {
          organizationPath: BUSINESS,
          positionKey: "magistrate",
          status: "employed",
          hiredAt: 1,
          onShiftSince: null,
        },
      ];
      await expect(
        GovernmentApi.holdsSeat(npc, "terminus-city", "magistrate")
      ).resolves.toBe(true);
    });

    it("is true via the authored template roster (no live business)", async () => {
      vi.spyOn(Template, "findByPath").mockImplementation(
        async (path: string) => {
          if (path !== BUSINESS) return null;
          return {
            path,
            data: {
              rosterSlots: [
                {
                  positionKey: "magistrate",
                  assignee: "/world/terminus/registry/clerk",
                  schedule: [],
                },
              ],
            },
          } as unknown as Template;
        }
      );
      const clerk = makeStuffAtPath(
        () => new NPC(),
        "/world/terminus/registry/clerk"
      );
      await expect(
        GovernmentApi.holdsSeat(clerk, "terminus-city", "magistrate")
      ).resolves.toBe(true);
    });

    it("is false for the wrong seat, wrong character, or unknown government", async () => {
      const npc = makeStuff(() => new NPC());
      await expect(
        GovernmentApi.holdsSeat(npc, "terminus-city", "magistrate")
      ).resolves.toBe(false);
      await expect(
        GovernmentApi.holdsSeat(npc, "terminus-city", "no-such-seat")
      ).resolves.toBe(false);
      await expect(
        GovernmentApi.holdsSeat(npc, "no-such-gov", "magistrate")
      ).resolves.toBe(false);
    });

    it("an explicit exit record suppresses the roster path", async () => {
      vi.spyOn(Template, "findByPath").mockImplementation(
        async (path: string) => {
          if (path !== BUSINESS) return null;
          return {
            path,
            data: {
              rosterSlots: [
                {
                  positionKey: "magistrate",
                  assignee: "/world/terminus/registry/clerk",
                  schedule: [],
                },
              ],
            },
          } as unknown as Template;
        }
      );
      const clerk = makeStuffAtPath(
        () => new NPC(),
        "/world/terminus/registry/clerk"
      );
      clerk.employments = [
        {
          organizationPath: BUSINESS,
          positionKey: "magistrate",
          status: "quit",
          hiredAt: 1,
          onShiftSince: null,
        },
      ];
      await expect(
        GovernmentApi.holdsSeat(clerk, "terminus-city", "magistrate")
      ).resolves.toBe(false);
    });
  });

  it("seatsOf resolves each seat to its roster holder", async () => {
    vi.spyOn(Template, "findByPath").mockImplementation(
      async (path: string) => {
        if (path !== BUSINESS) return null;
        return {
          path,
          data: {
            rosterSlots: [
              {
                positionKey: "magistrate",
                assignee: "/world/terminus/registry/clerk",
                schedule: [],
              },
            ],
          },
        } as unknown as Template;
      }
    );
    const views = await GovernmentApi.seatsOf("terminus-city");
    expect(views).toHaveLength(1);
    expect(views[0]!.seat.key).toBe("magistrate");
    expect(views[0]!.holder).toBe("/world/terminus/registry/clerk");
    await expect(GovernmentApi.seatsOf("no-such-gov")).resolves.toEqual([]);
  });

  it("descriptor getters read the warmed catalogue", () => {
    expect(GovernmentApi.getGovernment("narnia-gov")?.displayName).toBe(
      "the Realm of Narnia"
    );
    expect(GovernmentApi.getGovernment("nope")).toBeNull();
    expect(
      GovernmentApi.listGovernments().map((g) => g.key).sort()
    ).toEqual(["castle-gov", "narnia-gov", "terminus-city"]);
  });
});
