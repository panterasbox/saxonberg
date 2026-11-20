/**
 * tooltipSource — where a tooltip's document comes from, and how long it is
 * kept (tooltips D3, D4, D7; N9).
 *
 * Three sources, one honesty rule — only what you know:
 *
 *  - a **live thing** — a one-shot describe the server gates by reach and
 *    light (`websocketClient.query`). Cached per thing for a few seconds so
 *    sweeping the scrollback costs one request per thing, and dropped
 *    whenever you move or the light changes.
 *  - a **help term** — `GET /api/help/topic?word=`: what `help <word>`
 *    shows. Help does not change while you play; cached for the session.
 *  - a **wiki term** — the page's opening section through the wiki's gate
 *    (`websocketClient.wikiExcerpt`). Cached per page AND appetite for five
 *    minutes: a different appetite is a different answer.
 *
 * Every miss is SAID (*You can't see that now.*, *No help for that.*) —
 * never an empty panel, never a spinner that stays. It generalizes the
 * inspection gutter's old session cache (`useSummary` is a thin hook over it now).
 */

import type { HelpTopic, StuffDetailRecord, TooltipDoc } from "@saxonberg/types";
import { SERVER_URL } from "../config";
import { useStore } from "../store/index";
import { websocketClient } from "./websocket";
import {
  CANT_SEE,
  THING_FIELDS,
  helpDoc,
  termOf,
  thingDoc,
  type ThingRecord,
} from "../components/doc/docs";
import type { TipSpec } from "../components/tooltip/useTip";

const THING_TTL_MS = 5_000;
const WIKI_TTL_MS = 5 * 60_000;

interface Cached<T> {
  at: number;
  value: Promise<T>;
}

const things = new Map<string, Cached<TooltipDoc>>();
const helps = new Map<string, Promise<TooltipDoc>>();
const wikis = new Map<string, Cached<TooltipDoc>>();

/** Where you are and whether you can see — a change empties the thing cache. */
let sceneKey = "";
function currentScene(): string {
  const place = useStore.getState().navSections.place;
  return place ? `${place.stuffId}|${place.dark ? "dark" : "lit"}` : "";
}
function freshScene(): void {
  const now = currentScene();
  if (now !== sceneKey) {
    sceneKey = now;
    things.clear();
  }
}

function appetite(): number {
  const v = useStore.getState().clientState["spoiler.appetite"];
  return typeof v === "number" ? v : 0;
}

/**
 * A live thing's tooltip. `command` is what a click on the anchor runs
 * (`look …`).
 */
export function thingTip(stuffId: string, command?: string): TipSpec {
  return {
    key: `thing:${stuffId}`,
    resolve: () => {
      freshScene();
      const hit = things.get(stuffId);
      const now = Date.now();
      let value: Promise<TooltipDoc>;
      if (hit && now - hit.at < THING_TTL_MS) {
        value = hit.value;
      } else {
        value = websocketClient
          .query(`#${stuffId}`, [...THING_FIELDS])
          .then((env): TooltipDoc => {
            const rec = env?.result[0] as (ThingRecord & Partial<StuffDetailRecord>) | undefined;
            if (!env || !rec) return { miss: CANT_SEE };
            return thingDoc(rec, { at: now, ...(env.dark ? { dark: true } : {}) });
          });
        things.set(stuffId, { at: now, value });
      }
      // The command is the anchor's own (what a click runs) — added per open.
      return value.then((doc) => (doc.miss === CANT_SEE || !command ? doc : { ...doc, command }));
    },
  };
}

/** A help term: what `help <word>` shows, at tooltip size. */
export function helpTip(word: string): TipSpec {
  return {
    key: `help:${word}`,
    resolve: () => {
      let value = helps.get(word);
      if (!value) {
        value = fetch(`${SERVER_URL}/api/help/topic?word=${encodeURIComponent(word)}`, {
          credentials: "include",
        })
          .then(async (r) => {
            if (!r.ok) return { miss: "No help for that." };
            const body = (await r.json()) as { topic?: HelpTopic };
            return body.topic ? helpDoc(body.topic, word) : { miss: "No help for that." };
          })
          .catch(() => ({ miss: "No help for that." }));
        helps.set(word, value);
      }
      return value;
    },
  };
}

/** A help topic's summary by id — the inspection gutter's interface line. */
export function helpSummary(id: string): Promise<string | null> {
  return helpTip(id)
    .resolve!()
    .then((doc) => (doc.miss ? null : (doc.prose?.split("\n\n")[0] ?? null)));
}

/** A wiki term: the page's opening section, through the wiki's gate. */
export function wikiTip(ref: string): TipSpec {
  return {
    key: `wiki:${ref}`,
    resolve: () => {
      const key = `${ref}|${appetite()}`;
      const hit = wikis.get(key);
      const now = Date.now();
      if (hit && now - hit.at < WIKI_TTL_MS) return hit.value;
      const value = websocketClient
        .wikiExcerpt(ref)
        .then((doc): TooltipDoc => doc ?? { miss: "Nothing in the wiki for that." });
      wikis.set(key, { at: now, value });
      return value;
    },
  };
}

/** A link's tooltip when its command is a term (help or wiki), else null. */
export function termTip(command: string): TipSpec | null {
  const term = termOf(command);
  if (!term) return null;
  return term.kind === "help" ? helpTip(term.word) : wikiTip(term.ref);
}

/** Test seam: forget every cached answer. */
export function clearTooltipCaches(): void {
  things.clear();
  helps.clear();
  wikis.clear();
  sceneKey = "";
}
