/**
 * CharGenStage — the dedicated character-creation layout (phase
 * `char-gen`).
 *
 * NOT a modal and NOT an inline panel: this is its own full-screen
 * stage. Three bands, top to bottom:
 *
 *   1. The stage (flex: 1) — the current step prompt, the closed-choice
 *      `options` as clickable cards, the name `suggestion` with
 *      Keep / Re-roll / Type-your-own on the name step, the accumulated
 *      `picks`, and any validation `error`.
 *   2. A slim terminal strip — the Login's narration frames
 *      (`system.charactergen.welcome` et al.) scroll here, secondary.
 *   3. The command bar — front-and-centre (CLI-as-backbone). Reuses the
 *      cockpit `CommandBar` so typed input still works and echoes; every
 *      stage affordance sends the literal `enroll <field> <value>`
 *      string through the same `sendCommand` path.
 *
 * Every affordance is a thin wrapper over `sendCommand`. Clicking the
 * "Elf" card sends `enroll species elf`; Keep → `enroll name keep`;
 * Re-roll → `enroll name reroll`; an aspiration card → `enroll
 * aspiration healer`; the confirm button → `enroll confirm`. The server
 * owns all option computation and validation; the client only renders
 * what the `system.charactergen.state` frame carries and forwards the
 * tokens back.
 *
 * Styling matches the cockpit's token-driven aesthetic. Weight and
 * position carry the hierarchy (the command bar is the visual anchor);
 * color is reserved (the project is color-conservative).
 */

import { Fragment, useEffect, useState } from 'react';
import styled from 'styled-components';
import type {
  CharGenOption,
  CharGenPicks,
  CharGenStep,
} from '@saxonberg/types';
import { useStore } from '../store/index';
import { tokens } from './ui/tokens';
import { Terminal } from './Terminal';
import { CommandBar } from './CommandBar';
import type { Frame } from '../store/index';

/* --- Layout primitives -------------------------------------------- */

const Stage = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
`;

/** The main stage area — scrolls if the step is tall. */
const StageBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: ${tokens.space.xl};
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StageInner = styled.div`
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xl};
`;

const StepHeading = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: ${tokens.color.fgEmphasis};
`;

const StepSub = styled.p`
  margin: 0;
  font-size: ${tokens.font.body};
  color: ${tokens.color.fgMuted};
  line-height: 1.6;
`;

/* --- Picks summary ------------------------------------------------ */

const Picks = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${tokens.space.sm} ${tokens.space.xl};
  margin: 0;
  padding: ${tokens.space.md} ${tokens.space.xl};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.md};
  font-size: ${tokens.font.small};
`;

const PickKey = styled.dt`
  color: ${tokens.color.fgMuted};
  text-transform: lowercase;
`;

const PickVal = styled.dd`
  margin: 0;
  color: ${tokens.color.fg};
`;

/* --- Option cards ------------------------------------------------- */

const OptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${tokens.space.md};
`;

const OptionCard = styled.button<{ $selected?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  text-align: left;
  padding: ${tokens.space.lg};
  background: ${(p) =>
    p.$selected ? tokens.color.surface : tokens.color.surfaceAlt};
  color: ${tokens.color.fg};
  border: 1px solid
    ${(p) => (p.$selected ? tokens.color.primary : tokens.color.border)};
  box-shadow: ${(p) =>
    p.$selected ? `inset 0 0 0 1px ${tokens.color.primary}` : 'none'};
  border-radius: ${tokens.radius.md};
  font-family: ${tokens.font.family};
  cursor: pointer;

  &:hover {
    border-color: ${tokens.color.accent};
    background: ${tokens.color.surface};
  }
`;

const OptionLabel = styled.span`
  font-size: ${tokens.font.body};
  font-weight: 600;
`;

const OptionDesc = styled.span`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  line-height: 1.5;
`;

/**
 * Wizard navigation footer: Back on the left, the step's forward action
 * (Continue / Step into the world) on the right. Pinned outside the
 * scrolling stage body so it stays visible regardless of dossier height.
 */
const NavRow = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${tokens.space.md};
  padding: ${tokens.space.md} ${tokens.space.xl};
  border-top: 1px solid ${tokens.color.border};
  background: ${tokens.color.surfaceSunken};
`;

/* --- Illustrated step: cards + detail pane ------------------------ */

/**
 * Two-column band used on illustrated steps (species, aspiration):
 * the option grid on the left, an illustration-led detail pane on the
 * right. Stacks to a single column on narrow viewports.
 */
const IllustratedLayout = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.space.xl};

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const OptionColumn = styled.div`
  flex: 1;
  min-width: 0;
`;

/**
 * The detail pane — the illustration is the hero. Its width is fixed
 * so the 3:4 image slot has a stable footprint; the grid flexes
 * around it.
 */
const DetailPane = styled.aside`
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.md};
  padding: ${tokens.space.lg};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  /* The dossier can be long; keep it within the stage and scroll it in
     place so the option cards stay put. */
  max-height: calc(100vh - 13rem);
  overflow-y: auto;

  @media (max-width: 640px) {
    width: 100%;
    max-height: none;
  }
`;

/**
 * The 3:4 portrait slot. Holds the option's illustration when one
 * exists; otherwise a framed placeholder that keeps the exact
 * footprint so nothing reflows when real art lands. `aspect-ratio`
 * pins the shape independent of content.
 */
const DetailImage = styled.div`
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: ${tokens.radius.sm};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${tokens.color.surfaceSunken};
  border: 1px dashed ${tokens.color.borderMuted};
  color: ${tokens.color.fgMuted};
  font-size: ${tokens.font.small};
  text-transform: uppercase;
  letter-spacing: 0.08em;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const DetailLabel = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${tokens.color.fgEmphasis};
`;

const DetailDesc = styled.p`
  margin: 0;
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
  line-height: 1.6;
`;

/**
 * The scientific (Latin) binomial, shown italic under the common label.
 */
const Binomial = styled.div`
  font-size: ${tokens.font.small};
  font-style: italic;
  color: ${tokens.color.fgMuted};
  margin-top: -2px;
`;

/**
 * The structured species dossier — the showcase of how deeply the
 * species is modeled. Each server-composed section (Classification,
 * Biology, Anatomy, Composition) renders as a labeled key/value grid.
 * Every row is real data; the client is purely presentational.
 */
const DossierBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.md};
  padding-top: ${tokens.space.sm};
  border-top: 1px solid ${tokens.color.borderMuted};
`;

const DossierHeading = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${tokens.color.fgMuted};
  margin-bottom: ${tokens.space.xs};
`;

const DossierGrid = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px ${tokens.space.md};
  margin: 0;
  font-size: ${tokens.font.small};
`;

const DossierLabel = styled.dt`
  color: ${tokens.color.fgMuted};
`;

const DossierValue = styled.dd`
  margin: 0;
  color: ${tokens.color.fg};
`;

/* --- Name step ---------------------------------------------------- */

const NameForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.lg};
  padding: ${tokens.space.xl};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  align-items: flex-start;
`;

const NameAccountRef = styled.div`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};

  strong {
    color: ${tokens.color.fg};
    font-weight: 600;
  }
`;

const NameFieldRow = styled.div`
  display: flex;
  gap: ${tokens.space.lg};
  width: 100%;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

const NameField = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
`;

const NameFieldLabel = styled.label`
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const NameOptional = styled.span`
  color: ${tokens.color.fgMuted};
  opacity: 0.7;
`;

const NameInput = styled.input`
  padding: ${tokens.space.md};
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};

  &:focus {
    outline: none;
    border-color: ${tokens.color.primary};
  }
`;

const StageButton = styled.button<{ $primary?: boolean }>`
  padding: ${tokens.space.sm} ${tokens.space.xl};
  background: ${(p) =>
    p.$primary ? tokens.color.primary : tokens.color.actionBg};
  color: ${(p) => (p.$primary ? 'white' : tokens.color.fg)};
  border: 1px solid
    ${(p) => (p.$primary ? tokens.color.primary : tokens.color.borderEmphasis)};
  border-radius: ${tokens.radius.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};
  cursor: pointer;

  &:hover {
    background: ${(p) =>
      p.$primary ? tokens.color.primaryHover : tokens.color.actionBgHover};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* --- Error -------------------------------------------------------- */

const ErrorBanner = styled.div`
  padding: ${tokens.space.md} ${tokens.space.xl};
  border: 1px solid #e06c75;
  border-radius: ${tokens.radius.sm};
  color: #e06c75;
  font-size: ${tokens.font.small};
`;

/* --- Terminal strip ----------------------------------------------- */

/**
 * A slim, fixed-height band hosting the Login's narration scrollback.
 * Secondary to the stage — present so the player still sees the
 * server's prose, but not the focal element.
 */
const TerminalStrip = styled.div`
  display: flex;
  flex-direction: column;
  height: 9rem;
  border-top: 1px solid ${tokens.color.border};
  min-height: 0;
`;

/* --- Step copy ---------------------------------------------------- */

const STEP_PROMPT: Record<CharGenStep, { heading: string; sub: string }> = {
  species: {
    heading: 'Choose your species',
    sub: 'Pick the kind of being you are stepping into.',
  },
  sex: {
    heading: 'Choose a sex',
    sub: 'Independent of the pronouns you will pick next.',
  },
  name: {
    heading: 'Choose a name',
    sub: 'Edit the suggested name, or write your own.',
  },
  pronouns: {
    heading: 'Choose your pronouns',
    sub: 'How others will refer to you.',
  },
  aspiration: {
    heading: 'Choose an aspiration',
    sub: 'Who you are becoming. This seeds your story and your attire.',
  },
  confirm: {
    heading: 'Confirm your character',
    sub: 'Review your choices, then step into the world.',
  },
  done: {
    heading: 'Entering the world…',
    sub: 'Your character is being placed.',
  },
};

/**
 * Steps whose options carry an illustration — these render the
 * two-column cards-plus-detail-pane layout. Other steps (sex,
 * pronouns, name, confirm) keep the single centered column. Extending
 * this set is the only change needed to illustrate another step.
 */
const STEPS_WITH_ILLUSTRATION = new Set<CharGenStep>(['species', 'aspiration']);

const PICK_ORDER: { key: keyof CharGenPicks; label: string }[] = [
  { key: 'species', label: 'species' },
  { key: 'sex', label: 'sex' },
  { key: 'name', label: 'name' },
  { key: 'pronouns', label: 'pronouns' },
  { key: 'aspiration', label: 'aspiration' },
];

function renderPickValue(key: keyof CharGenPicks, picks: CharGenPicks): string {
  if (key === 'species') {
    return picks.species ? picks.species.commonName : '';
  }
  if (key === 'name') {
    return [picks.name, picks.surname].filter(Boolean).join(' ');
  }
  const value = picks[key];
  return typeof value === 'string' ? value : '';
}

/**
 * The already-chosen option value for a closed-choice step (so Back
 * pre-highlights the current pick). Returns the option `value` token,
 * not the display label. Non-choice steps return null.
 */
function pickValueForStep(
  step: CharGenStep,
  picks: CharGenPicks,
): string | null {
  switch (step) {
    case 'species':
      return picks.species?.key ?? null;
    case 'sex':
      return picks.sex ?? null;
    case 'pronouns':
      return picks.pronouns ?? null;
    case 'aspiration':
      return picks.aspiration ?? null;
    default:
      return null;
  }
}

/* --- Component ---------------------------------------------------- */

interface CharGenStageProps {
  /** The real command channel — every affordance routes through it. */
  onSendCommand: (text: string) => void;
  /** Frames feeding the slim narration strip. */
  frames: Frame[];
  /** CommandBar wiring, forwarded from App unchanged. */
  baseValue: string;
  onBaseChange: (value: string) => void;
  onSendPromptResponse: (promptId: string, response: string) => void;
  onCancelPrompt: (promptId: string) => void;
  flashing?: boolean;
  /** Terminal click-routing wiring, forwarded from App unchanged. */
  onCommandClick: (command: string) => void;
  onCommandPreview: (command: string | null) => void;
}

export function CharGenStage({
  onSendCommand,
  frames,
  baseValue,
  onBaseChange,
  onSendPromptResponse,
  onCancelPrompt,
  flashing,
  onCommandClick,
  onCommandPreview,
}: CharGenStageProps) {
  const charGenState = useStore((s) => s.charGenState);
  // The detail pane previews this option (driven by card hover); null
  // falls through to the selected card, then the first option, so the
  // pane is never empty.
  const [focusedValue, setFocusedValue] = useState<string | null>(null);
  // Editable name fields (name step). Initialized from the existing pick
  // if any, else the suggestion; refilled whenever that source changes
  // (e.g. reroll regenerates the suggestion and clears the pick).
  const [givenName, setGivenName] = useState('');
  const [surnameVal, setSurnameVal] = useState('');
  const nameSource = charGenState?.picks?.name
    ? `pick:${charGenState.picks.name}|${charGenState.picks.surname ?? ''}`
    : `sug:${charGenState?.suggestion?.name ?? ''}|${charGenState?.suggestion?.surname ?? ''}`;
  useEffect(() => {
    if (charGenState?.step !== 'name') return;
    if (charGenState.picks.name) {
      setGivenName(charGenState.picks.name);
      setSurnameVal(charGenState.picks.surname ?? '');
    } else if (charGenState.suggestion) {
      setGivenName(charGenState.suggestion.name ?? '');
      setSurnameVal(charGenState.suggestion.surname ?? '');
    }
    // Re-fill only when the pick/suggestion source changes, not on every
    // keystroke (those are local edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameSource]);
  // The tentatively-selected card for a closed-choice step. A click
  // selects (does not submit); the Continue button submits it. Reset to
  // the existing pick whenever the displayed step changes (so revisiting
  // a step via Back pre-highlights your current choice).
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const activeStepName = charGenState?.step;
  useEffect(() => {
    setSelectedValue(
      charGenState
        ? pickValueForStep(charGenState.step, charGenState.picks)
        : null,
    );
    setFocusedValue(null);
    // Re-run only when the displayed step changes; `picks` is read for the
    // pre-fill at that moment, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStepName]);

  // No state yet (frame in flight) — show a quiet placeholder rather
  // than an empty screen.
  if (!charGenState) {
    return (
      <Stage>
        <StageBody>
          <StageInner>
            <StepSub>Preparing character creation…</StepSub>
          </StageInner>
        </StageBody>
      </Stage>
    );
  }

  const { step, picks, options, error, canGoBack, accountName } = charGenState;
  const prompt = STEP_PROMPT[step];

  const isNameStep = step === 'name';
  const isConfirmStep = step === 'confirm';

  const submitName = () => {
    const given = givenName.trim();
    if (!given) return;
    const surname = surnameVal.trim();
    onSendCommand(`enroll name ${[given, surname].filter(Boolean).join(' ')}`);
  };

  return (
    <Stage data-testid="chargen-stage">
      <StageBody>
        <StageInner>
          <div>
            <StepHeading data-testid="chargen-step">{prompt.heading}</StepHeading>
            <StepSub>{prompt.sub}</StepSub>
          </div>

          {error ? (
            <ErrorBanner data-testid="chargen-error">{error}</ErrorBanner>
          ) : null}

          {/* Accumulated picks so far. */}
          {PICK_ORDER.some((p) => renderPickValue(p.key, picks)) ? (
            <Picks>
              {PICK_ORDER.map((p) => {
                const value = renderPickValue(p.key, picks);
                if (!value) return null;
                return (
                  <PickRow key={p.key} label={p.label} value={value} />
                );
              })}
            </Picks>
          ) : null}

          {/* Name step: editable given/surname fields pre-filled with the
              themed suggestion, plus a reroll that rewrites both boxes.
              Submitting rides the wizard's Continue button below. */}
          {isNameStep ? (
            <NameForm
              onSubmit={(e) => {
                e.preventDefault();
                submitName();
              }}
            >
              {accountName ? (
                <NameAccountRef>
                  Signed in as <strong>{accountName}</strong>
                </NameAccountRef>
              ) : null}
              <NameFieldRow>
                <NameField>
                  <NameFieldLabel htmlFor="chargen-given">
                    Given name
                  </NameFieldLabel>
                  <NameInput
                    id="chargen-given"
                    data-testid="chargen-given-input"
                    value={givenName}
                    onChange={(e) => setGivenName(e.target.value)}
                    placeholder="Given name"
                    autoComplete="off"
                  />
                </NameField>
                <NameField>
                  <NameFieldLabel htmlFor="chargen-surname">
                    Surname <NameOptional>(optional)</NameOptional>
                  </NameFieldLabel>
                  <NameInput
                    id="chargen-surname"
                    data-testid="chargen-surname-input"
                    value={surnameVal}
                    onChange={(e) => setSurnameVal(e.target.value)}
                    placeholder="Surname"
                    autoComplete="off"
                  />
                </NameField>
              </NameFieldRow>
              <StageButton
                type="button"
                data-testid="chargen-reroll"
                onClick={() => onSendCommand('enroll name reroll')}
              >
                ⟳ Suggest another
              </StageButton>
              {/* Hidden submit so Enter in a field triggers Continue. */}
              <button type="submit" hidden aria-hidden="true" />
            </NameForm>
          ) : null}

          {/* Closed-choice options for the current step. Illustrated
              steps render a cards-plus-detail-pane layout; the rest
              keep the single column. */}
          {options.length > 0
            ? (() => {
                const illustrated = STEPS_WITH_ILLUSTRATION.has(step);
                // Pane previews the hovered card, else the selected one,
                // else the first option.
                const focused =
                  options.find(
                    (o) => o.value === (focusedValue ?? selectedValue),
                  ) ??
                  options[0] ??
                  null;
                // On illustrated steps the description moves to the
                // detail pane, so cards stay compact (label only).
                const grid = (
                  <OptionGrid>
                    {options.map((opt: CharGenOption) => (
                      <OptionCard
                        key={opt.value}
                        data-testid={`chargen-option-${opt.value}`}
                        $selected={opt.value === selectedValue}
                        aria-pressed={opt.value === selectedValue}
                        onClick={() => setSelectedValue(opt.value)}
                        onMouseEnter={() => {
                          setFocusedValue(opt.value);
                          onCommandPreview(`enroll ${step} ${opt.value}`);
                        }}
                        onMouseLeave={() => {
                          setFocusedValue(null);
                          onCommandPreview(null);
                        }}
                      >
                        <OptionLabel>{opt.label}</OptionLabel>
                        {!illustrated && opt.description ? (
                          <OptionDesc>{opt.description}</OptionDesc>
                        ) : null}
                      </OptionCard>
                    ))}
                  </OptionGrid>
                );
                if (!illustrated) return grid;
                return (
                  <IllustratedLayout>
                    <OptionColumn>{grid}</OptionColumn>
                    <DetailPane data-testid="chargen-detail-pane">
                      <DetailImage data-testid="chargen-detail-image">
                        {focused?.image ? (
                          <img src={focused.image} alt={focused.label} />
                        ) : (
                          <span>illustration</span>
                        )}
                      </DetailImage>
                      {focused ? (
                        <DetailLabel data-testid="chargen-detail-label">
                          {focused.label}
                        </DetailLabel>
                      ) : null}
                      {focused?.dossier?.binomial ? (
                        <Binomial data-testid="chargen-detail-binomial">
                          {focused.dossier.binomial}
                        </Binomial>
                      ) : null}
                      {focused?.description ? (
                        <DetailDesc>{focused.description}</DetailDesc>
                      ) : null}
                      {focused?.dossier?.sections.length ? (
                        <DossierBox data-testid="chargen-detail-dossier">
                          {focused.dossier.sections.map((section) => (
                            <div key={section.heading}>
                              <DossierHeading>{section.heading}</DossierHeading>
                              <DossierGrid>
                                {section.rows.map((row) => (
                                  <Fragment key={row.label}>
                                    <DossierLabel>{row.label}</DossierLabel>
                                    <DossierValue>{row.value}</DossierValue>
                                  </Fragment>
                                ))}
                              </DossierGrid>
                            </div>
                          ))}
                        </DossierBox>
                      ) : null}
                    </DetailPane>
                  </IllustratedLayout>
                );
              })()
            : null}
        </StageInner>
      </StageBody>

      {/* Wizard nav, pinned below the (scrolling) stage so Back / Continue
          stay reachable no matter how tall the dossier is. The name step's
          forward lives in its own Keep / type affordances, so it shows
          Back only. */}
      <NavRow>
        {canGoBack ? (
          <StageButton
            data-testid="chargen-back"
            onClick={() => onSendCommand('enroll back')}
          >
            ← Back
          </StageButton>
        ) : (
          <span />
        )}
        {isConfirmStep ? (
          <StageButton
            $primary
            data-testid="chargen-confirm"
            onClick={() => onSendCommand('enroll confirm')}
          >
            Step into the world
          </StageButton>
        ) : isNameStep ? (
          <StageButton
            $primary
            data-testid="chargen-submit"
            disabled={!givenName.trim()}
            onClick={submitName}
          >
            Continue →
          </StageButton>
        ) : options.length > 0 ? (
          <StageButton
            $primary
            data-testid="chargen-submit"
            disabled={!selectedValue}
            onClick={() =>
              selectedValue && onSendCommand(`enroll ${step} ${selectedValue}`)
            }
          >
            Continue →
          </StageButton>
        ) : (
          <span />
        )}
      </NavRow>

      {/* Slim narration strip — secondary to the stage. */}
      <TerminalStrip>
        <Terminal
          frames={frames}
          onCommandClick={onCommandClick}
          onCommandPreview={onCommandPreview}
        />
      </TerminalStrip>

      {/* The command bar is the backbone — typed `enroll …` always works. */}
      <CommandBar
        baseValue={baseValue}
        onBaseChange={onBaseChange}
        onSendCommand={onSendCommand}
        onSendPromptResponse={onSendPromptResponse}
        onCancelPrompt={onCancelPrompt}
        flashing={flashing}
      />
    </Stage>
  );
}

function PickRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <PickKey>{label}</PickKey>
      <PickVal>{value}</PickVal>
    </>
  );
}
