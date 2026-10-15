/**
 * EmploymentApi.ensureOperatorAt — the lazy Business standup, by FOLLOWING
 * THE PLACE (the scan sweep, 2026-10-14). A house is attached to the room
 * its fixture stands in, in the location graph's record (derived from the
 * house's own `operatingLocations`); asking at the fixture reads that and
 * stands the house up — no scan of the template table, no manifest entry. Keyed on the
 * fixture (a terminal / vending unit), so two venues in one room each resolve
 * their own operator.
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
import TemplateApplier from "../../TemplateApplier";
import Location from "../../../../lib/stuff/Location";
import Thing from "../../../thing/Thing";
import { ContainmentApi } from "../../../../api/containment";
import { makeStuffAtPath } from "../../../../lib/security/__tests__/test-setup";
import { attachGraph } from "../../../../lib/location/__tests__/attachments-fixture";

const PH = TemplateApplier.templatePath;
const FIXTURE_A = "/world/test/emp/fixture-a";
const FIXTURE_B = "/world/test/emp/fixture-b";
const BIZ_A = "/world/test/emp/business-a";
const BIZ_B = "/world/test/emp/business-b";
const FIXTURE_C = "/world/test/emp/fixture-c";
const BIZ_C = "/world/test/emp/business-c";
const ABSENT_COOK = "/world/test/emp/absent-cook";
const ROOM = "/world/test/emp/room";

const docs: Doc[] = [
  { path: PH, class: PH, data: {} },

  // Two Businesses, each operating its OWN fixture (two venues, one "room").
  {
    path: BIZ_A,
    class: "/platform/idea/Business",
    data: { proprietorPath: "", positions: [], operatingLocations: [FIXTURE_A] },
  },
  {
    path: BIZ_B,
    class: "/platform/idea/Business",
    data: { proprietorPath: "", positions: [], operatingLocations: [FIXTURE_B] },
  },
  // A rostered venue whose assignee is NOT live — the shape every cast-staffed
  // venue has until residency spawns the NPC.
  {
    path: BIZ_C,
    class: "/platform/idea/Business",
    data: {
      proprietorPath: "",
      positions: [{ key: "cook", label: "minding the hearth", wageRate: 4, fulfills: ['cooking'] }],
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
    // ⭐ The houses are attached to the room their fixtures stand in — the
    // location graph's record, derived from each house's own
    // `operatingLocations` — and the fixtures stand there, live.
    attachGraph({ [ROOM]: [[BIZ_A, "house"], [BIZ_B, "house"], [BIZ_C, "house"]] });
    const room = makeStuffAtPath(() => new Location(), ROOM);
    for (const f of [FIXTURE_A, FIXTURE_B, FIXTURE_C]) {
      const t = makeStuffAtPath(() => new Thing(), f);
      ContainmentApi.move(t as never, room as never);
    }
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    vi.restoreAllMocks();
  });

  it("stands the Business up from what the graph attaches to the fixture's room — no scan", async () => {
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

  it("returns null when nothing is attached there", async () => {
    expect(await EmploymentApi.ensureOperatorAt("/world/test/emp/nowhere")).toBeNull();
  });

  it("⭐⭐ runs the roster pass for an ALREADY-LIVE venue, not only a fresh one", async () => {
    // ⚠ This is the whole bug. The roster resolves against the assignees
    // live at the moment of the pass, and a cast NPC is spawned by residency
    // only when a player walks in — so the boot pass skips them and the
    // venue is already live by the time anybody needs them. `ensureOperatorAt`
    // used to `return live` before running any pass, so the one venue that
    // needed it never got it: the Hearthworks cook stood at his own hearth
    // with no employment record, nobody was on shift in a `fulfills` seat, and `order`
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
