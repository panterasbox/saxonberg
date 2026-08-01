/**
 * FurnishableRoom (wave 7, D7/D14) — the one room class every archetype is
 * a template row over, and the posted designation it carries.
 *
 * The second test is the one that matters. D14's whole point is that the
 * kernel reads the sign and never enforces it, so the criterion is a PAIR:
 * the field round-trips, **and entry is unaffected**. A field that quietly
 * grew a consumer would still pass the first half.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import FurnishableRoom, { UNRESTRICTED } from "../FurnishableRoom";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { ContainmentApi } from "../../../api/containment";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import Thing from "../../stuff/Thing";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import type { Containable } from "../../spatial/Containable";

const ROOM_PATH = "/lib/location/FurnishableRoom";

beforeEach(() => {
  StuffApi.clearAll();
});

describe("FurnishableRoom", () => {
  it("is a persistable Location — it has a record to carry fixtures in", () => {
    const room = makeStuffAtPath(() => new FurnishableRoom(), ROOM_PATH);
    expect(MixinApi.isPersistable(room)).toBe(true);
    expect(MixinApi.isContainer(room)).toBe(true);
  });

  it("declares room-level state of its own, distinct from its contents (D7)", () => {
    const room = makeStuffAtPath(() => new FurnishableRoom(), ROOM_PATH);
    // The seam stewardship's condition and the mirror's readings will use:
    // a room carries declared fields, not merely a container slice.
    expect(FurnishableRoom.persistentFields).toContain("postedAs");
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
