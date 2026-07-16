/**
 * The Attendant substrate + its exclusive-lease anti-grief guard. Demo/test
 * vehicles for the model (no v1 content venue exercises every discipline):
 *   - instant (scrum) vs durative service;
 *   - serialization — one server can't attend two (falls out of the slot);
 *   - release → the next in line is pulled up;
 *   - the lease idle-eviction sweep (default-evict);
 *   - linkdead release;
 *   - the staffing states (closed / self-service when unstaffed).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AttendantApi } from "../../../api/attendant";
import AttendancePoint from "../AttendancePoint";
import Ticket from "../Ticket";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../config/AppSettings";
import { SchedulerApi } from "../../../api/scheduler";
import { StuffApi } from "../../../api/stuff";
import { EventApi } from "../../../api/event";
import EventRegistry from "../../../obj/EventRegistry";
import { Stuff } from "../../stuff/Stuff";
import { Idea } from "../../stuff/Idea";
import { EngagedMixin } from "../../activity/Engaged";
import { SensorMixin } from "../../message/Sensor";
import {
  AttendanceEngagement,
  ATTENDANCE_TYPE,
} from "../AttendanceEngagement";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";

class TestServer extends SensorMixin(EngagedMixin(Idea)) {
  static _mixinName = "TestServer";
}
class TestCustomer extends SensorMixin(Idea) {
  static _mixinName = "TestCustomer";
}

const POINT = "/domain/test/counter";
const ALICE = "/obj/Avatar/alice";
const BOB = "/obj/Avatar/bob";

function makePoint(cfg: Partial<AttendancePoint>): AttendancePoint {
  const p = makeStuffAtPath(() => new AttendancePoint(), POINT);
  Object.assign(p, cfg);
  return p;
}

function customer(path: string): TestCustomer {
  return makeStuffAtPath(() => new TestCustomer(), path);
}

/** Run through a root frame — SchedulerApi.start subscribes to events, which
 * needs an execution-context root. */
function act<T>(fn: () => T): T {
  return withRootContext(null, "attendant.test", fn) as T;
}

// The durative lease subscribes to host destruction, so the EventRegistry must
// be bootstrapped; and the per-test scheduler clear wipes the activity
// registry, so re-register the activity each test or onAbort would be skipped.
beforeEach(async () => {
  SchedulerApi._clearAllForTesting();
  EventApi._clearAllForTesting();
  StuffApi.clearAll();
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, "/obj/EventRegistry");
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
  act(() =>
    SchedulerApi.registerActivity(ATTENDANCE_TYPE, AttendanceEngagement as never),
  );
});

describe("Attendant — instant vs durative service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("boot() installs the sweep without a self-call gate error (regression)", () => {
    // AttendantLogic.boot() calls the sweep-install internally; a gated method
    // self-calling another gated method throws SecurityError (the self-caller
    // isn't the AttendantApi module) — which crashed server boot. boot() must
    // succeed and be idempotent.
    act(() => {
      AttendantApi.boot();
      AttendantApi.boot(); // idempotent — no throw on the second call
    });
  });

  it("instant (scrum, attendDurationMs 0) holds no slot", () => {
    const point = makePoint({ discipline: "scrum", attendDurationMs: 0 });
    customer(ALICE);
    const server = makeStuff(() => new TestServer());
    const r = act(() => point.requestAttention(ALICE, server));
    expect(r.status).toBe("attending");
    expect(r).toMatchObject({ instant: true });
    // No lease held — the server's attention is free (scrum, no serialization).
    expect(server.getEngagementBySlot("attention")).toBeUndefined();
    expect(point.isAttending(ALICE)).toBe(false);
  });

  it("durative service leases the server's attention (one at a time)", () => {
    const point = makePoint({ discipline: "line", attendDurationMs: 5000 });
    customer(ALICE);
    customer(BOB);
    const server = makeStuff(() => new TestServer());

    const r1 = act(() => point.requestAttention(ALICE, server));
    expect(r1.status).toBe("attending");
    expect(point.isAttending(ALICE)).toBe(true);
    // The server's attention is now held — serialization falls out of the slot.
    expect(server.getEngagementBySlot("attention")).toBeDefined();

    // A second customer can't be attended by the busy server → queued.
    const r2 = act(() => point.requestAttention(BOB, server));
    expect(r2).toMatchObject({ status: "queued", position: 1 });
    expect(point.getQueue()).toEqual([BOB]);
  });

  it("release pulls up the next in line", () => {
    const point = makePoint({ discipline: "line", attendDurationMs: 5000 });
    customer(ALICE);
    customer(BOB);
    const server = makeStuff(() => new TestServer());
    act(() => point.requestAttention(ALICE, server));
    act(() => point.requestAttention(BOB, server));

    act(() => point.release(ALICE));
    // Alice's lease is gone; the server is free again.
    expect(point.isAttending(ALICE)).toBe(false);
    expect(server.getEngagementBySlot("attention")).toBeUndefined();
    // Bob, still queued, can now be attended.
    const r = act(() => point.requestAttention(BOB, server));
    expect(r.status).toBe("attending");
    expect(point.getQueue()).toEqual([]);
  });
});

describe("Attendant — the lease idle-eviction sweep (anti-grief)", () => {
  let clock = 1_000_000;
  beforeEach(() => {
    clock = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    vi.spyOn(AppApi, "setting").mockImplementation((k: string) =>
      k === AppSettingKeys.attendantLeaseIdleThresholdMs ? "1000" : "",
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("revokes an idle lease and pulls the next up (default-evict)", () => {
    const point = makePoint({ discipline: "line", attendDurationMs: 5000 });
    customer(ALICE);
    customer(BOB);
    const server = makeStuff(() => new TestServer());
    act(() => point.requestAttention(ALICE, server));
    act(() => point.requestAttention(BOB, server));
    expect(point.isAttending(ALICE)).toBe(true);

    // A service act resets recency: still fresh, not swept.
    clock += 800;
    act(() => point.bumpLease(ALICE));
    clock += 800; // 800 since the bump — under the 1000 threshold
    act(() => AttendantApi.sweepNowForTesting());
    expect(point.isAttending(ALICE)).toBe(true); // legit-slow, kept

    // Now let it go idle past the threshold → revoked, server freed.
    clock += 2000;
    act(() => AttendantApi.sweepNowForTesting());
    expect(point.isAttending(ALICE)).toBe(false);
    expect(server.getEngagementBySlot("attention")).toBeUndefined();
    // Bob (front of the order) is still queued, ready to be served.
    expect(point.getQueue()).toEqual([BOB]);
  });
});

describe("Attendant — linkdead release", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("drops a linkdead customer's lease and queue place instantly", () => {
    const point = makePoint({ discipline: "line", attendDurationMs: 5000 });
    customer(ALICE);
    customer(BOB);
    const server = makeStuff(() => new TestServer());
    act(() => point.requestAttention(ALICE, server));
    act(() => point.requestAttention(BOB, server));

    // Alice (holding the lease) and Bob (queued) both go linkdead.
    act(() => AttendantApi.disconnectForTesting("alice"));
    expect(point.isAttending(ALICE)).toBe(false);
    expect(server.getEngagementBySlot("attention")).toBeUndefined();
    act(() => AttendantApi.disconnectForTesting("bob"));
    expect(point.getQueue()).toEqual([]);
  });
});

describe("Attendant — staffing states", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it("closed when unstaffed under the 'close' policy", () => {
    const point = makePoint({
      discipline: "line",
      attendDurationMs: 5000,
      staffingPolicy: "close",
    });
    customer(ALICE);
    // No server resolvable (no business/roster) → closed.
    const r = act(() => point.requestAttention(ALICE));
    expect(r.status).toBe("closed");
  });

  it("self-service when unstaffed under the 'self-service' policy", () => {
    const point = makePoint({
      discipline: "line",
      attendDurationMs: 5000,
      staffingPolicy: "self-service",
    });
    customer(ALICE);
    const r = act(() => point.requestAttention(ALICE));
    expect(r).toMatchObject({ status: "attending", selfService: true });
  });
});

describe("Attendant — config + take-a-number ticket", () => {
  afterEach(() => StuffApi.clearAll());

  it("carries its authored discipline/staffing/skin config", () => {
    const point = makePoint({
      discipline: "take-a-number",
      staffingPolicy: "self-service",
      skin: { poke: "Now serving your number." },
    });
    expect(point.getDiscipline()).toBe("take-a-number");
    expect(point.getStaffingPolicy()).toBe("self-service");
    expect(point.getSkin("poke")).toBe("Now serving your number.");
    // A default skin fills in for an unauthored key.
    expect(point.getSkin("moveOn")).toMatch(/next person/i);
  });

  it("a ticket stamps its point + number (the take-a-number claim)", () => {
    const t = makeStuff(() => {
      const ticket = new Ticket();
      ticket.pointPath = POINT;
      ticket.number = 42;
      return ticket;
    });
    expect(t.getPointPath()).toBe(POINT);
    expect(t.getNumber()).toBe(42);
  });
});

// Keep the scheduler registry clean between files.
afterEach(() => SchedulerApi._clearAllForTesting());
