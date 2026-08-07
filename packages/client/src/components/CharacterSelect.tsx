/**
 * CharacterSelect — the post-login roster screen (phase
 * `character-select`).
 *
 * Renders the `charGenRoster` (one card per existing character) plus a
 * "create new character" affordance. Both kinds of action go through
 * the real command channel via `sendCommand`:
 *
 *   - "Play" on a character → `play <playerId>`
 *   - "Create new character" → `enroll`
 *
 * The roster is empty during the brief connecting window (authenticated
 * but no `session.identity` frame yet); we show a quiet
 * waiting line rather than bouncing the player anywhere.
 *
 * Styling follows the cockpit's token-driven aesthetic. Weight and
 * position carry the hierarchy — no decorative color (the project is
 * color-conservative).
 */

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { CharGenRosterEntry } from "@saxonberg/types";
import { useStore } from "../store/index";
import { signOut } from "../services/auth";
import { tokens } from "./ui/tokens";
import { Button } from "./ui/Button";

const Screen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  overflow-y: auto;
`;

const Inner = styled.div`
  width: 100%;
  max-width: 640px;
  padding: 3rem ${tokens.space.xl} ${tokens.space.xl};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xl};
`;

const Heading = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: ${tokens.color.fgEmphasis};
`;

const Subhead = styled.p`
  margin: 0;
  font-size: ${tokens.font.body};
  color: ${tokens.color.fgMuted};
  line-height: 1.6;
`;

const RosterList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.md};
`;

const CharacterCard = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.space.xl};
  padding: ${tokens.space.xl};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
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

const CharacterDescription = styled.div`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  padding-top: ${tokens.space.md};
  border-top: 1px solid ${tokens.color.borderMuted};
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

interface CharacterSelectProps {
  /** The real command channel — every affordance routes through it. */
  onSendCommand: (text: string) => void;
}

function CharacterRow({
  entry,
  onSendCommand,
}: {
  entry: CharGenRosterEntry;
  onSendCommand: (text: string) => void;
}) {
  return (
    <CharacterCard>
      <CharacterBody>
        <CharacterName>{entry.name}</CharacterName>
        {entry.species ? (
          <CharacterSpecies>{entry.species}</CharacterSpecies>
        ) : null}
        {entry.description ? (
          <CharacterDescription>{entry.description}</CharacterDescription>
        ) : null}
      </CharacterBody>
      <Button
        variant="primary"
        data-testid={`roster-play-${entry.playerId}`}
        onClick={() => onSendCommand(`play ${entry.playerId}`)}
        aria-label={`Play ${entry.name}`}
      >
        Play
      </Button>
    </CharacterCard>
  );
}

export function CharacterSelect({ onSendCommand }: CharacterSelectProps) {
  const roster = useStore((s) => s.charGenRoster);

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

  // The "Choose your character" picker renders ONLY when there's a real
  // roster to pick from and we're not auto-entering. Every transient
  // state — connecting / holding / dev auto-enter — gets a quiet line,
  // never the picker.
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

  return (
    <Screen data-testid="roster-screen">
      <Inner>
        <Heading>Choose your character</Heading>
        <Subhead>
          Pick a character to enter the world, or create a new one.
        </Subhead>
        <RosterList>
          {roster.map((entry) => (
            <CharacterRow
              key={entry.playerId}
              entry={entry}
              onSendCommand={onSendCommand}
            />
          ))}
        </RosterList>
        <Actions>
          <Button
            variant="action"
            data-testid="roster-create"
            onClick={() => onSendCommand("enroll")}
            aria-label="Create a new character"
          >
            Create new character
          </Button>
          <SignOutLink onClick={() => void signOut()}>Sign out</SignOutLink>
        </Actions>
      </Inner>
    </Screen>
  );
}
