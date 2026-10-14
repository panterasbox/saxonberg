/**
 * The return-login backstop (maritime D26) and the restore hook.
 *
 * You log on where you logged off; when that place no longer resolves —
 * somebody broke the room, the ship you slept on is gone — the host
 * lands at the realm's default start instead of nowhere (a containerless
 * avatar made `Avatar.enter` throw). And after a record is restored the
 * host's `onRestored` hook runs, which is how a craft re-arms its voyage.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PersistableApi } from "../../../../api/persistable";
import { StuffApi } from "../../../../api/stuff";
import { ContainmentApi } from "../../../../api/containment";
import { ParcelApi } from "../../../../api/parcel";
import { MixinApi } from "../../../../api/mixin";
import { AppApi } from "../../../../api/app";
import TemplateApplier from "../../TemplateApplier";
import { PersistableMixin } from "../../../../lib/persistence/Persistable";
import { PersistenceManager } from "../../../../../backend/PersistenceManager";
import { Idea } from "../../../../lib/stuff/Idea";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { makeStuffAtPath } from "../../../../lib/security/__tests__/test-setup";

class Room extends ContainerMixin(Idea) {}

const restored = vi.fn();
class Sleeper extends PersistableMixin(ContainableMixin(Idea)) {
  override async onRestored(): Promise<void> {
    restored();
    await super.onRestored();
  }
}

/* ─────────────────────────── harness ───────────────────────────────── */

let cloneFactories: Record<string, () => Stuff>;

async function mockClone(path: string): Promise<Stuff> {
  const factory = cloneFactories[path];
  if (!factory) throw new Error(`no clone factory for ${path}`);
  const inst = makeStuffAtPath(factory, path);
  if (MixinApi.isPersistable(inst)) {
    await (
      inst as unknown as { onCreate: () => Promise<void> }
    ).onCreate();
  }
  return inst;
}

let snapshots: Record<string, unknown>[];

beforeEach(() => {
  StuffApi.clearAll();
  snapshots = [];
  cloneFactories = {};

  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col !== "holder_snapshots") return [];
    return snapshots.filter((d) =>
      Object.entries(query).every(([k, v]) => d[k] === v),
    );
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col !== "holder_snapshots") return "id";
    const i = snapshots.findIndex(
      (d) => d.scope === doc.scope && d.owner === doc.owner,
    );
    if (i >= 0) {
      snapshots[i] = { ...doc, _id: snapshots[i]!._id };
      return snapshots[i]!._id as string;
    }
    const _id = String(snapshots.length + 1);
    snapshots.push({ ...doc, _id });
    return _id;
  });
  const del = vi.fn(async (col: string, id: string) => {
    if (col !== "holder_snapshots") return;
    const i = snapshots.findIndex((d) => d._id === id);
    if (i >= 0) snapshots.splice(i, 1);
  });
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: del,
  } as unknown as PersistenceManager);

  vi.spyOn(StuffApi, "clone").mockImplementation(
    ((path: string) => mockClone(path)) as unknown as typeof StuffApi.clone,
  );

  vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue({
    kind: "group",
    name: "lounge",
  });

  makeStuffAtPath(
    () => new TemplateApplier(),
    TemplateApplier.templatePath,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});


describe("the return-login backstop", () => {
  it("⭐ a captured place that no longer resolves lands the host at the default start", async () => {
    const cabin = makeStuffAtPath(() => new Room(), "/test/ship/cabin");
    const sleeper = makeStuffAtPath(() => new Sleeper(), "/test/sleeper");
    ContainmentApi.move(sleeper, cabin);
    await PersistableApi.capture(sleeper);
    StuffApi.unregister(sleeper);
    StuffApi.unregister(cabin);

    const lounge = makeStuffAtPath(() => new Room(), "/test/lounge");
    vi.spyOn(StuffApi, "singletonOrClone").mockRejectedValue(new Error("Template not found"));
    vi.spyOn(AppApi, "setting").mockImplementation(((k: string) =>
      k === "defaultStartLocation" ? "/test/lounge" : "") as never);
    vi.spyOn(ContainmentApi, "resolveLanding").mockResolvedValue({ container: lounge } as never);

    const reborn = makeStuffAtPath(() => new Sleeper(), "/test/sleeper");
    await PersistableApi.materialize(reborn);
    expect(reborn.getContainer()).toBe(lounge);
  });

  it("onRestored runs after a record is restored, and not on a fresh seed", async () => {
    restored.mockReset();
    const fresh = makeStuffAtPath(() => new Sleeper(), "/test/fresh");
    await PersistableApi.materialize(fresh);
    expect(restored).not.toHaveBeenCalled();
    await PersistableApi.capture(fresh);
    StuffApi.unregister(fresh);
    const again = makeStuffAtPath(() => new Sleeper(), "/test/fresh");
    await PersistableApi.materialize(again);
    expect(restored).toHaveBeenCalledTimes(1);
  });
});
