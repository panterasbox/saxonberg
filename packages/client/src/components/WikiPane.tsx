/**
 * WikiPane — the right-column cockpit pane for reading an article
 * (wiki build, client half).
 *
 * A pure render of what the server pushed: `wiki <page>` sends the
 * article's prose to the scroll on `system.shell.wiki` and its
 * structured twin on `world.wiki.page`, which lands in the store
 * (`wikiPage`, see `store/index.ts` + the handler in
 * `services/websocket.ts`). This pane reads it reactively.
 *
 * ⭐ **The body arrives already rendered and already GATED.** The pane
 * displays the exact MML string the terminal got — it does not render,
 * and it never sees an article source. That is not an optimisation: the
 * reveal model rests on there being ONE gate, on the server, and a pane
 * that rendered from source would be a second path along which
 * over-capability content could reach a client. Spoilers the reader may
 * not see are already absent from this payload; spoilers above their
 * appetite arrive as `<spoiler>` tags for `MmlRenderer` to collapse.
 *
 * Every affordance is a **command the pane composes and emits** — Edit,
 * History, Links, and each section's own edit — on the same bus as
 * every other clickable, previewing on hover per the global contract.
 * There is no private wiki channel from the client, so anything the
 * pane can do can also be typed, and the verb re-checks permission on
 * arrival regardless of what `mayEdit` let the pane draw.
 *
 * Rudimentary by decision, not omission: the requirements scope the
 * client to "read a page, follow a link, submit an edit". No live
 * preview of an in-flight draft — markdown is parsed server-side, so
 * that means a round trip per keystroke, and it belongs to the shared
 * viewer substrate in the client-shell slate rather than here.
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../store/index";
import { tokens } from "./ui";
import { MmlRenderer } from "./MmlRenderer";
import type { WikiSectionSummary } from "@saxonberg/types";

export interface WikiPaneProps {
  /** Outbound command sink — the same path `CommandBar.onSend` uses. */
  onSendCommand: (text: string) => void;
  /** Hover-preview a command in the command bar (`null` clears). */
  onCommandPreview?: (command: string | null) => void;
}

const PaneContainer = styled.aside`
  display: flex;
  flex-direction: column;
  width: 360px;
  min-width: 360px;
  max-width: 360px;
  height: 100%;
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  border-left: 1px solid ${tokens.color.border};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};
  overflow: hidden;
`;

const Header = styled.header`
  padding: ${tokens.space.md} ${tokens.space.lg};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surfaceAlt};
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-weight: 700;
  color: ${tokens.color.fgEmphasis};
  font-size: ${tokens.font.title};
  word-break: break-word;
`;

const Meta = styled.div`
  margin-top: ${tokens.space.xs};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
  word-break: break-word;
`;

/** The unsaved-preview marker. A preview that looked saved would lie. */
const PreviewFlag = styled.span`
  display: inline-block;
  margin-right: ${tokens.space.sm};
  padding: 0 ${tokens.space.sm};
  border: 1px solid ${tokens.color.warning};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.warning};
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
  margin-top: ${tokens.space.md};
`;

const Action = styled.button`
  background: transparent;
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: ${tokens.font.small};
  padding: 0.1rem 0.5rem;

  &:hover {
    background: ${tokens.color.actionBg};
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${tokens.space.md} ${tokens.space.lg};
`;

const Empty = styled.p`
  color: ${tokens.color.fgMuted};
  font-style: italic;
  font-size: ${tokens.font.small};
  margin: ${tokens.space.md} 0;
`;

const Section = styled.section`
  margin-bottom: ${tokens.space.lg};
`;

const SectionLabel = styled.h3`
  margin: 0 0 ${tokens.space.sm};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.micro};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
`;

const Chip = styled.span`
  padding: 0 ${tokens.space.sm};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.micro};
`;

/** An outline row — indented by heading level, editable in place. */
const OutlineRow = styled.button<{ $level: 1 | 2 | 3 }>`
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgMuted};
  cursor: pointer;
  font: inherit;
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  padding-left: ${(p) => `calc(${tokens.space.sm} * ${p.$level})`};

  &:hover {
    background: ${tokens.color.actionBg};
    color: ${tokens.color.fg};
  }
`;

const LinkRow = styled(OutlineRow)`
  color: ${tokens.color.accent};
  padding-left: ${tokens.space.sm};
`;

/**
 * The props that make a button issue `command` on click and preview it
 * on hover — the global "every clickable previews its command"
 * contract, which the pane obeys for its own affordances as well as
 * for the clickables inside the rendered body.
 *
 * A plain function, deliberately not named `use…`: it holds no state
 * and is called inside `.map()`, where a hook would be a rules-of
 * -hooks violation.
 */
interface CommandProps {
  title: string;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function commandProps(
  command: string,
  onSendCommand: (text: string) => void,
  onCommandPreview?: (command: string | null) => void,
): CommandProps {
  return {
    title: `Click to send: ${command}`,
    onClick: () => onSendCommand(command),
    ...(onCommandPreview
      ? {
          onMouseEnter: () => onCommandPreview(command),
          onMouseLeave: () => onCommandPreview(null),
        }
      : {}),
  };
}

function ActionButton({
  label,
  command,
  onSendCommand,
  onCommandPreview,
}: {
  label: string;
  command: string;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  return (
    <Action {...commandProps(command, onSendCommand, onCommandPreview)}>
      {label}
    </Action>
  );
}

function OutlineItem({
  section,
  handle,
  editable,
  onSendCommand,
  onCommandPreview,
}: {
  section: WikiSectionSummary;
  handle: string;
  editable: boolean;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  // ⭐ A section edit, not a jump. Section editing is the wiki's real
  // concurrency control — two people in different sections never
  // collide — so the outline's most useful click is the one that opens
  // one. Readers who only want to look already have the whole body
  // right below. Without the right, it re-reads the page.
  const command = editable
    ? `wiki edit ${handle} --section ${section.anchor}`
    : `wiki ${handle}`;
  return (
    <OutlineRow
      $level={section.level}
      {...commandProps(command, onSendCommand, onCommandPreview)}
    >
      {section.title}
    </OutlineRow>
  );
}

export function WikiPane({
  onSendCommand,
  onCommandPreview,
}: WikiPaneProps): React.ReactElement {
  const page = useStore((s) => s.wikiPage);

  if (!page) {
    return (
      <PaneContainer aria-label="Wiki">
        <Header>
          <HeaderTitle>Wiki</HeaderTitle>
        </Header>
        <Body>
          <Empty>
            Nothing open. Type <code>wiki saxonberg</code> for the front door,
            or <code>wiki wanted</code> for what nobody has written yet.
          </Empty>
        </Body>
      </PaneContainer>
    );
  }

  const when = new Date(page.updatedAt);
  return (
    <PaneContainer aria-label="Wiki">
      <Header>
        <HeaderTitle>{page.title}</HeaderTitle>
        <Meta>
          {page.preview && <PreviewFlag>unsaved preview</PreviewFlag>}
          {page.handle} · rev {page.rev} · {page.updatedBy} ·{" "}
          {when.toLocaleDateString()}
        </Meta>
        <Actions>
          {page.mayEdit && (
            <ActionButton
              label="Edit"
              command={`wiki edit ${page.handle}`}
              onSendCommand={onSendCommand}
              onCommandPreview={onCommandPreview}
            />
          )}
          <ActionButton
            label="History"
            command={`wiki history ${page.handle}`}
            onSendCommand={onSendCommand}
            onCommandPreview={onCommandPreview}
          />
          <ActionButton
            label="What links here"
            command={`wiki links ${page.handle}`}
            onSendCommand={onSendCommand}
            onCommandPreview={onCommandPreview}
          />
        </Actions>
      </Header>
      <Body>
        {page.sections.length > 0 && (
          <Section>
            <SectionLabel>Contents</SectionLabel>
            {page.sections.map((s) => (
              <OutlineItem
                key={s.anchor}
                section={s}
                handle={page.handle}
                editable={page.mayEdit}
                onSendCommand={onSendCommand}
                onCommandPreview={onCommandPreview}
              />
            ))}
          </Section>
        )}
        <Section>
          <MmlRenderer
            text={page.body}
            onCommandClick={onSendCommand}
            onCommandPreview={onCommandPreview ?? (() => undefined)}
          />
        </Section>
        {page.subject && (
          <Section>
            <SectionLabel>Documents</SectionLabel>
            <Chips>
              <Chip>
                {page.subject.kind}: {page.subject.ref}
              </Chip>
            </Chips>
          </Section>
        )}
        {page.tags.length > 0 && (
          <Section>
            <SectionLabel>Tags</SectionLabel>
            <Chips>
              {page.tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </Chips>
          </Section>
        )}
        {page.related.length > 0 && (
          <Section>
            <SectionLabel>See also</SectionLabel>
            {page.related.map((r) => (
              <LinkRow
                key={r}
                $level={1}
                {...commandProps(
                  `wiki ${r}`,
                  onSendCommand,
                  onCommandPreview,
                )}
              >
                {r}
              </LinkRow>
            ))}
          </Section>
        )}
      </Body>
    </PaneContainer>
  );
}
