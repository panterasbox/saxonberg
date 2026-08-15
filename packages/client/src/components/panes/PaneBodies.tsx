/**
 * The pane bodies — one skeleton (`PaneCard`), five bodies.
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
 * the description set the header and prose already use. The pane
 * feasibility survey (mql-subscription.md) found that only two of the
 * dozen readings the art wants are declared today, and that each
 * missing one is a single descriptor on the mixin that owns the value.
 * ⭐ Deriving the rows means each of those lands in the panes the day
 * it is declared, with no component touched.
 *
 * ## ⚠ Every value goes through `Figure`
 *
 * Including — especially — the ones that are not there. A body with no
 * declared readings renders **one hatched figure naming the reason**,
 * not an empty div and never a plausible default. A pane that invented
 * a number would be the exact defect the convention exists to prevent,
 * and a sparse pane is a normal state on a substrate whose per-mixin
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
import type { StuffDetailRecord, StuffRefRecord } from "@saxonberg/types";
import { useStore } from "../../store/index";
import type { PaneCardState } from "../../store/paneFeedSlice";
import { Figure, EntityName, tokens } from "../ui";
import { websocketClient } from "../../services/websocket";
import { mediaUrl } from "../../config";
import { MmlRenderer } from "../MmlRenderer";

/* ─── shared pieces ─── */

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
  margin-bottom: ${tokens.space.md};
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

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
  margin-top: ${tokens.space.sm};
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

const CommandChip = styled.button`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  cursor: pointer;
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fg};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  min-height: 44px;

  &:hover {
    border-color: ${tokens.color.fgEmphasis};
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
 * ⚠ Asks for the answer if it does not have one — a subject pane opens
 * about something the radial may never have been pointed at. Deduped
 * inside `resolveAffordances`, so a re-render costs nothing.
 */
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
  if (!expanded) {
    return (
      <InlineLinks>
        <InlineLink
          data-testid="pane-composition-toggle"
          aria-expanded={false}
          aria-label="show what this is made of"
          onClick={() => setExpanded(true)}
        >
          {ordered.length} mixins
        </InlineLink>
      </InlineLinks>
    );
  }
  return (
    <>
      <Chips data-testid="pane-composition">
        {ordered.map((m) => (
          <Chip key={m}>{m}</Chip>
        ))}
      </Chips>
      <InlineLinks>
        <InlineLink
          data-testid="pane-composition-toggle"
          aria-expanded
          aria-label="hide what this is made of"
          onClick={() => setExpanded(false)}
        >
          less
        </InlineLink>
      </InlineLinks>
    </>
  );
}

/**
 * Action buttons — the verbs this viewer can actually run, from the
 * resolver.
 *
 * ⚠⚠ **Enabled only.** A pane body is a place to act, not a menu of
 * what you cannot do; the dimmed-with-a-reason treatment belongs to the
 * radial, where the player has asked *what are my options*. Putting
 * refusals in a card would make every pane a list of disappointments.
 */
function ActionRow({
  stuffId,
  onSendCommand,
  onCommandPreview,
  limit = 3,
}: {
  stuffId?: string;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
  limit?: number;
}): React.ReactElement | null {
  const answer = useStore((s) =>
    stuffId ? s.affordances[stuffId] : undefined,
  );
  if (!answer) return null;
  const verbs = answer.verbs
    .filter((v) => v.state === "enabled")
    .slice(0, limit);
  if (verbs.length === 0) return null;
  const preview = onCommandPreview ?? (() => undefined);
  return (
    <Actions>
      {verbs.map((v) => {
        const command = v.verb;
        return (
          <CommandChip
            key={v.verb}
            title={`Click to send: ${command}`}
            onClick={() => onSendCommand(command)}
            onMouseEnter={() => preview(command)}
            onMouseLeave={() => preview(null)}
          >
            {command}
          </CommandChip>
        );
      })}
    </Actions>
  );
}

/** The exits block — one command chip per way out. */
/**
 * The room's picture.
 *
 * ⚠ Hidden on a broken key rather than left as a broken-image icon —
 * the same rule the inspection pane's illustration follows. A missing
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
  onSendCommand,
  onCommandPreview,
}: {
  record: StuffDetailRecord | undefined;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement | null {
  const [expanded, setExpanded] = React.useState(false);
  const text = record?.longDescription ?? record?.shortDescription ?? "";
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
 * pane otherwise. Clickable-to-drill is the honest v1 answer, and it is
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

export interface PaneBodyProps {
  card: PaneCardState;
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
export function PaneBody(props: PaneBodyProps): React.ReactElement {
  const { card, onSendCommand, onCommandPreview } = props;
  if (card.released) return <ReleasedBody />;
  const record = card.records[0] as StuffDetailRecord | undefined;
  const stuffId = record?.stuffId;
  const refresh = record?.primaryKeyword
    ? `look ${record.primaryKeyword}`
    : "look";

  return (
    <>
      <PlaceIllustration record={record} />
      <RoomDescription
        record={record}
        onSendCommand={onSendCommand}
        onCommandPreview={onCommandPreview}
      />
      <Measured record={record} />
      <WaysOut
        record={record}
        onSendCommand={onSendCommand}
        onCommandPreview={onCommandPreview}
      />
      <HereList
        record={record}
        onSendCommand={onSendCommand}
        onCommandPreview={onCommandPreview}
      />
      <ActionRow
        stuffId={stuffId}
        onSendCommand={onSendCommand}
        onCommandPreview={onCommandPreview}
      />
      <Composition stuffId={stuffId} />
      {/*
        ⭐ Every card refreshes the same way, because every card is the
        same thing: `look` at its subject. Named with the subject's own
        keyword so the command reads as one the player could have typed.
      */}
      <InlineLinks>
        <InlineLink
          data-testid="card-refresh"
          title={`Click to send: ${refresh}`}
          onClick={() => onSendCommand(refresh)}
          onMouseEnter={() => onCommandPreview?.(refresh)}
          onMouseLeave={() => onCommandPreview?.(null)}
        >
          refresh
        </InlineLink>
      </InlineLinks>
    </>
  );
}
