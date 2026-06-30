/**
 * The seeded Goodkin branch is authored as staffed city content: it
 * populates the teller-counter fixture (the verb surface + vault) AND a
 * placeholder NPC teller (the "NPCs, not menus" intent), and is reachable
 * from the University Avenue plaza. A content assertion over the seed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";

const SEEDS = fileURLToPath(new URL("../../../seeds/", import.meta.url));

function seed(rel: string): Record<string, unknown> {
  return YAML.parse(readFileSync(`${SEEDS}${rel}`, "utf8")) as Record<
    string,
    unknown
  >;
}

describe("Goodkin University Avenue branch seed", () => {
  it("populates the teller counter and a placeholder NPC teller", () => {
    const branch = seed("domain/eternal/university-avenue/bank.yaml");
    const data = branch.data as { populates?: string[] };
    expect(data.populates).toContain(
      "/domain/eternal/university-avenue/bank-counter"
    );
    expect(data.populates).toContain(
      "/domain/eternal/university-avenue/npc/teller"
    );
  });

  it("is reachable from the University Avenue plaza (south exit)", () => {
    const branch = seed("domain/eternal/university-avenue/bank.yaml");
    const data = branch.data as {
      exits?: Record<string, { destination?: string }>;
    };
    expect(data.exits?.south?.destination).toBe(
      "/domain/eternal/university-avenue/plaza"
    );
  });

  it("the counter is a BankMixin host affiliated to a corpo", () => {
    const counter = seed("domain/eternal/university-avenue/bank-counter.yaml");
    expect(counter.class).toBe("/lib/banking/BankCounter");
    expect((counter.data as { corpoKey?: string }).corpoKey).toBe("goodkin");
  });

  it("the teller is an NPC with a name and a brain", () => {
    const teller = seed("domain/eternal/university-avenue/npc/teller.yaml");
    // `/lib/npc/NPC` (a Character subclass) — the class moved from the
    // retired `/lib/character/NPC` path the seed used to name.
    expect(String(teller.class)).toBe("/lib/npc/NPC");
    const data = teller.data as { name?: string; behaviors?: unknown[] };
    expect(data.name).toBeTruthy();
    expect(Array.isArray(data.behaviors)).toBe(true);
  });
});
