/**
 * ⭐⭐ The chain keeps a fibre's material — and says who made it.
 *
 * Until the silk build `spin` and `weave` cloned their fixed rows and set
 * only a quantity, a count and a band: the row's linen stood, so spun wool
 * came off the wheel as *a skein of linen yarn* and wove into *a bolt of
 * linen*. Nothing in the suite noticed, because every test spun flax.
 *
 * Real controllers, real engaged steps; only the row clone is stubbed (the
 * rows' own resolution is the content tests' claim).
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import SpinController from "../idea/cmd/textiles/SpinController";
import WeaveController from "../idea/cmd/textiles/WeaveController";
import TextileStock from "../thing/TextileStock";
import ClothBolt from "../thing/ClothBolt";
import { Grade } from "@saxonberg/server/mud/lib/craft/Grade";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import Material from "@saxonberg/server/mud/platform/idea/material/Material";
import { Construction } from "@saxonberg/server/mud/lib/material/Construction";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import {
  TestActor,
  makeContext,
  completeStep,
  ref,
  standUpBranchHarness,
  registerMaterial,
} from "@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";

const LINEN = "/stuff/idea/material/textile/linen";
const WOOL = "/stuff/idea/material/textile/wool";

let actor: TestActor;
let room: TestActor;

function material(path: string): Material {
  return StuffApi.findByTemplatePath<Material>(path)!;
}

/** A graded stack of `path`'s fibre, as a fleece or a skein would be. */
function stock(path: string, row: string, qty: number, count = 0): TextileStock {
  const s = makeStuff(() => new TextileStock());
  stampTemplatePathForTest(s, row);
  s.setMaterial(material(path));
  s.setQuantity(qty);
  s.setYarnCount(count);
  s.setGrade(Grade.of("fine"));
  s.setShortDescription(row.endsWith("/yarn") ? "skein of linen yarn" : "fleece");
  s.setKeywords(row.endsWith("/yarn") ? ["yarn", "skein"] : ["fleece"]);
  ContainmentApi.move(s, actor);
  return s;
}

/** Stand in for the row clone: a fresh linen-authored product, as the rows ship. */
function stubClones(): void {
  vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
    if (path.endsWith("/yarn")) {
      const y = makeStuff(() => new TextileStock());
      stampTemplatePathForTest(y, path);
      y.setMaterial(material(LINEN));
      y.setShortDescription("skein of linen yarn");
      y.setKeywords(["yarn", "skein", "thread", "spun", "linen"]);
      y.setGrade(Grade.of("fair"));
      return y;
    }
    const b = makeStuff(() => new ClothBolt());
    stampTemplatePathForTest(b, path);
    b.setMaterial(material(LINEN));
    b.setShortDescription("bolt of linen");
    b.setKeywords(["bolt", "cloth", "linen"]);
    b.setGrade(Grade.of("fair"));
    return b;
  }) as never);
}

function held(pred: (s: Stuff) => boolean): Stuff | undefined {
  return actor.getContents().find((s) => pred(s as unknown as Stuff)) as
    | Stuff
    | undefined;
}

beforeEach(async () => {
  await standUpBranchHarness();
  registerMaterial(LINEN, "linen", ["textile", "fibre", "cellulose"]);
  registerMaterial(WOOL, "wool", ["textile", "fibre", "protein"]);
  Construction.registerFabric({ key: "woven", layerBand: 0, loft: 0.1, weaveDensity: 0.75, drape: 0.6 });
  room = makeStuff(() => new TestActor());
  actor = makeStuff(() => new TestActor());
  ContainmentApi.move(actor, room);
  stampTemplatePathForTest(actor as unknown as Stuff, "/platform/agent/Avatar/carry-tester");
  stubClones();
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

async function spin(target: Stuff, count = 10): Promise<void> {
  const c = makeStuff(() => new SpinController());
  await c.execute(
    { stock: ref(target, "fleece"), count } as never,
    makeContext(actor as unknown as Stuff, room as unknown as Stuff, "spin"),
  );
  await completeStep(SpinController.BASE_MS * 2);
}

async function weave(target: Stuff): Promise<void> {
  const c = makeStuff(() => new WeaveController());
  await c.execute(
    { yarn: ref(target, "yarn") } as never,
    makeContext(actor as unknown as Stuff, room as unknown as Stuff, "weave"),
  );
  await completeStep(WeaveController.BASE_MS * 2);
}

describe("the textile chain keeps the fibre", () => {
  it("⭐ spun wool is wool yarn, named for it, and the spinner is its maker", async () => {
    await spin(stock(WOOL, "/trade/textiles/thing/line", 4));
    const yarn = held((s) => s instanceof TextileStock && (s as TextileStock).getYarnCount() > 0) as
      | TextileStock
      | undefined;
    expect(yarn).toBeDefined();
    expect(yarn!.getMaterial()?.getName()).toBe("wool");
    expect(yarn!.getShortDescription()).toBe("skein of wool yarn");
    expect(yarn!.getKeywords()).toContain("wool");
    expect(yarn!.getMaker()).toBe(actor.getIdentityPath());
  });

  it("⭐ woven wool is a bolt of wool, and the weaver is its maker", async () => {
    await weave(stock(WOOL, "/trade/textiles/thing/yarn", 4, 12));
    const bolt = held((s) => s instanceof ClothBolt) as ClothBolt | undefined;
    expect(bolt).toBeDefined();
    expect(bolt!.getMaterial()?.getName()).toBe("wool");
    expect(bolt!.getShortDescription()).toBe("bolt of wool");
    expect(bolt!.getMaker()).toBe(actor.getIdentityPath());
  });

  it("a linen chain reads exactly as it always did", async () => {
    await spin(stock(LINEN, "/trade/textiles/thing/line", 2));
    const yarn = held((s) => s instanceof TextileStock && (s as TextileStock).getYarnCount() > 0)!;
    expect((yarn as TextileStock).getShortDescription()).toBe("skein of linen yarn");
    // ⚠ Out of the hands first — a second skein of the same row would merge
    // into it on the move, and the weave would be handed a husk.
    StuffApi.destruct(yarn);
    await weave(stock(LINEN, "/trade/textiles/thing/yarn", 4, 12));
    const bolt = held((s) => s instanceof ClothBolt) as ClothBolt;
    expect(bolt.getShortDescription()).toBe("bolt of linen");
  });

  it("⭐⭐ two TITLED stacks of one spin together, and two titled skeins of yarn warp together", async () => {
    // A good somebody made is titled to them and a titled stack never
    // merges (the chattel rule): two reeled skeins are two stacks of one,
    // and \`spin\` wants two. Counting only the stack named refused every
    // silk spin a player could make (silk's drive: \`too-little\`).
    const titled = (s: Stuff, id: string): void => {
      (s as unknown as { _chattelId: string })._chattelId = id;
    };
    const a = stock(WOOL, "/trade/textiles/thing/line", 1);
    titled(a, "ch-a");
    const b = stock(WOOL, "/trade/textiles/thing/line", 1);
    titled(b, "ch-b");
    expect(a.canMergeWith(b)).toBe(false);
    await spin(a);
    expect(held((s) => s instanceof TextileStock && (s as TextileStock).getYarnCount() > 0)).toBeDefined();
    // Both stacks of line were the charge — nothing of either is left.
    expect(a.isDestroyed() && b.isDestroyed()).toBe(true);

    for (const s of actor.getContents()) StuffApi.destruct(s as unknown as Stuff);
    const y1 = stock(WOOL, "/trade/textiles/thing/yarn", 2, 12);
    titled(y1, "ch-y1");
    const y2 = stock(WOOL, "/trade/textiles/thing/yarn", 2, 12);
    titled(y2, "ch-y2");
    await weave(y1);
    expect(held((s) => s instanceof ClothBolt)).toBeDefined();
    expect(y1.isDestroyed() && y2.isDestroyed()).toBe(true);
  });

  it("a warp does not pool yarn of another count", async () => {
    const titled = (s: Stuff, id: string): void => {
      (s as unknown as { _chattelId: string })._chattelId = id;
    };
    const y1 = stock(WOOL, "/trade/textiles/thing/yarn", 2, 12);
    titled(y1, "ch-y1");
    const y2 = stock(WOOL, "/trade/textiles/thing/yarn", 2, 20);
    titled(y2, "ch-y2");
    await weave(y1);
    expect(held((s) => s instanceof ClothBolt)).toBeUndefined();
  });

  it("line (yarnCount 0) keeps its authored words — it is not yarn yet", () => {
    const line = stock(WOOL, "/trade/textiles/thing/line", 2);
    expect(line.getShortDescription()).toBe("fleece");
  });
});
