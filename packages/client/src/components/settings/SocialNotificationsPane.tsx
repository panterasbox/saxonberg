/**
 * SocialNotificationsPane — the "Social / Notifications" settings pane, a
 * thin front over the `notify` verb (social-graph Wave 3). Opened from the
 * account menu; renders the viewer's effective ordered rule list (top =
 * highest precedence) as rows, each with a color swatch row, a
 * name-rendering control, a boost toggle, and connect / disconnect /
 * message surface controls, plus an "add group" input and a global
 * `social.verbosity` control.
 *
 * The pane is a **read-only cache + command issuer**: it reads the
 * server-pushed `clientState['social.rules']` projection reactively and
 * NEVER writes the rule store directly. Every control follows the global
 * "buttons preview their command" contract — hovering previews the
 * equivalent `notify …` in the command bar (`onCommandPreview`), and
 * committing issues it down the same path the command bar uses
 * (`onCommandClick`). The server re-pushes a fresh projection after each
 * mutation, so the list reconciles itself; the store stays the single
 * source of truth.
 *
 * Reorder is up/down buttons (drag is fiddly in this stack and adds a dep;
 * order = precedence either way): "up" issues `notify <ref> --above
 * <prev>`, "down" issues `notify <ref> --below <next>`.
 */

import React, { useEffect } from "react";
import styled from "styled-components";
import { useStore } from "../../store/index";
import { tokens } from "../ui";
import type { SocialRuleProjection, SocialRulesState } from "@saxonberg/types";

const NAME_RENDERINGS = [
  "name",
  "feature-string",
  "count-only",
  "hidden",
] as const;
const CONNECT_SURFACES = ["banner", "log-only", "silent"] as const;
const MESSAGE_SURFACES = ["full", "summary", "silent"] as const;
const PALETTE_TOKENS = [
  "amber",
  "teal",
  "rose",
  "slate",
  "violet",
  "emerald",
  "sky",
  "neutral",
] as const;
const VERBOSITY = ["minimal", "standard", "verbose"] as const;

export interface SocialNotificationsPaneProps {
  onClose: () => void;
  /** Silent command issue (used to request the projection on mount). */
  onSendCommand: (text: string) => void;
  /** Hover-preview a command in the command bar (`null` clears). */
  onCommandPreview: (command: string | null) => void;
  /** Commit a command (preview-flash + send) — the command-bar path. */
  onCommandClick: (command: string) => void;
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 60;
  padding: ${tokens.space.xl};
  overflow: auto;
`;

const Panel = styled.div`
  width: min(48rem, 100%);
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${tokens.space.md} ${tokens.space.lg};
  border-bottom: 1px solid ${tokens.color.borderMuted};
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${tokens.font.title};
  font-weight: 600;
`;

const Close = styled.button`
  background: none;
  border: none;
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.body};
  cursor: pointer;
  padding: 0 ${tokens.space.sm};
  &:hover {
    color: ${tokens.color.fg};
  }
`;

const Body = styled.div`
  padding: ${tokens.space.md} ${tokens.space.lg};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.md};
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.md};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.md};
  background: ${tokens.color.surfaceAlt};
`;

const RowHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
`;

const RuleLabel = styled.span`
  font-weight: 600;
`;

const RefSub = styled.span`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.micro};
`;

const ReservedTag = styled.span`
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.micro};
  font-style: italic;
`;

const Spacer = styled.span`
  flex: 1;
`;

const Field = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  flex-wrap: wrap;
`;

const FieldLabel = styled.span`
  color: ${tokens.color.fgMuted};
  min-width: 5.5rem;
`;

const Btn = styled.button<{ $active?: boolean }>`
  background: ${(p) =>
    p.$active ? tokens.color.actionBgHover : "transparent"};
  border: 1px solid
    ${(p) => (p.$active ? tokens.color.borderEmphasis : tokens.color.borderMuted)};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fg};
  font-family: inherit;
  font-size: ${tokens.font.micro};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  cursor: pointer;
  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const Swatch = styled.button<{ $color: string; $active?: boolean }>`
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 50%;
  background: ${(p) => p.$color};
  border: 2px solid
    ${(p) => (p.$active ? tokens.color.fg : "transparent")};
  cursor: pointer;
  padding: 0;
`;

const AddBlock = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding-top: ${tokens.space.sm};
  border-top: 1px solid ${tokens.color.borderMuted};
`;

const AddInput = styled.input`
  flex: 1;
  background: ${tokens.color.surfaceMuted};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fg};
  font-family: inherit;
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.sm};
`;

const Global = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
  padding-top: ${tokens.space.sm};
  border-top: 1px solid ${tokens.color.borderMuted};
`;

function paletteColor(token: string): string {
  return tokens.palette[token] ?? tokens.palette.neutral!;
}

export const SocialNotificationsPane: React.FC<
  SocialNotificationsPaneProps
> = ({ onClose, onSendCommand, onCommandPreview, onCommandClick }) => {
  const state = useStore(
    (s) => s.clientState["social.rules"] as SocialRulesState | undefined,
  );
  const rules: SocialRuleProjection[] = state?.rules ?? [];
  const [addRef, setAddRef] = React.useState("");

  // Request the current projection on first open: the server pushes
  // `social.rules` on any `notify` invocation, and a bare `notify` is the
  // read. Issued only when no projection is cached yet (re-opens reuse the
  // cache; mutations refresh it on their own push).
  useEffect(() => {
    if (!state) onSendCommand("notify");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A button wired to the global "preview on hover, issue on commit"
  // contract. `data-testid` is the command itself — unique + assertable.
  const cmdButton = (
    command: string,
    label: string,
    active: boolean,
    key?: string,
  ): React.ReactElement => (
    <Btn
      key={key ?? command}
      $active={active}
      data-testid={command}
      onMouseEnter={() => onCommandPreview(command)}
      onMouseLeave={() => onCommandPreview(null)}
      onClick={() => onCommandClick(command)}
    >
      {label}
    </Btn>
  );

  const optionRow = (
    rule: SocialRuleProjection,
    fieldLabel: string,
    key: string,
    options: readonly string[],
    current: string,
  ): React.ReactElement => (
    <Field>
      <FieldLabel>{fieldLabel}</FieldLabel>
      {options.map((opt) =>
        cmdButton(
          `notify ${rule.groupRef} ${key}=${opt}`,
          opt,
          current === opt,
          `${key}-${opt}`,
        ),
      )}
    </Field>
  );

  const submitAdd = (): void => {
    const ref = addRef.trim();
    if (!ref) return;
    // Any field assignment materializes the rule with defaults; `render=
    // name` is the custom default, so this is a default-preserving create.
    onCommandClick(`notify ${ref} render=name`);
    setAddRef("");
  };

  return (
    <Backdrop
      data-testid="social-pane"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Panel>
        <Header>
          <Title>Social / Notifications</Title>
          <Close aria-label="Close" onClick={onClose}>
            ×
          </Close>
        </Header>
        <Body>
          {rules.length === 0 && <RefSub>Loading rules…</RefSub>}
          {rules.map((rule, i) => (
            <Row data-testid={`rule-${rule.groupRef}`} key={rule.groupRef}>
              <RowHead>
                {cmdButton(
                  `notify ${rule.groupRef} --above ${rules[i - 1]?.groupRef ?? ""}`,
                  "▲",
                  false,
                  `up-${rule.groupRef}`,
                )}
                {cmdButton(
                  `notify ${rule.groupRef} --below ${rules[i + 1]?.groupRef ?? ""}`,
                  "▼",
                  false,
                  `down-${rule.groupRef}`,
                )}
                <RuleLabel>{rule.label}</RuleLabel>
                {rule.label !== rule.groupRef && (
                  <RefSub>{rule.groupRef}</RefSub>
                )}
                {rule.reserved && <ReservedTag>(default)</ReservedTag>}
                <Spacer />
                {cmdButton(
                  `notify ${rule.groupRef} remove`,
                  "remove",
                  false,
                  `remove-${rule.groupRef}`,
                )}
              </RowHead>

              <Field>
                <FieldLabel>color</FieldLabel>
                {PALETTE_TOKENS.map((tok) => (
                  <Swatch
                    key={tok}
                    $color={paletteColor(tok)}
                    $active={rule.color === tok}
                    data-testid={`notify ${rule.groupRef} color=${tok}`}
                    aria-label={`color ${tok}`}
                    onMouseEnter={() =>
                      onCommandPreview(`notify ${rule.groupRef} color=${tok}`)
                    }
                    onMouseLeave={() => onCommandPreview(null)}
                    onClick={() =>
                      onCommandClick(`notify ${rule.groupRef} color=${tok}`)
                    }
                  />
                ))}
              </Field>

              {optionRow(
                rule,
                "render",
                "render",
                NAME_RENDERINGS,
                rule.nameRendering,
              )}

              <Field>
                <FieldLabel>boost</FieldLabel>
                {cmdButton(
                  `notify ${rule.groupRef} boost=on`,
                  "on",
                  rule.boostInDense,
                  `boost-on`,
                )}
                {cmdButton(
                  `notify ${rule.groupRef} boost=off`,
                  "off",
                  !rule.boostInDense,
                  `boost-off`,
                )}
              </Field>

              {optionRow(
                rule,
                "connect",
                "login",
                CONNECT_SURFACES,
                rule.onConnect,
              )}
              {optionRow(
                rule,
                "disconnect",
                "disconnect",
                CONNECT_SURFACES,
                rule.onDisconnect,
              )}
              {optionRow(
                rule,
                "message",
                "message",
                MESSAGE_SURFACES,
                rule.onMessage,
              )}
            </Row>
          ))}

          <AddBlock>
            <FieldLabel>add group</FieldLabel>
            <AddInput
              data-testid="social-add-input"
              placeholder="contacts label, managed:guild, …"
              value={addRef}
              onChange={(e) => setAddRef(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAdd();
              }}
            />
            <Btn
              data-testid="social-add-button"
              onMouseEnter={() =>
                addRef.trim() &&
                onCommandPreview(`notify ${addRef.trim()} render=name`)
              }
              onMouseLeave={() => onCommandPreview(null)}
              onClick={submitAdd}
            >
              add
            </Btn>
          </AddBlock>

          <Global>
            <FieldLabel>verbosity</FieldLabel>
            {VERBOSITY.map((v) =>
              cmdButton(
                `settings set social.verbosity ${v}`,
                v,
                false,
                `verbosity-${v}`,
              ),
            )}
          </Global>
        </Body>
      </Panel>
    </Backdrop>
  );
};
