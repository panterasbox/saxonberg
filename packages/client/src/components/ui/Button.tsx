/**
 * `<Button>` — shared button primitive with semantic variants.
 *
 * Variants encode the role the button plays in the UI, not its
 * pixel treatment. A theme can re-skin every `primary` button at
 * once (touch the variant rule, not every call site). All colors
 * come from `tokens`; no hex literals appear in component code.
 *
 * Variants in v1:
 *   - `primary`: prominent action (Refresh).
 *   - `action`:  secondary admin action (clone / reload / eval).
 *   - `ghost`:   minimal-chrome target used as a placeholder /
 *                paint-the-body call-to-action (the cleared-body
 *                affordance in the inspection card).
 *
 * The component returns a real `<button>` so keyboard, focus
 * outline, and a11y come from the platform.
 */

import React from "react";
import styled, { css } from "styled-components";
import { tokens } from "./tokens";

type Variant = "primary" | "action" | "ghost";

const primary = css`
  background: ${tokens.color.primary};
  color: ${tokens.color.onField};
  border: none;
  padding: ${tokens.space.sm} ${tokens.space.lg};
  font-size: ${tokens.font.small};

  &:hover {
    background: ${tokens.color.primaryHover};
  }
  &:active {
    background: ${tokens.color.primaryActive};
  }
`;

const action = css`
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.borderEmphasis};
  padding: ${tokens.space.sm} ${tokens.space.lg};
  font-size: ${tokens.font.micro};

  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const ghost = css`
  background: none;
  border: 1px dashed ${tokens.color.borderEmphasis};
  color: ${tokens.color.fgMuted};
  padding: ${tokens.space.lg};
  text-align: center;
  width: 100%;
  border-radius: ${tokens.radius.md};

  &:hover {
    background: ${tokens.color.surfaceAlt};
    color: ${tokens.color.fg};
    border-color: ${tokens.color.fgMuted};
  }
`;

const variantStyles: Record<Variant, ReturnType<typeof css>> = {
  primary,
  action,
  ghost,
};

const StyledButton = styled.button<{ $variant: Variant }>`
  font: inherit;
  cursor: pointer;
  ${({ $variant }) => variantStyles[$variant]}
`;

interface ButtonProps {
  variant: Variant;
  onClick: () => void;
  "aria-label"?: string;
  "data-testid"?: string;
  children: React.ReactNode;
  /**
   * The command this button will send when clicked. When provided
   * together with `onPreview`, mouseenter fires `onPreview(command)`
   * so the cockpit's command bar mirrors what's about to be sent;
   * mouseleave fires `onPreview(null)`. Buttons without a fixed
   * outgoing command (toggles, navigation) omit both.
   */
  command?: string;
  onPreview?: (command: string | null) => void;
}

export function Button({
  variant,
  onClick,
  children,
  command,
  onPreview,
  ...rest
}: ButtonProps): React.ReactElement {
  const previewEnabled = !!(onPreview && command);
  return (
    <StyledButton
      $variant={variant}
      onClick={onClick}
      onMouseEnter={
        previewEnabled ? () => onPreview!(command!) : undefined
      }
      onMouseLeave={
        previewEnabled ? () => onPreview!(null) : undefined
      }
      {...rest}
    >
      {children}
    </StyledButton>
  );
}
