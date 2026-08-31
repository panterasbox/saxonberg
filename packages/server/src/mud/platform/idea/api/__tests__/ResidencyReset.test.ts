/**
 * The residency reset (repop) sweep — the game-time eviction sibling.
 *
 * Proves: a non-shop resettable is topped up by `resetNow()` when absent
 * but SKIPPED while a player occupies its room (the presence default); the
 * shop's `Stock` overrides that skip (`resetsWhilePresent`) and restocks to
 * par even while browsed; observe mode repops nothing. Eviction is
 * unregressed (its own suite). Harness: the `ResidencyLogic` test shape
 * (warmed AppSettings cache + spied presence).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Stock from "../../../thing/Stock";
import Thing from "../../../../lib/stuff/Thing";
import { Vessel } from "../../../../lib/stuff/Vessel";
import Location from "../../../../lib/stuff/Location";
import { ResettableMixin } from "../../../../lib/residency/Resettable";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { Idea } from "../../../../lib/stuff/Idea";
import { ResidencyApi } from "../../../../api/residency";
import { StuffApi } from "../../../../api/stuff";
import { ShadowApi } from "../../../../api/shadow";
import { ContainmentApi } from "../../../../api/containment";
import { ProxyApi } from "../../../../api/proxy";
import { ConnectionApi } from "../../../../api/connection";
import type Interactive from "../../Interactive";
import { AppSettings, AppSettingKeys } from "../../../../lib/config/AppSettings";
import { makeStuff, makeStuffAtPath } from "../../../../lib/security/__tests__/test-setup";
import type { Stuff } from "../../../../lib/stuff/Stuff";

const TORCH = "/obj/test/Torch";

class ResettableDemo extends ResettableMixin(ContainableMixin(Idea)) {
  static _mixinName = "ResettableDemo";
  public resetCount = 0;
  override reset(): void {
    this.resetCount += 1;
  }
}

function setSetting(key: string, value: string): void {
  AppSettings.getCached().setValue(key, value);
}

function presentIn(room: Stuff): { mockRestore(): void } {
  const holder = makeStuff(() => new Thing());
  ContainmentApi.move(holder, room as never);
  return vi
    .spyOn(ConnectionApi, "getAllInteractives")
    .mockReturnValue([{ getHolder: () => holder } as unknown as Interactive]);
}

describe("residency reset sweep", () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    (AppSettings as unknown as { _cached: AppSettings | null })._cached =
      new AppSettings();
    setSetting(AppSettingKeys.residencyResetMode, "enforce");
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
      const t = makeStuffAtPath(() => new Thing(), path);
      t.setKeywords(["torch"]);
      return t;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resets a non-present resettable to baseline", async () => {
    const room = makeStuff(() => new Location());
    const demo = makeStuff(() => new ResettableDemo());
    ContainmentApi.move(demo, room);
    await ResidencyApi.resetNow();
    expect(demo.resetCount).toBe(1);
  });

  it("skips a resettable while a player occupies its room (default)", async () => {
    const room = makeStuff(() => new Location());
    const demo = makeStuff(() => new ResettableDemo());
    ContainmentApi.move(demo, room);
    const spy = presentIn(room);
    await ResidencyApi.resetNow();
    expect(demo.resetCount).toBe(0); // present + no override → skipped
    spy.mockRestore();
  });

  // ⭐⭐ The sweep must not WARM what it inspects. It unwraps precisely so
  // enumeration is not a residency touch — but `getContainer()` RETURNS a
  // proxy, so a walk that unwrapped only its starting object went back
  // through the security proxy at every hop after the first, touching
  // every ancestor in the world. The cold tail the eviction sweep exists
  // to find could then never GO cold, and each proxied hop also paid a
  // gated call (which captures a JS stack): a live drive found the server
  // pinned at a core with five of five debugger pauses landing in this
  // walk. Nothing asserted the no-touch half, which is how it shipped.
  it("walking the presence check does not TOUCH the containers it walks", async () => {
    const room = makeStuff(() => new Location());
    // A container standing in the room, with the resettable inside it —
    // so the presence walk has a real ancestor hop to make.
    const crate = makeStuff(() => new Vessel());
    ContainmentApi.move(crate as never, room as never);
    const item = makeStuff(() => new ResettableDemo());
    ContainmentApi.move(item as never, crate as never);
    // Somebody is present SOMEWHERE, so the walk actually runs (it
    // early-returns on an empty present set — which is why this cliff
    // only appears once a player logs in).
    const elsewhere = makeStuff(() => new Location());
    const restore = presentIn(elsewhere);

    const rawOuter = ProxyApi.unwrap(crate as never) as unknown as {
      getLastTouched(): number;
    };
    const before = rawOuter.getLastTouched();
    await ResidencyApi.resetNow();
    const after = rawOuter.getLastTouched();
    restore.mockRestore();
    expect(after).toBe(before);
  });

  it("observe mode repops nothing", async () => {
    setSetting(AppSettingKeys.residencyResetMode, "observe");
    const room = makeStuff(() => new Location());
    const demo = makeStuff(() => new ResettableDemo());
    ContainmentApi.move(demo, room);
    await ResidencyApi.resetNow();
    expect(demo.resetCount).toBe(0);
  });

  it("the shop's Stock restocks to par even while browsed (override)", async () => {
    const room = makeStuff(() => new Location());
    const stock = makeStuffAtPath(() => {
      const s = new Stock();
      s.stockLines = [{ itemTemplatePath: TORCH, par: 2 }];
      return s;
    }, "/obj/test/counter");
    ContainmentApi.move(stock as never, room as never);
    // Sell down to empty, then a player is browsing the shop.
    expect(stock.onHand(TORCH)).toBe(0);
    const spy = presentIn(room);

    await ResidencyApi.resetNow();

    expect(stock.onHand(TORCH)).toBe(2); // topped to par despite presence
    spy.mockRestore();
  });
});
