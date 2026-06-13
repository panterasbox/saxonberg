/**
 * Sign out from anywhere. Ends the server session, tears down the
 * socket (no auto-reconnect), and returns the client to the start
 * screen. Shared by the in-world AccountMenu, the character-select
 * roster, and char-gen, so a player is never trapped on a screen with
 * no exit.
 */

import { SERVER_URL } from "../config";
import { websocketClient } from "./websocket";
import { useStore } from "../store/index";

export async function signOut(): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    /* tear the client down regardless of the network result */
  }
  websocketClient.disconnect();
  const s = useStore.getState();
  s.clearAuth();
  s.setConnectionPhase("unauthenticated");
}
