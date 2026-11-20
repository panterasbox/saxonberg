/**
 * Document builders — pure functions from what the client holds to a
 * {@link TooltipDoc} (tooltips D2).
 *
 * ⭐ A builder adds no fact its input lacks. Each one is the ONLY path from
 * its kind of subject to a document, and a card and a tooltip about the
 * same subject call the same builder, so the two cannot disagree.
 */

import type {
  NavWay,
  NavSections,
  TooltipFact,
  TooltipSource,
  HelpTopic,
  StuffKind,
  TaggedPath,
  TooltipDoc,
  TopicDescriptor,
  IllustrationShape,
} from "@saxonberg/types";

/**
 * A control's tooltip: what it does, and the command it runs. A control
 * previews no card.
 */
export function controlDoc(label: string, command?: string, detail?: string): TooltipDoc {
  return {
    header: { name: label, kindWord: "control" },
    ...(detail ? { prose: detail } : {}),
    ...(command ? { command } : {}),
  };
}

/**
 * A scrollback frame's gutter: which topic it was filed under, and when.
 * Composed on the client from the topic catalogue; the click is the
 * gutter's own action menu, not a command.
 */
export function frameDoc(descriptor: TopicDescriptor, timestamp: number): TooltipDoc {
  return {
    header: { name: descriptor.label, kindWord: "topic" },
    ...(descriptor.description ? { prose: descriptor.description } : {}),
    facts: [
      { label: "topic", value: descriptor.topic, source: "client" },
      { label: "at", value: new Date(timestamp).toLocaleTimeString(), source: "client", at: timestamp },
    ],
    hint: "click — mute, solo, or open in a tab",
  };
}

/** What a kind of thing is called in a header. */
const KIND_WORD: Readonly<Record<StuffKind, string>> = {
  location: "place",
  agent: "someone",
  thing: "thing",
  idea: "idea",
};

/** The spoiler label every path wears (spoiler-slate § Paths are a spoiler). */
export const PATH_LABEL = "What is this, really?";

/** The fields a thing's describe asks for — and the only ones `thingDoc` reads. */
export const THING_FIELDS = [
  "displayName",
  "kind",
  "quantity",
  "shortDescription",
  "illustration",
  "illustrationShape",
  "path",
] as const;

/** A thing's record as the describe (or a card's projection) carries it. */
export interface ThingRecord {
  displayName?: string;
  kind?: StuffKind;
  quantity?: number;
  shortDescription?: string;
  illustration?: string;
  illustrationShape?: IllustrationShape;
  path?: TaggedPath;
}

/**
 * ⭐ A thing's document — the tooltip's AND the card's head, facts and
 * spoiler (tooltips D2, D2a). It says nothing `look` gates: no mass, no
 * material, no contents — only what the record already carries.
 *
 * `command` is what a click on the anchor runs — the footer says so.
 */
export function thingDoc(
  rec: ThingRecord,
  opts: { command?: string; at?: number; dark?: boolean } = {},
): TooltipDoc {
  const doc: TooltipDoc = {
    header: {
      name: rec.displayName ?? "something",
      ...(rec.kind ? { kind: rec.kind, kindWord: KIND_WORD[rec.kind] } : {}),
    },
  };
  if (opts.dark) doc.miss = "Too dark to make out.";
  // A description that only repeats the name (with or without its article)
  // says nothing twice.
  const bare = (t: string): string => t.trim().toLowerCase().replace(/^(a|an|the)\s+/, "");
  if (rec.shortDescription && bare(rec.shortDescription) !== bare(rec.displayName ?? "")) {
    doc.prose = rec.shortDescription;
  }
  if (rec.illustration) {
    doc.image = { key: rec.illustration, ...(rec.illustrationShape ? { shape: rec.illustrationShape } : {}) };
  }
  if (rec.quantity !== undefined && rec.quantity > 1) {
    doc.facts = [
      { label: "how many", value: String(rec.quantity), source: "seen", ...(opts.at ? { at: opts.at } : {}) },
    ];
  }
  if (rec.path) {
    doc.spoilers = [{ level: rec.path.spoiler, label: PATH_LABEL, text: rec.path.path }];
  }
  if (opts.command) doc.command = opts.command;
  return doc;
}

/** The line a thing you can no longer perceive says instead. */
export const CANT_SEE = "You can't see that now.";

/** A help topic as a glossary term: its summary, and where to read more. */
export function helpDoc(topic: HelpTopic, word: string): TooltipDoc {
  const related = topic.relations
    .slice(0, 6)
    .map((r) => `<link href="mudcmd:help ${r.targetId}">${r.targetTitle}</link>`);
  const prose = related.length > 0 ? `${topic.summary}\n\nSee also: ${related.join(", ")}.` : topic.summary;
  return {
    header: { name: topic.title, kindWord: "help" },
    prose,
    command: `help ${word}`,
  };
}

/**
 * The `wiki` and `help` subcommands that do something OTHER than show a
 * page — a link running one is a command, not a term. (`wiki create X` is
 * the red link to a page that does not exist yet; found by the walk.)
 * Mirrors the two verbs' views; `read` / `verb` / `api` name a page or
 * topic and stay terms.
 */
const WIKI_ACTS = new Set([
  "create", "edit", "history", "diff", "rollback", "move", "delete", "undelete",
  "purge", "protect", "preview", "links", "wanted", "orphans", "dangling", "list", "spoiler",
]);
const HELP_ACTS = new Set(["search"]);

/**
 * ⭐ Which links are TERMS — a link whose command shows a help topic or a
 * wiki page (tooltips D7). That is the whole classification, and it is why
 * a new topic or page needs no code to have a tooltip.
 */
export function termOf(command: string): { kind: "help"; word: string } | { kind: "wiki"; ref: string } | null {
  const m = /^(help|wiki)\s+(\S+)(?:\s+(.+))?$/.exec(command.trim());
  if (!m) return null;
  const verb = m[1];
  const first = m[2]!;
  const rest = m[3];
  if (verb === "wiki") {
    if (first === "read") return rest ? { kind: "wiki", ref: rest.trim() } : null;
    if (WIKI_ACTS.has(first)) return null;
    return { kind: "wiki", ref: rest ? `${first} ${rest}`.trim() : first };
  }
  if (HELP_ACTS.has(first)) return null;
  if ((first === "verb" || first === "api") && rest) return { kind: "help", word: rest.trim() };
  return { kind: "help", word: rest ? `${first} ${rest}`.trim() : first };
}

/**
 * ⭐ A way out's tooltip (tooltips D2; grown by the navigation card D12):
 * its direction, where it leads and what it goes through — and, given the
 * way the ways section sent, one block per fact key (a pack's portcullis
 * shows with no client change), one-way, muffled, a track's length, what
 * stops you and what would work, and a small map of the zone it leads
 * into. ⛔ No buttons: opening, unlocking and looking through are the
 * door's menu.
 */
export function wayDoc(
  dir: string,
  command: string,
  known: {
    to?: string;
    /** How you know where it leads (your map's channel). */
    toSource?: TooltipSource;
    through?: string;
    way?: NavWay;
    foundBySearching?: boolean;
    /** The far place is in another zone your map holds placed claims in. */
    zoneThumb?: { zone: string; level: number };
  } = {},
): TooltipDoc {
  const way = known.way;
  const facts: TooltipFact[] = [
    ...(known.to ? [{ label: "to", value: known.to, source: known.toSource ?? ("client" as const) }] : []),
    ...(known.through ? [{ label: "through", value: known.through, source: "client" as const }] : []),
  ];
  if (way) {
    for (const [key, value] of Object.entries(way.facts ?? {})) {
      facts.push({ label: WAY_FACT_LABEL[key] ?? key, value: wayFactValue(key, value), source: "seen" });
    }
    if (way.oneWay) facts.push({ label: "one way", value: "no way back by it that you know of", source: "seen" });
    if (way.muffled) facts.push({ label: "sound", value: "muffled through it", source: "seen" });
    if (way.lengthM !== undefined) facts.push({ label: "length", value: `${Math.round(way.lengthM)} m`, source: "seen" });
    if (way.crossesZone) facts.push({ label: "leaves", value: "this zone", source: "seen" });
  }
  if (known.foundBySearching) facts.push({ label: "found", value: "by searching", source: "searched" });
  const doc: TooltipDoc = { header: { name: dir, kindWord: "way out" }, ...(facts.length ? { facts } : {}), command };
  if (way?.take && !way.take.ok) {
    doc.prose = way.take.reason;
    if (way.take.works?.command) doc.hint = `${way.take.works.command} would get you through — click tries ${command}.`;
  } else if (way?.take?.ok && way.take.unseen) {
    doc.prose = "Open, as far as you know: you cannot see the far side from here.";
  }
  if (known.zoneThumb) doc.zoneThumb = known.zoneThumb;
  return doc;
}

/** A way's projected fact keys, in words; any other key is shown as itself. */
const WAY_FACT_LABEL: Record<string, string> = {
  state: "state",
  opening: "opening",
  swingsShut: "swings shut",
  locked: "locked",
  keyHeld: "your key",
  freeHere: "free from this side",
};

function wayFactValue(key: string, value: string | number | boolean): string {
  if (typeof value === "boolean") {
    if (key === "keyHeld") return value ? "you hold its key" : "you hold no key to it";
    if (key === "freeHere") return value ? "yes" : "no";
    return value ? "yes" : "no";
  }
  return String(value);
}

/** A described detail of a thing (`look <key>`). */
export function detailDoc(key: string, command: string): TooltipDoc {
  return { header: { name: key, kindWord: "detail" }, command };
}

/** A link that only runs a command: the command is the whole of it. */
export function commandDoc(command: string, label?: string): TooltipDoc {
  return { ...(label ? { header: { name: label, kindWord: "command" } } : {}), command };
}

/**
 * A former native hover string, as a tooltip (tooltips W7): *Click to send:
 * X* becomes the command's tooltip; any other text keeps its own words — a
 * short one as the name, a sentence as prose. `null`/empty → no tooltip.
 */
export function hoverDoc(text: string | null | undefined): TooltipDoc | null {
  if (!text) return null;
  const send = /^Click to send: (.+)$/.exec(text);
  if (send) return commandDoc(send[1]!);
  if (text.length <= 48) return { header: { name: text } };
  return { prose: text.replace(/&/g, "&amp;").replace(/</g, "&lt;") };
}

/**
 * ⭐ A map lens (navigation card D11): what it draws, the channel it owns,
 * and — when it has nothing to draw — that it has nothing to draw.
 */
export function lensDoc(lens: string, on: boolean, count: number): TooltipDoc {
  const what: Record<string, string> = {
    frontier: "Marks every way you know of but have not taken — the edge of your map.",
    route: "Draws the plan your last route answered with; the least certain leg is marked.",
    refusals: "Rings every way you saw shut or locked across the zone.",
    boundaries: "Draws a border where your map says one government's ground meets another's.",
  };
  return {
    header: { name: `${lens} lens`, kindWord: on ? "on" : "off" },
    prose: `${what[lens] ?? ""}${count === 0 ? " Nothing to draw here yet." : ""}`,
    facts: [{ label: "draws", value: String(count), source: "client" }],
    hint: on ? "click — turn it off" : "click — turn it on",
  };
}

// ── Your map (navigation card D12) ─────────────────────────────────────
//
// ⚠ A claim's dates are GAME time and the client holds no game "now" (D19),
// so no map fact carries `at`: sources are listed in the order learned.

/** What a place your map holds is, and how you know it. */
export interface MapPlaceInput {
  name: string;
  /** The place's path — the spoiler block, never prose. */
  key: string;
  tier: "walked" | "known";
  sources: readonly { channel: TooltipSource }[];
  keywords: readonly string[];
}

const TIER_WORD = { walked: "a place you have walked", known: "a place you know of" } as const;

/** A place on the map: its tier, every source, what a click does, its path. */
export function placeDoc(
  place: MapPlaceInput,
  opts: { command?: string | null; neighbor?: boolean; disagreements?: readonly string[] } = {},
): TooltipDoc {
  const counts = new Map<TooltipSource, number>();
  for (const s of place.sources) counts.set(s.channel, (counts.get(s.channel) ?? 0) + 1);
  const facts: TooltipFact[] = [...counts.entries()].map(([channel, n]) => ({
    label: "known by",
    value: `${n} record${n === 1 ? "" : "s"}`,
    source: channel,
  }));
  for (const d of opts.disagreements ?? []) facts.push({ label: "disagrees", value: d, source: "client" });
  const doc: TooltipDoc = {
    header: { name: place.name, kindWord: TIER_WORD[place.tier] },
    facts,
    spoilers: [{ level: 2, label: PATH_LABEL, text: place.key }],
  };
  if (opts.command) {
    doc.command = opts.command;
    doc.hint = opts.neighbor ? `click — ${opts.command}` : "click — draw the route there";
  } else if (opts.command === null) {
    doc.hint = "Your map has no word to route there by — walk there instead.";
  }
  return doc;
}

/** A way your map holds from a place you are not standing in. */
export function edgeDoc(
  edge: {
    dir: string;
    state?: string;
    stale: boolean;
    foundBySearching: boolean;
    conflict: boolean;
    shape: string;
    claims: readonly { channel: TooltipSource }[];
  },
  opts: { from: string; to?: string; lengthM?: number; command?: string | null; others?: readonly string[] } = { from: "" },
): TooltipDoc {
  const latest = edge.claims[edge.claims.length - 1]?.channel ?? "seen";
  const facts: TooltipFact[] = [{ label: "from", value: opts.from, source: "client" }];
  facts.push({ label: "to", value: opts.to ?? (edge.shape === "opening" ? "somewhere you do not know" : "unknown"), source: latest });
  if (edge.state) facts.push({ label: "last seen", value: edge.state, source: latest });
  if (edge.foundBySearching) facts.push({ label: "found", value: "by searching", source: "searched" });
  if (opts.lengthM !== undefined) facts.push({ label: "length", value: `≈ ${Math.round(opts.lengthM)} m`, source: "client" });
  for (const o of opts.others ?? []) facts.push({ label: "also said to lead", value: o, source: "client" });
  const doc: TooltipDoc = { header: { name: edge.dir, kindWord: "a way your map holds" }, facts };
  if (edge.stale) doc.prose = "Not seen the last time you looked at its place.";
  if (edge.conflict) doc.prose = `${doc.prose ? `${doc.prose} ` : ""}Your map disagrees with itself about where it leads; both are drawn.`;
  if (opts.command) doc.command = opts.command;
  return doc;
}

/** A crumb — a Locality as YOUR map knows it. */
export function crumbDoc(
  crumb: { address: string; name?: string; ship?: true },
  known: {
    claim?: { channel: TooltipSource; government?: { name: string }; localityKind?: string };
    claims: number;
  },
  civic?: { seats: readonly { seat: string; holder: string | null }[]; resident: boolean; forecast?: string } | null,
): TooltipDoc {
  if (crumb.ship) {
    return { header: { name: crumb.name ?? "the ship", kindWord: "the ship you are aboard" } };
  }
  if (!crumb.name || !known.claim) {
    return {
      header: { name: "Unnamed", kindWord: "locality" },
      prose: "You have not learned this place's name: nothing on your map says what it is called.",
    };
  }
  const facts: TooltipFact[] = [
    { label: "first came", value: CHANNEL_WORD[known.claim.channel] ?? known.claim.channel, source: known.claim.channel },
    { label: "your map", value: `${known.claims} claim${known.claims === 1 ? "" : "s"} here`, source: "client" },
  ];
  if (known.claim.localityKind) facts.push({ label: "kind", value: known.claim.localityKind, source: known.claim.channel });
  if (known.claim.government) facts.push({ label: "government", value: known.claim.government.name, source: known.claim.channel });
  if (civic) {
    facts.push({ label: "you are", value: civic.resident ? "a resident" : "a visitor", source: "seen" });
    for (const s of civic.seats) facts.push({ label: s.seat, value: s.holder ?? "vacant", source: "seen" });
    if (civic.forecast) facts.push({ label: "forecast", value: civic.forecast, source: "seen" });
  }
  return {
    header: { name: crumb.name, kindWord: "locality" },
    facts,
    command: `map ${crumb.address}`,
    hint: "click — what your map holds of it",
  };
}

const CHANNEL_WORD: Partial<Record<TooltipSource, string>> = {
  walked: "walked in",
  seen: "seen",
  searched: "found by searching",
  published: "from a published map",
  charted: "from a chart",
  told: "told of it",
};

/** A level button: how much of it you know. */
export function levelDoc(name: string, places: number, yours: boolean): TooltipDoc {
  return {
    header: { name, kindWord: "level" },
    prose: `${places} place${places === 1 ? "" : "s"} you know on this level.${yours ? " You are on this level." : ""}`,
    hint: "click — show this level",
  };
}

/** A section's summary line. */
export function sectionDoc(summary: string, open: boolean): TooltipDoc {
  return {
    header: { name: summary, kindWord: "section" },
    hint: open ? "click — fold it; the card remembers you did" : "click — open it; the card remembers you did",
  };
}

/** A thing on the horizon. */
export function sightingDoc(
  thing: { name: string; landmark: boolean; glance?: { point?: string; closeBy?: boolean; roughMiles?: number } },
  command: string,
): TooltipDoc {
  const g = thing.glance;
  const where = g?.closeBy ? "close by" : [g?.point, g?.roughMiles !== undefined ? `${g.roughMiles} mi` : null].filter(Boolean).join(", ");
  return {
    header: { name: thing.name, kindWord: thing.landmark ? "landmark" : "on the horizon" },
    ...(where ? { facts: [{ label: "roughly", value: where, source: "seen" as const }] } : {}),
    command,
  };
}

/** The zone you stand in, as the zone section frames it — its path as the spoiler. */
export function zoneDoc(sections: NavSections, known: { walked: number; known: number; openings: number }): TooltipDoc {
  const z = sections.zone;
  const facts: TooltipFact[] = [
    { label: "walked", value: String(known.walked), source: "walked" },
    { label: "known", value: String(known.known), source: "client" },
    { label: "ways not taken", value: String(known.openings), source: "client" },
  ];
  if (z?.cellSizeM) facts.push({ label: "a cell", value: `${z.cellSizeM} m`, source: "seen" });
  return {
    header: { name: z?.label ?? "This zone", kindWord: "zone" },
    facts,
    ...(z?.id ? { spoilers: [{ level: z.id.spoiler, label: PATH_LABEL, text: z.id.path }] } : {}),
  };
}
