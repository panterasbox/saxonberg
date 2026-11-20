/**
 * NavSection — one section of the navigation card (D7): a summary line
 * that opens. Its toggle is the player's (remembered in `nav.card`); when
 * the player has not set it, the card opens and folds it to fill the
 * height (D8). The section's change mark is kept from the old navigator.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import { Tip } from "../tooltip/Tip";
import { ChangeMark } from "../cards/ChangeMark";
import { sectionDoc } from "../doc/docs";
import type { TooltipDoc } from "@saxonberg/types";

const Root = styled.section`
  border-top: 1px solid ${tokens.color.borderMuted};
  padding-top: ${tokens.space.xs};
`;

const Head = styled.button`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.xs};
  width: 100%;
  min-width: 0;
  font: inherit;
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgDim};
  background: transparent;
  border: none;
  padding: 2px 0;
  cursor: pointer;
  text-align: left;
`;

const Chevron = styled.span`
  flex: none;
  width: 0.8em;
  color: ${tokens.color.fgMuted};
`;

const Summary = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Body = styled.div`
  padding: ${tokens.space.xs} 0 ${tokens.space.sm};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
`;

export interface NavSectionProps {
  name: string;
  /** The one line shown when it is folded (and heading it when open). */
  summary: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  /** Whether the player set it by hand (shown as a data attribute). */
  set?: boolean;
  /** The surface name for the change mark (`nav:<section>`). */
  surface?: string;
  bodyRef?: (el: HTMLDivElement | null) => void;
  /** The summary's tooltip, when the section has its own document (the zone's). */
  tip?: TooltipDoc;
  children: React.ReactNode;
}

export function NavSection(props: NavSectionProps): React.ReactElement {
  const head = (
    <Head
      type="button"
      data-testid={`nav-section-${props.name}-toggle`}
      aria-expanded={props.open}
      onClick={() => props.onToggle(!props.open)}
    >
      <Chevron aria-hidden="true">{props.open ? "▾" : "▸"}</Chevron>
      <Summary data-testid={`nav-section-${props.name}-summary`}>{props.summary}</Summary>
    </Head>
  );
  const body = (
    <Root
      data-testid={`nav-section-${props.name}`}
      data-open={props.open ? "true" : "false"}
      data-set={props.set ? "true" : undefined}
    >
      <Tip tip={props.tip ?? sectionDoc(props.summary, props.open)}>
        {head}
      </Tip>
      {props.open ? <Body ref={props.bodyRef}>{props.children}</Body> : null}
    </Root>
  );
  return props.surface ? <ChangeMark surface={props.surface}>{body}</ChangeMark> : body;
}
