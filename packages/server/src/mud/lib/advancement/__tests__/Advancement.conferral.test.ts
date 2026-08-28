/**
 * AdvancementMixin conferral integration — the knowing→doing seam.
 *
 * A minimal AdvancementMixin + CommandGiver host practices a Discipline
 * through `AdvancementApi.recordDeed` (which triggers a conferral refresh),
 * and we assert the band-gated verb appears in `getAffordances()` with the
 * catalogue as its source — and is absent below the band. Proves
 * "advancement = the door opens" end-to-end on this branch.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Idea } from "../../stuff/Idea";
import { CommandGiverMixin } from "../../command/CommandGiver";
import { SensorMixin } from "../../message/Sensor";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { AdvancementMixin } from "../Advancement";
import DisciplineCatalogue from "../../../platform/idea/DisciplineCatalogue";
import Discipline from "../../../platform/idea/Discipline";
import { AdvancementApi } from "../../../api/advancement";
import { CommandApi } from "../../../api/command";
import { WorldClockApi } from "../../../api/worldclock";
import { StuffApi } from "../../../api/stuff";
import { ShadowApi } from "../../../api/shadow";
import { Template } from "../../stuff/Template";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
const DISCIPLINE_PATH_PREFIX = '/arcana/idea/Discipline/';
const DISCIPLINE_CLASS = '/platform/idea/Discipline';

const TestGiverBase = AdvancementMixin(
  CommandGiverMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea))))
);
class TestGiver extends TestGiverBase {
  protected override handleMessage(_frame: unknown): void {}
  protected override handleEnvelope(_envelope: unknown): void {}
}

type Loose = Record<string, unknown>;
const CATALOG_SEED: Loose[] = [
  { key: "recipe-knowledge", channel: "knowledge", label: "Recipe Knowledge" },
  {
    key: "mixology",
    channel: "skill",
    label: "Mixology",
    requires: ["recipe-knowledge"],
    conferrals: [{ band: "competent", verbs: ["platform/cmd/social/flourish.yaml"] }],
  },
  { key: "darts", channel: "skill", label: "Darts" },
];

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let counter = 0;

function makeGiver(): TestGiver {
  return makeStuffAtPath(
    () => new TestGiver(),
    `/platform/agent/Avatar/g${counter++}`
  ) as TestGiver;
}

async function warmCatalogue(): Promise<void> {
  vi.spyOn(Template, "findByClass").mockImplementation(
    async (basePath: string) => {
      if (basePath !== DISCIPLINE_CLASS) return [];
      return CATALOG_SEED.map((seed) => ({
        path: `${DISCIPLINE_PATH_PREFIX}${String(seed.key)}`,
        data: seed,
      })) as unknown as Template[];
    }
  );
  const cat = makeStuffAtPath(
    () => new DisciplineCatalogue(),
    "/platform/idea/DisciplineCatalogue"
  );
  await cat.postRegister();
}

function affordedVerbs(giver: TestGiver): string[] {
  return giver
    .getAffordances()
    .map((a) => a.command.getPrimaryVerb());
}

beforeEach(async () => {
  StuffApi.clearAll();
  ShadowApi._clearAllForTesting();
  CommandApi.clearCache();
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "isConnected").mockReturnValue(true);
  vi.spyOn(pm, "find").mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, "save").mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
  WorldClockApi._setNowProviderForTesting(() => 100);
  await warmCatalogue();
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe("AdvancementMixin conferral", () => {
  it("does not afford the conferred verb before the band is reached", async () => {
    const giver = makeGiver();
    // An easy success leaves Mixology below 'competent'.
    await AdvancementApi.recordDeed(giver, {
      discipline: "mixology",
      difficulty: "easy",
      outcome: "success",
    });
    expect(affordedVerbs(giver)).not.toContain("flourish");
  });

  it("affords the conferred verb once the band is crossed", async () => {
    const giver = makeGiver();
    // A hard, decisive (critical) attempt crosses into 'competent',
    // conferring flourish.
    await AdvancementApi.recordDeed(giver, {
      discipline: "mixology",
      difficulty: "hard",
      outcome: "critical",
    });
    expect(affordedVerbs(giver)).toContain("flourish");
  });

  it("attributes the conferred verb to the catalogue (your competence)", async () => {
    const giver = makeGiver();
    await AdvancementApi.recordDeed(giver, {
      discipline: "mixology",
      difficulty: "hard",
      outcome: "critical",
    });
    const catalogue = StuffApi.findByTemplatePath("/platform/idea/DisciplineCatalogue");
    const flourish = giver
      .getAffordances()
      .find((a) => a.command.getPrimaryVerb() === "flourish");
    expect(flourish?.source).toBe(catalogue);
  });

  it("does not confer from a Discipline with no conferral rules", async () => {
    const giver = makeGiver();
    await AdvancementApi.recordDeed(giver, {
      discipline: "darts",
      difficulty: "hard",
      outcome: "critical",
    });
    expect(affordedVerbs(giver)).not.toContain("flourish");
  });

  it("re-evaluating is idempotent — the verb is not duplicated", async () => {
    const giver = makeGiver();
    await AdvancementApi.recordDeed(giver, {
      discipline: "mixology",
      difficulty: "hard",
      outcome: "success",
    });
    await AdvancementApi.recordDeed(giver, {
      discipline: "mixology",
      difficulty: "hard",
      outcome: "success",
    });
    const flourishes = affordedVerbs(giver).filter((v) => v === "flourish");
    expect(flourishes).toHaveLength(1);
  });
});
