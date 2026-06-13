/**
 * Fast-travel cascade + lounge seating — integration over the in-memory
 * lounge domain store. Proves: landing stands up the lounge host; the lounge
 * TPA node is seated into it; and its `postRegister` cascade brings the rest
 * of the network (the University Avenue node + its room) live from that one
 * seed — with no registry and no manual loading.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import LoungeWarren from "../../../domain/lounge/LoungeWarren";
import Avatar from "../../../obj/Avatar";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import type { Stuff } from "../../stuff/Stuff";
import type { Container } from "../../spatial/Container";
import type { FastTravel } from "../FastTravel";
import { makeStuff } from "../../security/__tests__/test-setup";
import {
  installStore,
  loungeDocs,
  flush,
  type Doc,
} from "../../../domain/lounge/__tests__/lounge-fixtures";
import PersistentHydrator from "../../persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;
const UA_TERMINAL = "/domain/eternal/university-avenue-terminal";
const UA_ROOM = "/domain/eternal/university-avenue";

const fastTravelDocs: Doc[] = [
  {
    path: LoungeWarren.LOUNGE_TERMINAL_PATH,
    class: "/domain/lounge/LoungeTerminal",
    hydratorClass: PH,
    data: {
      shortDescription: "a Teleport Authority terminal",
      keywords: ["lounge"],
      directionality: "both",
      routes: [{ to: UA_TERMINAL }],
    },
  },
  {
    path: UA_TERMINAL,
    class: "/domain/common/tpa/TpaTerminal",
    hydratorClass: PH,
    data: {
      container: UA_ROOM,
      shortDescription: "a Teleport Authority terminal",
      keywords: ["university-avenue", "campus"],
      directionality: "both",
      routes: [{ to: LoungeWarren.LOUNGE_TERMINAL_PATH }],
    },
  },
  {
    path: UA_ROOM,
    class: "/domain/eternal/UniversityAvenue",
    hydratorClass: PH,
    data: { shortDescription: "University Avenue" },
  },
];

async function land(): Promise<Avatar> {
  const avatar = makeStuff(() => new Avatar());
  await (
    avatar as unknown as { applyStartLocation(r: string): Promise<void> }
  ).applyStartLocation(LoungeWarren.WARREN_PATH);
  return avatar;
}

function hostOf(avatar: Avatar): Stuff & Container {
  return (
    avatar as unknown as { getContainer(): Stuff & Container }
  ).getContainer();
}

describe("fast-travel cascade + lounge seating", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installStore(loungeDocs(fastTravelDocs));
  });
  afterEach(() => vi.restoreAllMocks());

  it("seats the lounge node in the host and cascades the network live", async () => {
    const avatar = await land();
    await flush();

    const host = hostOf(avatar);
    expect(host).toBeTruthy();

    const node = host.getContents().find((s) => MixinApi.isFastTravel(s)) as
      | (Stuff & FastTravel)
      | undefined;
    expect(node).toBeTruthy();
    expect(node!.getDirectionality()).toBe("both");

    // The cascade loaded the rest of the network from that one seated node.
    expect(StuffApi.findByTemplatePath(UA_TERMINAL)).toBeTruthy();
    expect(StuffApi.findByTemplatePath(UA_ROOM)).toBeTruthy();
  });

  it("the lounge node arrival room resolves to the live warren host", async () => {
    const avatar = await land();
    await flush();
    const host = hostOf(avatar);
    const node = host
      .getContents()
      .find((s) => MixinApi.isFastTravel(s)) as Stuff & FastTravel;
    const arrival = await node.getArrivalRoom();
    expect(arrival).toBe(host);
  });
});
