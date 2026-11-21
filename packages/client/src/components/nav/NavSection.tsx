/**
 * NavSection — one section of the navigation card (D7): a header row that
 * opens and folds, with the section's icon, its one-line summary, an
 * optional action (look) and a chevron that says which state it is in.
 * Its toggle is the player's (remembered in `nav.card`); when the player
 * has not set it, the card opens and folds it to fill the height (D8).
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import { Icon } from "../ui/icons/Icon";
import { ChangeMark } from "../cards/ChangeMark";

const Root = styled.section`
  border-top: 1px solid ${tokens.color.borderMuted};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.xs};
  min-height: 26px;
`;

const Head = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  font: inherit;
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
  background: transparent;
  border: none;
  padding: 4px 0;
  cursor: pointer;
  text-align: left;
  &:hover {
    color: ${tokens.color.accentHover};
  }
`;

const Summary = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Body = styled.div`
  padding: 2px 0 ${tokens.space.sm} 22px;
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
`;

export interface NavSectionProps {
  name: string;
  /** The one line shown when it is folded (and heading it when open). */
  summary: string;
  /** What heads it when OPEN, if the summary would repeat the body's rows. */
  title?: string;
  /** An icon-map name for the section. */
  icon?: string;
  /** A control that sits on the header row, outside the toggle (look). */
  action?: React.ReactNode;
  open: boolean;
  onToggle: (open: boolean) => void;
  /** Whether the player set it by hand (shown as a data attribute). */
  set?: boolean;
  /** The surface name for the change mark (`nav:<section>`). */
  surface?: string;
  bodyRef?: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}

export function NavSection(props: NavSectionProps): React.ReactElement {
  const body = (
    <Root
      data-testid={`nav-section-${props.name}`}
      data-open={props.open ? "true" : "false"}
      data-set={props.set ? "true" : undefined}
    >
      <Row>
        <Head
          type="button"
          data-testid={`nav-section-${props.name}-toggle`}
          aria-expanded={props.open}
          onClick={() => props.onToggle(!props.open)}
        >
          {props.icon ? <Icon name={props.icon} label={props.name} size={14} decorative color={tokens.color.fgDim} /> : null}
          <Summary data-testid={`nav-section-${props.name}-summary`}>{props.open && props.title ? props.title : props.summary}</Summary>
          <Icon name={props.open ? "ui.open" : "ui.closed"} label={props.open ? "fold" : "open"} size={14} decorative color={tokens.color.fgMuted} />
        </Head>
        {props.action}
      </Row>
      {props.open ? <Body ref={props.bodyRef}>{props.children}</Body> : null}
    </Root>
  );
  return props.surface ? <ChangeMark surface={props.surface}>{body}</ChangeMark> : body;
}
