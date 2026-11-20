/**
 * ⭐ A good kept INSIDE a container in its place comes back inside it
 * (size and carrying, finalize run 15, step 21).
 *
 * A container's own contents slice skips an owned good (D2), so the good's
 * owner carries it — and until the estate entry learned the way in
 * (`within`, from `Containable.getKeptWithin`), the restore put it in the
 * PLACE: a player's rations in the pannier on the steading mule came back
 * loose on the mule (and R1's loud diagnostic said so). Two holders here —
 * a persisted holder the owner is not (the mule's case, the room overlay)
 * and the owner's own body (the inventory case) — with two alike bags, so
 * the ordinal is what picks the right one.
 */

import "../../../../test-bootstrap";
import { withSaveMany } from '../../persistence/__tests__/pm-fake';
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ChattelRegistry from "../../../platform/idea/ChattelRegistry";
import Good from "../../stuff/Good";
import { StuffApi } from "../../../api/stuff";
import { ContainmentApi } from "../../../api/containment";
import { PersistableApi } from "../../../api/persistable";
import { PersistableMixin } from "../../persistence/Persistable";
import { EstateMixin } from "../Estate";
import { ContainerMixin } from "../../spatial/Container";
import { Idea } from "../../stuff/Idea";
import TemplateApplier from "../../../platform/idea/TemplateApplier";
import { Document } from "../../persistence/Document";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import type { Containable } from "../../spatial/Containable";
import type { FieldMeta } from "../../mixin";
import type { Chattel } from "../Chattel";

const RATION_PATH = "/test/ration";
const PANNIER_PATH = "/test/pannier";
const MULE_PATH = "/test/mule";
const ALICE_PATH = "/platform/agent/Avatar/alice";

class Ration extends Good {}
class Pannier extends ContainerMixin(Good) {
  static fieldMeta: FieldMeta = {};
}
/** A persisted holder the owner is not — the steading mule, reduced. */
class Mule extends PersistableMixin(ContainerMixin(Idea)) {
  static fieldMeta: FieldMeta = {};
}
class Person extends PersistableMixin(EstateMixin(ContainerMixin(Idea))) {
  static fieldMeta: FieldMeta = {};
}

interface Doc extends Record<string, unknown> {
  _id?: string;
}
let store: Map<string, Doc[]>;
let idCounter = 0;
function col(c: string): Doc[] {
  let arr = store.get(c);
  if (!arr) {
    arr = [];
    store.set(c, arr);
  }
  return arr;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  vi.spyOn(PersistenceManager, "get").mockReturnValue(withSaveMany({
    save: vi.fn(async (c: string, doc: Doc) => {
      const arr = col(c);
      if (doc._id) {
        const i = arr.findIndex((d) => d._id === doc._id);
        if (i >= 0) arr[i] = { ...doc };
        else arr.push({ ...doc });
        return doc._id;
      }
      const id = String(++idCounter);
      arr.push({ ...doc, _id: id });
      return id;
    }),
    find: vi.fn(async (c: string, q: Record<string, unknown>) => {
      const arr = col(c);
      const keys = Object.keys(q);
      if (keys.length === 0) return arr.slice();
      return arr.filter((d) => keys.every((k) => d[k] === q[k]));
    }),
    findById: vi.fn(async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null),
    delete: vi.fn(async (c: string, id: string) => {
      const arr = col(c);
      const i = arr.findIndex((d) => d._id === id);
      if (i >= 0) arr.splice(i, 1);
    }),
    isConnected: () => true,
  }) as unknown as PersistenceManager);
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

async function boot(): Promise<void> {
  installV1QuantityMarshallers();
  const reg = makeStuffAtPath(() => new ChattelRegistry(), "/platform/idea/ChattelRegistry");
  await reg.onCreate();
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
  vi.spyOn(StuffApi, "clone").mockImplementation(((path: string) =>
    Promise.resolve(
      path === PANNIER_PATH
        ? makeStuffAtPath(() => new Pannier(), path)
        : makeStuffAtPath(() => new Ration(), path),
    )) as unknown as typeof StuffApi.clone);
}

const mule = (): Mule => makeStuffAtPath(() => new Mule(), MULE_PATH);
const person = (): Person => makeStuffAtPath(() => new Person(), ALICE_PATH);
const pannier = (): Pannier => makeStuffAtPath(() => new Pannier(), PANNIER_PATH);
const ration = (): Ration => makeStuffAtPath(() => new Ration(), RATION_PATH);

function put(item: Stuff, into: Stuff): void {
  ContainmentApi.move(item as unknown as Stuff & Containable, into as unknown as Stuff & Container);
}

/** Two alike, untitled panniers on `holder`; the second holds Alice's ration. */
async function loaded(holder: Stuff, alice: Person, place: string): Promise<string> {
  const left = pannier();
  const right = pannier();
  put(left, holder);
  put(right, holder);
  const r = ration();
  put(r, right);
  await r.stampChattel(alice);
  await (r as unknown as Stuff & Chattel).setChattelPlace(place);
  return r.getChattelId();
}

beforeEach(async () => {
  StuffApi.clearAll();
  installStore();
  await boot();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("a good kept inside a container in its place", () => {
  it("⭐ the player's rations in an unowned pannier on the mule come back IN that pannier across a restart", async () => {
    const alice = person();
    const m = mule();
    const id = await loaded(m, alice, PersistableApi.placeIdOf(m));

    await PersistableApi.capture(m);
    await PersistableApi.capture(alice);
    // The owner's record names the way in: the second pannier on the mule.
    const aliceState = col("holder_snapshots").find((d) => d.scope === ALICE_PATH)?.state as Record<
      string,
      { entries?: Array<{ chattelId: string; within?: unknown }> }
    >;
    expect(aliceState.EstateMixin?.entries?.find((e) => e.chattelId === id)?.within).toEqual([
      { in: PANNIER_PATH, nth: 1 },
    ]);

    StuffApi.clearAll();
    await boot();
    const reborn = mule();
    await PersistableApi.materialize(reborn);

    const onMule = (reborn as unknown as Container).getContents();
    // Nothing loose on the mule: only its two panniers.
    expect(onMule.map((c) => c.getTemplatePath())).toEqual([PANNIER_PATH, PANNIER_PATH]);
    const [left, right] = onMule as unknown as Container[];
    expect(left!.getContents()).toHaveLength(0);
    const back = right!.getContents();
    expect(back.map((c) => (c as unknown as Stuff & Chattel).getChattelId())).toEqual([id]);
    expect(await (back[0] as unknown as Stuff & Chattel).chattelOwner()).toEqual({
      kind: "player",
      templatePath: ALICE_PATH,
    });
  });

  it("⭐ a ration in an unowned bag its owner carries comes back in the bag, not loose on the owner", async () => {
    const alice = person();
    const id = await loaded(alice, alice, "inventory");

    await PersistableApi.capture(alice);
    StuffApi.clearAll();
    await boot();
    const reborn = person();
    await PersistableApi.materialize(reborn);

    const carried = (reborn as unknown as Container).getContents();
    expect(carried.map((c) => c.getTemplatePath())).toEqual([PANNIER_PATH, PANNIER_PATH]);
    const [left, right] = carried as unknown as Container[];
    expect(left!.getContents()).toHaveLength(0);
    expect(right!.getContents().map((c) => (c as unknown as Stuff & Chattel).getChattelId())).toEqual([id]);
  });

  it("a good standing in its place directly names no way in", async () => {
    const alice = person();
    const m = mule();
    const r = ration();
    put(r, m);
    await r.stampChattel(alice);
    expect(r.getKeptWithin()).toBeNull();
  });
});
