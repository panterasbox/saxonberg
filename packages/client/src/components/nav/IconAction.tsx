/**
 * IconAction — an act as an icon button (owner, review: "icons that mean
 * look everywhere they show up"). The icon is the act's own name in the
 * icon vocabulary; its tooltip names the command; hover previews it in
 * the status bar; a click runs it.
 */

import React from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import { Icon } from "../ui/icons/Icon";
import { Tip } from "../tooltip/Tip";
import { commandDoc } from "../doc/docs";

const Btn = styled.button`
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid ${tokens.color.border};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
  cursor: pointer;
  &:hover {
    background: ${tokens.color.actionBgHover};
    color: ${tokens.color.accentHover};
  }
`;

export interface IconActionProps {
  icon: string;
  label: string;
  command: string;
  testid?: string;
  onRun: (command: string) => void;
  onPreview?: (command: string | null) => void;
}

export function IconAction(props: IconActionProps): React.ReactElement {
  return (
    <Tip tip={commandDoc(props.command, props.label)}>
      <Btn
        type="button"
        aria-label={props.command}
        {...(props.testid ? { "data-testid": props.testid } : {})}
        onClick={() => props.onRun(props.command)}
        onMouseEnter={() => props.onPreview?.(props.command)}
        onMouseLeave={() => props.onPreview?.(null)}
      >
        <Icon name={props.icon} label={props.label} size={14} decorative />
      </Btn>
    </Tip>
  );
}
