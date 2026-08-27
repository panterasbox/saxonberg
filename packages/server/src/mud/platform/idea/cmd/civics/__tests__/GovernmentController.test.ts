/**
 * GovernmentController — the `government` verb driven as the dispatcher
 * would: bare/list renders the subjectTo chain (most local first, seats
 * with holders, the residency command link), the empty chain is honest
 * prose + a structured note, and `residency` renders the domicile line +
 * chain (undomiciled → honest prose + note).
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import GovernmentController from "../GovernmentController";
import GovernmentCatalogue from "../../../GovernmentCatalogue";
import Government from "../../../Government";
import AddressRegistry from "../../../AddressRegistry";
import Locality from "../../../Locality";
import Location from "../../../../../lib/stuff/Location";
import { NPC } from "../../../../../lib/npc/NPC";
import { AddressApi } from "../../../../../api/address";
import { ContainmentApi } from "../../../../../api/containment";
import { MessageApi } from "../../../../../api/message";
import { StuffApi } from "../../../../../api/stuff";
import { ShadowApi } from "../../../../../api/shadow";
import { Template } from "../../../../../lib/stuff/Template";
import { ExecutionContextApi } from "../../../../../api/execution-context";
import type { CommandContext, CommandModel } from "../../../../../api/command";
import type { Stuff } from "../../../../../lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../../lib/security/__tests__/test-setup";

type Loose = Record<string, unknown>;

class TestLocation extends Location {}

const BUSINESS = "/world/terminus/registry/business";

const GOVERNMENTS: Loose[] = [
  {
    key: "narnia-gov",
    displayName: "the Realm of Narnia",
    description: "the old crown",
  },
  {
    key: "castle-gov",
    displayName: "the Castle Seneschalsy",
    charter: "/charters/castle",
    seats: [
      {
        key: "seneschal",
        label: "Seneschal",
        department: BUSINESS,
        positionKey: "seneschal",
      },
    ],
  },
];

let captured: string[];

function captureScenes(): void {
  captured = [];
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: { toString(): string }) => {
      captured.push(String(body));
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

async function warmCatalogue(): Promise<void> {
  vi.spyOn(Template, "findByPath").mockResolvedValue(null);
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
    "/platform/idea/GovernmentCatalogue"
  );
  await cat.postRegister();
}

function installLocality(
  path: string,
  address: string,
  governmentKey: string | null
): void {
  const loc = makeStuffAtPath(() => {
    const l = new Locality();
    l.setName(address);
    l.setAddress(address);
    l.setGovernmentKey(governmentKey);
    return l;
  }, path);
  AddressApi.registerLocality(loc);
}

function ctx(giver: Stuff): CommandContext & { note: ReturnType<typeof vi.fn> } {
  return {
    commandGiver: giver,
    note: vi.fn(),
  } as unknown as CommandContext & { note: ReturnType<typeof vi.fn> };
}

async function run(
  giver: Stuff,
  model: CommandModel,
  context: CommandContext
): Promise<void> {
  await withRootContext(null, "government-verb.test", () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return makeStuff(() => new GovernmentController()).execute(
      model as never,
      context
    );
  });
}

async function giverInAddressedRoom(address: string | null): Promise<Stuff> {
  const room = makeStuff(() => {
    const r = new TestLocation();
    if (address) r.setAddress(address);
    return r;
  });
  const npc = makeStuff(() => new NPC());
  await withRootContext(null, "government-verb.test", () =>
    ContainmentApi.move(npc, room)
  );
  return npc;
}

describe("GovernmentController", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    makeStuffAtPath(() => new AddressRegistry(), "/platform/idea/AddressRegistry");
    await warmCatalogue();
    installLocality("/stuff/idea/Locality/narnia", "narnia", "narnia-gov");
    installLocality(
      "/stuff/idea/Locality/cair-paravel",
      "narnia/castle",
      "castle-gov"
    );
    captureScenes();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bare `government` renders the chain most local first", async () => {
    const giver = await giverInAddressedRoom("narnia/castle/closet");
    await run(giver, { subcommand: undefined } as CommandModel, ctx(giver));
    const out = captured.join("\n");
    expect(out).toContain("the Castle Seneschalsy");
    expect(out).toContain("the Realm of Narnia");
    expect(out.indexOf("Castle Seneschalsy")).toBeLessThan(
      out.indexOf("Realm of Narnia")
    );
    // Seats render with a vacancy, the charter renders, and the
    // residency follow-up is a clickable command link.
    expect(out).toContain("Seneschal");
    expect(out).toContain("(vacant)");
    expect(out).toContain("/charters/castle");
    expect(out).toContain("mudcmd:government residency");
  });

  it("renders honest prose + a note when no government claims here", async () => {
    const giver = await giverInAddressedRoom(null);
    const context = ctx(giver);
    await run(giver, { subcommand: "list" } as CommandModel, context);
    expect(captured.join("\n")).toContain("No government claims this ground");
    expect(context.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "no-government" })
    );
  });

  it("`government residency` renders the domicile chain", async () => {
    const giver = await giverInAddressedRoom("narnia/castle/closet");
    (giver as InstanceType<typeof NPC>).setDomicileAddress("narnia/quarters");
    await run(giver, { subcommand: "residency" } as CommandModel, ctx(giver));
    const out = captured.join("\n");
    expect(out).toContain("Domiciled at narnia/quarters");
    expect(out).toContain("the Realm of Narnia");
    expect(out).not.toContain("Castle Seneschalsy");
  });

  it("`government residency` is honest for the undomiciled", async () => {
    const giver = await giverInAddressedRoom("narnia/castle/closet");
    const context = ctx(giver);
    await run(giver, { subcommand: "residency" } as CommandModel, context);
    expect(captured.join("\n")).toContain("no domicile on record");
    expect(context.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "no-domicile" })
    );
  });
});
