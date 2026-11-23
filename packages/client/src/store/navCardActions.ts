/**
 * navCardActions — what the navigation card remembers (navigation card
 * D9): the sections the player opened or closed BY HAND, and the map
 * lenses that are on. One client-state key, `nav.card`, declared by the
 * server's client schema — so it survives a reload and a second device.
 *
 * Each action updates local `clientState` optimistically and emits one
 * `client-state-write`, the shape `cardViewActions` uses.
 *
 * ⚠⚠ The seeding clobber (`cardViewActions` header): the card writes
 * NOTHING on mount. An absent key means *untouched* — the card fills the
 * height itself — and only a player's own toggle writes.
 */

import { useStore } from "./index";
import { websocketClient } from "../services/websocket";

const KEY = "nav.card";

export type SectionSet = "open" | "closed";

export interface NavCardMemory {
  sections: Record<string, SectionSet>;
  lenses: string[];
}

/** The lenses on when nothing has been set. */
export const DEFAULT_LENSES: readonly string[] = ["frontier", "route"];

/** The stored memory, or the defaults when it has not arrived or was never set. */
export function readNavCard(state: Record<string, unknown>): NavCardMemory {
  const raw = state[KEY] as Partial<NavCardMemory> | undefined;
  return {
    sections: raw && typeof raw.sections === "object" && raw.sections !== null ? { ...raw.sections } : {},
    lenses: raw && Array.isArray(raw.lenses) ? [...raw.lenses] : [...DEFAULT_LENSES],
  };
}

function write(next: NavCardMemory): void {
  useStore.getState().setLocalClientState(KEY, next);
  websocketClient.sendClientStateWrite(KEY, next);
}

/** The player opened or closed a section by hand. */
export function setSection(name: string, to: SectionSet): void {
  const now = readNavCard(useStore.getState().clientState);
  write({ ...now, sections: { ...now.sections, [name]: to } });
}

/** The player turned a lens on or off. */
export function setLens(name: string, on: boolean): void {
  const now = readNavCard(useStore.getState().clientState);
  const lenses = now.lenses.filter((l) => l !== name);
  write({ ...now, lenses: on ? [...lenses, name] : lenses });
}
