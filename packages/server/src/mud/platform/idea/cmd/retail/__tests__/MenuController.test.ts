/**
 * ⭐⭐ `menu` — **both slates, in one act.**
 *
 * ⚠ This file exists because the drive found the bug the unit suite
 * could not: adding the mending `Tariff` to the hearthworks smithy
 * HID its forging menu, because the tariff read returned. A house that
 * makes things and also mends them is the ordinary case — it is the
 * whole of the repair shop's second-instance test — so the two blocks
 * compose.
 *
 * The negative matters as much as the positive: a room with neither
 * still refuses with `empty-result`, and a room with only one shows only
 * that one, with no empty heading.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MenuController from "../MenuController";
import Tariff from "../../../../thing/Tariff";
import CommerceMenu from "../../../../../lib/commerce/Menu";
import { Idea } from "../../../../../lib/stuff/Idea";
import { ContainerMixin } from "../../../../../lib/spatial/Container";
import { CraftingApi } from "../../../../../api/crafting";
import { MessageApi } from "../../../../../api/message";
import { MqlApi } from "../../../../../api/mql";
import { StuffApi } from "../../../../../api/stuff";
import { RecipeKnowledge } from "../../../../../lib/script/RecipeKnowledge";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import type { CommandContext } from "../../../../../api/command";
import type { Stuff } from "../../../../../lib/stuff/Stuff";

class TestRoom extends ContainerMixin(Idea) {}

let said: string[];
let note: ReturnType<typeof vi.fn>;

function stubScene(): void {
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toPeers = () => b;
    b.toSelf = (m: unknown) => {
      said.push(String(m));
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

/** The room's occupants, as the `peers` seed both resolvers read. */
function stubPeers(stuff: Stuff[]): void {
  vi.spyOn(MqlApi, "resolveMany").mockReturnValue({ stuff } as never);
}

function ctx(giver: unknown): CommandContext {
  note = vi.fn();
  return {
    commandGiver: giver,
    commandSource: null,
    location: null,
    note,
  } as unknown as CommandContext;
}

function slate(opts: { tariff: boolean; menu: boolean }): {
  giver: Stuff;
  peers: Stuff[];
} {
  // ⭐ The giver's surroundings ARE the stubbed `peers` seed — both
  // resolvers read exactly that — so no containment is built here.
  const giver = makeStuff(() => new TestRoom()) as unknown as Stuff;
  stampTemplatePathForTest(giver as never, "/test/smith");
  const peers: Stuff[] = [];
  if (opts.tariff) {
    const t = makeStuff(() => new Tariff());
    t.prices = { repair: 5 };
    t.services = { repair: "repair" };
    peers.push(t as unknown as Stuff);
  }
  if (opts.menu) {
    const m = makeStuff(() => new CommerceMenu());
    m.offeredRecipes = ["recipe/belt-knife"];
    peers.push(m as unknown as Stuff);
  }
  stubPeers(peers);
  return { giver, peers };
}

beforeEach(() => {
  installV1QuantityMarshallers();
  said = [];
  stubScene();
  vi.spyOn(RecipeKnowledge, "noteKnown").mockResolvedValue(undefined as never);
  vi.spyOn(CraftingApi, "offeredRecipes").mockResolvedValue([
    { recipeId: "recipe/belt-knife", name: "Belt Knife" },
  ] as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("`menu` reads every slate the house hangs", () => {
  it("⭐⭐ a venue carrying BOTH shows both — the drive's finding", async () => {
    const { giver } = slate({ tariff: true, menu: true });
    await makeStuff(() => new MenuController()).execute({}, ctx(giver));
    const out = said.join("\n");
    expect(out, "the services").toMatch(/The house does/);
    expect(out, "and the recipes — this is the regression").toMatch(
      /Belt Knife/,
    );
  });

  it("a tariff alone shows only the services, with no blank menu heading", async () => {
    const { giver } = slate({ tariff: true, menu: false });
    await makeStuff(() => new MenuController()).execute({}, ctx(giver));
    const out = said.join("\n");
    expect(out).toMatch(/The house does/);
    expect(out).not.toMatch(/On the menu/);
  });

  it("a menu alone shows only the recipes", async () => {
    const { giver } = slate({ tariff: false, menu: true });
    await makeStuff(() => new MenuController()).execute({}, ctx(giver));
    const out = said.join("\n");
    expect(out).toMatch(/Belt Knife/);
    expect(out).not.toMatch(/The house does/);
  });

  it("⚠ neither is still an honest refusal, with the note", async () => {
    const { giver } = slate({ tariff: false, menu: false });
    await makeStuff(() => new MenuController()).execute({}, ctx(giver));
    expect(said.join("\n")).toMatch(/no menu here/i);
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "empty-result" }),
    );
  });
});
