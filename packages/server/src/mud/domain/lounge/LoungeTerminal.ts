/**
 * LoungeTerminal — the lounge's Teleport Authority node, and the network's
 * boot-manifest root.
 *
 * Lives with the lounge content (not under `/domain/common/tpa/`) because it's
 * coupled to the lounge Warren: the lounge "room" is an elastic runtime host,
 * so this node's arrival room is the Warren's host rather than a static
 * container. Everything else is the generic `TpaTerminal`.
 *
 * `getArrivalRoom()` resolves to the live lounge host (`LoungeWarren.getHost`),
 * creating it on first call — which, since this node is the eager boot root,
 * stands the lounge host up at boot.
 */

import TpaTerminal from "../common/tpa/TpaTerminal";
import LoungeWarren from "./LoungeWarren";
import { StuffApi } from "../../api/stuff";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Container } from "../../lib/spatial/Container";

export default class LoungeTerminal extends TpaTerminal {

  override async getArrivalRoom(): Promise<Stuff & Container> {
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    return (await warren.getHost()) as unknown as Stuff & Container;
  }
}
