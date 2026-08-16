/**
 * The card bodies — one skeleton (`Card`), five bodies.
 *
 * ## ⭐⭐ The measured rows are DERIVED, not enumerated
 *
 * The reference art draws each body as a hand-picked list of readings —
 * `Temperature 1240 °C`, `Bearing preoccupied`, `Stock holding`. A
 * component holding that list would be a second vocabulary of what an
 * object is measurable by, and it would drift from the substrate's real
 * one the first time a mixin declared a field.
 *
 * So the rows come from **whatever the subscription projected**, minus
 * the description set the header and prose already use. The card
 * feasibility survey (mql-subscription.md) found that only two of the
 * dozen readings the art wants are declared today, and that each
 * missing one is a single descriptor on the mixin that owns the value.
 * ⭐ Deriving the rows means each of those lands in the cards the day
 * it is declared, with no component touched.
 *
 * ## ⚠ Every value goes through `Figure`
 *
 * Including — especially — the ones that are not there. A body with no
 * declared readings renders **one hatched figure naming the reason**,
 * not an empty div and never a plausible default. A card that invented
 * a number would be the exact defect the convention exists to prevent,
 * and a sparse card is a normal state on a substrate whose per-mixin
 * descriptor list is still filling in.
 *
 * ## ⚠ The chips read the resolver, not a field
 *
 * Composition is `getActiveMixins` — augments, implants, species
 * innates, on-shift conferral — so it changes at runtime and cannot be
 * projected onto a subscription without going stale. That is precisely
 * why the art's `<thing mx="…">` digest was cut. The chips read the
 * affordance cache, which is answered fresh per subject.
 */

import React from "react";
import styled from "styled-components";
import type {
  CardId,
  HelpTopic,
  PresenceStatus,
  ReleaseRow,
  RosterRow,
  StuffDetailRecord,
  StuffKind,
  StuffRefRecord,
  WikiPageFrame,
} from "@saxonberg/types";
import { useStore } from "../../store/index";
import type { CardState } from "../../store/cardFeedSlice";
import { Figure, EntityName, tokens } from "../ui";
import { websocketClient } from "../../services/websocket";
import { mediaUrl } from "../../config";
import { MmlRenderer } from "../MmlRenderer";
import { CmsExplorer } from "../cms/CmsExplorer";
import { CmsEditor } from "../cms/CmsEditor";
import { CmsGitPanel } from "../cms/CmsGitPanel";
import { StudioPanel } from "../cms/studio/StudioPanel";

/* ─── shared pieces ─── */

const Trail = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
  margin-bottom: ${tokens.space.xs};
  overflow-wrap: anywhere;
`;

const TrailTail = styled.span`
  color: ${tokens.color.fg};
`;

const ChipToggle = styled.button`
  font: inherit;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  white-space: nowrap;
  color: ${tokens.color.fgEmphasis};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${tokens.space.xs};
`;

const Chip = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgDim};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  padding: 0 ${tokens.space.xs};
`;


/** The card's picture — full-bleed to the card's padding box. */
/**
 * ⚠ Capped, and cropped rather than letterboxed.
 *
 * At the rail's full width a room plate came out ~280px tall — the
 * single biggest thing on the card, pushing the exits and contents off
 * the screen. A card is a handle for a thing, not a display of it: the
 * picture is here to make the room recognisable at a glance, which a
 * band does as well as a plate.
 */
const CardIllustration = styled.img`
  display: block;
  width: 100%;
  max-height: 6.5rem;
  object-fit: cover;
  object-position: center;
  border-radius: ${tokens.radius.sm};
  margin-bottom: ${tokens.space.xs};
`;

/*
 * ⚠ The right column is NARROW and holds a stack of cards. Every rule
 * here is about density: a card that spends 44px of height on one exit
 * pushes the next card off the screen, and the whole point of a feed is
 * that you can see more than one thing in it.
 */
const Label = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
  margin: ${tokens.space.sm} 0 2px;
`;

/**
 * The room's prose, clamped.
 *
 * ⚠ Two lines by default. The full description is the transcript's job
 * — it is already there, in full, where you arrived — and a card that
 * reprints it pushes everything else out of view. Two lines is enough
 * to say *which* room without the card becoming the room.
 */
const RoomProse = styled.p<{ $expanded: boolean }>`
  margin: 0 0 ${tokens.space.xs};
  font-size: ${tokens.font.small};
  line-height: 1.45;
  color: ${tokens.color.fgMuted};
  overflow-wrap: anywhere;

  ${(p) =>
    p.$expanded
      ? ""
      : `
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `}
`;

/**
 * ⚠ A viewport act, so it carries no command preview — it changes how
 * much of a thing you can see and nothing about the world.
 */
const MoreToggle = styled.button`
  font: inherit;
  font-size: ${tokens.font.label};
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  color: ${tokens.color.fgEmphasis};
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;


/**
 * Exits, as inline links rather than buttons.
 *
 * ⚠ They were 44px chips — the touch-target minimum — which is right
 * for a primary action on a phone and wrong for a list of five
 * directions in a 360px rail, where it cost most of a card's height to
 * say `south north east`. The transcript renders exits as links and
 * always has; this now matches it.
 */
/**
 * How many mixin chips fit on one line of the rail.
 *
 * ⚠ A count, not a measurement — three is what fits at 360px with the
 * longest names in the shipped set. The row wraps rather than clipping
 * if a longer one appears, which is the safe direction.
 */
const MIXIN_LINE = 3;

/** How many contents rows a card shows before counting the rest. */
const HERE_SHOWN = 5;

/** The remainder count — dim, and never a control. */
const Overflow = styled.div`
  margin-top: 2px;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const InlineLinks = styled.div`
  font-size: ${tokens.font.small};
  line-height: 1.5;
  color: ${tokens.color.fgMuted};
`;

const InlineLink = styled.button`
  font: inherit;
  font-family: ${tokens.font.mono};
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  color: ${tokens.color.fgEmphasis};
  text-decoration: underline;
  text-decoration-style: dotted;

  &:hover {
    color: ${tokens.color.fgEmphasis};
  }
`;


const Prose = styled.div`
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.body};
  line-height: 1.5;
  color: ${tokens.color.fgDim};
  margin-bottom: ${tokens.space.sm};
`;

/**
 * Mixins that are framework plumbing rather than a fact about the
 * thing.
 *
 * ⚠ Found by driving: the lounge's chip row read `PostRegistrationMixin
 * · ExitableMixin · DetailedMixin`, so two of the three visible slots
 * on a **teaching surface** were spent on machinery. The chips exist to
 * show a player the composition palette they would author with; a
 * lifecycle hook is not part of that palette.
 *
 * ⚠ Sorted LAST rather than removed. The resolver's answer is the
 * ACTIVE composition and it is true — hiding part of it would be the
 * client editing a server fact. Demoting it is a presentation decision,
 * which is the client's; the overflow count still includes them.
 */
const PLUMBING: ReadonlySet<string> = new Set([
  "PostRegistration",
  "Propertied",
  "Persistable",
  "Forkable",
  "Shadowable",
  "ClientState",
]);

/**
 * `ExitableMixin` → `Exitable`.
 *
 * ⚠ The suffix is an implementation technique, not part of the name.
 * The codebase's own convention says so — the marker is
 * `_mixinName = 'PropertiedMixin'` while the file, the concept and
 * every doc call it `Propertied` — and the reference art's chips carry
 * no suffix either.
 */
export function chipLabel(mixin: string): string {
  return mixin.endsWith("Mixin") ? mixin.slice(0, -"Mixin".length) : mixin;
}

/** The chips, most-interesting first. */
export function orderComposition(
  composition: readonly string[],
): string[] {
  const labelled = composition.map(chipLabel);
  return [
    ...labelled.filter((m) => !PLUMBING.has(m)),
    ...labelled.filter((m) => PLUMBING.has(m)),
  ];
}

/**
 * Field names that are DESCRIPTION rather than measurement — the header
 * and the prose already render them, so they must not double as rows.
 *
 * ⚠ A deny-list rather than an allow-list, deliberately. An allow-list
 * would have to name every reading a mixin might ever declare, which is
 * the enumeration this module exists not to hold; a deny-list names the
 * handful of fields with a rendering of their own and lets everything
 * new arrive as a row.
 */
const DESCRIPTION_FIELDS: ReadonlySet<string> = new Set([
  "stuffId",
  "displayName",
  "primaryKeyword",
  "shortDescription",
  "longDescription",
  "illustration",
  "details",
  "contents",
  "exits",
  "quantity",
  "bulkMaterial",
  "detailMaterial",
  "focus",
]);

/** `mass` → `Mass`, `carryCapacity` → `Carry capacity`. */
function humanise(field: string): string {
  const spaced = field.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Render one projected value as a display string, or `null` when the
 * shape is not something this surface can honestly print.
 *
 * ⚠ Returning `null` matters more than the formatting does: a value
 * this cannot read is **not rendered at all**, rather than stringified
 * into `[object Object]` beside a confident label.
 */
function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.length > 0 ? value : null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : null;
  }
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") {
    const q = value as { value?: unknown; unit?: unknown };
    if (typeof q.value === "number" && typeof q.unit === "string") {
      /*
       * ⚠⚠ **Zero is "not declared", not "weighs nothing".**
       *
       * `mass` rides `DETAIL_FIELDS`, so the projection carries it for
       * anything Tangible whether or not the object ever set one — and
       * an implant that never declared a weight came back `0 kg`,
       * putting `MASS 0 kg` on card after card. That is the substrate
       * saying *nothing here*, printed as though the subject had told
       * you something.
       *
       * The knowing cost: a thing that genuinely masses zero shows no
       * MASS row. Nothing in the world models one, and a row of
       * meaningless zeroes on every card is the worse failure.
       */
      if (q.value === 0) return null;
      return `${Math.round(q.value * 100) / 100} ${q.unit}`;
    }
  }
  return null;
}

/** Every measured field the record actually carries. */
function measuredRows(
  record: StuffDetailRecord | StuffRefRecord | undefined,
): Array<{ field: string; text: string }> {
  if (!record) return [];
  const out: Array<{ field: string; text: string }> = [];
  for (const [field, value] of Object.entries(record)) {
    if (DESCRIPTION_FIELDS.has(field)) continue;
    const text = formatValue(value);
    if (text === null) continue;
    out.push({ field, text });
  }
  return out;
}

/**
 * The measured block: every declared reading, or one honest hatch.
 *
 * ⭐ The hatch's reason is the SURVEY's finding stated to the player in
 * their own terms. It is not an apology — it names what is missing and
 * what would fill it, which is what separates an unbuilt state from a
 * broken one.
 */
function Measured({
  record,
}: {
  record: StuffDetailRecord | StuffRefRecord | undefined;
}): React.ReactElement | null {
  const rows = measuredRows(record);
  /*
   * ⚠ Absent, not hatched.
   *
   * An unwired hatch is the right answer for a figure the surface
   * PROMISED and cannot fill. This section promises nothing: the card
   * shows the sections its subject HAS, and a room having no readings is
   * not a gap in the room — it is what a room is. Hatching it put
   * *"nothing about this declares a reading yet"* on every location
   * card, which is noise claiming to be honesty.
   */
  if (rows.length === 0) return null;
  return (
    <Rows>
      {rows.map((r) => (
        <Figure
          key={r.field}
          label={humanise(r.field)}
          variant="row"
          figure={{ state: "live", value: r.text }}
        />
      ))}
    </Rows>
  );
}

/**
 * The composition chip row, read from the affordance cache.
 *
 * ⚠ Asks for the answer if it does not have one — a subject card opens
 * about something the radial may never have been pointed at. Deduped
 * inside `resolveAffordances`, so a re-render costs nothing.
 */
/**
 * ⭐⭐ **The card's action row — what this thing is FOR.**
 *
 * It shipped showing `cast · defend · destruct` on everything, because
 * `AffordanceEntry` could not tell *the actor can always do this* from
 * *this subject affords it*. The resolver already computed the
 * distinction and used it as a filter; it now carries it as
 * `entry.source`, and this row renders `'subject'` only.
 *
 * ⚠ **A subject-afforded set of size zero renders NOTHING**, and for an
 * ordinary lamp with no `commandContributions` that is most of the
 * time. That is correct per *a section that does not apply is absent,
 * not hatched* — but it is worth saying plainly, because "the row is
 * usually missing" and "the row does not work" look identical from the
 * outside. A noticeboard's `read`, an NPC's `talk` and a door's `open`
 * are what it is for.
 *
 * ⚠ The RADIAL still shows both sources: a radial answers *what can I
 * do here*, which is the wider question the gesture asks.
 */
function ActionRow({
  stuffId,
  keyword,
  onSendCommand,
  onCommandPreview,
}: {
  stuffId?: string;
  /** The subject's own keyword — the word the player would type. */
  keyword?: string;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement | null {
  const answer = useStore((s) => (stuffId ? s.affordances[stuffId] : undefined));
  if (!answer) return null;
  const afforded = answer.verbs.filter(
    (v) => v.source === "subject" && v.state !== "disabled",
  );
  if (afforded.length === 0) return null;
  return (
    <>
      <Label>What it affords</Label>
      <Chips data-testid="card-action-row">
        {afforded.map((v) => {
          /*
           * ⚠ Named with the subject's own KEYWORD, so the command
           * reads as one the player could have typed — the same rule
           * the refresh control follows. A verb with no operand slot
           * sends bare.
           */
          const send = keyword ? `${v.verb} ${keyword}` : v.verb;
          return (
            <InlineLink
              key={v.verb}
              title={`Click to send: ${send}`}
              aria-label={send}
              onClick={() => onSendCommand(send)}
              onMouseEnter={() => onCommandPreview?.(send)}
              onMouseLeave={() => onCommandPreview?.(null)}
            >
              {v.verb}
            </InlineLink>
          );
        })}
      </Chips>
    </>
  );
}

function Composition({ stuffId }: { stuffId?: string }): React.ReactElement | null {
  const [expanded, setExpanded] = React.useState(false);
  const answer = useStore((s) =>
    stuffId ? s.affordances[stuffId] : undefined,
  );
  /*
   * ⚠⚠ Re-asks whenever the answer is MISSING, not only when the
   * subject changes.
   *
   * `clearAffordances` runs after every command the player sends —
   * coarse on purpose, because knowing which subjects a command touched
   * is a server semantic. So a card that asked once on mount lost its
   * composition on the next command and never got it back: the effect's
   * only dependency was `stuffId`, which had not changed.
   * `resolveAffordances` dedupes in flight, so this costs one round
   * trip, not a loop.
   */
  React.useEffect(() => {
    if (stuffId && !answer) websocketClient.resolveAffordances(stuffId);
  }, [stuffId, answer]);
  if (!answer || answer.composition.length === 0) return null;
  const ordered = orderComposition(answer.composition);
  /*
   * ⚠ Collapsed by default, and at the FOOT of the card.
   *
   * The chip row is a teaching surface — it is how a player meets the
   * content-development palette on real objects — but it is not what
   * they came to the card for. At the top it was the first thing after
   * the name on every single card, in a column where space is the
   * constraint; the count says it is there and one click opens it.
   */
  const shown = expanded ? ordered : ordered.slice(0, MIXIN_LINE);
  const rest = ordered.length - shown.length;
  return (
    <>
      {/*
        ⚠ Labelled, and in the same rhythm as every other section. It
        used to be a bare row of chips with its own margin, which read
        as indented next to the labelled blocks around it — the label
        was the missing thing, not the alignment.
      */}
      <Label>Interfaces</Label>
      <Chips data-testid="card-composition">
        {shown.map((m) => (
          <Chip key={m}>{m}</Chip>
        ))}
      {/*
        ⚠ Inline with the chips, not on a line of its own. The row is
        *one line of mixins and a way to see the rest* — a toggle
        underneath turns a one-line teaching surface into a two-line
        one, which is the space it was moved down here to stop taking.
      */}
        {(rest > 0 || expanded) && (
          <ChipToggle
            data-testid="card-composition-toggle"
            aria-expanded={expanded}
            aria-label={
              expanded
                ? "hide the rest"
                : `show all ${ordered.length} interfaces`
            }
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "less" : `+${rest} more`}
          </ChipToggle>
        )}
      </Chips>
    </>
  );
}

/*
 * ⚠⚠ **There is no action row, and it is a SERVER gap rather than a
 * design choice.**
 *
 * It showed the first few enabled verbs from the resolver, which put
 * `cast · defend · destruct` on a noticeboard, on a room and on an
 * implant — the same three on everything. They are enabled because the
 * ACTOR can always do them, not because the subject affords anything,
 * and `AffordanceEntry` carries nothing that tells the two apart:
 * `verb`, `description`, `state`, `reason`, `operand`, `category`. A
 * client-side filter would have to guess, and a guess dressed as a
 * recommendation is worse than no row at all.
 *
 * The radial already answers *what can I do with this* properly — every
 * verb, with the validator's own words beside the ones you cannot run.
 * Until the resolver can say which verbs a SUBJECT affords, that is the
 * honest place for it.
 */

/** The exits block — one command chip per way out. */
/**
 * The room's picture.
 *
 * ⚠ Hidden on a broken key rather than left as a broken-image icon —
 * the same rule the inspection card's illustration follows. A missing
 * asset is not information; a broken icon claims something failed.
 */
function PlaceIllustration({
  record,
}: {
  record: StuffDetailRecord | undefined;
}): React.ReactElement | null {
  const illustration = record?.illustration;
  if (!illustration) return null;
  return (
    <CardIllustration
      src={mediaUrl(illustration)}
      alt={record?.shortDescription ?? record?.displayName ?? ""}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

/**
 * The room's description, clamped to two lines with a way to see the
 * rest. The full prose is in the transcript where you arrived.
 */
function RoomDescription({
  record,
  text: override,
  onSendCommand,
  onCommandPreview,
}: {
  record: StuffDetailRecord | undefined;
  /** A drilled detail's prose, replacing the subject's own. */
  text?: string;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement | null {
  const [expanded, setExpanded] = React.useState(false);
  const text =
    override ?? record?.longDescription ?? record?.shortDescription ?? "";
  if (!text) return null;
  return (
    <>
      {/*
        ⭐⭐ **The details ARE the description.** This renders the
        subject's own markup, so `loudspeaker`, `benches`, `walls` are
        clickable where they are written — each one a real
        `look <keyword>` that opens its own card.

        It used to strip the tags and print a separate DETAILS row
        beneath, which said the same words twice: once as prose and
        once as a list. Reported as exactly that. The reasoning for
        flattening was that a clamped box hides some of its own
        clickable words — true, and answered by `more` rather than by
        taking the links away.
      */}
      <RoomProse $expanded={expanded} data-testid="place-prose">
        <MmlRenderer
          text={text}
          onCommandClick={onSendCommand}
          onCommandPreview={onCommandPreview ?? (() => undefined)}
        />
      </RoomProse>
      <MoreToggle
        aria-label={expanded ? "show less" : "show more"}
        aria-expanded={expanded}
        data-testid="place-prose-toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "less" : "more"}
      </MoreToggle>
    </>
  );
}

function WaysOut({
  record,
  onSendCommand,
  onCommandPreview,
}: {
  record: StuffDetailRecord | undefined;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement | null {
  const exits = record?.exits ?? [];
  if (exits.length === 0) return null;
  const preview = onCommandPreview ?? (() => undefined);
  return (
    <>
      <Label>Exits</Label>
      <InlineLinks>
        {exits.map((exit, i) => {
          const command = `go ${exit.direction}`;
          return (
            <React.Fragment key={exit.direction}>
              {i > 0 && ", "}
              {/*
                ⚠ The LABEL is the bare direction; the command is still
                `go <direction>` and still previews in the title and on
                hover. Under a heading that already says WAYS OUT the
                verb is implied.

                Not a break with *every clickable previews exactly what
                it sends* — the preview is the contract, not the label,
                and the transcript has always done this.
              */}
              <InlineLink
                title={`Click to send: ${command}`}
                onClick={() => onSendCommand(command)}
                onMouseEnter={() => preview(command)}
                onMouseLeave={() => preview(null)}
              >
                {exit.direction}
              </InlineLink>
            </React.Fragment>
          );
        })}
      </InlineLinks>
    </>
  );
}

/**
 * A contents list where each row carries its own reading.
 *
 * ⚠ The art shows `the forge · 1240 °C` beside each item, and the
 * survey found that `REF_FIELDS` (`displayName` / `quantity` /
 * `primaryKeyword`) cannot carry one — a nested projection is a
 * substrate question, not a descriptor one. So a row prints whatever
 * reading it HAS (a quantity, today) and is clickable to open its own
 * card otherwise. Clickable-to-drill is the honest v1 answer, and it is
 * better than a hatch per row would be.
 */
function HereList({
  record,
  onSendCommand,
  onCommandPreview,
}: {
  record: StuffDetailRecord | undefined;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement | null {
  const contents = record?.contents ?? [];
  if (contents.length === 0) return null;
  const preview = onCommandPreview ?? (() => undefined);
  /*
   * ⚠ Capped, with the remainder COUNTED rather than dropped — the same
   * rule the mixin chip row follows. A busy room ran to a dozen rows
   * and buried every card below it; a silent truncation would instead
   * tell the player the room is emptier than it is.
   */
  const shown = contents.slice(0, HERE_SHOWN);
  const hidden = contents.length - shown.length;
  return (
    <>
      <Label>Here</Label>
      <Rows>
        {shown.map((row) => {
          const target = row.primaryKeyword ?? row.displayName;
          const command = `look ${target}`;
          return (
            <div key={row.stuffId}>
              <EntityName
                stuffId={row.stuffId}
                label={row.displayName}
                title={`Click to send: ${command}`}
                command={command}
                onPreview={preview}
                onClick={() => onSendCommand(command)}
              />
            </div>
          );
        })}
      </Rows>
      {hidden > 0 && (
        <Overflow data-testid="here-overflow">+{hidden} more</Overflow>
      )}
    </>
  );
}

export interface CardBodyProps {
  card: CardState;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

/**
 * The released husk. No body, no controls — the reason is already in
 * the header, and re-rendering yesterday's contents as if they were
 * current is exactly what the fade exists to prevent.
 */
function ReleasedBody(): React.ReactElement {
  return (
    <Prose>
      What you last saw. Re-reading is free; acting on it needs the
      condition back.
    </Prose>
  );
}

/**
 * Dispatch a card to its body. One switch, in one place — the
 * alternative is a `kind` check inside every body and a default that
 * silently renders the wrong one.
 */
/**
 * The detail trail — **only ever about details**.
 *
 * ⚠⚠ It appears the moment you drill into the FIRST detail and not
 * before. A breadcrumb on an undrilled card would be a trail of one,
 * which says nothing; and this trail has no job outside details, so a
 * card you have not drilled shows none.
 *
 * The root segment is the object itself: clicking it leaves the detail
 * entirely and puts the object's own description back. Intermediate
 * segments pop to that level. The tail is plain text, because clicking
 * it would back you out to where you already are.
 *
 * ⚠ The root is the subject's **primaryKeyword**, not its display name.
 * Every other segment is a detail keyword, so a trail reading
 * *"the Terminus ticket office › pigeonholes"* changes register
 * halfway: one prose name and then a run of keywords. `office ›
 * pigeonholes` is one vocabulary — and it is the word the player would
 * type, which is what the rest of the surface is teaching them.
 */
function DetailTrail({
  rootName,
  path,
  onPopTo,
}: {
  rootName: string;
  path: readonly string[];
  onPopTo: (depth: number) => void;
}): React.ReactElement | null {
  if (path.length === 0) return null;
  return (
    <Trail aria-label="detail breadcrumbs" data-testid="detail-trail">
      <InlineLink
        data-testid="detail-trail-root"
        title={`Back to ${rootName}`}
        onClick={() => onPopTo(0)}
      >
        {rootName}
      </InlineLink>
      {path.map((key, i) => {
        const isTail = i === path.length - 1;
        return (
          <React.Fragment key={`${key}-${i}`}>
            {" › "}
            {isTail ? (
              <TrailTail>{key}</TrailTail>
            ) : (
              <InlineLink
                title={`Back to ${key}`}
                onClick={() => onPopTo(i + 1)}
              >
                {key}
              </InlineLink>
            )}
          </React.Fragment>
        );
      })}
    </Trail>
  );
}

/**
 * ⭐⭐ **One body, and the subject decides what is in it.**
 *
 * There is no location view and no thing view — there is one card, and
 * it shows the sections the subject HAS. `exits` is absent on anything
 * that is not Exitable, `contents` on anything empty, `illustration` on
 * most things; each section renders itself away when its field is not
 * there. What differs between a room, a person and a lamp is what they
 * are associated with, which is exactly what the record already says.
 *
 * It shipped as a switch over four "kinds" with four hand-written
 * bodies, taken from the reference art. That made a room and a thing
 * two different components with two different sets of controls, and it
 * was reported as the confusion it is: *"they all have the same
 * controls, they just differ in what they spotlight because they have
 * different associates."*
 */
export function CardBody(props: CardBodyProps): React.ReactElement {
  const { card } = props;
  /*
   * ⭐ **Three sources, three bodies.** An MQL card renders the
   * projected record below; a PAYLOAD card renders what its producing
   * controller already computed; a CLIENT card fills itself from its
   * own transport. One dispatch, in one place — a `kind` check inside
   * every body would be a default that silently renders the wrong one.
   */
  if (card.payload) return <PayloadBody {...props} />;
  if (card.promptId) return <PromptCardBody card={card} />;
  if (CLIENT_BODIES[card.cardId]) return <ClientBody card={card} />;
  return <MqlBody {...props} />;
}

/**
 * ⭐ The `client`-source bodies — the authoring surfaces.
 *
 * The SERVER owns these cards' existence, identity, lifetime and
 * pinned-ness; only the BODY is the client's, because the CMS tree, the
 * git panel and the Studio catalogue all speak their own REST routes.
 * That is what a `client` source means, and it is the only tier where
 * the client fills a card at all.
 *
 * ⚠ A map rather than a switch inside the body, so `CardBody`'s
 * dispatch can ask *is this a client card* without knowing which one.
 */
const CLIENT_BODIES: Partial<Record<CardId, React.ComponentType>> = {
  cms: CmsEditorBody,
  git: CmsGitPanel,
  studio: StudioComposerBody,
};

function ClientBody({ card }: { card: CardState }): React.ReactElement {
  const Body = CLIENT_BODIES[card.cardId]!;
  /*
   * ⚠ `cmsInit` mints the CSRF token the REST routes need, and it is
   * idempotent. It runs here rather than in each body so a second
   * authoring card opening does not race a second mint.
   */
  const cmsInit = useStore((s) => s.cmsInit);
  React.useEffect(() => {
    void cmsInit();
  }, [cmsInit]);
  return (
    <ClientSurface data-testid={`client-body-${card.cardId}`}>
      <Body />
    </ClientSurface>
  );
}

/**
 * ⚠ The authoring bodies need HEIGHT — Monaco is not a paragraph. The
 * card frame is otherwise content-sized, which is right for a room and
 * wrong for an editor, so this is the one body that asks for a floor.
 */
const ClientSurface = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 24rem;
  max-height: 70vh;
  overflow: hidden;
`;

const ExplorerColumn = styled.div`
  flex: 0 0 16rem;
  min-width: 0;
  overflow: auto;
  border-right: 1px solid ${tokens.color.borderMuted};
`;

const EditorSplit = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

/** The content editor: the tree beside Monaco. */
function CmsEditorBody(): React.ReactElement {
  return (
    <EditorSplit>
      <ExplorerColumn>
        <CmsExplorer />
      </ExplorerColumn>
      <CmsEditor />
    </EditorSplit>
  );
}

/**
 * The composer.
 *
 * ⚠ `onOpenInFiles` sends the `cms` VERB rather than flipping a local
 * tab, because the editor is a different card now: the Studio's
 * "open in Files" is a request to open another card, and the one way to
 * open a card is a command.
 */
function StudioComposerBody(): React.ReactElement {
  return <StudioPanel onOpenInFiles={() => undefined} />;
}

/**
 * ⭐ A `payload` card's body — the roster, the releases, the wiki page,
 * the help topic. The producing controller computed these; nothing here
 * re-derives them, which is what keeps the card and the scrollback from
 * disagreeing about the same answer.
 */
function PayloadBody(props: CardBodyProps): React.ReactElement {
  const { card, onSendCommand, onCommandPreview } = props;
  const payload = card.payload!;
  switch (payload.kind) {
    case 'roster':
      return (
        <RosterBody
          rows={payload.rows}
          onSendCommand={onSendCommand}
          onCommandPreview={onCommandPreview}
        />
      );
    case 'releases':
      return (
        <ReleasesBody
          rows={payload.rows}
          onSendCommand={onSendCommand}
          onCommandPreview={onCommandPreview}
        />
      );
    case 'wikiPage':
      return (
        <WikiPageBody
          page={payload.page}
          onSendCommand={onSendCommand}
          onCommandPreview={onCommandPreview}
        />
      );
    case 'helpTopic':
      return <HelpTopicBody topic={payload.topic} />;
  }
}

/**
 * ⚠ A prompt card has **no body here**. The client already holds one
 * prompt model (the prompt queue) and the card joins it by `promptId` —
 * one prompt model, and the feed reads it. Rendering a second copy of
 * the question would be two renderings of one payload that can drift.
 */
function PromptCardBody({ card }: { card: CardState }): React.ReactElement {
  const prompt = useStore((s) =>
    s.prompts.find((p) => p.promptId === card.promptId),
  );
  /*
   * ⚠⚠ **A settled card must not say it is waiting.** The prompt leaves
   * the queue the moment it is answered, and the card closes in the same
   * beat — so the fallback fires exactly when it is FALSE, and the husk
   * of an answered question read *"Waiting on your answer."* under a
   * header saying `answered · settled`. Found by driving.
   *
   * The fallback belongs to the open case only: a card whose question
   * has not arrived in the queue yet. A closed one says nothing; its
   * header already says what became of it.
   */
  if (card.closed !== undefined) return <ReleasedBody />;
  return <Prose>{prompt ? prompt.label : 'Waiting on your answer.'}</Prose>;
}

function MqlBody(props: CardBodyProps): React.ReactElement {
  const { card, onSendCommand, onCommandPreview } = props;
  const record = card.records[0] as StuffDetailRecord | undefined;
  const stuffId = record?.stuffId;

  /*
   * ⚠⚠ **The drill is per CARD, and it stays inside the card.**
   *
   * Clicking a detail word does not send `look <key>` — it descends a
   * level here. The Stuff never changes, only how closely you are
   * looking at it, which is exactly what a detail is. Sending the
   * command would move the player's FOCUS and open a whole new card
   * for something that is not a separate object.
   */
  const [detailPath, setDetailPath] = React.useState<readonly string[]>([]);
  // A different subject means a different set of details. Keeping the
  // path would leave the card claiming to be inside a detail the new
  // subject does not have.
  React.useEffect(() => setDetailPath([]), [stuffId]);

  const detailAliases = React.useMemo(() => {
    const out = new Set<string>();
    for (const entry of record?.details ?? []) {
      for (const id of entry.ids) out.add(id);
    }
    return out;
  }, [record]);

  /**
   * Intercept a detail click; let everything else through.
   *
   * ⚠ Only `look <one-word>` where the word is one of THIS subject's
   * detail aliases. `look noticeboard` in a room's prose is a different
   * object and must still travel as a command.
   */
  const handleProseClick = React.useCallback(
    (text: string) => {
      const match = /^look (\S+)$/.exec(text);
      if (match && detailAliases.has(match[1]!)) {
        setDetailPath((p) => [...p, match[1]!]);
        return;
      }
      onSendCommand(text);
    },
    [detailAliases, onSendCommand],
  );

  if (card.closed) return <ReleasedBody />;

  const tail = detailPath[detailPath.length - 1];
  const drilled = tail
    ? record?.details?.find((d) => d.ids.includes(tail))
    : undefined;

  /*
   * ⭐⭐ **An inspection card is laid out by what its subject IS.**
   *
   * Four kinds, and they are the four top-level Stuff branches — a
   * place, a person, an object, an idea. Not narrower: a weapon and a
   * lamp are both `thing`, an NPC and a player are both `agent`, and
   * splitting further waits until something needs it.
   *
   * ⚠ **It is a composition, not four hand-written components.** The
   * sections already existed and each renders itself away when its
   * field is absent; what differs by kind is WHICH ones are offered at
   * all, and that is a real difference rather than a cosmetic one:
   *
   *  - a **place** has ways out and things in it; it has no mass;
   *  - an **agent** is a who, not a container to enumerate — listing a
   *    person's contents in a look card would be reading their pockets;
   *  - a **thing** is the one kind whose material and weight are worth
   *    the line, and whose contents you may legitimately see;
   *  - an **idea** is not perceived at all in the usual way — no
   *    picture, no exits, no measure. Mostly it is reached through the
   *    authoring and wiki surfaces rather than by looking.
   *
   * ⚠ This deliberately re-opens a call that was closed the other way.
   * The per-kind bodies were built from reference art and removed after
   * *"they all have the same controls, they just differ in what they
   * spotlight"* — which was true of THOSE bodies, four hand-written
   * shells duplicating one another. The difference now is that the
   * shell is shared and only the section set varies.
   */
  /*
   * ⚠ The fallback reads the card's own kind rather than defaulting
   * blind: a `place` card IS a location even on an older envelope that
   * carries no `subjectKind`, and treating it as a thing would take its
   * exits away.
   */
  const kind: StuffKind =
    card.subjectKind ?? (card.cardId === "place" ? "location" : "thing");
  const isPlace = kind === "location";
  const isAgent = kind === "agent";
  const isIdea = kind === "idea";

  return (
    <>
      <DetailTrail
        rootName={record?.primaryKeyword || record?.displayName || "it"}
        path={detailPath}
        onPopTo={(depth) => setDetailPath((p) => p.slice(0, depth))}
      />
      {/*
        ⚠ The illustration is the OBJECT's, so it goes while you are
        inside a detail — the hall's photograph beside the loudspeaker's
        prose would be a picture of the wrong thing. When details carry
        their own media this is where it renders.
      */}
      {!drilled && !isIdea && <PlaceIllustration record={record} />}
      {/*
        ⭐ The description is what the drill replaces. Everything below
        belongs to the object and stays put; the trail above says which
        level you are reading.
      */}
      <RoomDescription
        record={record}
        text={drilled?.description}
        onSendCommand={handleProseClick}
        onCommandPreview={onCommandPreview}
      />
      {/* Mass and material are a THING's line. A room has no weight. */}
      {!isPlace && !isAgent && !isIdea && <Measured record={record} />}
      {isPlace && (
        <WaysOut
          record={record}
          onSendCommand={onSendCommand}
          onCommandPreview={onCommandPreview}
        />
      )}
      {/* ⚠ Never for an agent: a person's contents are their pockets. */}
      {!isAgent && !isIdea && (
        <HereList
          record={record}
          onSendCommand={onSendCommand}
          onCommandPreview={onCommandPreview}
        />
      )}
      <ActionRow
        stuffId={stuffId}
        keyword={record?.primaryKeyword}
        onSendCommand={onSendCommand}
        onCommandPreview={onCommandPreview}
      />
      <Composition stuffId={stuffId} />
    </>
  );
}

/* ─── the payload bodies, salvaged from the retired pane shells ─── */

/*
 * ⭐ **What was salvaged, and what died.** `WhoPane`, `NewsTickerPane`
 * and `WikiPane` were hand-written client surfaces with their own data
 * paths, sitting in a tab switcher. The ROW-RENDERING knowledge — the
 * recognized/stranger styling, the pin-first release rows and their
 * expand, the wiki outline and its section-edit click — was real work
 * and moves here. What died is the pane *shell*: its 360px chrome, its
 * own read of the store, and its tab.
 */

const RosterRowButton = styled.button<{ $recognized: boolean }>`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.md};
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  cursor: pointer;
  font: inherit;
  color: ${(p) => (p.$recognized ? tokens.color.fg : tokens.color.fgMuted)};

  &:hover {
    background: ${tokens.color.actionBg};
  }
`;

const RosterHeader = styled.span<{ $recognized: boolean }>`
  flex: 1;
  font-weight: ${(p) => (p.$recognized ? 600 : 400)};
  color: ${(p) => (p.$recognized ? tokens.color.accent : tokens.color.fgMuted)};
  word-break: break-word;
`;

const RosterCountry = styled.span`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
  white-space: nowrap;
`;

const STATUS_TINT: Record<PresenceStatus, string> = {
  active: tokens.color.fgMuted,
  idle: tokens.color.fgMuted,
  engaged: tokens.color.accent,
  reconnecting: tokens.color.warning,
};

const StatusBadge = styled.span<{ $status: PresenceStatus }>`
  flex: 0 0 auto;
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: ${tokens.space.xs} ${tokens.space.sm};
  border-radius: ${tokens.radius.sm};
  border: 1px solid ${(p) => STATUS_TINT[p.$status]};
  color: ${(p) => STATUS_TINT[p.$status]};
  white-space: nowrap;
`;

/**
 * ⚠ **The rows come from the CARD, not from the roster store slice.**
 *
 * `self.group` presence frames still keep that slice current — it is
 * subsystem state, not pane state — but this card carries the roster
 * `WhoController` itself rendered. Reading the slice instead would make
 * the card and the `who` output two answers to one question, drifting
 * apart the moment a filter (`--here`, `--friends`) is applied.
 */
function RosterBody({
  rows,
  onSendCommand,
  onCommandPreview,
}: {
  rows: readonly RosterRow[];
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  if (rows.length === 0) {
    return <Prose>No one else is around right now.</Prose>;
  }
  return (
    <div data-testid="card-roster" aria-label="online characters">
      {rows.map((row) => {
        const command = `profile ${row.header}`;
        return (
          <RosterRowButton
            key={row.handle}
            $recognized={row.recognized}
            data-handle={row.handle}
            title={`Click to send: ${command}`}
            onClick={() => onSendCommand(command)}
            onMouseEnter={
              onCommandPreview ? () => onCommandPreview(command) : undefined
            }
            onMouseLeave={
              onCommandPreview ? () => onCommandPreview(null) : undefined
            }
          >
            <RosterHeader $recognized={row.recognized}>
              {row.header}
            </RosterHeader>
            {row.status && (
              <StatusBadge $status={row.status}>{row.status}</StatusBadge>
            )}
            {row.country && <RosterCountry>— {row.country}</RosterCountry>}
          </RosterRowButton>
        );
      })}
    </div>
  );
}

const ReleaseRowBox = styled.div<{ $pinned: boolean }>`
  border-left: 2px solid
    ${(p) => (p.$pinned ? tokens.color.accent : "transparent")};
  padding: ${tokens.space.xs} ${tokens.space.sm};
`;

const HeadlineButton = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  color: ${tokens.color.fg};
`;

const ReleaseBodyText = styled.div`
  margin-top: ${tokens.space.xs};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
`;

/** Pinned releases first, then recency — the ticker's own order. */
function ReleasesBody({
  rows,
  onSendCommand,
  onCommandPreview,
}: {
  rows: readonly ReleaseRow[];
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  if (rows.length === 0) return <Prose>Nothing on the wire.</Prose>;
  const ordered = [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.publishedAt - a.publishedAt;
  });
  return (
    <div data-testid="card-releases">
      {ordered.map((row) => (
        <ReleaseRowBox key={row.releaseId} $pinned={row.pinned}>
          <HeadlineButton
            onClick={() =>
              setExpanded((p) => ({
                ...p,
                [row.releaseId]: !p[row.releaseId],
              }))
            }
          >
            <MmlRenderer
              text={row.headline}
              onCommandClick={onSendCommand}
              onCommandPreview={onCommandPreview ?? (() => undefined)}
            />
          </HeadlineButton>
          {expanded[row.releaseId] && row.body && (
            <ReleaseBodyText>
              <MmlRenderer
                text={row.body}
                onCommandClick={onSendCommand}
                onCommandPreview={onCommandPreview ?? (() => undefined)}
              />
            </ReleaseBodyText>
          )}
        </ReleaseRowBox>
      ))}
    </div>
  );
}

const OutlineRow = styled.button<{ $level: 1 | 2 | 3 }>`
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  font: inherit;
  color: ${tokens.color.fgEmphasis};
  padding: 0 0 0 ${(p) => (p.$level - 1) * 0.75}rem;
`;

const SearchField = styled.input`
  width: 100%;
  box-sizing: border-box;
  font: inherit;
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fg};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  margin-bottom: ${tokens.space.sm};
`;

/**
 * ⭐ **Wiki search, wired.**
 *
 * It shipped as a not-wired treatment saying there was no port behind
 * it and that the tree was the way in, citing an audit that was already
 * stale: `recall --scope wiki` had merged BEFORE the wave that wrote
 * the hatch. The hatch was written from a table rather than from the
 * tree. (The retired sentence is deliberately not quoted here — a
 * source grep is what keeps it gone.)
 *
 * ⚠ It sends a REAL command, previewed exactly as sent — no private
 * search channel, and the results land in the transcript like every
 * other answer.
 */
function WikiSearch({
  onSendCommand,
  onCommandPreview,
}: {
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  const [terms, setTerms] = React.useState('');
  const command = `recall --scope wiki ${terms.trim()}`;
  return (
    <SearchField
      data-testid="wiki-search"
      aria-label="Search the wiki"
      placeholder="Search the wiki…"
      value={terms}
      onChange={(e) => setTerms(e.target.value)}
      onFocus={() => onCommandPreview?.(command)}
      onBlur={() => onCommandPreview?.(null)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || terms.trim().length === 0) return;
        onSendCommand(command);
        setTerms('');
      }}
    />
  );
}

function WikiPageBody({
  page,
  onSendCommand,
  onCommandPreview,
}: {
  page: WikiPageFrame;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  return (
    <div data-testid="card-wiki-page">
      <WikiSearch
        onSendCommand={onSendCommand}
        onCommandPreview={onCommandPreview}
      />
      {page.sections.length > 0 && (
        <>
          <Label>Contents</Label>
          {page.sections.map((sec) => {
            /*
             * ⭐ A section EDIT, not a jump. Section editing is the
             * wiki's real concurrency control — two people in different
             * sections never collide — so the outline's most useful
             * click is the one that opens one. Readers who only want to
             * look already have the whole body right below.
             */
            const command = page.mayEdit
              ? `wiki edit ${page.handle} --section ${sec.anchor}`
              : `wiki ${page.handle}`;
            return (
              <OutlineRow
                key={sec.anchor}
                $level={sec.level}
                title={`Click to send: ${command}`}
                onClick={() => onSendCommand(command)}
                onMouseEnter={() => onCommandPreview?.(command)}
                onMouseLeave={() => onCommandPreview?.(null)}
              >
                {sec.title}
              </OutlineRow>
            );
          })}
        </>
      )}
      <MmlRenderer
        text={page.body}
        onCommandClick={onSendCommand}
        onCommandPreview={onCommandPreview ?? (() => undefined)}
      />
    </div>
  );
}

/**
 * ⚠ The topic body is **already valid, gated MML** — the catalogue
 * escaped it. Rendering it through the ordinary renderer is what makes
 * the card and the scrollback the same rendering.
 */
function HelpTopicBody({ topic }: { topic: HelpTopic }): React.ReactElement {
  return (
    <div data-testid="card-help-topic">
      <MmlRenderer
        text={topic.body}
        onCommandClick={() => undefined}
        onCommandPreview={() => undefined}
      />
      {topic.relations.length > 0 && (
        <>
          <Label>See also</Label>
          {topic.relations.map((rel) => (
            <Prose key={`${rel.kind}-${rel.targetTitle}`}>
              {rel.kind}: {rel.targetTitle}
            </Prose>
          ))}
        </>
      )}
    </div>
  );
}
