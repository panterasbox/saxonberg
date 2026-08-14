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
import { mediaUrl } from "../config";
import { tokens } from "./ui/tokens";
import { Button } from "./ui/Button";
import { Figure, UnbuiltGround } from "./ui";
import { Seal } from "./frame/Seal";
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

/**
 * ⭐ The header band, per the mock: identity on the left, the ACCOUNT's
 * standing on the right as compact meters, and the account action.
 *
 * ⚠ Account standing belongs up here rather than as cards in the body.
 * It is the frame for everything below — the subject of this screen is
 * the person, and the roster is what they own.
 */
const HeaderBand = styled.div`
  width: 100%;
  box-sizing: border-box;
  border-top: 2px solid ${tokens.color.seal};
  border-bottom: 1px solid ${tokens.color.border};
  background: ${tokens.color.surface};
  padding: ${tokens.space.lg} ${tokens.space.xl};
`;

const HeaderInner = styled.div`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${tokens.space.xl};
`;

const HeaderIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.lg};
  flex: 1;
  min-width: 0;
`;

/** The account meters — label, value, and a bar. */
const Meters = styled.div`
  display: flex;
  gap: ${tokens.space.xxl};
  flex-wrap: wrap;
`;

const Meter = styled.div`
  min-width: 7rem;
`;

const MeterHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${tokens.space.md};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const MeterValue = styled.span<{ $live?: boolean }>`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.body};
  color: ${(p) => (p.$live ? tokens.color.accent : tokens.color.fgMuted)};
`;

const MeterBar = styled.div<{ $live?: boolean }>`
  margin-top: 3px;
  height: 3px;
  border-radius: 2px;
  background: ${(p) =>
    p.$live ? tokens.color.accent : tokens.color.borderMuted};
  opacity: ${(p) => (p.$live ? 1 : 0.5)};
`;

const MeterNote = styled.div`
  margin-top: ${tokens.space.xs};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
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

const RosterList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.md};
`;

/**
 * ⚠ A WIDE row, not a card in a column. The mock gives each character
 * the full width of the roster so the play bar has somewhere to run and
 * the meta line (when they were last out · where they are) can sit
 * across the bottom.
 *
 * ⭐ The selected row takes the seal red — this is the one screen where
 * "which of these am I about to become" is the whole question.
 */
const CharacterCard = styled.li<{ $selected?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.space.lg};
  padding: ${tokens.space.lg};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid
    ${(p) => (p.$selected ? tokens.color.seal : tokens.color.border)};
  box-shadow: ${(p) =>
    p.$selected ? `inset 0 0 0 1px ${tokens.color.seal}` : "none"};
  border-radius: ${tokens.radius.md};
  cursor: pointer;
  min-height: 44px;
  text-align: left;

  &:hover {
    border-color: ${(p) =>
      p.$selected ? tokens.color.seal : tokens.color.borderEmphasis};
  }
`;

/** The per-row play meter — label, bar, value. */
const PlayBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  margin-top: ${tokens.space.sm};
`;

const PlayTrack = styled.div`
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: ${tokens.color.borderMuted};
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${tokens.space.md};
  margin-top: ${tokens.space.sm};
  font-size: ${tokens.font.label};
  font-family: ${tokens.font.mono};
  color: ${tokens.color.fgMuted};
`;

/** "Make someone new" — a dashed row, not a button in a toolbar. */
const MakeNewRow = styled.button`
  display: flex;
  align-items: center;
  gap: ${tokens.space.lg};
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  padding: ${tokens.space.lg};
  margin-top: ${tokens.space.md};
  background: transparent;
  border: 1px dashed ${tokens.color.fgEmphasis};
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: inherit;
  cursor: pointer;

  &:hover {
    background: ${tokens.color.surfaceAlt};
  }
`;

const PlusBox = styled.span`
  flex: none;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px dashed ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  font-size: ${tokens.font.display};
  color: ${tokens.color.fgMuted};
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

/**
 * ⚠ The species PLATE, not a bespoke likeness — no per-character art
 * exists, and minting a URL for one would be a fabricated asset. When a
 * real portrait lands it replaces this field's source, not its shape.
 */
const Portrait = styled.div`
  flex: none;
  width: 44px;
  height: 58px;
  overflow: hidden;
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  background: ${tokens.color.surfaceMuted};
  display: grid;
  place-items: center;
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

/**
 * ⭐ NEW is DERIVED from `lastSeen` being absent — the server already
 * says "never played" and a second field asserting it could disagree.
 * ⚠ There is deliberately no RETIRED badge: nothing can retire a
 * character, so a badge for it would advertise a state the world cannot
 * enter.
 */
const Flag = styled.span`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.1em;
  padding: 1px ${tokens.space.xs};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fgDim};
`;

const DetailHead = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.space.lg};
`;

const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.sm};
`;

/** The binomial — italic, the way a field guide prints it. */
const Binomial = styled.div`
  font-size: ${tokens.font.small};
  font-style: italic;
  color: ${tokens.color.fgEmphasis};
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

/** Two-letter stand-in when no plate is authored. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function CharacterPortrait({
  entry,
  scope = "roster",
}: {
  entry: CharGenRosterEntry;
  /** ⚠ A one-character account renders BOTH the row and the detail, so
   *  the two portraits need distinct ids or a query matches two nodes. */
  scope?: "roster" | "detail";
}) {
  return (
    <Portrait data-testid={`${scope}-portrait-${entry.playerId}`}>
      {entry.portrait ? (
        <img src={mediaUrl(entry.portrait)} alt="" />
      ) : (
        initials(entry.name)
      )}
    </Portrait>
  );
}

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
      <CharacterPortrait entry={entry} />
      <CharacterBody>
        <NameRow>
          <CharacterName>{entry.name}</CharacterName>
          {entry.binomial ? (
            <Binomial as="span">{entry.binomial}</Binomial>
          ) : entry.species ? (
            <CharacterSpecies as="span">{entry.species}</CharacterSpecies>
          ) : null}
          {entry.lastSeen === undefined ? <Flag>NEW</Flag> : null}
        </NameRow>
        {entry.description ? (
          <CharacterSpecies as="div">{entry.description}</CharacterSpecies>
        ) : null}
        <PlayBar>
          <SectionLabel as="span" style={{ margin: 0 }}>
            Play
          </SectionLabel>
          <PlayTrack />
          <MeterValue $live={Boolean(entry.playStanding)}>
            {entry.playStanding ?? "—"}
          </MeterValue>
        </PlayBar>
        <MetaRow>
          <span>{lastSeenLabel(entry)}</span>
          <span>{entry.lastLocation ? `◆ ${entry.lastLocation}` : ""}</span>
        </MetaRow>
      </CharacterBody>
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

      <DetailHead>
        <CharacterPortrait entry={entry} scope="detail" />
        <div>
        <NameRow>
          <Heading as="h2">{entry.name}</Heading>
          {entry.lastSeen === undefined ? <Flag>NEW</Flag> : null}
        </NameRow>
        <Subhead>
          <em>{entry.binomial ?? entry.species}</em>
          {entry.description ? ` · ${entry.description}` : ""}
        </Subhead>
        </div>
      </DetailHead>

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
  const accountName = useStore((s) => s.accountName);
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
      <SectionLabel>
        Your characters · {roster.length}
      </SectionLabel>
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
      <MakeNewRow
        data-testid="roster-create"
        onClick={() => onSendCommand("enroll")}
        aria-label="Make someone new"
      >
        <PlusBox aria-hidden="true">+</PlusBox>
        <span style={{ flex: 1, minWidth: 0 }}>
          <CharacterName as="div">Make someone new</CharacterName>
          <CharacterMeta>
            Runs the same Articles of Enrolment.
          </CharacterMeta>
        </span>
        <SendsAs>sends as enroll</SendsAs>
      </MakeNewRow>
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
      <HeaderBand>
        <HeaderInner>
          <HeaderIdentity>
            <Seal size={40} id="sx-seal-roster" title="Saxonberg" />
            <div>
              <Heading>Who are you tonight?</Heading>
              <Subhead>
                {accountName ? (
                  <>
                    Signed in as <strong>{accountName}</strong>
                  </>
                ) : (
                  "Signed in"
                )}
              </Subhead>
            </div>
          </HeaderIdentity>

          {/*
            ⚠ Account standing, as meters rather than cards. Make is
            LIVE when the server resolved the account; Fund never is —
            the capital stock has no faucet — and each says which.
          */}
          <Meters data-testid="account-standing">
            <Meter>
              <MeterHead>
                <span>Make</span>
                <MeterValue $live={Boolean(account.make)}>
                  {account.make ?? "╌╌"}
                </MeterValue>
              </MeterHead>
              <MeterBar $live={Boolean(account.make)} />
              <MeterNote>
                {account.make
                  ? "summed across your characters"
                  : "this account could not be resolved"}
              </MeterNote>
            </Meter>
            <Meter>
              <MeterHead>
                <span>Fund</span>
                <MeterValue>╌╌</MeterValue>
              </MeterHead>
              <MeterBar />
              <MeterNote>the capital stock has no faucet yet</MeterNote>
            </Meter>
          </Meters>

          <SignOutLink onClick={() => void signOut()}>Sign out</SignOutLink>
        </HeaderInner>
      </HeaderBand>

      <Inner>
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

      </Inner>
    </Screen>
  );
}
