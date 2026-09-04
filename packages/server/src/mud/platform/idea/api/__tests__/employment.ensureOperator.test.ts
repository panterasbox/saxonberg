/**
 * EmploymentApi.ensureOperatorAt — the derived, lazy Business standup. A
 * Business stands up from its OWN `operatingLocations` template data on first
 * query at a fixture it operates — no manifest entry, no per-venue standup
 * hook. Keyed on the fixture (a terminal / vending unit), so two venues in one
 * room each resolve their own operator.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EmploymentApi } from "../../../../api/employment";
import { StuffApi } from "../../../../api/stuff";
import { AppSettings } from "../../../../lib/config/AppSettings";
import {
  installStore,
  type Doc,
} from "../../../../world/lounge/__tests__/lounge-fixtures";
import PersistentHydrator from "../../persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;
const FIXTURE_A = "/world/test/emp/fixture-a";
const FIXTURE_B = "/world/test/emp/fixture-b";
const BIZ_A = "/world/test/emp/business-a";
const BIZ_B = "/world/test/emp/business-b";
const FIXTURE_C = "/world/test/emp/fixture-c";
const BIZ_C = "/world/test/emp/business-c";
const ABSENT_COOK = "/world/test/emp/absent-cook";

const docs: Doc[] = [
  { path: PH, class: PH, data: {} },
  // Two Businesses, each operating its OWN fixture (two venues, one "room").
  {
    path: BIZ_A,
    class: "/platform/idea/Business",
    hydratorClass: PH,
    data: { proprietorPath: "", positions: [], operatingLocations: [FIXTURE_A] },
  },
  {
    path: BIZ_B,
    class: "/platform/idea/Business",
    hydratorClass: PH,
    data: { proprietorPath: "", positions: [], operatingLocations: [FIXTURE_B] },
  },
  // A rostered venue whose assignee is NOT live — the shape every cast-staffed
  // venue has until residency spawns the NPC.
  {
    path: BIZ_C,
    class: "/platform/idea/Business",
    hydratorClass: PH,
    data: {
      proprietorPath: "",
      positions: [{ key: "cook", label: "minding the hearth", wageRate: 4, confers: ["MakerMixin"] }],
      rosterSlots: [
        {
          positionKey: "cook",
          assignee: ABSENT_COOK,
          schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], hours: [0, 24] }],
        },
      ],
      operatingLocations: [FIXTURE_C],
    },
  },
];

describe("EmploymentApi.ensureOperatorAt (derived standup)", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    installStore(docs);
    await AppSettings.warm();
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    vi.restoreAllMocks();
  });

  it("stands the Business up lazily from its operatingLocations template data", async () => {
    // Not live yet — the sync scan finds nothing.
    expect(EmploymentApi.businessAt(FIXTURE_A)).toBeNull();

    const op = await EmploymentApi.ensureOperatorAt(FIXTURE_A);
    expect(op).toBeTruthy();
    expect(op!.getAccountPath()).toBe(BIZ_A);
    // Now live — the sync scan sees it, and a second call is idempotent.
    expect(EmploymentApi.businessAt(FIXTURE_A)).toBe(op);
    expect(await EmploymentApi.ensureOperatorAt(FIXTURE_A)).toBe(op);
  });

  it("keys on the fixture — two venues resolve their own operators", async () => {
    const a = await EmploymentApi.ensureOperatorAt(FIXTURE_A);
    const b = await EmploymentApi.ensureOperatorAt(FIXTURE_B);
    expect(a!.getAccountPath()).toBe(BIZ_A);
    expect(b!.getAccountPath()).toBe(BIZ_B);
    expect(a).not.toBe(b);
  });

  it("returns null when no authored Business operates the path", async () => {
    expect(await EmploymentApi.ensureOperatorAt("/world/test/emp/nowhere")).toBeNull();
  });

  it("⭐⭐ runs the roster pass for an ALREADY-LIVE venue, not only a fresh one", async () => {
    // ⚠ This is the whole bug. The roster resolves against the assignees
    // live at the moment of the pass, and a cast NPC is spawned by residency
    // only when a player walks in — so the boot pass skips them and the
    // venue is already live by the time anybody needs them. `ensureOperatorAt`
    // used to `return live` before running any pass, so the one venue that
    // needed it never got it: the Hearthworks cook stood at his own hearth
    // with no employment record, nothing conferred `MakerMixin`, and `order`
    // answered "There's no one on hand to make that" for a whole game-hour.
    //
    // Observed through the pass's own report about an unresolvable assignee:
    // it must fire on the SECOND call too, when the Business is already live.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const missed = (): number =>
      warn.mock.calls.filter((c) => String(c[0]).includes(ABSENT_COOK)).length;

    await EmploymentApi.ensureOperatorAt(FIXTURE_C); // stands it up + passes
    const afterStandup = missed();
    expect(afterStandup).toBeGreaterThan(0);

    expect(EmploymentApi.businessAt(FIXTURE_C)).toBeTruthy(); // now live
    await EmploymentApi.ensureOperatorAt(FIXTURE_C);
    expect(missed()).toBeGreaterThan(afterStandup);
  });
});
