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

const MoreChip = styled(Chip)`
  color: ${tokens.color.fgMuted};
  border-style: dashed;
`;

/** The card's picture — full-bleed to the card's padding box. */
const CardIllustration = styled.img`
  display: block;
  width: 100%;
  height: auto;
  border-radius: ${tokens.radius.sm};
  margin-bottom: ${tokens.space.sm};
`;

const Label = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
  margin: ${tokens.space.md} 0 ${tokens.space.xs};
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
  margin-top: ${tokens.space.md};
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
 * How many mixin chips ride the row before the overflow count.
 *
 * ⚠ The row **truncates with a count** (`+11`). It is a teaching
 * surface — *this is what the thing is made of, and those names are
 * the palette you would author with* — not a manifest. A full list
 * would be a wall of thirty names on a person and would teach nothing.
 */
const CHIP_LIMIT = 3;

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
}): React.ReactElement {
  const rows = measuredRows(record);
  if (rows.length === 0) {
    return (
      <Rows>
        <Figure
          label="measured"
          variant="row"
          figure={{
            state: "unwired",
            reason: "nothing about this declares a reading yet",
          }}
        />
      </Rows>
    );
  }
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
  const answer = useStore((s) =>
    stuffId ? s.affordances[stuffId] : undefined,
  );
  React.useEffect(() => {
    if (stuffId) websocketClient.resolveAffordances(stuffId);
  }, [stuffId]);
  if (!answer || answer.composition.length === 0) return null;
  const ordered = orderComposition(answer.composition);
  const shown = ordered.slice(0, CHIP_LIMIT);
  const rest = ordered.length - shown.length;
  return (
    <Chips data-testid="pane-composition">
      {shown.map((m) => (
        <Chip key={m}>{m}</Chip>
      ))}
      {rest > 0 && <MoreChip>+{rest}</MoreChip>}
    </Chips>
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
      <Label>Ways out</Label>
      <Actions>
        {exits.map((exit) => {
          const command = `go ${exit.direction}`;
          return (
            <CommandChip
              key={exit.direction}
              title={`Click to send: ${command}`}
              onClick={() => onSendCommand(command)}
              onMouseEnter={() => preview(command)}
              onMouseLeave={() => preview(null)}
            >
              {/*
                ⚠ The LABEL is the bare direction; the command is still
                `go <direction>` and still previews in the title and on
                hover. Under a heading that already says WAYS OUT the
                verb is implied, and printing it on every chip made a
                row of exits read as a row of sentences.

                This is not a break with *every clickable previews
                exactly what it sends* — the preview is the contract,
                not the label. The transcript has always done the same
                thing: `Obvious exits: north` sends `go north`.
              */}
              {exit.direction}
            </CommandChip>
          );
        })}
      </Actions>
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
  return (
    <>
      <Label>Here</Label>
      <Rows>
        {contents.map((row) => {
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
export function PaneBody(props: PaneBodyProps): React.ReactElement {
  const { card, onSendCommand, onCommandPreview } = props;
  if (card.released) return <ReleasedBody />;
  const record = card.records[0] as StuffDetailRecord | undefined;
  const stuffId = record?.stuffId;

  switch (card.kind) {
    case "place":
      return (
        <>
          <PlaceIllustration record={record} />
          <Composition stuffId={stuffId} />
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
        </>
      );
    case "agent":
      return (
        <>
          <Composition stuffId={stuffId} />
          <Measured record={record} />
          <ActionRow
            stuffId={stuffId}
            onSendCommand={onSendCommand}
            onCommandPreview={onCommandPreview}
          />
        </>
      );
    case "instrument":
      return (
        <>
          <Composition stuffId={stuffId} />
          <Measured record={record} />
          {record?.shortDescription && <Prose>{record.shortDescription}</Prose>}
          <ActionRow
            stuffId={stuffId}
            onSendCommand={onSendCommand}
            onCommandPreview={onCommandPreview}
          />
        </>
      );
    case "manifest":
      return (
        <>
          <Composition stuffId={stuffId} />
          <Measured record={record} />
          <HereList
            record={record}
            onSendCommand={onSendCommand}
            onCommandPreview={onCommandPreview}
          />
        </>
      );
    case "form":
    case "inspect":
    default:
      // Both have bodies of their own: `form` is rendered from the
      // prompt queue (its subject is a prompt, not a Stuff), and
      // `inspect` keeps the existing inspection pane. Neither reaches
      // this switch in practice; the branch exists so the union is
      // exhaustive rather than defaulted.
      return <ReleasedBody />;
  }
}
