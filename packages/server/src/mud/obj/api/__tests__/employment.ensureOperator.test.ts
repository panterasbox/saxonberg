/**
 * EmploymentApi.ensureOperatorAt — the derived, lazy Business standup. A
 * Business stands up from its OWN `operatingLocations` template data on first
 * query at a fixture it operates — no manifest entry, no per-venue standup
 * hook. Keyed on the fixture (a terminal / vending unit), so two venues in one
 * room each resolve their own operator.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EmploymentApi } from "../../../api/employment";
import { StuffApi } from "../../../api/stuff";
import { AppSettings } from "../../../lib/config/AppSettings";
import {
  installStore,
  type Doc,
} from "../../../domain/lounge/__tests__/lounge-fixtures";
import PersistentHydrator from "../../persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;
const FIXTURE_A = "/domain/test/emp/fixture-a";
const FIXTURE_B = "/domain/test/emp/fixture-b";
const BIZ_A = "/domain/test/emp/business-a";
const BIZ_B = "/domain/test/emp/business-b";

const docs: Doc[] = [
  { path: PH, class: PH, data: {} },
  // Two Businesses, each operating its OWN fixture (two venues, one "room").
  {
    path: BIZ_A,
    class: "/obj/Business",
    hydratorClass: PH,
    data: { proprietorPath: "", positions: [], operatingLocations: [FIXTURE_A] },
  },
  {
    path: BIZ_B,
    class: "/obj/Business",
    hydratorClass: PH,
    data: { proprietorPath: "", positions: [], operatingLocations: [FIXTURE_B] },
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
    expect(await EmploymentApi.ensureOperatorAt("/domain/test/emp/nowhere")).toBeNull();
  });
});
