/**
 * InspectionBody — the inspection card, rendered from what `look` SAID
 * (client-surface D1/D2, AC 6).
 *
 * ⭐⭐ **The card says exactly what the terminal said, by source.** The
 * server sends `look`'s lines as segments — the prose, then one state
 * line per interface that spoke, then `look`'s own sections (lists,
 * notices) — and this renders them IN ORDER, each with a gutter stripe
 * naming the interface that said it: solid for a mixin, dotted for a
 * class's own augmenter or a `look` section. Nothing here derives a line
 * of its own, so the card and the scrollback cannot disagree.
 *
 * Around the segments: the header's stripes (Perceptible, and Containable
 * or Addressable), the image plate by its declared shape (never cropped),
 * the quiet row (the interfaces that said nothing, one click away) and
 * the subject's own affordances. Every link addresses its thing by id —
 * `look #<id>` — so a chip names exactly one thing (D7, AC 9).
 */

import React from "react";
import styled from "styled-components";
import type {
  IllustrationShape,
  LookSegment,
  SegmentItem,
  SegmentSource,
  StuffDetailRecord,
  StuffKind,
} from "@saxonberg/types";
import { useStore } from "../../store/index";
import type { CardState } from "../../store/cardFeedSlice";
import { tokens } from "../ui";
import { websocketClient } from "../../services/websocket";
import { mediaUrl, SERVER_URL } from "../../config";
import { MmlRenderer } from "../MmlRenderer";
import { colorForTopic } from "../GutterStripe";

/* ─── layout ─── */

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.xs};
  margin-bottom: ${tokens.space.xs};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const Branch = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  padding: 0 0.3rem;
`;

const Row = styled.div`
  display: flex;
  align-items: stretch;
  gap: ${tokens.space.sm};
  margin: ${tokens.space.xs} 0;
`;

const GutterCell = styled.div`
  flex: none;
  display: flex;
  gap: 1px;
`;

const Stripe = styled.button<{ $color: string; $solid: boolean }>`
  width: 3px;
  padding: 0;
  border: none;
  cursor: help;
  background: ${(p) =>
    p.$solid
      ? p.$color
      : `repeating-linear-gradient(to bottom, ${p.$color} 0 3px, transparent 3px 6px)`};
`;

const Content = styled.div<{ $shape: LookSegment["shape"] }>`
  flex: 1;
  min-width: 0;
  font-family: ${(p) => (p.$shape === "prose" ? tokens.font.serif : tokens.font.family)};
  font-size: ${tokens.font.body};
  color: ${(p) => (p.$shape === "notice" ? tokens.color.fgMuted : tokens.color.fg)};
  font-style: ${(p) => (p.$shape === "notice" ? "italic" : "normal")};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const ListHeading = styled.div`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.sectionLabel};
  margin-bottom: 2px;
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
`;

const ItemChip = styled.button`
  font: inherit;
  font-size: ${tokens.font.small};
  padding: 0.05rem ${tokens.space.sm};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fgEmphasis};
  cursor: pointer;

  &:hover {
    border-color: ${tokens.color.fgEmphasis};
  }
`;

const Toggle = styled.button`
  font: inherit;
  font-size: ${tokens.font.micro};
  background: transparent;
  border: none;
  padding: 0;
  color: ${tokens.color.fgMuted};
  cursor: pointer;
`;

const Quiet = styled.div`
  margin-top: ${tokens.space.sm};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const QuietChip = styled.span`
  display: inline-block;
  margin: 2px ${tokens.space.xs} 0 0;
  padding: 0 0.3rem;
  border: 1px dashed ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
`;

const Popover = styled.div`
  margin: ${tokens.space.xs} 0;
  padding: ${tokens.space.sm};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surfaceAlt};
  font-size: ${tokens.font.small};
`;

/**
 * ⭐ The plate keeps the picture's declared shape and never crops it:
 * `object-fit: contain`, an aspect ratio per shape (illustration slate).
 */
const ASPECT: Record<IllustrationShape, string> = {
  wide: "16 / 9",
  tall: "4 / 5",
  square: "1 / 1",
};

const Plate = styled.img<{ $shape: IllustrationShape; $beside: boolean }>`
  display: block;
  aspect-ratio: ${(p) => ASPECT[p.$shape]};
  object-fit: contain;
  background: ${tokens.color.paper};
  border-radius: ${tokens.radius.sm};
  ${(p) =>
    p.$beside
      ? `float: right; width: 40%; margin: 0 0 ${tokens.space.sm} ${tokens.space.sm};`
      : `width: 100%; margin-bottom: ${tokens.space.sm};`}
`;

const ActionLabel = styled.div`
  margin-top: ${tokens.space.sm};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.sectionLabel};
`;

/* ─── interface summaries (the gutter hover) ─── */

/** Session cache of mixin summaries, from the help catalogue (#89). */
const summaries = new Map<string, string | null>();

function useSummary(source: SegmentSource | null): string | null {
  const key = source?.kind === "mixin" ? `mixin.${source.name}` : null;
  const [summary, setSummary] = React.useState<string | null>(
    key ? (summaries.get(key) ?? null) : null,
  );
  React.useEffect(() => {
    if (!key) return;
    if (summaries.has(key)) {
      setSummary(summaries.get(key) ?? null);
      return;
    }
    let live = true;
    void (async () => {
      try {
        const res = await fetch(
          `${SERVER_URL}/api/help/topic?id=${encodeURIComponent(key)}`,
          { credentials: "include" },
        );
        const body = res.ok ? ((await res.json()) as { topic?: { summary?: string } }) : null;
        summaries.set(key, body?.topic?.summary || null);
      } catch {
        summaries.set(key, null);
      }
      if (live) setSummary(summaries.get(key) ?? null);
    })();
    return () => {
      live = false;
    };
  }, [key]);
  return summary;
}

/* ─── pieces ─── */

const BRANCH_LETTER: Record<StuffKind, string> = {
  location: "L",
  agent: "A",
  thing: "T",
  idea: "I",
};

function defaultShape(kind: StuffKind): IllustrationShape {
  return kind === "location" ? "wide" : kind === "agent" ? "tall" : "square";
}

function sourceLabel(src: SegmentSource): string {
  return src.kind === "look" ? `look · ${src.name}` : src.name;
}

function Gutter({
  sources,
  open,
  onOpen,
}: {
  sources: SegmentSource[];
  open: SegmentSource | null;
  onOpen: (src: SegmentSource | null) => void;
}): React.ReactElement {
  return (
    <GutterCell>
      {sources.map((src) => (
        <Stripe
          key={`${src.kind}:${src.name}`}
          type="button"
          data-testid="segment-stripe"
          data-stripe-kind={src.kind === "mixin" ? "solid" : "dotted"}
          data-source={sourceLabel(src)}
          aria-label={`said by ${sourceLabel(src)}`}
          title={sourceLabel(src)}
          $color={colorForTopic(src.name)}
          $solid={src.kind === "mixin"}
          onClick={() => onOpen(open === src ? null : src)}
        />
      ))}
    </GutterCell>
  );
}

function ItemChips({
  items,
  onSendCommand,
  onCommandPreview,
}: {
  items: SegmentItem[];
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  const [openGroup, setOpenGroup] = React.useState<string | null>(null);
  const chip = (item: SegmentItem): React.ReactElement => {
    // ⭐ By id: the chip names exactly this thing, not the first match.
    const cmd = `look #${item.stuffId}`;
    return (
      <ItemChip
        key={item.stuffId}
        type="button"
        data-testid="segment-chip"
        aria-label={cmd}
        onClick={() => onSendCommand(cmd)}
        onMouseEnter={() => onCommandPreview?.(cmd)}
        onMouseLeave={() => onCommandPreview?.(null)}
      >
        {item.label}
      </ItemChip>
    );
  };
  return (
    <ChipRow>
      {items.map((item) =>
        item.count > 1 && item.members ? (
          <React.Fragment key={item.stuffId}>
            {/* ⭐ A group expands in place (#71/#76). */}
            <Toggle
              type="button"
              data-testid="segment-group"
              aria-expanded={openGroup === item.stuffId}
              onClick={() => setOpenGroup(openGroup === item.stuffId ? null : item.stuffId)}
            >
              {item.label} {openGroup === item.stuffId ? "▾" : "▸"}
            </Toggle>
            {openGroup === item.stuffId ? item.members.map(chip) : null}
          </React.Fragment>
        ) : (
          chip(item)
        ),
      )}
    </ChipRow>
  );
}

function SourcePopover({
  source,
  stuffId,
  onSendCommand,
}: {
  source: SegmentSource;
  stuffId?: string;
  onSendCommand: (text: string) => void;
}): React.ReactElement {
  const summary = useSummary(source);
  const help = source.kind === "mixin" ? `help mixin.${source.name}` : null;
  return (
    <Popover data-testid="source-popover">
      <strong>{sourceLabel(source)}</strong>
      {summary ? <div>{summary}</div> : null}
      <ChipRow style={{ marginTop: tokens.space.xs }}>
        {help ? (
          <ItemChip type="button" onClick={() => onSendCommand(help)}>
            {help}
          </ItemChip>
        ) : null}
        {stuffId ? (
          <ItemChip type="button" onClick={() => onSendCommand(`look #${stuffId}`)}>
            look again
          </ItemChip>
        ) : null}
      </ChipRow>
    </Popover>
  );
}

/* ─── the body ─── */

export interface InspectionBodyProps {
  card: CardState;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
  /** The card is cut to fit: the image collapses first. */
  cut?: boolean;
  /** Intercept prose clicks (the detail drill). */
  onProseClick?: (text: string) => void;
}

/** Interfaces the header already shows — never "quiet". */
const HEADER_MIXINS = new Set(["Perceptible", "Containable", "Addressable"]);

export function InspectionBody({
  card,
  onSendCommand,
  onCommandPreview,
  cut = false,
  onProseClick,
}: InspectionBodyProps): React.ReactElement {
  const record = card.records[0] as StuffDetailRecord | undefined;
  const stuffId = record?.stuffId;
  const kind: StuffKind = card.subjectKind ?? "thing";
  const segments = card.segments ?? [];
  const [openSource, setOpenSource] = React.useState<SegmentSource | null>(null);
  const [quietOpen, setQuietOpen] = React.useState(false);
  const [imageOpen, setImageOpen] = React.useState(false);

  const answer = useStore((s) => (stuffId ? s.affordances[stuffId] : undefined));
  React.useEffect(() => {
    if (stuffId && !answer) websocketClient.resolveAffordances(stuffId);
  }, [stuffId, answer]);

  const spoke = new Set(
    segments.flatMap((s) => s.sources).filter((s) => s.kind === "mixin").map((s) => s.name),
  );
  const composition = (answer?.composition ?? []).map((m) => m.replace(/Mixin$/, ""));
  const quiet = composition.filter((m) => !spoke.has(m) && !HEADER_MIXINS.has(m));
  const headerMixins = composition.filter((m) => HEADER_MIXINS.has(m));

  const shape: IllustrationShape = record?.illustrationShape ?? defaultShape(kind);
  const size = card.size ?? "unit";
  const illustration = record?.illustration;
  // ⭐ At unit width a tall or square picture sits BESIDE the prose; a
  // wide one spans the card. Cut to fit, the image collapses first.
  const beside = size === "unit" && shape !== "wide";
  const showImage = Boolean(illustration) && (!cut || imageOpen);

  const afforded = (answer?.verbs ?? []).filter(
    (v) => v.source === "subject" && v.state !== "disabled",
  );

  return (
    <div data-testid="inspection-body">
      <Head data-testid="inspection-head">
        <Branch title={kind}>{BRANCH_LETTER[kind]}</Branch>
        {headerMixins.map((m) => (
          <Stripe
            key={m}
            type="button"
            aria-label={`said by ${m}`}
            title={m}
            $color={colorForTopic(m)}
            $solid
            style={{ height: "0.9rem" }}
          />
        ))}
      </Head>
      {illustration && cut && !imageOpen ? (
        <Toggle type="button" data-testid="image-collapsed" onClick={() => setImageOpen(true)}>
          picture ▸
        </Toggle>
      ) : null}
      {showImage ? (
        <Plate
          data-testid="illustration-plate"
          data-shape={shape}
          src={mediaUrl(illustration!)}
          alt={record?.shortDescription ?? record?.displayName ?? ""}
          $shape={shape}
          $beside={beside}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          <Row data-testid="segment" data-shape={seg.shape}>
            <Gutter sources={seg.sources} open={openSource} onOpen={setOpenSource} />
            <Content $shape={seg.shape}>
              {seg.shape === "list" && seg.items && seg.items.length > 0 ? (
                <>
                  {seg.heading ? <ListHeading>{seg.heading}</ListHeading> : null}
                  <ItemChips
                    items={seg.items}
                    onSendCommand={onSendCommand}
                    onCommandPreview={onCommandPreview}
                  />
                </>
              ) : (
                <MmlRenderer
                  text={seg.text}
                  onCommandClick={seg.shape === "prose" && onProseClick ? onProseClick : onSendCommand}
                  onCommandPreview={onCommandPreview ?? (() => undefined)}
                />
              )}
            </Content>
          </Row>
          {openSource && seg.sources.includes(openSource) ? (
            <SourcePopover source={openSource} stuffId={stuffId} onSendCommand={onSendCommand} />
          ) : null}
        </React.Fragment>
      ))}
      {quiet.length > 0 ? (
        <Quiet data-testid="quiet-row">
          <Toggle
            type="button"
            data-testid="quiet-toggle"
            aria-expanded={quietOpen}
            onClick={() => setQuietOpen((v) => !v)}
          >
            {quiet.length} quiet interface{quiet.length === 1 ? "" : "s"} {quietOpen ? "▾" : "▸"}
          </Toggle>
          {quietOpen ? (
            <div>
              {quiet.map((m) => (
                <QuietChip key={m} title={m}>
                  {m}
                </QuietChip>
              ))}
            </div>
          ) : null}
        </Quiet>
      ) : null}
      {afforded.length > 0 && stuffId ? (
        <>
          <ActionLabel>What it affords</ActionLabel>
          <ChipRow data-testid="card-action-row">
            {afforded.map((v) => {
              const send = `${v.verb} #${stuffId}`;
              return (
                <ItemChip
                  key={v.verb}
                  type="button"
                  aria-label={send}
                  title={`Click to send: ${send}`}
                  onClick={() => onSendCommand(send)}
                  onMouseEnter={() => onCommandPreview?.(send)}
                  onMouseLeave={() => onCommandPreview?.(null)}
                >
                  {v.verb}
                </ItemChip>
              );
            })}
          </ChipRow>
        </>
      ) : null}
    </div>
  );
}
