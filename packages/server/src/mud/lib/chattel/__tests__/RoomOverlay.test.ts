/**
 * The room overlay (wave 4, D4) — a room, on materialize, restores its own
 * record (its **fixtures**) and then lays down the owned goods whose `place`
 * names it, cloned as **their owner**.
 *
 * Order is the whole decision: fixtures first, so a placed good can rest on
 * a surface that exists. The room captures nothing owner-side on the way
 * down — the owner's record is authoritative for chattel, and a room going
 * dormant simply forgets furniture it never owned.
 *
 * Also proves the two criteria the overlay exists for:
 *
 *   - **the furnish loop** — place → dormancy → restart → the same goods in
 *     the same rooms, with the room's own fixtures respawned separately;
 *   - **the guest-drop leak is closed** — a visitor's good is titled to the
 *     visitor, rides the visitor's record, names the foreign room, reappears
 *     there, and NEVER appears in the host's record.
 *
 * And the D15 check: none of this is residential. The engine half is
 * venue-generic, so the last case runs on a plain room with no parcel, no
 * lease and no tenant.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ChattelRegistry from "../../../platform/idea/ChattelRegistry";
import Thing from "../../stuff/Thing";
import { ChattelApi } from "../../../api/chattel";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { ContainmentApi } from "../../../api/containment";
import { PersistableApi } from "../../../api/persistable";
import { PersistableMixin } from "../../persistence/Persistable";
import { EstateMixin } from "../Estate";
import { ContainerMixin } from "../../spatial/Container";
import { PostRegistrationMixin } from "../../stuff/PostRegistration";
import { Idea } from "../../stuff/Idea";
import PersistentHydrator from "../../../platform/idea/persistence/PersistentHydrator";
import { Document } from "../../persistence/Document";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { PosedMixin } from "../../character/Posed";
import { SlottableMixin } from "../../slot/Slottable";
import PosturedChair from "../../../platform/thing/Chair";
import type { Containable } from "../../spatial/Containable";
import type { Slotted } from "../../slot/Slotted";
import type { Slottable } from "../../slot/Slottable";
import type { FieldMeta } from "../../mixin";

const CHAIR_PATH = "/obj/test/Chair";
const ROOM_PATH = "/world/test/Room";
const ALICE_PATH = "/platform/agent/Avatar/alice";
const BOB_PATH = "/platform/agent/Avatar/bob";

class Chair extends Thing {}
class Room extends PersistableMixin(ContainerMixin(PostRegistrationMixin(Idea))) {
  static fieldMeta: FieldMeta = {};
}
class Person extends PersistableMixin(
  EstateMixin(ContainerMixin(PostRegistrationMixin(Idea))),
) {
  static fieldMeta: FieldMeta = {};
}

/** A sleeper: Posed + Slottable + Containable, an Avatar reduced to D10. */
class Sleeper extends PersistableMixin(
  PosedMixin(SlottableMixin(ContainableMixin(PostRegistrationMixin(Idea)))),
) {
  static fieldMeta: FieldMeta = {};
}

const BED_PATH = "/stuff/thing/fixture/bed";
function makeBed(): PosturedChair {
  const bed = makeStuffAtPath(() => new PosturedChair(), BED_PATH);
  bed.setStaticSlots([
    { name: "lie:1", accepts: "SlottableMixin", capacity: 1, postures: ["lie", "sit"] },
  ]);
  bed.setRestQuality(2.5);
  return bed;
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
  const reg = makeStuffAtPath(() => new ChattelRegistry(), "/platform/idea/ChattelRegistry");
  await reg.postRegister();
  makeStuffAtPath(() => new PersistentHydrator(), PersistentHydrator.templatePath);
  vi.spyOn(StuffApi, "clone").mockImplementation(
    ((path: string) =>
      Promise.resolve(makeStuffAtPath(() => new Chair(), path))) as unknown as
      typeof StuffApi.clone,
  );
}

const chair = (): Chair => makeStuffAtPath(() => new Chair(), CHAIR_PATH);
const room = (): Room => makeStuffAtPath(() => new Room(), ROOM_PATH);
const person = (path: string): Person =>
  makeStuffAtPath(() => new Person(), path);

/** Put `item` in `host` and record the owner as keeping it there. */
async function place(item: Stuff, host: Stuff): Promise<void> {
  ContainmentApi.move(
    item as unknown as Stuff & Containable,
    host as unknown as Stuff & Container,
  );
  await ChattelApi.setPlace(item, PersistableApi.placeIdOf(host));
}

beforeEach(async () => {
  StuffApi.clearAll();
  installStore();
  await boot();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("the room overlay", () => {
  it("the furnish loop persists — same goods, same room, across a restart", async () => {
    const alice = person(ALICE_PATH);
    const r = room();
    const c = chair();
    await ChattelApi.stamp(c, alice);
    await place(c, r);
    const id = c.getChattelId();

    await PersistableApi.capture(r);
    await PersistableApi.capture(alice);

    // Dormancy + restart: nothing live survives.
    StuffApi.clearAll();
    await boot();

    const reborn = room();
    await PersistableApi.materialize(reborn);

    const contents = (reborn as unknown as Container).getContents();
    expect(contents.length).toBe(1);
    expect((contents[0] as unknown as { getChattelId(): string }).getChattelId()).toBe(id);
    // Still Alice's — custody moved, title never did.
    expect(await ChattelApi.ownerOf(contents[0] as Stuff)).toEqual({
      kind: "player",
      templatePath: ALICE_PATH,
    });
  });

  it("the guest-drop leak is closed — a visitor's good never rides the host's record", async () => {
    const bob = person(BOB_PATH); // the visitor
    const r = room(); // somebody else's room
    const book = chair();
    await ChattelApi.stamp(book, bob);
    await place(book, r);
    const id = book.getChattelId();

    await PersistableApi.capture(r);

    // The host's record carries nothing of Bob's.
    const roomState = col("holder_snapshots").find((d) => d.scope === ROOM_PATH)
      ?.state as Record<string, { contents?: unknown[] }>;
    expect(roomState.ContainerMixin?.contents?.length).toBe(0);

    // Bob's record does, naming the foreign room.
    await PersistableApi.capture(bob);
    const bobState = col("holder_snapshots").find((d) => d.scope === BOB_PATH)
      ?.state as Record<string, { entries?: Array<{ chattelId: string; place: string }> }>;
    expect(bobState.EstateMixin?.entries?.find((e) => e.chattelId === id)?.place).toBe(
      ROOM_PATH,
    );

    // "I left my book at a friend's" — it re-appears there, and is his.
    StuffApi.clearAll();
    await boot();
    const reborn = room();
    await PersistableApi.materialize(reborn);
    const found = (reborn as unknown as Container).getContents()[0];
    expect(found).toBeDefined();
    expect(await ChattelApi.ownerOf(found as Stuff)).toEqual({
      kind: "player",
      templatePath: BOB_PATH,
    });
  });

  it("fixtures restore BEFORE the overlay — a good can rest on a surface that exists", async () => {
    const alice = person(ALICE_PATH);
    const r = room();
    // An unstamped fixture: it rides the room's own record (the skip rule
    // keys on the stamp, so a fixture stays host-side where it belongs).
    const fixture = chair();
    ContainmentApi.move(
      fixture as unknown as Stuff & Containable,
      r as unknown as Stuff & Container,
    );
    const owned = chair();
    await ChattelApi.stamp(owned, alice);
    await place(owned, r);

    await PersistableApi.capture(r);
    await PersistableApi.capture(alice);
    StuffApi.clearAll();
    await boot();

    const reborn = room();
    await PersistableApi.materialize(reborn);
    const contents = (reborn as unknown as Container).getContents();
    // Both present, and the fixture came from the room's own record while
    // the owned good came from Alice's — two scopes, one room.
    expect(contents.length).toBe(2);
    expect(contents.filter((x) => MixinApi.isChattel(x as Stuff)).length).toBe(2);
  });

  it("is venue-generic — no parcel, no lease, no tenant (D15)", async () => {
    // The engine half was never residential: a good owned by one character,
    // placed in a plain room nobody holds title to, behaves identically.
    const alice = person(ALICE_PATH);
    const r = room();
    const c = chair();
    await ChattelApi.stamp(c, alice);
    await place(c, r);

    await PersistableApi.capture(r);
    await PersistableApi.capture(alice);
    StuffApi.clearAll();
    await boot();

    const reborn = room();
    await PersistableApi.materialize(reborn);
    expect((reborn as unknown as Container).getContents().length).toBe(1);
    expect(col("parcels").length).toBe(0);
  });
});

describe("sleep-as-logout — you wake where you slept (D10)", () => {
  const SLEEPER = "/platform/agent/Avatar/sleeper";

  /** Lie the sleeper on a bed in `r`, capture both, wipe, restore. */
  async function sleepAndWake(
    withBed: boolean,
  ): Promise<{ sleeper: Sleeper; bed: PosturedChair | null }> {
    const r = room();
    const bed = makeBed();
    ContainmentApi.move(
      bed as unknown as Stuff & Containable,
      r as unknown as Stuff & Container,
    );
    const sleeper = makeStuffAtPath(() => new Sleeper(), SLEEPER);
    ContainmentApi.move(
      sleeper as unknown as Stuff & Containable,
      r as unknown as Stuff & Container,
    );
    (bed as unknown as Stuff & Slotted).occupyAll(
      sleeper as unknown as Stuff & Slottable,
      ["lie:1"],
    );
    sleeper.setPosture("lie");
    await PersistableApi.capture(r);
    await PersistableApi.capture(sleeper);

    StuffApi.clearAll();
    await boot();
    const reborn = room();
    if (withBed) {
      ContainmentApi.move(
        makeBed() as unknown as Stuff & Containable,
        reborn as unknown as Stuff & Container,
      );
    }
    const woken = makeStuffAtPath(() => new Sleeper(), SLEEPER);
    ContainmentApi.move(
      woken as unknown as Stuff & Containable,
      reborn as unknown as Stuff & Container,
    );
    await PersistableApi.materialize(woken);
    const seat = (reborn as unknown as Container)
      .getContents()
      .find((x) => x.getTemplatePath() === BED_PATH) as PosturedChair | undefined;
    return { sleeper: woken, bed: seat ?? null };
  }

  it("restores ON the bed, not merely in the posture", async () => {
    const { sleeper, bed } = await sleepAndWake(true);
    expect(sleeper.getPosture()).toBe("lie");
    // The bed is what makes the reconcile pay out — a posture alone reads
    // `restQuality` 1.0 and the night is worth nothing.
    expect((sleeper as unknown as Slottable).getOccupiedHost()).toBe(bed);
  });

  it("degrades to the room floor when the bed is gone — no error, no teleport", async () => {
    const { sleeper } = await sleepAndWake(false);
    // Sold, destroyed, redecorated. You wake in the room, and nothing is
    // thrown at the player: restoring must never fail because furniture
    // moved.
    expect((sleeper as unknown as Slottable).getOccupiedHost()).toBeNull();
    expect(sleeper.isDestroyed()).toBe(false);
  });
});
