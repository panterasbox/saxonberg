/**
 * Mayfield & Co. — one counter fronting every plat book, and a purchase
 * that fires AS THE BUYER (residences D14).
 *
 * The two things that make a realty office worth existing:
 *
 *   1. **It holds no list.** The window is enumerated live off the plat
 *      books themselves, so a subdivision anywhere in the world appears
 *      here with no edit to any row and no code change. A synthetic
 *      second book proves it.
 *   2. **It is not the buyer.** The dialogue substrate's intrinsic
 *      `dispatch` runs a command as the NPC — right for a landlord
 *      granting a lease out of his own stock, wrong for an agent, who
 *      does not buy your house for you. The prompt opens on the BUYER's
 *      client and the command runs as THEM: their money, their
 *      validators, their ascent gate, their title.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import Realtor from "../npc/Realtor";
import PlatBook from "@saxonberg/content-residence/src/idea/PlatBook";
import Avatar from "@saxonberg/server/mud/platform/agent/Avatar";
import { Idea } from "@saxonberg/server/mud/lib/stuff/Idea";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ParcelApi } from "@saxonberg/server/mud/api/parcel";
import { PromptApi } from "@saxonberg/server/mud/api/prompt";
import { CommandApi } from "@saxonberg/server/mud/api/command";
import { DialogueEffectRegistry } from "@saxonberg/server/mud/lib/npc/DialogueEffects";
import { makeStuffAtPath } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";

/** The provisioner half a book asks for capacity and the next free leaf. */
class TestHolder extends Idea {
  public cap = 40;
  public next: string | null = "lot-1";
  capacity(): number {
    return this.cap;
  }
  nextFreeLeaf(taken: ReadonlySet<string>): string | null {
    return this.next && taken.has(this.next) ? null : this.next;
  }
}

let sold: string[];

function book(
  path: string,
  label: string,
  parent: string,
  price: number,
  nextLeaf: string,
): PlatBook {
  const holder = makeStuffAtPath(() => new TestHolder(), `${path}-holder`);
  holder.next = nextLeaf;
  const b = makeStuffAtPath(() => new PlatBook(), path);
  b.setLabel(label);
  b.setParentExtent(parent);
  b.setPriceMinor(price);
  b.setAreaM2(400);
  b.setLandUse("residential");
  b.setHolderPath(`${path}-holder`);
  return b;
}

function buyer(id = "iris"): Avatar {
  return makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
}

/** A buyer with a client attached — what a prompt needs to reach anyone. */
function withClient(a: Avatar): Avatar {
  const interactive = { id: "sess-1" };
  (a as unknown as { getInteractives(): Set<unknown> }).getInteractives = () =>
    new Set([interactive]);
  return a;
}

let issued: Array<{ actor: Stuff; line: string }>;

beforeEach(() => {
  StuffApi.clearAll();
  sold = [];
  issued = [];
  vi.spyOn(ParcelApi, "childParcelsOf").mockImplementation((async (
    parent: string,
  ) =>
    sold
      .filter((e) => e.startsWith(`${parent}/`))
      .map((e) => ({ getExtent: () => e }))) as never);
  vi.spyOn(ParcelApi, "coveringParcelOf").mockImplementation((async (
    path: string,
  ) =>
    sold.includes(path) ? { getExtent: () => path } : null) as never);
  vi.spyOn(CommandApi, "forceCommand").mockImplementation((async (
    actor: Stuff,
    line: string,
  ) => {
    issued.push({ actor, line });
    return undefined;
  }) as unknown as typeof CommandApi.forceCommand);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("the realty window", () => {
  it("⭐ spans every book — a second subdivision needs NO code change here", async () => {
    book("/world/fx/hinkley/plat-book", "Hinkley Hills", "/world/fx/hinkley", 500, "lot-4");
    book("/world/fx/newtown/plat-book", "Newtown", "/world/fx/newtown", 300, "lot-1");

    const offers = await Realtor.offers();
    expect(offers.map((o) => o.book)).toEqual(["Newtown", "Hinkley Hills"]);
    // Cheapest first — the only ordering an agent would use.
    expect(offers[0]!.priceMinor).toBe(300);
  });

  it("never lists ground that is already sold", async () => {
    book("/world/fx/hinkley/plat-book", "Hinkley Hills", "/world/fx/hinkley", 500, "lot-2");
    sold = ["/world/fx/hinkley/lots/lot-1"];

    const offers = await Realtor.offers();
    expect(offers.map((o) => o.leaf)).toEqual(["lot-2"]);
  });

  it("says so plainly when there is nothing on the books", async () => {
    expect(await Realtor.offers()).toEqual([]);
  });
});

describe("the purchase", () => {
  it("⭐⭐ runs `title buy` AS THE BUYER, after their own confirmation", async () => {
    book("/world/fx/hinkley/plat-book", "Hinkley Hills", "/world/fx/hinkley", 500, "lot-7");
    const iris = withClient(buyer());
    const ricky = makeStuffAtPath(() => new Realtor(), "/world/fx/realty/ricky");
    vi.spyOn(PromptApi, "choice").mockResolvedValue(
      "/world/fx/hinkley/lots/lot-7" as never,
    );
    const confirm = vi.spyOn(PromptApi, "confirm").mockResolvedValue(true);

    await Realtor.BUY_EFFECT.apply({
      npc: ricky as unknown as Stuff,
      player: iris as unknown as Stuff,
      effect: {},
    });

    // The price was shown before the yes was taken.
    expect(confirm.mock.calls[0]![1]).toMatch(/Hinkley Hills lot-7/);
    // And the command ran as IRIS — never as Ricky.
    expect(issued).toEqual([
      { actor: iris as unknown as Stuff, line: "title buy lot-7" },
    ]);
  });

  it("buys nothing when the buyer says no", async () => {
    book("/world/fx/hinkley/plat-book", "Hinkley Hills", "/world/fx/hinkley", 500, "lot-7");
    const iris = withClient(buyer());
    const ricky = makeStuffAtPath(() => new Realtor(), "/world/fx/realty/ricky");
    vi.spyOn(PromptApi, "choice").mockResolvedValue(
      "/world/fx/hinkley/lots/lot-7" as never,
    );
    vi.spyOn(PromptApi, "confirm").mockResolvedValue(false);

    await Realtor.BUY_EFFECT.apply({
      npc: ricky as unknown as Stuff,
      player: iris as unknown as Stuff,
      effect: {},
    });
    expect(issued).toEqual([]);
  });

  it("buys nothing for somebody with no client — a purchase needs a person's yes", async () => {
    book("/world/fx/hinkley/plat-book", "Hinkley Hills", "/world/fx/hinkley", 500, "lot-7");
    const ricky = makeStuffAtPath(() => new Realtor(), "/world/fx/realty/ricky");
    const npcBuyer = buyer("nobody");

    await Realtor.BUY_EFFECT.apply({
      npc: ricky as unknown as Stuff,
      player: npcBuyer as unknown as Stuff,
      effect: {},
    });
    expect(issued).toEqual([]);
  });

  it("offers nothing to buy when the books are empty", async () => {
    const iris = withClient(buyer());
    const ricky = makeStuffAtPath(() => new Realtor(), "/world/fx/realty/ricky");
    const choice = vi.spyOn(PromptApi, "choice");

    await Realtor.BUY_EFFECT.apply({
      npc: ricky as unknown as Stuff,
      player: iris as unknown as Stuff,
      effect: {},
    });
    expect(choice).not.toHaveBeenCalled();
    expect(issued).toEqual([]);
  });
});

describe("Ricky", () => {
  it("registers both effects when he stands up — no module-scope registration", async () => {
    const ricky = makeStuffAtPath(() => new Realtor(), "/world/fx/realty/ricky");
    await ricky.postRegister();
    expect(DialogueEffectRegistry.has("realty-list")).toBe(true);
    expect(DialogueEffectRegistry.has("realty-buy")).toBe(true);
  });

  it("⚠ sells GROUND — rentals appear nowhere in his tree", () => {
    // Leasing is a landlord's act at his own building (Walter, up the
    // Row). An agent's tree that offered one would be promising
    // something no code behind this desk can do.
    const row = readFileSync(
      fileURLToPath(
        new URL(
          "../../../content/world/terminus/realty/npc/ricky.yaml",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    const beats = row
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("#"))
      .join("\n");
    expect(beats).not.toMatch(/\blease\b/i);
    expect(beats).not.toMatch(/\brent(al|s)?\b/i);
    // …and it does offer the two effects it exists for.
    expect(beats).toContain("realty-list");
    expect(beats).toContain("realty-buy");
  });
});
