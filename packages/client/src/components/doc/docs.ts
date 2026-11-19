/**
 * Document builders — pure functions from what the client holds to a
 * {@link TooltipDoc} (tooltips D2).
 *
 * ⭐ A builder adds no fact its input lacks. Each one is the ONLY path from
 * its kind of subject to a document, and a card and a tooltip about the
 * same subject call the same builder, so the two cannot disagree.
 */

import type {
  HelpTopic,
  StuffKind,
  TaggedPath,
  TooltipDoc,
  TopicDescriptor,
  IllustrationShape,
} from "@saxonberg/types";

/**
 * A control's tooltip: what it does, and the command it runs. A control
 * previews no card, so it has no pin.
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
 * `command` is what a click on the anchor runs, and is also the pin: the
 * card a thing's tooltip previews is the one its own `look` opens.
 */
export function thingDoc(
  rec: ThingRecord,
  opts: { command?: string; at?: number; dark?: boolean; pin?: boolean } = {},
): TooltipDoc {
  const doc: TooltipDoc = {
    header: {
      name: rec.displayName ?? "something",
      ...(rec.kind ? { kind: rec.kind, kindWord: KIND_WORD[rec.kind] } : {}),
    },
  };
  if (opts.dark) doc.miss = "Too dark to make out.";
  if (rec.shortDescription && rec.shortDescription !== rec.displayName) {
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
  if (opts.command) {
    doc.command = opts.command;
    if (opts.pin !== false) doc.pin = opts.command;
  }
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
    pin: `help ${word}`,
  };
}

/**
 * ⭐ Which links are TERMS — a link whose command opens a help or wiki
 * card (tooltips D7). That is the whole classification, and it is why a
 * new topic or page needs no code to have a tooltip.
 */
export function termOf(command: string): { kind: "help"; word: string } | { kind: "wiki"; ref: string } | null {
  const m = /^(help|wiki)\s+(.+)$/.exec(command.trim());
  if (!m) return null;
  const rest = m[2]!.trim();
  return m[1] === "help" ? { kind: "help", word: rest } : { kind: "wiki", ref: rest };
}

/**
 * A way out's tooltip: its direction, and — where the client holds them —
 * where it leads and what it goes through. More (cost, what you know of
 * the far side) is the navigation build's to add.
 */
export function wayDoc(dir: string, command: string, known: { to?: string; through?: string } = {}): TooltipDoc {
  const facts = [
    ...(known.to ? [{ label: "to", value: known.to, source: "client" as const }] : []),
    ...(known.through ? [{ label: "through", value: known.through, source: "client" as const }] : []),
  ];
  return { header: { name: dir, kindWord: "way out" }, ...(facts.length ? { facts } : {}), command };
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
