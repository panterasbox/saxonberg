/**
 * The document blocks — what a tooltip and a card SAY (tooltips D2).
 *
 * ⭐⭐ Two containers, one content. A card and a tooltip about the same
 * subject render the same header, the same fact rows and the same spoiler
 * block, from the same props. These blocks belong to neither container:
 * `cards/` and `tooltip/` both import this module and neither imports the
 * other. Nothing here knows whether it is inside a card or a tooltip.
 */

import React from "react";
import styled from "styled-components";
import type {
  TooltipDoc,
  TooltipFact,
  TooltipHeader,
  TooltipSpoiler,
} from "@saxonberg/types";
import { Icon, tokens } from "../ui";
import { mediaUrl } from "../../config";
import { useStore } from "../../store/index";
import { MmlRenderer } from "../MmlRenderer";
import { zoneView } from "../../store/navSelectors";
import { ZoneMap } from "../nav/ZoneMap";

// ── The spoiler appetite ────────────────────────────────────────────────

/**
 * The reader's spoiler appetite (0–3), mirrored from the server's
 * `spoiler.appetite` setting (tooltips D5). Absent → 0, the setting's own
 * default: everything above the open level arrives collapsed.
 */
export function useAppetite(): number {
  return useStore((s) => {
    const v = s.clientState["spoiler.appetite"];
    return typeof v === "number" ? v : 0;
  });
}

/**
 * ⭐ The one spoiler rule, for every spoiler the client draws (the tooltip
 * block, the terminal's `<spoiler>` span): open iff `level <= appetite`,
 * else collapsed until clicked — that occurrence only.
 */
export function useSpoilerOpen(level: number): [open: boolean, reveal: () => void] {
  const appetite = useAppetite();
  const [opened, setOpened] = React.useState(false);
  return [opened || level <= appetite, () => setOpened(true)];
}

// ── Header ──────────────────────────────────────────────────────────────

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  min-width: 0;
`;

const HeadName = styled.span`
  font-weight: 600;
  color: ${tokens.color.fg};
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HeadKind = styled.span`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.micro};
  margin-left: auto;
  white-space: nowrap;
`;

/**
 * Icon · name · what kind of thing. The icon is decorative — the name
 * beside it is the word (iconography-slate § 4.3).
 */
export function DocHeader({
  header,
  showKindWord = true,
}: {
  header: TooltipHeader;
  showKindWord?: boolean;
}): React.ReactElement {
  const icon = header.icon ?? (header.kind ? `kind.${header.kind}` : undefined);
  return (
    <Head data-testid="doc-header">
      {icon ? (
        <Icon
          name={icon}
          label={header.kindWord ?? header.name}
          decorative
          size={16}
          {...(header.kind ? { color: tokens.kind[header.kind] } : {})}
        />
      ) : null}
      <HeadName data-testid="doc-name">{header.name}</HeadName>
      {showKindWord && header.kindWord ? <HeadKind>{header.kindWord}</HeadKind> : null}
    </Head>
  );
}

// ── Fact rows ───────────────────────────────────────────────────────────

const FactTable = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px ${tokens.space.md};
  margin: 0;
  font-size: ${tokens.font.small};
`;

const FactLabel = styled.dt`
  color: ${tokens.color.fgMuted};
`;

const FactValue = styled.dd`
  margin: 0;
  color: ${tokens.color.fg};
  min-width: 0;
  overflow-wrap: anywhere;
`;

const FactSource = styled.span`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.micro};
  margin-left: ${tokens.space.sm};
`;

/** How a fact's source reads beside it. */
const SOURCE_WORD: Record<TooltipFact["source"], string> = {
  seen: "seen",
  help: "from help",
  wiki: "from the wiki",
  client: "",
  // Your map's channels (navigation card D12).
  walked: "walked",
  searched: "found by searching",
  published: "from a published map",
  charted: "from a chart",
  told: "told",
};

function sourceLine(f: TooltipFact): string {
  const word = SOURCE_WORD[f.source];
  if (f.at === undefined || f.source === "client") return word;
  return `${word} ${new Date(f.at).toLocaleTimeString()}`.trim();
}

/** Each fact with where it came from and when (requirements § contents). */
export function FactRows({ facts }: { facts: readonly TooltipFact[] }): React.ReactElement | null {
  if (facts.length === 0) return null;
  return (
    <FactTable data-testid="doc-facts">
      {facts.map((f) => (
        <React.Fragment key={`${f.label}:${f.value}`}>
          <FactLabel>
            {f.icon ? <Icon name={f.icon} label={f.label} size={12} decorative style={{ marginRight: 4, verticalAlign: "-2px" }} /> : null}
            {f.label}
          </FactLabel>
          <FactValue>
            {f.value}
            {sourceLine(f) ? <FactSource>{sourceLine(f)}</FactSource> : null}
          </FactValue>
        </React.Fragment>
      ))}
    </FactTable>
  );
}

// ── Prose ───────────────────────────────────────────────────────────────

const ProseBox = styled.div`
  color: ${tokens.color.fg};
  line-height: 1.45;
  overflow-wrap: anywhere;
`;

export interface DocLinkHandlers {
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}

/** MML prose — carries identity and term links. */
export function DocProse({
  prose,
  onCommandClick,
  onCommandPreview,
}: { prose: string } & DocLinkHandlers): React.ReactElement {
  return (
    <ProseBox data-testid="doc-prose">
      <MmlRenderer text={prose} onCommandClick={onCommandClick} onCommandPreview={onCommandPreview} inDoc />
    </ProseBox>
  );
}

// ── Image ───────────────────────────────────────────────────────────────

const Thumb = styled.img`
  display: block;
  max-width: 96px;
  max-height: 96px;
  object-fit: contain;
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.paper};
`;

/** An illustration or portrait thumbnail — at most 96px, never cropped. */
export function DocImage({ image }: { image: NonNullable<TooltipDoc["image"]> }): React.ReactElement {
  return <Thumb data-testid="doc-image" src={mediaUrl(image.key)} alt="" loading="lazy" />;
}

// ── The one spoiler block ───────────────────────────────────────────────

const SpoilerShut = styled.button`
  all: unset;
  cursor: pointer;
  color: ${tokens.color.fgDim};
  font-size: ${tokens.font.small};
  border-bottom: 1px dotted ${tokens.color.border};
  &:focus-visible {
    outline: 1px solid ${tokens.color.accent};
  }
`;

const SpoilerOpen = styled.div`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgDim};
  & code {
    font-family: ${tokens.font.mono};
    color: ${tokens.color.fg};
    overflow-wrap: anywhere;
  }
`;

/**
 * ⭐ The one spoiler block, everywhere (spoiler-slate § Paths are a
 * spoiler). Open iff `level <= appetite`; otherwise collapsed under its
 * label, one click opens it — for this showing only. Hidden by default,
 * one click, never prevented.
 */
export function SpoilerBlock({ spoiler }: { spoiler: TooltipSpoiler }): React.ReactElement {
  const [open, setOpened] = useSpoilerOpen(spoiler.level);
  return open ? (
    <SpoilerOpen data-testid="doc-spoiler" data-spoiler-level={spoiler.level} data-open="true">
      {/[?!.:]$/.test(spoiler.label) ? spoiler.label : `${spoiler.label}:`} <code>{spoiler.text}</code>
    </SpoilerOpen>
  ) : (
    <SpoilerShut
      type="button"
      data-testid="doc-spoiler"
      data-spoiler-level={spoiler.level}
      data-open="false"
      onClick={(e) => {
        e.stopPropagation();
        setOpened();
      }}
    >
      {spoiler.label}
    </SpoilerShut>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────

const Foot = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${tokens.space.sm};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.micro};
`;

/** The boxed command — what a click runs. */
export const CommandBox = styled.code`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  padding: 0 ${tokens.space.xs};
`;

/** What a click does: the command it runs, and any hint. */
export function HintFooter({ doc }: { doc: TooltipDoc }): React.ReactElement | null {
  if (!doc.command && !doc.hint) return null;
  return (
    <Foot data-testid="doc-hint">
      {doc.command ? (
        <>
          <span>click runs</span>
          <CommandBox data-testid="doc-command">{doc.command}</CommandBox>
        </>
      ) : null}
      {doc.hint ? <span>{doc.hint}</span> : null}
    </Foot>
  );
}

// ── The whole document ──────────────────────────────────────────────────

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
`;

const Row = styled.div`
  display: flex;
  gap: ${tokens.space.md};
  align-items: flex-start;
`;

const Miss = styled.div`
  color: ${tokens.color.fgDim};
  font-style: italic;
`;

/** Every block of a document, in the requirements' order. */
export function DocView({ doc, ...links }: { doc: TooltipDoc } & DocLinkHandlers): React.ReactElement {
  return (
    <Body data-testid="doc-view">
      {doc.header ? <DocHeader header={doc.header} /> : null}
      {doc.miss ? <Miss data-testid="doc-miss">{doc.miss}</Miss> : null}
      {doc.prose || doc.image ? (
        <Row>
          {doc.image ? <DocImage image={doc.image} /> : null}
          {doc.prose ? <DocProse prose={doc.prose} {...links} /> : null}
        </Row>
      ) : null}
      {doc.facts?.length ? <FactRows facts={doc.facts} /> : null}
      {doc.zoneThumb ? <ZoneThumb thumb={doc.zoneThumb} /> : null}
      {doc.spoilers?.map((sp) => <SpoilerBlock key={`${sp.level}:${sp.label}`} spoiler={sp} />)}
      <HintFooter doc={doc} />
    </Body>
  );
}

/**
 * ⭐ A small map of a zone you know (navigation card D12): the same
 * renderer as the card's map, at *whole zone*, with no handlers — drawn
 * from your own copy. Absent when your map holds nothing placed there.
 */
export function ZoneThumb({ thumb }: { thumb: NonNullable<TooltipDoc["zoneThumb"]> }): React.ReactElement | null {
  const mapCopy = useStore((s) => s.mapCopy);
  const view = React.useMemo(() => zoneView(mapCopy, thumb.zone), [mapCopy, thumb.zone]);
  if (!view.places.some((p) => p.level === thumb.level)) return null;
  return (
    <div data-testid="doc-zone-thumb">
      <ZoneMap view={view} level={thumb.level} thumbnail />
    </div>
  );
}
