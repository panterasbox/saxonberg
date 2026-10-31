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

/** One person arriving, as the community card tells it. */
export interface Arrival {
  /** The character for a new player; the platform handle otherwise. */
  who: string;
  kind: 'player' | 'follow' | 'sub' | 'gift' | 'member' | 'patron';
  /** Where it happened; absent for a new Saxonberg player. */
  via?: Platform;
  /** For a gift: how many subs. */
  count?: number;
}

/**
 * People joining, this stream. ⚠ The feed carries none of it yet: new
 * players need character creation's commit on the feed; follows, subs, gifts,
 * members and patrons need the giving build's event intake.
 */
/**
 * Tonight's goal — a count to reach this stream, and what happens when it is
 * reached: a segment at the end of the show. Followers until Twitch
 * Affiliate (subs need it), subs after; five subs a stream is about Twitch's
 * $50 payout a month.
 */
export interface StreamGoal {
  metric: 'subs' | 'followers';
  target: number;
  /**
   * The segment the show ends with when the goal is hit, e.g. "a lore
   * reading" — or null, and then no reward is mentioned at all.
   */
  reward: string | null;
}

export interface Community {
  /** Tonight's tallies. */
  newPlayers: number;
  newFollowers: number;
  subsAndGifts: number;
  goal: StreamGoal | null;
  /** The latest arrivals, newest first. */
  recent: Arrival[];
}

/**
 * The wiki's article of the day — picked by the date, so the stream, the
 * in-game wiki and Discord agree; level-0 pages only. ⚠ Needs the wiki's
 * public route (wiki-foundation), which also settles the URL shape.
 */
export interface WikiArticle {
  title: string;
  /** What the page is about, when it is a typed subject. */
  kind: 'mixin' | 'command' | 'template' | null;
  /** The page's own lead paragraph — `**bold**` and `` `code` `` only. */
  lead: string;
  url: string;
}

/**
 * What the streamer's own client is doing — facts its client reports on the
 * feed (broadcast-ready requirements: the foreground, the mode; the verb is a
 * proposed addition — the verb only, never its arguments). The screen guide
 * points at whatever is live.
 */
export interface ClientFacts {
  /** Saxonberg in front, another tab in that window, or another app. */
  foreground: 'saxonberg' | 'other-tab' | 'other-app';
  /** The client's mode: explore, chat, watch, build, govern. */
  mode: 'explore' | 'chat' | 'watch' | 'build' | 'govern';
  /** The verb of the streamer's last command, e.g. "look". */
  lastVerb: string | null;
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
  community: Community | null;
  wikiOfDay: WikiArticle | null;
  client: ClientFacts | null;
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
  community: null,
  wikiOfDay: null,
  client: null,
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

/** Community is the channel's too. */
const MOCK_COMMUNITY: Community = {
  newPlayers: 4,
  newFollowers: 9,
  subsAndGifts: 3,
  goal: { metric: 'subs', target: 5, reward: null },
  recent: [
    { who: 'Iffy', kind: 'player' },
    { who: 'ironmonger', kind: 'gift', via: 'twitch', count: 2 },
    { who: 'Mara K.', kind: 'patron', via: 'patreon' },
  ],
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
  community: MOCK_COMMUNITY,
  // A real page from wiki-starter; the URL shape is a placeholder.
  wikiOfDay: {
    title: 'Perceptible',
    kind: 'mixin',
    lead:
      'The capability of **being addressable by a word** — keywords, and the one a thing answers to first. It is what makes `look lantern` find the lantern and `go north` find the way.',
    url: 'https://mud.panterasbox.com/wiki/main/perceptible',
  },
  // `?fg=other-tab`, `?mode=build`, `?verb=smelt` vary it for preview.
  client: {
    foreground: (new URLSearchParams(window.location.search).get('fg') ??
      'saxonberg') as ClientFacts['foreground'],
    mode: (new URLSearchParams(window.location.search).get('mode') ??
      'explore') as ClientFacts['mode'],
    lastVerb: new URLSearchParams(window.location.search).get('verb') ?? 'look',
  },
};

export default function useShow(profile: ShowProfile): Show {
  const [show] = useState<Show>(() => {
    if (!new URLSearchParams(window.location.search).has('mock')) return EMPTY;
    return profile.key === 'saxonberg' ? MOCK_SAXONBERG : EMPTY;
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
