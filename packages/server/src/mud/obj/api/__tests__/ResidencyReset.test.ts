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

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Stock from "../../Stock";
import Thing from "../../../lib/stuff/Thing";
import Location from "../../../lib/stuff/Location";
import { ResettableMixin } from "../../../lib/residency/Resettable";
import { ContainableMixin } from "../../../lib/spatial/Containable";
import { Idea } from "../../../lib/stuff/Idea";
import { ResidencyApi } from "../../../api/residency";
import { StuffApi } from "../../../api/stuff";
import { ShadowApi } from "../../../api/shadow";
import { ContainmentApi } from "../../../api/containment";
import { ConnectionApi } from "../../../api/connection";
import type Interactive from "../../Interactive";
import { AppSettings, AppSettingKeys } from "../../../lib/config/AppSettings";
import { makeStuff, makeStuffAtPath } from "../../../lib/security/__tests__/test-setup";
import type { Stuff } from "../../../lib/stuff/Stuff";

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
