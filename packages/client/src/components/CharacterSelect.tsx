/**
 * CharacterSelect — the account's screen (phase `character-select`).
 *
 * Two panes on a desktop, two screens on a phone, and **the split is by
 * question**: the list answers *who*, the detail answers *what happened
 * while I was gone*. Most accounts have one character, so the list is a
 * way-station rather than a destination — a single-character account
 * opens straight on the detail.
 *
 * ⭐ **Every figure here rides the roster payload**, because at `Login`
 * you are not embodied: the per-character standings are readable
 * in-session through a subscription and none of those is available to a
 * screen with no character. `lastSeen`, `playStanding`, `lastLocation`
 * and `practice` shipped on that payload some time ago and nothing has
 * ever read them; this is their first consumer.
 *
 * ⚠ **What is hatched, and why each reason differs.** Three distinct
 * claims, and collapsing them into one string would send the next
 * reader to the wrong place:
 *
 *   - **Since you left** — nothing records what happened while you were
 *     away. No mailbox, no offline-notice store, no queue. A whole-card
 *     `UnbuiltGround`, because hatching one value inside an otherwise
 *     confident panel would understate it.
 *   - **Fund standing** — the capital stock has no faucet at all.
 *   - **retire / restore / rename / appearance** — no such command
 *     exists. The controls render disabled with that reason rather than
 *     being omitted, so the absence is legible instead of invisible.
 *
 * ⚠ A never-played character shows a reasoned `empty`, never a zero. A
 * zero is a measurement; "never taken out" is the truth.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import type { CharGenRosterEntry } from "@saxonberg/types";
import { useStore } from "../store/index";
import { signOut } from "../services/auth";
import { useIsCompact } from "../lib/style/useIsCompact";
import { tokens } from "./ui/tokens";
import { Button } from "./ui/Button";
import { Figure, UnbuiltGround } from "./ui";
import type { FigureState } from "./ui";

const Screen = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-width: 100vw;
  overflow-x: hidden;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
`;

const Inner = styled.div`
  box-sizing: border-box;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: ${tokens.space.xxl} ${tokens.space.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xl};
  flex: 1;
  min-height: 0;
`;

const TwoPane = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${tokens.space.xl};
  align-items: start;

  @media (min-width: 860px) {
    grid-template-columns: 360px 1fr;
  }
`;

const Heading = styled.h1`
  margin: 0;
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.display};
  font-weight: 500;
  letter-spacing: 0.03em;
  color: ${tokens.color.fg};
`;

const Subhead = styled.p`
  margin: 0;
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const SectionLabel = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
  margin-bottom: ${tokens.space.md};
`;

const AccountRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.md};
`;

const RosterList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.md};
`;

const CharacterCard = styled.li<{ $selected?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.space.lg};
  padding: ${tokens.space.lg};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid
    ${(p) => (p.$selected ? tokens.color.fgEmphasis : tokens.color.border)};
  border-radius: ${tokens.radius.md};
  cursor: pointer;
  min-height: 44px;
  text-align: left;

  &:hover {
    border-color: ${tokens.color.borderEmphasis};
  }
`;

const CharacterBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;

const CharacterName = styled.div`
  font-size: ${tokens.font.title};
  font-weight: 600;
  color: ${tokens.color.fg};
`;

const CharacterSpecies = styled.div`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgEmphasis};
  text-transform: lowercase;
`;

const CharacterMeta = styled.div`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  line-height: 1.5;
`;

const Panel = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xl};
  padding: ${tokens.space.xl};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
`;

const HatchedCard = styled(UnbuiltGround)`
  padding: ${tokens.space.lg};
`;

const HatchReason = styled.div`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
  line-height: 1.6;
`;

const PracticeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.sm};
`;

const PracticeChip = styled.span`
  font-size: ${tokens.font.micro};
  padding: 2px ${tokens.space.sm};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgDim};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${tokens.space.md};
  padding-top: ${tokens.space.md};
  border-top: 1px solid ${tokens.color.borderMuted};
`;

/**
 * ⭐ Every clickable previews exactly what it sends. The axiom does not
 * switch off before the command bar exists — this screen has no bar, so
 * the preview is inline.
 */
const SendsAs = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const Waiting = styled.p`
  margin: 0;
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  font-style: italic;
`;

/** Subtle escape — never trap the player on a screen with no exit. */
const SignOutLink = styled.button`
  margin-left: auto;
  background: none;
  border: none;
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: ${tokens.color.fg};
  }
`;

const BackLink = styled.button`
  align-self: flex-start;
  background: none;
  border: none;
  padding: ${tokens.space.sm} 0;
  min-height: 44px;
  color: ${tokens.color.fgDim};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  cursor: pointer;
`;

/**
 * ⚠ A disabled control that names WHY. Rendering nothing would hide
 * the gap; rendering it live would promise a command that does not
 * exist.
 */
const DisabledAction = styled.button`
  min-height: 44px;
  padding: ${tokens.space.sm} ${tokens.space.lg};
  border: 1px dashed ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  background: transparent;
  color: ${tokens.color.fgMuted};
  font-family: inherit;
  font-size: ${tokens.font.small};
  cursor: not-allowed;
`;

/** Controls the art shows and no command backs. */
const UNBUILT_ACTIONS: ReadonlyArray<{ label: string; reason: string }> = [
  { label: "Rename", reason: "no rename command exists" },
  { label: "Appearance", reason: "no appearance command exists" },
  { label: "Retire", reason: "no retire command exists" },
];

/** Relative "last seen", or the honest never. */
function lastSeenLabel(entry: CharGenRosterEntry): string {
  if (entry.lastSeen === undefined) return "never taken out";
  const mins = Math.max(0, Math.round((Date.now() - entry.lastSeen) / 60000));
  if (mins < 1) return "out just now";
  if (mins < 60) return `out ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `out ${hours}h ago`;
  return `out ${Math.round(hours / 24)}d ago`;
}

/**
 * Play standing as an honest figure.
 *
 * ⚠ A character who has never been taken out gets `empty` with that
 * reason — NOT a zero. A zero says "we measured, and it is nothing";
 * the truth is that nothing has been measured.
 */
function playFigure(entry: CharGenRosterEntry): FigureState {
  if (entry.playStanding) {
    return { state: "live", value: entry.playStanding };
  }
  return entry.lastSeen === undefined
    ? { state: "empty", reason: "never taken out" }
    : { state: "empty", reason: "no play standing measured yet" };
}

interface CharacterSelectProps {
  /** The real command channel — every affordance routes through it. */
  onSendCommand: (text: string) => void;
}

function RosterCard({
  entry,
  selected,
  onSelect,
}: {
  entry: CharGenRosterEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <CharacterCard
      $selected={selected}
      data-testid={`roster-card-${entry.playerId}`}
      onClick={onSelect}
    >
      <CharacterBody>
        <CharacterName>{entry.name}</CharacterName>
        {entry.species ? (
          <CharacterSpecies>{entry.species}</CharacterSpecies>
        ) : null}
        <CharacterMeta>
          {lastSeenLabel(entry)}
          {entry.lastLocation ? ` · ${entry.lastLocation}` : ""}
        </CharacterMeta>
      </CharacterBody>
      <Figure
        label="Play"
        variant="chip"
        figure={playFigure(entry)}
      />
    </CharacterCard>
  );
}

function CharacterDetail({
  entry,
  onSendCommand,
  onBack,
}: {
  entry: CharGenRosterEntry;
  onSendCommand: (text: string) => void;
  onBack?: () => void;
}) {
  const enterCmd = `play ${entry.playerId}`;
  return (
    <Panel data-testid="roster-detail">
      {onBack ? (
        <BackLink data-testid="roster-back" onClick={onBack}>
          ‹ All characters
        </BackLink>
      ) : null}

      <div>
        <Heading as="h2">{entry.name}</Heading>
        <Subhead>
          {entry.species}
          {entry.description ? ` · ${entry.description}` : ""}
        </Subhead>
      </div>

      {/*
        ⚠ Whole-card hatch, not a hatched value. There is no mailbox,
        no offline-notice store and no queue — nothing anywhere records
        what happened while you were away — so hatching one row inside
        a confident panel would understate how absent this is.
      */}
      <div>
        <SectionLabel>Since you left</SectionLabel>
        <HatchedCard data-testid="since-you-left">
          <HatchReason>
            Nothing records what happened while you were away yet. Tells,
            civic notices and guild business are not kept for you between
            sessions.
          </HatchReason>
        </HatchedCard>
      </div>

      <div>
        <SectionLabel>Play standing</SectionLabel>
        <Figure label="Play" variant="row" figure={playFigure(entry)} />
      </div>

      <div>
        <SectionLabel>Practice</SectionLabel>
        {entry.practice && entry.practice.length > 0 ? (
          <PracticeRow data-testid="practice-record">
            {entry.practice.map((p) => (
              <PracticeChip key={p.discipline}>
                {p.discipline} · {p.band}
              </PracticeChip>
            ))}
          </PracticeRow>
        ) : (
          <Figure
            label="Practice"
            variant="row"
            figure={{
              state: "empty",
              reason:
                entry.lastSeen === undefined
                  ? "never taken out"
                  : "no practice recorded yet",
            }}
          />
        )}
      </div>

      <div>
        <SectionLabel>Where you left them</SectionLabel>
        <Figure
          label="Location"
          variant="row"
          figure={
            entry.lastLocation
              ? { state: "live", value: entry.lastLocation }
              : {
                  state: "empty",
                  reason:
                    entry.lastSeen === undefined
                      ? "never taken out"
                      : "no last location recorded",
                }
          }
        />
      </div>

      <Actions>
        <Button
          variant="primary"
          data-testid={`roster-play-${entry.playerId}`}
          onClick={() => onSendCommand(enterCmd)}
          aria-label={`Enter as ${entry.name}`}
        >
          Enter as {entry.name}
        </Button>
        <SendsAs data-testid="roster-sends-as">sends as {enterCmd}</SendsAs>
      </Actions>

      <div>
        {UNBUILT_ACTIONS.map((a) => (
          <DisabledAction
            key={a.label}
            disabled
            title={a.reason}
            data-testid={`roster-unbuilt-${a.label.toLowerCase()}`}
          >
            {a.label} — {a.reason}
          </DisabledAction>
        ))}
      </div>
    </Panel>
  );
}

export function CharacterSelect({ onSendCommand }: CharacterSelectProps) {
  const roster = useStore((s) => s.charGenRoster);
  const account = useStore((s) => s.accountStanding);
  const isCompact = useIsCompact();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Dev-only auto-enter: the dev "Skip to world" button sets
  // `autoEnterPending`; when the roster arrives, auto-play the first
  // character so dev login lands straight in-world instead of stopping
  // at the picker. Real players never set the flag, so the roster
  // behaves normally for them. Latch it locally so the "entering" state
  // holds for the whole window even after the store flag is cleared.
  const autoPlayedRef = useRef(false);
  const [autoEntering] = useState(() => useStore.getState().autoEnterPending);
  useEffect(() => {
    if (autoPlayedRef.current || !autoEntering || roster.length === 0) return;
    autoPlayedRef.current = true;
    useStore.getState().setAutoEnterPending(false);
    onSendCommand(`play ${roster[0]!.playerId}`);
  }, [roster, onSendCommand, autoEntering]);

  /**
   * ⭐ A single-character account opens straight on the detail. The
   * list answers *who*, and with one character that question has one
   * answer — so the way-station is skipped on both form factors.
   */
  const selected = useMemo(() => {
    if (roster.length === 1) return roster[0] ?? null;
    return roster.find((r) => r.playerId === selectedId) ?? null;
  }, [roster, selectedId]);

  if (autoEntering || roster.length === 0) {
    return (
      <Screen data-testid="roster-screen">
        <Inner>
          <Waiting>
            {autoEntering ? "Entering the world…" : "Connecting…"}
          </Waiting>
        </Inner>
      </Screen>
    );
  }

  const listPane = (
    <div>
      <SectionLabel>Your characters</SectionLabel>
      <RosterList>
        {roster.map((entry) => (
          <RosterCard
            key={entry.playerId}
            entry={entry}
            selected={selected?.playerId === entry.playerId}
            onSelect={() => setSelectedId(entry.playerId)}
          />
        ))}
      </RosterList>
      <Actions>
        <Button
          variant="action"
          data-testid="roster-create"
          onClick={() => onSendCommand("enroll")}
          aria-label="Make someone new"
        >
          Make someone new
        </Button>
        <SendsAs>sends as enroll</SendsAs>
      </Actions>
    </div>
  );

  // ⭐ On a phone the two panes become two SCREENS, split by question:
  // the list answers who, the detail answers what happened while I was
  // gone. Only one is mounted at a time — a phone cannot show both, and
  // rendering both to hide one would make "exactly one screen" an
  // unassertable claim.
  const showDetailOnly = isCompact && selected !== null;
  const showListOnly = isCompact && selected === null;

  return (
    <Screen data-testid="roster-screen">
      <Inner>
        <div>
          <Heading>Who are you tonight?</Heading>
          <Subhead>
            {roster.length === 1
              ? "One character on this account."
              : `${roster.length} characters on this account.`}
          </Subhead>
        </div>

        {/*
          Account standing. ⚠ Make is account-level and arrives only
          when the server could resolve the account; Fund has no faucet
          at all, so it is ALWAYS hatched — and the two reasons differ
          because the gaps differ.
        */}
        <div>
          <SectionLabel>Account standing</SectionLabel>
          <AccountRow>
            <Figure
              label="Make"
              figure={
                account.make
                  ? { state: "live", value: account.make }
                  : {
                      state: "unwired",
                      reason: "this account could not be resolved",
                    }
              }
            />
            <Figure
              label="Fund"
              figure={{
                state: "unwired",
                reason: "the capital stock has no faucet yet",
              }}
            />
          </AccountRow>
        </div>

        {showDetailOnly ? (
          <CharacterDetail
            entry={selected!}
            onSendCommand={onSendCommand}
            onBack={
              roster.length > 1 ? () => setSelectedId(null) : undefined
            }
          />
        ) : showListOnly ? (
          listPane
        ) : (
          <TwoPane>
            {listPane}
            {selected ? (
              <CharacterDetail
                entry={selected}
                onSendCommand={onSendCommand}
              />
            ) : (
              <Panel>
                <Waiting>Pick a character to see what waited for them.</Waiting>
              </Panel>
            )}
          </TwoPane>
        )}

        <Actions>
          <SignOutLink onClick={() => void signOut()}>Sign out</SignOutLink>
        </Actions>
      </Inner>
    </Screen>
  );
}
