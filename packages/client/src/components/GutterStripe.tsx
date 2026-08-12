/**
 * GutterStripe — per-frame topic-color indicator + frame-inspection
 * affordance.
 *
 * A 3px-wide vertical bar prepended to every Terminal row. The
 * color is derived from the frame's topic family (hashed → hue;
 * fixed S/L) so leaves under the same family cluster visually.
 *
 * Hover (>250ms) → floating tooltip with the friendly label, raw
 * dotted path, description, and timestamp. Click → action popover
 * with mute / solo / open-new-tab / mute-family. No right-click
 * handler is bound; the gutter IS the inspection surface, per the
 * slate's gesture-reservation rule.
 */

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { tokens } from './ui';
import { useStore } from '../store/index';
import {
  addMuteForActiveTab,
  addTab,
  setActiveTab,
} from '../store/consoleActions';
import type { TopicDescriptor } from '@saxonberg/types';

const HOVER_DELAY_MS = 250;

const StripeContainer = styled.span`
  display: inline-block;
  width: 3px;
  align-self: stretch;
  min-height: 1em;
  margin-right: ${tokens.space.sm};
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
`;

const Tooltip = styled.div`
  position: absolute;
  top: 0;
  left: 8px;
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  min-width: 14rem;
  max-width: 28rem;
  z-index: 20;
  pointer-events: none;
  white-space: normal;
`;

const TooltipRow = styled.div`
  margin-bottom: ${tokens.space.xs};
  &:last-child {
    margin-bottom: 0;
  }
`;

const RowLabel = styled.span`
  color: ${tokens.color.fgMuted};
  margin-right: ${tokens.space.sm};
`;

const Popover = styled.div`
  position: absolute;
  top: 0;
  left: 8px;
  background: ${tokens.color.surface};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.sm};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  z-index: 30;
  white-space: nowrap;
`;

const PopoverButton = styled.button`
  background: ${tokens.color.actionBg};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  cursor: pointer;
  text-align: left;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  &:hover {
    background: ${tokens.color.actionBgHover};
  }
`;

/**
 * FNV-1a 24-bit hash of the family path → hue, so every leaf in a
 * family shares a hue cluster.
 *
 * ⭐ The **only computed colour in the client**, and the one place a
 * colour is not simply a token read. The hue must stay computed — it is
 * derived from the topic string and there is no table that could hold
 * 360 of them — but the saturation and lightness are a *calibration*,
 * hand-tuned so the result is legible against the ground. Those two
 * numbers were therefore theme-blind: tuned for the dark terminal and
 * silently wrong on a light one.
 *
 * The fix is to compose with `var()` rather than resolve it. The
 * space-separated HSL form takes custom properties directly, so the
 * hue stays computed here and the calibration comes from the active
 * ground's `--sx-stripe-s` / `--sx-stripe-l`. This is why
 * `noHexLiterals.test.ts` permits a colour function whose arguments
 * include a `var(` — a pattern permission, not a file allowlist.
 */
export function colorForTopic(family: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < family.length; i++) {
    h ^= family.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue} var(--sx-stripe-s) var(--sx-stripe-l))`;
}

interface GutterStripeProps {
  topic: string;
  timestamp: number;
}

export function GutterStripe({ topic, timestamp }: GutterStripeProps) {
  const getDescriptor = useStore((s) => s.getTopicDescriptor);
  const descriptor: TopicDescriptor = getDescriptor(topic);
  const color = colorForTopic(descriptor.family || topic);
  const [hoveringTip, setHoveringTip] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) {
        window.clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showPopover) return;
    const onMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      setShowPopover(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [showPopover]);

  function onMouseEnter() {
    if (showPopover) return;
    hoverTimerRef.current = window.setTimeout(() => {
      setHoveringTip(true);
    }, HOVER_DELAY_MS);
  }

  function onMouseLeave() {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveringTip(false);
  }

  function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    setHoveringTip(false);
    setShowPopover((v) => !v);
  }

  function muteThisInTab() {
    addMuteForActiveTab(topic);
    setShowPopover(false);
  }

  function soloInTab() {
    // Solo = mute every other known topic on the active tab. We
    // approximate "known" with the catalogue snapshot plus any
    // currently-visible topic in the frame buffer.
    const state = useStore.getState();
    const known = new Set<string>();
    for (const d of state.topicCatalogue.values()) known.add(d.topic);
    for (const f of state.frames) known.add(f.topic);
    known.delete(topic);
    for (const t of known) addMuteForActiveTab(t);
    setShowPopover(false);
  }

  function openInNewTab() {
    const newName = `${descriptor.label}`;
    addTab(newName);
    setActiveTab(newName);
    // Mute every known topic except this one on the new tab.
    const state = useStore.getState();
    const known = new Set<string>();
    for (const d of state.topicCatalogue.values()) known.add(d.topic);
    for (const f of state.frames) known.add(f.topic);
    known.delete(topic);
    for (const t of known) addMuteForActiveTab(t);
    setShowPopover(false);
  }

  function muteFamily() {
    const family = descriptor.family;
    if (!family) {
      muteThisInTab();
      return;
    }
    const state = useStore.getState();
    const leavesUnderFamily = new Set<string>();
    for (const d of state.topicCatalogue.values()) {
      if (d.topic.startsWith(`${family}.`)) leavesUnderFamily.add(d.topic);
    }
    for (const f of state.frames) {
      if (f.topic.startsWith(`${family}.`)) leavesUnderFamily.add(f.topic);
    }
    for (const t of leavesUnderFamily) addMuteForActiveTab(t);
    setShowPopover(false);
  }

  return (
    <StripeContainer
      data-testid="gutter-stripe"
      data-topic={topic}
      style={{ background: color }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {hoveringTip && !showPopover && (
        <Tooltip data-testid="gutter-tooltip">
          <TooltipRow>
            <strong>{descriptor.label}</strong>
          </TooltipRow>
          <TooltipRow>
            <RowLabel>topic</RowLabel>
            <code>{descriptor.topic}</code>
          </TooltipRow>
          <TooltipRow>{descriptor.description}</TooltipRow>
          <TooltipRow>
            <RowLabel>at</RowLabel>
            {new Date(timestamp).toLocaleTimeString()}
          </TooltipRow>
        </Tooltip>
      )}
      {showPopover && (
        <Popover
          ref={popoverRef}
          data-testid="gutter-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <PopoverButton
            onClick={muteThisInTab}
            data-testid="gutter-mute"
          >
            Mute in this tab
          </PopoverButton>
          <PopoverButton onClick={soloInTab} data-testid="gutter-solo">
            Solo in this tab
          </PopoverButton>
          <PopoverButton
            onClick={openInNewTab}
            data-testid="gutter-newtab"
          >
            Open in new tab filtered to this
          </PopoverButton>
          <PopoverButton
            onClick={muteFamily}
            data-testid="gutter-mute-family"
          >
            Mute family
          </PopoverButton>
        </Popover>
      )}
    </StripeContainer>
  );
}
