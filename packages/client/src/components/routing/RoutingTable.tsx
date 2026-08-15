/**
 * `RoutingTable` — the ordered rules, first match wins.
 *
 * ## ⚠⚠ The last rule cannot be deleted, and the reason lives here
 *
 * Not in a doc, not in a tooltip: **in the table, beside the rule**.
 * *Every frame must land somewhere. Without a catch-all a mistyped
 * predicate silently drops output — and in a world where a frame can be
 * "you are on fire", a lost message is not a cosmetic bug.*
 *
 * The catch-all is not merely undeletable in the UI; it is **not in the
 * stored list at all**. The server appends it at evaluation time, so
 * writing the clientState key directly cannot remove it either. This
 * component renders the effective table — the player's rules plus the
 * appended one — because a table that showed only the editable rules
 * would leave the player looking at something that does not explain
 * where most of their frames go.
 *
 * ## ⚠ Every rule shows its MATCH COUNT, from the frames it matched
 *
 * Not from an estimate and not from a counter. The buffer is walked and
 * the same first-match-wins walk the server does is replayed over it —
 * ⚠ **for display only**. The routing decision itself is already made
 * and stamped on `meta.feeds`; this re-walk answers a different
 * question, *which RULE was responsible*, which the stamp does not
 * carry. When the two could disagree the stamp wins, because the stamp
 * is what actually happened.
 */

import React from "react";
import styled from "styled-components";
import type { Frame } from "../../store/index";
import type { RoutingRule } from "@saxonberg/types";
import { useStore } from "../../store/index";
import {
  describePredicate,
  getEffectiveRoutingRules,
  getRoutingRules,
  moveRoutingRule,
  removeRoutingRule,
  toggleRoutingDisposition,
} from "../../store/routingActions";
import { RuleBuilder } from "./RuleBuilder";
import { tokens } from "../ui";

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};
  color: ${tokens.color.fg};
  padding: ${tokens.space.md};
  max-width: 100%;
`;

const Head = styled.header`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
`;

const Label = styled.span`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
`;

const Note = styled.span`
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const Rule = styled.div<{ $catchAll: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${tokens.space.sm};
  border: 1px solid ${tokens.color.borderMuted};
  border-left: 2px solid
    ${(p) => (p.$catchAll ? tokens.color.danger : tokens.color.borderMuted)};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.sm};
`;

const Ordinal = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const Op = styled.button<{ $copy: boolean; $fixed: boolean }>`
  font: inherit;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: ${(p) => (p.$fixed ? "default" : "pointer")};
  background: transparent;
  color: ${(p) => (p.$copy ? tokens.color.info : tokens.color.fgEmphasis)};
  border: 1px solid
    ${(p) => (p.$copy ? tokens.color.info : tokens.color.fgEmphasis)};
  border-radius: ${tokens.radius.sm};
  padding: 0 ${tokens.space.xs};
  min-height: 44px;
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

const Pred = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  overflow-wrap: anywhere;
`;

const Dest = styled.div`
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const Hits = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const Controls = styled.div`
  display: flex;
  gap: ${tokens.space.xs};
`;

const Small = styled.button`
  font: inherit;
  font-size: ${tokens.font.label};
  cursor: pointer;
  background: ${tokens.color.surfaceAlt};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${tokens.color.fg};
  min-height: 44px;
  min-width: 28px;
`;

const Why = styled.div`
  border: 1px solid ${tokens.color.border};
  border-left: 2px solid ${tokens.color.danger};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.sm} ${tokens.space.md};
`;

const WhyLabel = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.danger};
  margin-bottom: ${tokens.space.xs};
`;

const Legend = styled.div`
  border-top: 1px solid ${tokens.color.borderMuted};
  padding-top: ${tokens.space.sm};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgDim};
`;

/**
 * Replay the server's walk over the buffer to attribute each frame to
 * the rule that claimed it — **for display only**.
 *
 * ⚠ This does not decide anything. The decision is already made and
 * stamped on `meta.feeds`; what the stamp cannot say is *which rule*
 * was responsible, and that is the only question this answers. Keeping
 * the two separate is what stops this becoming a second evaluator.
 */
export function matchCounts(
  frames: readonly Frame[],
  rules: readonly RoutingRule[],
  descriptorFor: (topic: string) => {
    address?: string;
    actor?: string;
    weight?: string;
  },
): number[] {
  const counts = rules.map(() => 0);
  for (const frame of frames) {
    const facets = descriptorFor(frame.topic);
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]!;
      const { when } = rule;
      if (when.address !== undefined && facets.address !== when.address) continue;
      if (when.actor !== undefined && facets.actor !== when.actor) continue;
      if (when.weight !== undefined && facets.weight !== when.weight) continue;
      if (when.topic !== undefined) {
        const pattern = when.topic;
        const ok = pattern.endsWith("*")
          ? frame.topic.startsWith(pattern.slice(0, -1))
          : frame.topic === pattern;
        if (!ok) continue;
      }
      counts[i] = (counts[i] ?? 0) + 1;
      if (rule.disposition === "move") break;
    }
  }
  return counts;
}

/**
 * Is the copy-to-Attention safety net still in the table?
 *
 * ⚠ Matched on the RULE's shape rather than on an index or a flag: a
 * player can reorder, retarget or re-word their table, and any of those
 * would defeat a positional check while leaving the net intact — or,
 * worse, claim a net that had been retargeted somewhere else.
 */
export function isSafetyNetPresent(rules: readonly RoutingRule[]): boolean {
  return rules.some(
    (r) =>
      r.disposition === "copy" &&
      r.to === "attention" &&
      r.when.address === "direct",
  );
}

export interface RoutingTableProps {
  frames: readonly Frame[];
}

export function RoutingTable({ frames }: RoutingTableProps): React.ReactElement {
  // Subscribing to clientState is what makes an edit re-render.
  useStore((s) => s.clientState);
  const getTopicDescriptor = useStore((s) => s.getTopicDescriptor);

  const [builderOpen, setBuilderOpen] = React.useState(false);
  const effective = getEffectiveRoutingRules();
  const editableCount = getRoutingRules().length;
  const counts = React.useMemo(
    () => matchCounts(frames, effective, (t) => getTopicDescriptor(t)),
    [frames, effective, getTopicDescriptor],
  );

  return (
    <Wrap data-testid="routing-table">
      <Head>
        <Label>Routing table</Label>
        <Note>first match wins · order matters</Note>
      </Head>

      {effective.map((rule, i) => {
        const catchAll = i === editableCount;
        return (
          <Rule key={i} $catchAll={catchAll} data-testid={`routing-rule-${i}`}>
            <Ordinal>{i + 1}</Ordinal>
            <Op
              $copy={rule.disposition === "copy"}
              $fixed={catchAll}
              disabled={catchAll}
              aria-label={`disposition ${rule.disposition}`}
              onClick={() => !catchAll && toggleRoutingDisposition(i)}
            >
              {rule.disposition}
            </Op>
            <Body>
              <Pred>{describePredicate(rule)}</Pred>
              <Dest>→ {rule.to}</Dest>
            </Body>
            <Hits data-testid={`routing-hits-${i}`}>{counts[i] ?? 0}</Hits>
            {/*
              ⚠⚠ No delete on the catch-all — and it is absent rather
              than disabled, because a greyed-out control invites the
              question "why not?" at the moment the answer is already
              printed directly below the table.
            */}
            {!catchAll && (
              <Controls>
                <Small
                  aria-label={`move rule ${i + 1} up`}
                  onClick={() => moveRoutingRule(i, -1)}
                >
                  ↑
                </Small>
                <Small
                  aria-label={`move rule ${i + 1} down`}
                  onClick={() => moveRoutingRule(i, 1)}
                >
                  ↓
                </Small>
                <Small
                  aria-label={`delete rule ${i + 1}`}
                  onClick={() => removeRoutingRule(i)}
                >
                  ×
                </Small>
              </Controls>
            )}
          </Rule>
        );
      })}

      {/*
        ⭐ On a phone the routing table IS a settings screen, and the
        one thing a settings screen must not ask for is a hand-typed
        predicate. `from a frame…` opens the envelope picker.
      */}
      <Controls>
        <Small
          aria-label="add a rule"
          onClick={() => setBuilderOpen((v) => !v)}
        >
          {builderOpen ? "× cancel" : "+ from a frame…"}
        </Small>
      </Controls>
      {builderOpen && (
        <RuleBuilder frames={frames} onDone={() => setBuilderOpen(false)} />
      )}

      {/*
        ⚠⚠ **Copy-to-Attention ships ON, and turning it off states the
        cost.**

        On a desktop it is a convenience: the frame is visible in World
        anyway. On a phone World may not be the feed you are looking at,
        so it stops being a convenience and becomes the safety net —
        and a safety net you can remove without being told what it
        caught is a trapdoor.
      */}
      {isSafetyNetPresent(effective) ? (
        <Note data-testid="safety-net-note">
          Direct messages are copied to Attention. Remove that rule and a
          message aimed at you lands only in the feed the rules send it to
          — which may not be the one you are watching.
        </Note>
      ) : (
        <Note data-testid="safety-net-gone">
          ⚠ Nothing copies direct messages to Attention. A message aimed
          at you now lands only where the rules send it — if that is not
          the feed you are watching, you will not see it arrive.
        </Note>
      )}

      <Why data-testid="catch-all-reason">
        <WhyLabel>WHY THE LAST RULE CANNOT BE DELETED</WhyLabel>
        <div>
          Every frame must land somewhere. Without a catch-all a mistyped
          predicate silently drops output — and in a world where a frame can
          be <em>you are on fire</em>, a lost message is not a cosmetic bug.
        </div>
      </Why>

      <Legend>
        <Label>Move or copy</Label>
        <div>
          <strong>move</strong> — routes here and stops. Later rules never see
          it.
        </div>
        <div>
          <strong>copy</strong> — routes here and keeps going, which is how a
          tell reaches Attention <em>and</em> still lands in World.
        </div>
      </Legend>
    </Wrap>
  );
}
