/**
 * StreamControls — the `stream` card's body (broadcast-ready D10, W4).
 *
 * ⭐ Every control is a real `stream …` command sent through the ordinary
 * bus, and every one previews the command it sends — the card owns no
 * state of its own. What it shows is the `stream.state` client-state key
 * the server pushes: the streamer's show (phase, reason, timers, topic,
 * agenda, rotation) plus streamer-only extras (the reason rows for the
 * picker; viewer counts, uptime, chat rate, who is online by name).
 *
 * Replaces the dead StreamerDeck scaffold: its moderation / rewards /
 * penalties chips are gone deliberately — no slate builds those verbs.
 */

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { tokens } from "../ui";
import { useStore } from "../../store";
import type { StreamShowCore, StreamReason } from "@saxonberg/types";

/** A reason row as the picker reads it (the extras carry its default). */
interface PickerReason extends StreamReason {
  defaultDurationMs: number | null;
}

/** The streamer's own numbers (D16) — present only while on air. */
interface StreamNumbers {
  viewers?: { twitch?: number | null; youtube?: number | null };
  startedAt?: number | null;
  chatRate?: number | null;
  online?: string[];
}

/** What `stream.state` carries: the show plus the streamer-only extras. */
export type StreamCardState = StreamShowCore & {
  reasons?: PickerReason[];
} & StreamNumbers;

/** The panel keys the rotation can pin or skip (the shipped rows). */
const ROTATION_KEYS = ["join", "world", "what", "fact", "money", "community", "compact", "about", "gitlab", "wiki"];

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.md};
  padding: ${tokens.space.md};
  font-size: ${tokens.font.small};
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${tokens.space.sm};
`;

const Heading = styled.div`
  font-weight: 600;
  color: ${tokens.color.fgEmphasis};
`;

const Muted = styled.span`
  color: ${tokens.color.fgMuted};
`;

const Phase = styled.span<{ $onAir: boolean }>`
  font-family: ${tokens.font.mono};
  font-weight: 700;
  color: ${(p) => (p.$onAir ? tokens.color.danger : tokens.color.fgMuted)};
`;

const Chip = styled.button`
  padding: 0.2rem 0.6rem;
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  font: inherit;
  cursor: pointer;

  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

const Field = styled.input`
  flex: 1;
  min-width: 8rem;
  font: inherit;
  padding: 0.2rem 0.4rem;
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
`;

const Agenda = styled.ol`
  margin: 0;
  padding-left: 1.4rem;
`;

/** `m:ss` (or `h:mm:ss`) until `target`, never negative. */
function countdown(target: number, now: number): string {
  const s = Math.max(0, Math.round((target - now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** A spoken duration the server's grammar reads back (`5m`, `90s`). */
function durationWord(ms: number): string {
  const s = Math.round(ms / 1000);
  return s % 60 === 0 ? `${s / 60}m` : `${s}s`;
}

export function StreamControls({
  onSendCommand,
  onCommandPreview,
}: {
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  const state = useStore(
    (s) => (s.clientState["stream.state"] as StreamCardState | null | undefined) ?? null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [topic, setTopic] = useState("");
  const [agenda, setAgenda] = useState("");

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  /** A control: previews on hover and focus, sends on click. */
  const control = (label: string, command: string, testId?: string): React.ReactElement => (
    <Chip
      key={command}
      data-testid={testId}
      data-command={command}
      title={command}
      onMouseEnter={() => onCommandPreview?.(command)}
      onFocus={() => onCommandPreview?.(command)}
      onMouseLeave={() => onCommandPreview?.(null)}
      onBlur={() => onCommandPreview?.(null)}
      onClick={() => onSendCommand(command)}
    >
      {label}
    </Chip>
  );

  if (!state) {
    return (
      <Body data-testid="stream-controls">
        <Muted>The stream controls load from the game.</Muted>
        <Row>{control("Load", "stream", "stream-load")}</Row>
      </Body>
    );
  }

  const onAir = state.phase === "starting" || state.phase === "live" || state.phase === "ending";
  const timer =
    state.phase === "standby" && state.awayUntil !== null
      ? `back in ${countdown(state.awayUntil, now)}`
      : state.phase === "starting" && state.startsAt !== null
        ? `starting in ${countdown(state.startsAt, now)}`
        : state.phase === "ending" && state.endsAt !== null
          ? `offline in ${countdown(state.endsAt, now)}`
          : null;
  const reasons = state.reasons ?? [];
  const rotationNote = [
    state.rotation.pinned ? `pinned: ${state.rotation.pinned}` : null,
    state.rotation.skip.length > 0 ? `skipping: ${state.rotation.skip.join(", ")}` : null,
  ]
    .filter((x): x is string => x !== null)
    .join(" · ");

  return (
    <Body data-testid="stream-controls" data-phase={state.phase}>
      <Row>
        <Phase $onAir={onAir} data-testid="stream-phase">
          {onAir ? "● " : ""}
          {state.phase.toUpperCase()}
        </Phase>
        {state.reason && <span>{state.reason.label}</span>}
        {timer && <Muted data-testid="stream-timer">{timer}</Muted>}
      </Row>

      <Row>
        {state.phase === "offline" && control("Start", "stream start in 5m", "stream-start")}
        {(state.phase === "starting" || state.phase === "standby") &&
          control(state.phase === "standby" ? "Back" : "Go live", state.phase === "standby" ? "stream back" : "stream live", "stream-live")}
        {(state.phase === "starting" || state.phase === "live" || state.phase === "standby") &&
          control("End", "stream end", "stream-end")}
        {state.phase !== "offline" && control("Off", "stream off", "stream-off")}
      </Row>

      {state.phase !== "ending" && (
        <div>
          <Heading>Away</Heading>
          <Row>
            {reasons.length === 0
              ? control("Away 15m", "stream away 15m")
              : reasons.map((r) =>
                  control(
                    r.privacy
                      ? `${r.label} (no timer)`
                      : r.defaultDurationMs
                        ? `${r.label} ${durationWord(r.defaultDurationMs)}`
                        : r.label,
                    `stream away ${r.key}`,
                    `stream-away-${r.key}`,
                  ),
                )}
          </Row>
        </div>
      )}

      <div>
        <Heading>Topic</Heading>
        <Row>
          <span data-testid="stream-topic">{state.topic ?? <Muted>none</Muted>}</span>
        </Row>
        <Row>
          <Field
            aria-label="topic"
            value={topic}
            placeholder="the glass trade"
            onChange={(e) => setTopic(e.target.value)}
          />
          {topic.trim() !== "" && control("Set", `stream segment ${topic.trim()}`)}
        </Row>
      </div>

      <div>
        <Heading>Agenda</Heading>
        {state.agenda.length > 0 ? (
          <Agenda data-testid="stream-agenda">
            {state.agenda.map((a, i) => (
              <li key={`${i}-${a.title}`} style={{ opacity: a.done ? 0.5 : 1 }}>
                {i === state.current ? <strong>{a.title}</strong> : a.title}
                {a.done ? " ✓" : ""}
              </li>
            ))}
          </Agenda>
        ) : (
          <Muted>none</Muted>
        )}
        <Row>
          {state.agenda.length > 0 && control("Next", "stream next", "stream-next")}
          {state.agenda.length > 0 && control("Clear", "stream agenda clear")}
        </Row>
        <Row>
          <Field
            aria-label="agenda"
            value={agenda}
            placeholder="glass, paper, Q&A"
            onChange={(e) => setAgenda(e.target.value)}
          />
          {agenda.trim() !== "" && control("Set", `stream agenda ${agenda.trim()}`)}
        </Row>
      </div>

      <div>
        <Heading>Lower third</Heading>
        {rotationNote && <Muted>{rotationNote}</Muted>}
        <Row>
          {ROTATION_KEYS.map((k) => control(`pin ${k}`, `stream-rotation pin ${k}`))}
        </Row>
        <Row>
          {ROTATION_KEYS.map((k) => control(`skip ${k}`, `stream-rotation skip ${k}`))}
          {control("clear", "stream-rotation clear")}
        </Row>
      </div>

      {onAir && (
        <div data-testid="stream-numbers">
          <Heading>On air</Heading>
          <Row>
            <span>Twitch {state.viewers?.twitch ?? "—"}</span>
            <span>YouTube {state.viewers?.youtube ?? "—"}</span>
            {state.startedAt ? <span>up {countdown(now, state.startedAt)}</span> : null}
            {state.chatRate !== undefined && state.chatRate !== null ? (
              <span>{state.chatRate.toFixed(1)} lines/min</span>
            ) : null}
          </Row>
          {state.online && state.online.length > 0 && (
            <Row>
              <Muted>In the game:</Muted> {state.online.join(", ")}
            </Row>
          )}
        </div>
      )}
    </Body>
  );
}
