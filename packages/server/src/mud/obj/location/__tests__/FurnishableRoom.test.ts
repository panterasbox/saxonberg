/**
 * FurnishableRoom (wave 7, D7/D14) — the one room class every archetype is
 * a template row over, and the posted designation it carries.
 *
 * The second test is the one that matters. D14's whole point is that the
 * kernel reads the sign and never enforces it, so the criterion is a PAIR:
 * the field round-trips, **and entry is unaffected**. A field that quietly
 * grew a consumer would still pass the first half.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import FurnishableRoom, { UNRESTRICTED } from "../FurnishableRoom";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../../lib/mixin";
import { ContainmentApi } from "../../../api/containment";
import { makeStuffAtPath } from "../../../lib/security/__tests__/test-setup";
import Thing from "../../../lib/stuff/Thing";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";

const ROOM_PATH = "/obj/location/FurnishableRoom";

beforeEach(() => {
  StuffApi.clearAll();
});

describe("FurnishableRoom", () => {
  it("is a persistable Location — it has a record to carry fixtures in", () => {
    const room = makeStuffAtPath(() => new FurnishableRoom(), ROOM_PATH);
    expect(MixinApi.isPersistable(room)).toBe(true);
    expect(MixinApi.isContainer(room)).toBe(true);
  });

  it("composes every layer a room seed actually needs", () => {
    // The regression this test exists for: FurnishableRoom first shipped as
    // `Persistable(Reserved(Location))`, and EVERY OMISSION WAS SILENT — a
    // seed's `populates:` never fired, its prose never landed, and nothing
    // could walk into it. The YAML-shape tests all passed, because a seed
    // row is only as real as the class that reads it.
    //
    // The stack mirrors the shipped DormRoom's, minus WarrenMember.
    for (const layer of [
      Mixins.Populates, // `populates:` — without this, no fixture EVER lands
      Mixins.Visible, // shortDescription / longDescription
      Mixins.Detailed, // `details:`
      Mixins.Exitable, // you can walk into it
      Mixins.Reserved, // the kitchen's authored `air` budget
      Mixins.Container,
      Mixins.Persistable,
    ]) {
      expect(MixinApi.hasMixin(FurnishableRoom, layer)).toBe(true);
    }
  });

  it("declares room-level state of its own, distinct from its contents (D7)", () => {
    const room = makeStuffAtPath(() => new FurnishableRoom(), ROOM_PATH);
    // The seam stewardship's condition and the mirror's readings will use:
    // a room carries declared fields, not merely a container slice.
    expect(MixinApi.getAllPersistentFields(FurnishableRoom)).toContain("postedAs");
    expect(room.getPostedAs()).toBe(UNRESTRICTED);
  });

  it("a posted room says so — and that is the entire behaviour (D14)", () => {
    const room = makeStuffAtPath(() => new FurnishableRoom(), ROOM_PATH);
    room.setPostedAs("gendered: women");
    expect(room.getPostedAs()).toBe("gendered: women");

    // ...and entry is unaffected, for anybody. No denial, no note, no
    // message. This is the half that pins D14: the kernel reads the sign
    // and never enforces it, so a character whose pronouns or sex differ
    // from anything the sign says walks in and out freely.
    const visitor = makeStuffAtPath(() => new Thing(), "/obj/test/Visitor");
    ContainmentApi.move(
      visitor as unknown as Stuff & Containable,
      room as unknown as Stuff & Container,
    );
    expect((room as unknown as Container).getContents()).toContain(visitor);
  });

  it("actually SEEDS its fixtures — populates fires end to end", async () => {
    // The behavioural half of "four archetypes seed their own fixture set".
    // Parsing the seed row proves the row says so; this proves the class
    // does it. Both are needed — the first version of this class parsed
    // green and seeded nothing.
    const paths = [
      "/obj/fixture/toilet",
      "/obj/fixture/basin",
      "/obj/fixture/tub",
    ];
    // A `domain` row per fixture — `applyPopulates` resolves each spec
    // through `Template.findByPath` before cloning it.
    const rows = paths.map((path) => ({ _id: path, path, class: "/obj/Prop" }));
    vi.spyOn(PersistenceManager, "get").mockReturnValue({
      find: vi.fn(async (_c: string, q: Record<string, unknown>) =>
        rows.filter((r) => r.path === q.path),
      ),
      save: vi.fn(async () => "1"),
      findById: vi.fn(async () => null),
      delete: vi.fn(async () => undefined),
      isConnected: () => true,
    } as unknown as PersistenceManager);

    const room = makeStuffAtPath(() => new FurnishableRoom(), ROOM_PATH);
    const cloned: string[] = [];
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
      cloned.push(path);
      return makeStuffAtPath(() => new Thing(), path);
    }) as unknown as typeof StuffApi.clone);

    // On a persistable host `applyPopulates` RETAINS the specs and
    // `seedBornWith` lays them down once (the no-record branch) — the
    // DormWarren.admit shape.
    await room.applyPopulates(paths);
    await room.seedBornWith();

    expect(cloned).toEqual(paths);
    expect((room as unknown as Container).getContents().length).toBe(3);
    vi.restoreAllMocks();
  });

  it("has NO consumer anywhere in the engine — the D14 constraint, enforced", () => {
    // The grep D14 specifies, as a test rather than a habit: the field's
    // name may appear in its own declaration, its accessors, its prose and
    // this file — and nowhere else. The moment something reads it to decide
    // anything, the kernel is in the identity business and this fails.
    const root = fileURLToPath(new URL("../../..", import.meta.url));
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".ts") && readFileSync(full, "utf8").includes("postedAs")) {
          hits.push(full.slice(root.length));
        }
      }
    };
    walk(root);
    expect(hits.sort()).toEqual([
      "lib/location/FurnishableRoom.ts",
      "lib/location/__tests__/FurnishableRoom.test.ts",
    ]);
  });

  it("an empty or missing designation falls back to unrestricted", () => {
    const room = makeStuffAtPath(() => new FurnishableRoom(), ROOM_PATH);
    room.setPostedAs("");
    expect(room.getPostedAs()).toBe(UNRESTRICTED);
  });
});
