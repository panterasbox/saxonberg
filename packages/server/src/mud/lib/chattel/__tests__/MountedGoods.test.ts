/**
 * Mounted goods — a lamp you hung stays on the wall across a restart
 * (residences D11).
 *
 * The room overlay's second placement. A good standing in a room is
 * captured by its owner and laid back down in that room's contents;
 * a good HUNG in it is captured by its owner and re-attached to that
 * room's `Adornable` fixture map, in the slot it was in.
 *
 * That needs three things this suite pins:
 *
 *   - a **capture pass on the fixtures map**. The container slice never
 *     sees a fixture, so without one a room going dormant while its
 *     owner is offline would take the lamp down with it and nobody
 *     would have captured it;
 *   - a **marker on the estate entry** (`mounted.slot`), derived from
 *     where the good actually hangs rather than passed in, so it can
 *     never disagree with the fixture map;
 *   - the overlay's **mount branch** — out of the contents (the
 *     not-portable invariant forbids being in both) and into the slot.
 *
 * Harness: the `RoomOverlay.test` shape verbatim.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ChattelRegistry from "../../../platform/idea/ChattelRegistry";
import Thing from "../../stuff/Thing";
import { ChattelApi } from "../../../api/chattel";
import { StuffApi } from "../../../api/stuff";
import { PersistableApi } from "../../../api/persistable";
import { PersistableMixin } from "../../persistence/Persistable";
import { EstateMixin } from "../Estate";
import { ContainerMixin } from "../../spatial/Container";
import { AdornableMixin } from "../../boundary/Adornable";
import { AdornmentMixin } from "../../boundary/Adornment";
import { ContainmentApi } from "../../../api/containment";
import { PostRegistrationMixin } from "../../stuff/PostRegistration";
import { Idea } from "../../stuff/Idea";
import PersistentHydrator from "../../../platform/idea/persistence/PersistentHydrator";
import { Document } from "../../persistence/Document";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import { ESTATE_INVENTORY } from "../../persistence/PersistenceSlice";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import type { Containable } from "../../spatial/Containable";
import type { Adornable } from "../../boundary/Adornable";
import type { Adornment } from "../../boundary/Adornment";
import type { FieldMeta } from "../../mixin";
import type { Chattel } from '../Chattel';

const SCONCE_PATH = "/stuff/thing/fixture/sconce-lamp";
const ROOM_PATH = "/test/Parlour";
const ALICE_PATH = "/platform/agent/Avatar/alice";

/** The wall light: chattel (every Thing is) that can be adorned onto a host. */
class Sconce extends AdornmentMixin(Thing) {}

/** A room you can hang things in — every Location composes Adornable. */
class Room extends PersistableMixin(
  AdornableMixin(ContainerMixin(PostRegistrationMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {};
}

class Person extends PersistableMixin(
  EstateMixin(ContainerMixin(PostRegistrationMixin(Idea))),
) {
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
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
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
    findById: vi.fn(
      async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null,
    ),
    delete: vi.fn(async (c: string, id: string) => {
      const arr = col(c);
      const i = arr.findIndex((d) => d._id === id);
      if (i >= 0) arr.splice(i, 1);
    }),
    isConnected: () => true,
  } as unknown as PersistenceManager);
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

async function boot(): Promise<void> {
  installV1QuantityMarshallers();
  const reg = makeStuffAtPath(
    () => new ChattelRegistry(),
    "/platform/idea/ChattelRegistry",
  );
  await reg.postRegister();
  makeStuffAtPath(() => new PersistentHydrator(), PersistentHydrator.templatePath);
  vi.spyOn(StuffApi, "clone").mockImplementation(
    ((path: string) =>
      Promise.resolve(makeStuffAtPath(() => new Sconce(), path))) as unknown as
      typeof StuffApi.clone,
  );
}

const sconce = (): Sconce => makeStuffAtPath(() => new Sconce(), SCONCE_PATH);
const room = (): Room => makeStuffAtPath(() => new Room(), ROOM_PATH);
const person = (path: string): Person =>
  makeStuffAtPath(() => new Person(), path);

/** What `hang` does, in three lines: detach, attach, follow. */
async function hang(item: Sconce, host: Room, slot: string): Promise<void> {
  ContainmentApi.move(item as unknown as Stuff & Containable, null);
  (host as unknown as Stuff & Adornable).addFixture(
    item as unknown as Stuff & Adornment,
    slot,
  );
  await (item as unknown as Stuff & Chattel).followCustody();
}

function estateEntries(scope: string): Array<{
  chattelId: string;
  place: string;
  mounted?: { slot: string };
}> {
  const rec = col("holder_snapshots").find((d) => d.scope === scope);
  const state = rec?.state as
    | Record<string, { entries?: Array<{ chattelId: string; place: string; mounted?: { slot: string } }> }>
    | undefined;
  return state?.EstateMixin?.entries ?? [];
}

beforeEach(async () => {
  StuffApi.clearAll();
  installStore();
  await boot();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("a hung good", () => {
  it("persists owner-side with its mount slot, and the room's record carries nothing of it", async () => {
    const alice = person(ALICE_PATH);
    const r = room();
    const lamp = sconce();
    await (lamp as unknown as Stuff & Chattel).stampChattel(alice);
    await hang(lamp, r, "mounted:one");
    const id = lamp.getChattelId();

    await PersistableApi.capture(r);
    await PersistableApi.capture(alice);

    // The room forgot furniture it never owned — including off the wall.
    const roomState = col("holder_snapshots").find((d) => d.scope === ROOM_PATH)
      ?.state as Record<string, { contents?: unknown[] }>;
    expect(roomState.ContainerMixin?.contents?.length).toBe(0);

    // Alice's record names the room AND the wall.
    const entry = estateEntries(ALICE_PATH).find((e) => e.chattelId === id);
    expect(entry?.place).toBe(ROOM_PATH);
    expect(entry?.mounted?.slot).toBe("mounted:one");
  });

  it("comes back ON THE WALL after a restart, not on the floor", async () => {
    const alice = person(ALICE_PATH);
    const r = room();
    const lamp = sconce();
    await (lamp as unknown as Stuff & Chattel).stampChattel(alice);
    await hang(lamp, r, "mounted:one");
    const id = lamp.getChattelId();

    await PersistableApi.capture(r);
    await PersistableApi.capture(alice);
    StuffApi.clearAll();
    await boot();

    const reborn = room();
    await PersistableApi.materialize(reborn);

    const host = reborn as unknown as Stuff & Adornable;
    const fixtures = host.getFixtures();
    expect(fixtures.length).toBe(1);
    // Same slot, and NOT in the contents — an attached adornment may not
    // be in both, and the floor is the failure this test exists to catch.
    expect(host.slotOfFixture(fixtures[0]!)).toBe("mounted:one");
    expect((reborn as unknown as Container).getContents().length).toBe(0);
    expect(
      (fixtures[0] as unknown as { getChattelId(): string }).getChattelId(),
    ).toBe(id);
    // Still Alice's — hanging it in a room never moved title.
    expect(await (fixtures[0] as unknown as Stuff & Chattel).chattelOwner()).toEqual({
      kind: "player",
      templatePath: ALICE_PATH,
    });
  });

  it("is captured by its owner even when the owner is OFFLINE when the room sleeps", async () => {
    const alice = person(ALICE_PATH);
    const r = room();
    const lamp = sconce();
    await (lamp as unknown as Stuff & Chattel).stampChattel(alice);
    // Alice has a record, and in it the lamp is still in her hands.
    await PersistableApi.capture(alice);
    await hang(lamp, r, "mounted:one");
    const id = lamp.getChattelId();

    // …and then she logs out. Her stored record is the only copy of her
    // estate now, and it does not know about the wall.
    const live = StuffApi.findByTemplatePath.bind(StuffApi);
    vi.spyOn(StuffApi, "findByTemplatePath").mockImplementation(((
      path: string,
    ) => (path === ALICE_PATH ? null : live(path))) as unknown as
      typeof StuffApi.findByTemplatePath);

    // The room sleeps with nobody live to notice the lamp. THIS is the
    // only path by which it is captured by anybody at all.
    await PersistableApi.capture(r);

    const entry = estateEntries(ALICE_PATH).find((e) => e.chattelId === id);
    expect(entry).toBeDefined();
    expect(entry?.place).toBe(ROOM_PATH);
    expect(entry?.mounted?.slot).toBe("mounted:one");
  });

  it("comes down into your hands — custody follows, and the marker clears", async () => {
    const alice = person(ALICE_PATH);
    const r = room();
    const lamp = sconce();
    await (lamp as unknown as Stuff & Chattel).stampChattel(alice);
    await hang(lamp, r, "mounted:one");
    const id = lamp.getChattelId();

    // What `get` does to a fixture: detach, then the ordinary move.
    (r as unknown as Stuff & Adornable).removeFixture(
      lamp as unknown as Stuff & Adornment,
    );
    ContainmentApi.move(
      lamp as unknown as Stuff & Containable,
      alice as unknown as Stuff & Container,
    );
    await (lamp as unknown as Stuff & Chattel).followCustody();

    await PersistableApi.capture(alice);
    const entry = estateEntries(ALICE_PATH).find((e) => e.chattelId === id);
    expect(entry?.place).toBe(ESTATE_INVENTORY);
    expect(entry?.mounted).toBeUndefined();
  });

  it("a wall takes as many as you can afford — capacity is read, never enforced", async () => {
    const alice = person(ALICE_PATH);
    const r = room();
    for (let i = 0; i < 12; i++) {
      const lamp = sconce();
      await (lamp as unknown as Stuff & Chattel).stampChattel(alice);
      await hang(lamp, r, `mounted:${i}`);
    }
    expect((r as unknown as Stuff & Adornable).getFixtures().length).toBe(12);
  });
});
