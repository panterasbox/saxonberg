/**
 * The residency sweeps are single-flight WITH A TRAILING RUN.
 *
 * A firing that lands while a sweep is running must not be dropped: the
 * running sweep may already have passed the shelf that now needs it. The
 * assembly drive found it once master's scan sweep retired the spawn path
 * that had been hiding it — a timber yard topped up, bought out, then
 * forty days skipped stayed bare until the next game hour, because the
 * forty-day firing landed inside a sweep that had already been past the
 * yard and was thrown away.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from "vitest";
import { ResidencyLogic } from "../ResidencyLogic";
import { ResettableMixin } from "../../../../lib/residency/Resettable";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { Idea } from "../../../../lib/stuff/Idea";
import { StuffApi } from "../../../../api/stuff";
import { ShadowApi } from "../../../../api/shadow";
import { AppSettings, AppSettingKeys } from "../../../../lib/config/AppSettings";
import { makeStuff } from "../../../../lib/security/__tests__/test-setup";

/** A shelf whose reset blocks until released — a long sweep, held open. */
class SlowShelf extends ResettableMixin(ContainableMixin(Idea)) {
  static _mixinName = "SlowShelfTrailing";
  public resets = 0;
  public gate: Promise<void> = Promise.resolve();
  override async reset(): Promise<void> {
    this.resets += 1;
    await this.gate;
  }
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 0));
};

describe("residency reset sweep — single-flight with a trailing run", () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    (AppSettings as unknown as { _cached: AppSettings | null })._cached = new AppSettings();
    AppSettings.getCached().setValue(AppSettingKeys.residencyResetMode, "enforce");
  });

  it("⭐ firings during a sweep collapse to ONE more sweep after it — never none, never several", async () => {
    const shelf = makeStuff(() => new SlowShelf());
    let release!: () => void;
    shelf.gate = new Promise<void>((r) => (release = r));
    const logic = makeStuff(() => new ResidencyLogic());
    const start = (): void => (logic as unknown as { startResetSweep(): void }).startResetSweep();

    start(); // the sweep under way, held open at the shelf
    await settle();
    expect(shelf.resets).toBe(1);
    start(); // a firing lands mid-sweep (the forty-day jump)…
    start(); // …and another (the backlog): still ONE trailing run
    await settle();
    expect(shelf.resets).toBe(1); // nothing overlaps

    shelf.gate = Promise.resolve();
    release();
    await settle();
    expect(shelf.resets).toBe(2); // the trailing run happened, once
    await settle();
    expect(shelf.resets).toBe(2);
  });

  it("a firing with nothing running sweeps at once, and leaves nothing pending", async () => {
    const shelf = makeStuff(() => new SlowShelf());
    const logic = makeStuff(() => new ResidencyLogic());
    (logic as unknown as { startResetSweep(): void }).startResetSweep();
    await settle();
    expect(shelf.resets).toBe(1);
    await settle();
    expect(shelf.resets).toBe(1);
  });
});
