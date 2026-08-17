/**
 * SettingsPanel — the first consumer of the summoned-card tier.
 *
 * Renders BESIDE the current layout's terminal (never a full-screen
 * modal, never blocking input — the no-modal rule, law 6). Every control
 * sends the REAL command (`settings set …` / `var set …` / the future
 * notification verbs) per command-bus primacy; there is no client-only
 * settings state. The card is purely a write-affordance surface — the
 * authoritative values live server-side and the command echo confirms.
 *
 * Two sections:
 *   - **Notifications** — consumes the (separately-built) notification-
 *     settings backend when present; degrades to a "coming soon"
 *     placeholder when it is absent (the case on this branch).
 *   - **Settings & variables** — a few common player-tunable settings as
 *     send-the-command controls, plus generic `settings set` / `var set`
 *     mini-forms (the `EnvironmentMixin` keyspace).
 *
 * Controls dispatch un-moded (no `barId`) — like any affordance click,
 * preview equals send.
 */

import React, { useState } from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import { PromptFormatBar } from "../PromptFormatBar";

const Card = styled.aside`
  display: flex;
  flex-direction: column;
  flex: none;
  width: 22rem;
  min-width: 18rem;
  border-left: 1px solid ${tokens.color.borderEmphasis};
  background: ${tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${tokens.space.md} ${tokens.space.xl};
  border-bottom: 1px solid ${tokens.color.border};
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${tokens.font.body};
  color: ${tokens.color.fgEmphasis};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${tokens.color.fgMuted};
  cursor: pointer;
  font-size: 1rem;
  &:hover {
    color: ${tokens.color.fg};
  }
`;

const Section = styled.section`
  padding: ${tokens.space.md} ${tokens.space.xl};
  border-bottom: 1px solid ${tokens.color.border};
`;

const SectionTitle = styled.h3`
  margin: 0 0 ${tokens.space.sm};
  font-size: ${tokens.font.small};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${tokens.color.fgMuted};
`;

const Placeholder = styled.div`
  color: ${tokens.color.fgMuted};
  font-style: italic;
  font-size: ${tokens.font.small};
`;

const Field = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${tokens.space.sm};
  padding: ${tokens.space.xs} 0;
  font-size: ${tokens.font.small};
`;

const Select = styled.select`
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  padding: 0.1rem 0.3rem;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
`;

const MiniForm = styled.form`
  display: flex;
  gap: ${tokens.space.xs};
  margin-top: ${tokens.space.sm};
`;

const TextInput = styled.input`
  flex: 1;
  min-width: 0;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  padding: 0.15rem 0.35rem;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
`;

const SubmitButton = styled.button`
  background: ${tokens.color.primary};
  color: ${tokens.color.onField};
  border: none;
  border-radius: ${tokens.radius.sm};
  padding: 0.15rem 0.6rem;
  cursor: pointer;
  font-size: ${tokens.font.small};
  &:hover {
    background: ${tokens.color.primaryHover};
  }
`;

/**
 * A curated set of player-tunable settings exposed as quick controls.
 * Each is a real `EnvironmentMixin` key; changing one sends
 * `settings set <key> <value>`. (Current values live server-side; the
 * control is a write-affordance, the echo confirms.)
 */
const QUICK_SETTINGS: Array<{
  key: string;
  label: string;
  options: string[];
}> = [
  {
    key: "social.react.intensity",
    label: "Reaction intensity",
    options: ["off", "subtle", "normal", "vivid"],
  },
  {
    key: "social.autoIntroduce",
    label: "Auto-introduce",
    options: ["true", "false"],
  },
  {
    key: "workspace.tree",
    label: "Shell tree",
    options: ["source", "template", "document"],
  },
];

interface SettingsPanelProps {
  /** Send a real command, un-moded (no barId). */
  onSendCommand: (text: string) => void;
  onClose: () => void;
  /**
   * Whether the notification-settings backend is present. False on this
   * branch (it lands separately on master), so the section degrades.
   */
  notificationsAvailable?: boolean;
}

/*
 * ⚠⚠ **Routing and the prompt format live HERE, not on the play
 * surface.**
 *
 * They shipped docked above the command input, which meant a player who
 * had just logged in was shown a bare word `routing` and a row of raw
 * Liquid (`{{ focus }} {{ posture }} {{ time }} {{ hp }}`) with nothing
 * saying what either was for. Neither is something you touch while
 * playing; both are settings, and the format bar was additionally
 * printing a prompt the command input already displays two inches
 * below it. Permanent screen space has to be earned.
 */
export function SettingsPanel({
  onSendCommand,
  onClose,
  notificationsAvailable = false,
}: SettingsPanelProps): JSX.Element {
  const [settingKey, setSettingKey] = useState("");
  const [settingValue, setSettingValue] = useState("");
  const [varName, setVarName] = useState("");
  const [varValue, setVarValue] = useState("");

  const submitSetting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingKey.trim() || !settingValue.trim()) return;
    onSendCommand(`settings set ${settingKey.trim()} ${settingValue.trim()}`);
    setSettingKey("");
    setSettingValue("");
  };

  const submitVar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!varName.trim() || !varValue.trim()) return;
    onSendCommand(`var set ${varName.trim()} ${varValue.trim()}`);
    setVarName("");
    setVarValue("");
  };

  return (
    <Card aria-label="Settings">
      <Header>
        <Title>Settings</Title>
        <CloseButton aria-label="Close settings" onClick={onClose}>
          ✕
        </CloseButton>
      </Header>

      {/*
        ⚠ The filter editor is NOT here. It lives on the play surface,
        opened by `+` (which has just created and activated the view you
        are about to edit) or by the `⋯` on your own active view. Here
        it would be a second entry point to the same editor, with no way
        to tell from this screen which view it was about to change —
        which is the confusion the whole pass was fixing.
      */}
      <Section>
        <SectionTitle>Prompt format</SectionTitle>
        <PromptFormatBar
          onSendCommand={onSendCommand}
          onCommandPreview={() => undefined}
        />
      </Section>

      {/*
        ⚠⚠ **The routing table is not here, because it no longer does
        anything you could see.**

        Its only observable effect was placing a frame into one of four
        feeds, and feeds are gone — every tab is a view over the whole
        buffer. A settings screen for rules that change nothing would be
        a control lying about its own effect, which is worse than a
        missing one.

        The rules themselves are retained (`DEFAULT_ROUTING`, the
        predicate vocabulary, `MessageApi.feedsFor` and its tests) as
        the substrate for notification policy — *which frames should
        ping you* is a real question that wants exactly this shape. The
        UI returns when there is something for it to drive.
      */}
      <Section>
        <SectionTitle>Notifications</SectionTitle>
        {notificationsAvailable ? (
          <Placeholder>Notification categories load here.</Placeholder>
        ) : (
          <Placeholder>Notification settings — coming soon.</Placeholder>
        )}
      </Section>

      <Section>
        <SectionTitle>Preferences</SectionTitle>
        {QUICK_SETTINGS.map((s) => (
          <Field key={s.key}>
            <span>{s.label}</span>
            <Select
              defaultValue=""
              aria-label={s.label}
              onChange={(e) => {
                if (!e.target.value) return;
                onSendCommand(`settings set ${s.key} ${e.target.value}`);
              }}
            >
              <option value="" disabled>
                set…
              </option>
              {s.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
        ))}
        <MiniForm onSubmit={submitSetting}>
          <TextInput
            placeholder="setting key"
            aria-label="setting key"
            value={settingKey}
            onChange={(e) => setSettingKey(e.target.value)}
          />
          <TextInput
            placeholder="value"
            aria-label="setting value"
            value={settingValue}
            onChange={(e) => setSettingValue(e.target.value)}
          />
          <SubmitButton type="submit">set</SubmitButton>
        </MiniForm>
      </Section>

      <Section>
        <SectionTitle>Session variables</SectionTitle>
        <MiniForm onSubmit={submitVar}>
          <TextInput
            placeholder="$name"
            aria-label="variable name"
            value={varName}
            onChange={(e) => setVarName(e.target.value)}
          />
          <TextInput
            placeholder="value"
            aria-label="variable value"
            value={varValue}
            onChange={(e) => setVarValue(e.target.value)}
          />
          <SubmitButton type="submit">set</SubmitButton>
        </MiniForm>
      </Section>
    </Card>
  );
}
