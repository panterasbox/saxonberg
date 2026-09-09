/**
 * ⭐⭐ Diminishment — dying makes you worse at everything, for a while,
 * and **writes nothing down**.
 *
 * The distinction the user asked for and the whole reason this is a
 * separate mechanism from W0d's floor:
 *
 *   - **Losing a fight** costs you along the disciplines the fight used.
 *     That is the game teaching you honestly, and it goes in the ledger.
 *   - **Dying** is not teaching. It is punishment, so it costs you
 *     **across the board**, it fades, and it never touches the record.
 *
 * ⚠⚠ The load-bearing assertion in this file is the negative one: the
 * Transcript is byte-identical before and after. If diminishment ever
 * rewrote history, `chronicle` would be lying about what a player had
 * done — which is a different and much worse thing than being weak for
 * an evening.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AdvancementMixin } from "../Advancement";
import { CompetenceBand } from "../CompetenceBand";
import { Creature } from "../../creature/Creature";
import Condition from "../../../platform/idea/Condition";
import type { AfflictionRecord } from "../../../platform/idea/Condition";
import { StuffApi } from "../../../api/stuff";
import { TemplatePaths } from "../../paths";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

class Person extends AdvancementMixin(Creature) {}

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

function fakeMongo(): void {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "isConnected").mockReturnValue(true);
  vi.spyOn(pm, "find").mockImplementation(
    async (_c: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
  );
  vi.spyOn(pm, "save").mockImplementation(
    async (_c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    },
  );
}

/** The shipped `recovering` row, with the suppression it authors. */
function seedRecovering(bands = 2, atStage = 12): void {
  if (StuffApi.findByTemplatePath(TemplatePaths.mortalityRecovering)) return;
  makeStuffAtPath(() => {
    const c = new Condition();
    c.setName("recovering");
    c.setSignature([{ kind: "expression", bands }]);
    c.setProgression({ law: "stage", intervalMs: 3_600_000 });
    c.setResolution({ by: "rest", atStage });
    return c;
  }, TemplatePaths.mortalityRecovering);
}

/** A person with a real record in one Discipline. */
async function practised(path: string): Promise<Person> {
  const p = makeStuff(() => new Person());
  stampTemplatePathForTest(p, path);
  for (let i = 0; i < 20; i++) {
    await p.creditDeed({
      discipline: "blades",
      difficulty: "hard",
      outcome: "success",
    });
  }
  return p;
}

function recovering(stage: number): AfflictionRecord {
  return {
    kind: "affliction",
    templatePath: TemplatePaths.mortalityRecovering,
    stage,
    elapsed: 0,
  };
}

beforeEach(() => {
  installV1QuantityMarshallers();
  fakeMongo();
  seedRecovering();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("diminishment — across the board, and temporary", () => {
  it("⭐ a fresh death costs TWO bands of everything", async () => {
    const p = await practised("/platform/agent/Avatar/dim-a");
    const whole = await p.competenceBandFor("blades");
    expect(CompetenceBand.rank(whole)).toBeGreaterThanOrEqual(
      CompetenceBand.rank("proficient"),
    );

    p.afflict(recovering(0));
    expect(await p.competenceBandFor("blades")).toBe(
      CompetenceBand.lowered(whole, 2),
    );
  });

  it("⭐ it TAPERS — one band at the halfway mark, gone at the end", async () => {
    const p = await practised("/platform/agent/Avatar/dim-b");
    const whole = await p.competenceBandFor("blades");

    const rec = recovering(0);
    p.afflict(rec);
    expect(await p.competenceBandFor("blades")).toBe(
      CompetenceBand.lowered(whole, 2),
    );

    rec.stage = 6;
    expect(await p.competenceBandFor("blades")).toBe(
      CompetenceBand.lowered(whole, 1),
    );

    rec.stage = 12;
    expect(await p.competenceBandFor("blades")).toBe(whole);
  });

  it("⚠⚠ the TRANSCRIPT is byte-identical — nothing was forgotten", async () => {
    // The load-bearing negative. Punishment must never become a lie
    // about what a player has done.
    const p = await practised("/platform/agent/Avatar/dim-c");
    const before = await p.transcriptEntries("blades");
    p.afflict(recovering(0));
    const after = await p.transcriptEntries("blades");
    expect(after).toEqual(before);
    expect(after.length).toBe(20);
  });

  it("⭐ ACROSS THE BOARD — every discipline, not the ones death involved", async () => {
    // The distinction from losing a fight, which is pointed. Dying is
    // punishment, so it is broad.
    const p = makeStuff(() => new Person());
    stampTemplatePathForTest(p, "/platform/agent/Avatar/dim-d");
    for (const d of ["blades", "medicine", "smithing"]) {
      for (let i = 0; i < 20; i++) {
        await p.creditDeed({
          discipline: d,
          difficulty: "hard",
          outcome: "success",
        });
      }
    }
    const whole = await p.competenceBands();
    expect(whole.length).toBe(3);

    p.afflict(recovering(0));
    const hurt = await p.competenceBands();
    expect(hurt.length).toBe(3);
    for (const row of hurt) {
      const was = whole.find((w) => w.discipline === row.discipline)!;
      expect(row.band, row.discipline).toBe(CompetenceBand.lowered(was.band, 2));
    }
  });

  it("floors at untrained rather than going negative", async () => {
    const p = makeStuff(() => new Person());
    stampTemplatePathForTest(p, "/platform/agent/Avatar/dim-e");
    await p.creditDeed({
      discipline: "blades",
      difficulty: "easy",
      outcome: "success",
    });
    p.afflict(recovering(0));
    expect(await p.competenceBandFor("blades")).toBe("untrained");
  });

  it("a body carrying nothing that suppresses reads exactly as before", async () => {
    const p = await practised("/platform/agent/Avatar/dim-f");
    const whole = await p.competenceBandFor("blades");
    expect(p.expressionSuppression()).toBe(0);
    expect(await p.competenceBandFor("blades")).toBe(whole);
  });
});
