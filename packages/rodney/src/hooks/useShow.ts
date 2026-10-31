import { useEffect, useState } from 'react';
import type { ShowProfile } from '../show/profiles';
import type { Platform } from '../scenes/shared/ServiceGlyph';

/**
 * What the show knows besides the stream state and the chat: the topic and
 * agenda, the world right now, who is in it, and the crawl.
 *
 * ⚠ The broadcast feed does not carry any of this yet — the broadcast-ready
 * build adds it (docs/requirements/broadcast-ready-requirements.md, § One
 * token per streamer: the allowlist). Until then every field is empty unless
 * the page has `?mock`, and each panel that reads one hides while it is empty.
 */
export interface AgendaItem {
  title: string;
  done: boolean;
}

export interface WorldNow {
  /** "Terminus" — where the clock and weather are read. */
  place: string;
  /** "a quarter past four in the afternoon" */
  time: string;
  /** "early autumn" */
  season: string;
  /** "overcast, a light westerly" */
  weather: string;
  /** The latest in-world headline, if any. */
  headline: string | null;
}

/** The build the world is running. */
export interface Build {
  /** When it was built (deployed commit's date), epoch ms. */
  at: number;
}

/**
 * The month's money, from the giving ledger and the books. ⚠ Neither exists
 * yet (giving-slate, budget-slate).
 */
export interface Money {
  /** The month this covers, e.g. "October"; everything resets on the 1st. */
  month: string;
  /** Income at net — what reached the project after each platform's cut. */
  income: number;
  /** The month's costs, by what drives them. */
  costs: { label: string; amount: number }[];
  /** The latest gifts, newest first, at net. */
  recent: { who: string; amount: number; via: Platform }[];
  /** Days left in the month. */
  daysLeft: number;
}

export interface Show {
  /** The current segment — the topic line. */
  topic: string | null;
  agenda: AgendaItem[];
  /** Index of the current agenda item, or -1. */
  current: number;
  world: WorldNow | null;
  /** How many players are in the world now. */
  playersOnline: number | null;
  /** In-world news and world firsts for the crawl, oldest first. */
  crawl: string[];
  /**
   * ⚠ Not exposed by the server at all yet — the deploy has to stamp its
   * commit and date and the feed carry them.
   */
  build: Build | null;
  money: Money | null;
}

const EMPTY: Show = {
  topic: null,
  agenda: [],
  current: -1,
  world: null,
  playersOnline: null,
  crawl: [],
  build: null,
  money: null,
};

/** The money is the channel's, so every profile's mock carries it. */
const MOCK_MONEY: Money = {
    month: 'October',
    income: 142.35,
    costs: [
      { label: 'Running the world', amount: 11 },
      { label: 'Building it', amount: 200 },
    ],
    recent: [
      { who: 'ironmonger', amount: 3.5, via: 'youtube' },
      { who: 'Mara K.', amount: 8.5, via: 'patreon' },
      { who: 'pelt_and_tallow', amount: 2.5, via: 'twitch' },
    ],
    daysLeft: 11,
  };

const MOCK_SAXONBERG: Show = {
  topic: 'Building the river',
  agenda: [
    { title: 'What merged this week', done: true },
    { title: 'Building the river', done: false },
    { title: 'A walk through Rejection', done: false },
    { title: 'Your questions', done: false },
  ],
  current: 1,
  world: {
    place: 'Terminus',
    time: 'a quarter past four in the afternoon',
    season: 'early autumn',
    weather: 'overcast, a light westerly',
    headline: 'The Wharfside reeler is hiring hands for the silk season',
  },
  playersOnline: 12,
  crawl: [
    'In the world — the Kestrel ferry runs again after the spring flood',
    'World first — the first ingot smelted in Rejection, by Odo',
    'In the world — the clinic at Duncan Hall is open through the night',
    'World first — the first silk reeled at the Hearts Delight silk house',
  ],
  build: { at: Date.now() - 1.3 * 86_400_000 },
  money: MOCK_MONEY,
};

/** Every other profile's mock: an agenda of its own, no world, no crawl. */
const MOCK_OTHER: Record<string, Show> = {
  music: {
    ...EMPTY,
    money: MOCK_MONEY,
    topic: 'Hard Rain',
    agenda: [
      { title: 'Warm-up', done: true },
      { title: 'Hard Rain', done: false },
      { title: 'The Long Field', done: false },
      { title: 'Requests', done: false },
    ],
    current: 1,
  },
  gaming: {
    ...EMPTY,
    money: MOCK_MONEY,
    topic: 'NetHack — a Valkyrie, Gnomish Mines',
    agenda: [
      { title: 'Get to Minetown', done: true },
      { title: 'Sokoban', done: false },
    ],
    current: 1,
  },
};

export default function useShow(profile: ShowProfile): Show {
  const [show] = useState<Show>(() => {
    if (!new URLSearchParams(window.location.search).has('mock')) return EMPTY;
    return profile.key === 'saxonberg' ? MOCK_SAXONBERG : MOCK_OTHER[profile.key] ?? EMPTY;
  });
  // The mock's player count drifts so the join panel visibly updates.
  const [players, setPlayers] = useState(show.playersOnline);
  useEffect(() => {
    if (show.playersOnline === null) return;
    const id = setInterval(
      () => setPlayers((n) => Math.max(1, (n ?? 0) + (Math.random() < 0.5 ? -1 : 1))),
      15000
    );
    return () => clearInterval(id);
  }, [show.playersOnline]);
  return { ...show, playersOnline: players, crawl: profile.crawl ? show.crawl : [] };
}
