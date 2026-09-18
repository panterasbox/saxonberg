/**
 * ⭐ The conditioning branch of the fold (nutrition-and-fitness W2 /
 * plan D4): a Discipline that names a body `stock` has its band read
 * off the body — a threshold over the reserve — never a Transcript
 * fold. No rows are appended; the band tracks the stock; suppression
 * still applies; a transcript-derived row for the same key is replaced.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AdvancementMixin } from "../Advancement";
import { Creature } from "../../creature/Creature";
import { CommandGiverMixin } from "../../command/CommandGiver";
import { SensorMixin } from "../../message/Sensor";
import { StuffApi } from "../../../api/stuff";
import { AppApi } from "../../../api/app";
import { Quantity } from "../../quantity";
import { TemplatePaths } from "../../paths";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { Template } from "../../stuff/Template";
import DisciplineCatalogue from "../../../platform/idea/DisciplineCatalogue";
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

// A credit re-derives conferrals, which pushes a command source on the
// giver — so the host needs the CommandGiver face a real Character has.
class Person extends AdvancementMixin(CommandGiverMixin(SensorMixin(Creature))) {
  protected override handleMessage(): void {}
  protected override handleEnvelope(): void {}
}

let store: Map<string, Record<string, unknown>>;

function fakeMongo(): void {
  store = new Map();
  let n = 0;
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
      const id = (doc._id as string | undefined) ?? `id-${n++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    },
  );
}

async function warmCatalogue(): Promise<void> {
  vi.spyOn(Template, "findByClass").mockImplementation(async (basePath: string) => {
    if (basePath !== "/platform/idea/Discipline") return [];
    return [
      { path: "/platform/idea/Discipline/wind", data: { key: "wind", channel: "conditioning", label: "Wind", stock: "wind" } },
      { path: "/platform/idea/Discipline/blades", data: { key: "blades", channel: "skill", label: "Blades" } },
    ] as unknown as Template[];
  });
  const cat = makeStuffAtPath(() => new DisciplineCatalogue(), TemplatePaths.disciplineCatalogue);
  await cat.postRegister();
}

describe("conditioning — the band is a threshold over a body stock", () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    fakeMongo();
    vi.spyOn(AppApi, "setting").mockReturnValue("");
    await warmCatalogue();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const person = (): Person => {
    const p = makeStuff(() => new Person());
    stampTemplatePathForTest(p, "/platform/agent/Avatar/p1");
    return p;
  };
  const wind = (p: Person, level: number): void => {
    const cur = p.getWind().current.rawValue();
    p.adjustReserve("wind", Quantity.of(level - cur, "%"));
  };

  it("⭐ a stock discipline's band tracks the reserve with NO transcript rows", async () => {
    const p = person();
    expect(await p.competenceBandFor("wind")).toBe("untrained");
    wind(p, 45);
    expect(await p.competenceBandFor("wind")).toBe("competent");
    expect(store.size).toBe(0);
  });

  it("⭐ `competence` lists it beside the transcript's disciplines", async () => {
    const p = person();
    await p.creditDeed({ discipline: "blades", difficulty: "hard", outcome: "success" });
    wind(p, 25);
    const bands = await p.competenceBands();
    expect(bands.map((b) => b.discipline)).toEqual(["blades", "wind"]);
    expect(bands.find((b) => b.discipline === "wind")?.band).toBe("novice");
  });

  it("a fresh body lists wind as untrained rather than absent — the stock exists", async () => {
    const p = person();
    const bands = await p.competenceBands();
    expect(bands).toEqual([{ discipline: "wind", band: "untrained" }]);
  });

  it("a transcript row for the same key is replaced by the body read", async () => {
    const p = person();
    for (let i = 0; i < 20; i++) {
      await p.creditDeed({ discipline: "wind", difficulty: "hard", outcome: "success" });
    }
    const bands = await p.competenceBands();
    expect(bands.filter((b) => b.discipline === "wind")).toHaveLength(1);
    expect(bands[0]?.band).toBe("untrained");
  });

  it("suppression applies to the stock band as it does to every other", async () => {
    const p = person();
    wind(p, 90);
    vi.spyOn(p, "expressionSuppression").mockReturnValue(2);
    expect(await p.competenceBandFor("wind")).toBe("competent");
  });
});
