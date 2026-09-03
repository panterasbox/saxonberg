/**
 * A good stamped to an ORGANIZATION persists with the host that holds it.
 *
 * The skip rule (`ContainerMixin.captureSlice`) drops a stamped good from
 * its host's record because the good's OWNER persists it — true of a player
 * (an `EstateMixin` host, the room overlay lays it back down). An
 * organization has no estate: the goods a business consigns onto its own
 * counter, or buys for its own rail, are the business's and the counter's
 * record is the only place they can live. Skipping them captured them by
 * nobody — a dev restart emptied the cash-and-carry counter and the bar's
 * rail (the libations live drive).
 *
 * Synthetic fixtures throughout; the PM and the clone pipeline are the
 * spine test's mocks.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PersistableApi } from "../../../api/persistable";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { ParcelApi } from "../../../api/parcel";
import { ChattelApi } from "../../../api/chattel";
import { MixinApi } from "../../../api/mixin";
import PersistentHydrator from "../../../platform/idea/persistence/PersistentHydrator";
import { PersistableMixin } from "../Persistable";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { Idea } from "../../stuff/Idea";
import Thing from "../../stuff/Thing";
import type { Stuff } from "../../stuff/Stuff";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { PostRegistrationMixin } from "../../stuff/PostRegistration";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import type { FieldMeta } from "../../mixin";
import ChattelRegistry from "../../../platform/idea/ChattelRegistry";
import { TemplatePaths } from "../../paths";
import { Document } from "../Document";
import { installV1QuantityMarshallers } from "./quantity-marshaller-test-helpers";

const ROOM = "/test/floor";
const COUNTER = "/test/counter";
const GOOD = "/test/bottle";
const HAND = "/test/hand";
const CARD = "/test/card";
const OUTFIT = "/test/outfit";

class Room extends PersistableMixin(
  ContainerMixin(PostRegistrationMixin(Idea)),
) {
  static fieldMeta: FieldMeta = {};
}
class Counter extends PersistableMixin(
  ContainerMixin(ContainableMixin(PostRegistrationMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {};
}
class Hand extends ContainerMixin(ContainableMixin(PostRegistrationMixin(Idea))) {
  static fieldMeta: FieldMeta = {};
}
class Good extends Thing {}

const factories: Record<string, () => Stuff> = {
  [ROOM]: () => new Room(),
  [COUNTER]: () => new Counter(),
  [GOOD]: () => new Good(),
  [HAND]: () => new Hand(),
  [CARD]: () => new Good(),
};

let snapshots: Record<string, unknown>[];
let chattelRows: Record<string, unknown>[];

async function mockClone(path: string): Promise<Stuff> {
  const factory = factories[path];
  if (!factory) throw new Error(`no clone factory for ${path}`);
  const inst = makeStuffAtPath(factory, path);
  if (MixinApi.isPersistable(inst)) {
    await (inst as unknown as { postRegister: () => Promise<void> }).postRegister();
  }
  return inst;
}

beforeEach(() => {
  StuffApi.clearAll();
  ChattelApi._resetRegistryRefForReload(); // the logic caches the registry across clearAll
  snapshots = [];
  chattelRows = [];
  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col === "chattel") return chattelRows;
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
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);
  vi.spyOn(StuffApi, "clone").mockImplementation(
    ((path: string) => mockClone(path)) as unknown as typeof StuffApi.clone,
  );
  vi.spyOn(ParcelApi, "ownerOf").mockResolvedValue({
    kind: "organization",
    templatePath: OUTFIT,
  } as never);
  vi.spyOn(ChattelApi, "placedIn").mockResolvedValue([]);
  Document.setMarshallerResolver(() => undefined, async () => undefined);
  installV1QuantityMarshallers();
  makeStuffAtPath(() => new PersistentHydrator(), PersistentHydrator.templatePath);
});
afterEach(() => vi.restoreAllMocks());

/** Title on file for `good` — the registry's index is rebuilt from the rows. */
async function stamp(good: Stuff, owner: unknown): Promise<void> {
  const id = `c-${good.stuffId}`;
  (good as unknown as { _chattelId: string })._chattelId = id;
  chattelRows.push({ _id: id, chattelId: id, owner, place: "", titledAt: 1 });
  const reg = makeStuffAtPath(() => new ChattelRegistry(), TemplatePaths.chattelRegistry);
  await reg.postRegister();
}
const OUTFIT_OWNER = { kind: "organization", templatePath: OUTFIT };
const ALICE_OWNER = { kind: "player", templatePath: "/platform/agent/Avatar/alice" };

describe("organization-owned goods persist with their host", () => {
  it("a consigned good on the counter survives capture → clear → restore", async () => {
    const room = (await StuffApi.singleton<Room>(ROOM)) as Room;
    const counter = (await StuffApi.singleton<Counter>(COUNTER)) as Counter;
    ContainmentApi.move(counter as never, room as never);
    const good = makeStuffAtPath(() => new Good(), GOOD);
    ContainmentApi.move(good as never, counter as never);
    await stamp(good, OUTFIT_OWNER);
    expect(good.isStamped()).toBe(true);
    expect(good.isOwnerPersisted()).toBe(false);

    await PersistableApi.capture(counter);
    await PersistableApi.capture(room);
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new PersistentHydrator(), PersistentHydrator.templatePath);

    const reborn = (await StuffApi.singleton<Room>(ROOM)) as Room;
    const counter2 = reborn
      .getContents()
      .find((c) => c.getTemplatePath() === COUNTER) as Counter | undefined;
    expect(counter2).toBeDefined();
    const goods = counter2!.getContents().map((c) => c.getTemplatePath());
    expect(goods).toEqual([GOOD]);
  });

  it("a hand's card and the room's fixtures come back where they were; nothing holds itself", async () => {
    const room = (await StuffApi.singleton<Room>(ROOM)) as Room;
    const counter = (await StuffApi.singleton<Counter>(COUNTER)) as Counter;
    ContainmentApi.move(counter as never, room as never);
    const hand = makeStuffAtPath(() => new Hand(), HAND);
    ContainmentApi.move(hand as never, room as never);
    const card = makeStuffAtPath(() => new Good(), CARD);
    ContainmentApi.move(card as never, hand as never);
    const good = makeStuffAtPath(() => new Good(), GOOD);
    ContainmentApi.move(good as never, hand as never);
    await stamp(good, OUTFIT_OWNER);

    await PersistableApi.capture(counter);
    await PersistableApi.capture(room);
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    makeStuffAtPath(() => new PersistentHydrator(), PersistentHydrator.templatePath);

    const reborn = (await StuffApi.singleton<Room>(ROOM)) as Room;
    const paths = reborn.getContents().map((c) => c.getTemplatePath()).sort();
    expect(paths).toEqual([COUNTER, HAND].sort());
    const hand2 = reborn.getContents().find((c) => c.getTemplatePath() === HAND) as Hand;
    const held = hand2.getContents().map((c) => c.getTemplatePath()).sort();
    expect(held).toEqual([CARD, GOOD].sort());
    for (const c of hand2.getContents()) expect(c).not.toBe(hand2);
  });

  it("a PLAYER's good still rides its owner's record, never the host's (the skip rule holds)", async () => {
    const room = (await StuffApi.singleton<Room>(ROOM)) as Room;
    const good = makeStuffAtPath(() => new Good(), GOOD);
    ContainmentApi.move(good as never, room as never);
    await stamp(good, ALICE_OWNER);
    expect(good.isOwnerPersisted()).toBe(true);
    await PersistableApi.capture(room);
    const rec = snapshots.find((d) => d.scope === ROOM) as { state: Record<string, { contents?: unknown[] }> };
    const contents = Object.values(rec.state).find((sl) => "contents" in sl)?.contents ?? [];
    expect(contents).toEqual([]);
  });
});
