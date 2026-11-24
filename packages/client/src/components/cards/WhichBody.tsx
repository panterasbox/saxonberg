/**
 * WhichBody — the `which` card's body (the which build, W4): what you can
 * type here, and what gives you each verb — the same answer the terminal
 * printed, as a table that shows more as it widens.
 *
 * | width | shows |
 * |---|---|
 * | `line` · `unit` (a phone) | verb · the source's handle |
 * | `medium` (across the terminal) | + the source and where it is · greyed with the reason when unusable |
 * | `full` (the stage) | + help's one-line *what it does* · a `help` link |
 *
 * ⚠ The *what it does* line is **help's own**, borrowed knowingly and
 * shown beside the link to it — the one place this lives in two places.
 *
 * ⭐ A click on a verb TYPES it onto your command line and sends nothing:
 * `which` is deliberate and never acts. A click on a source sends
 * `which #<id>` — the same card, narrowed — and a narrowed card offers
 * *everything* to widen it again.
 */

import React from "react";
import styled from "styled-components";
import type { AffordanceEntry, WhichAnswer, WhichGroup, WhichSource, WidthClass } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { tokens } from "../ui";

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${tokens.font.small};
  td {
    padding: 2px 6px 2px 0;
    vertical-align: top;
  }
`;

const VerbButton = styled.button<{ $off?: boolean }>`
  font-family: ${tokens.font.mono};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: ${(p) => (p.$off ? tokens.color.fgMuted : tokens.color.fg)};
  text-decoration: underline dotted;
`;

const SourceButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  text-align: left;
`;

const Muted = styled.span`
  color: ${tokens.color.fgMuted};
`;

const Details = styled.details`
  margin-top: 4px;
  font-size: ${tokens.font.small};
  summary {
    cursor: pointer;
    color: ${tokens.color.fgMuted};
  }
`;

/** A source in the reply's words: *the lever here*, *your calendar*, *you*. */
function sourcePhrase(s: WhichSource): string {
  if (s.place === "") return s.name;
  if (s.place === "where you are") return `${s.name}, where you are`;
  return `${s.name} ${s.place}`;
}

interface Clicks {
  type: (verb: string) => void;
  send: (command: string) => void;
}

function VerbChips({ verbs, clicks }: { verbs: readonly string[]; clicks: Clicks }): React.ReactElement {
  return (
    <>
      {verbs.map((v, i) => (
        <React.Fragment key={v}>
          {i > 0 ? ", " : null}
          <VerbButton type="button" data-testid={`which-verb-${v}`} onClick={() => clicks.type(v)}>
            {v}
          </VerbButton>
        </React.Fragment>
      ))}
    </>
  );
}

function Row({ v, g, size, clicks }: { v: AffordanceEntry; g: WhichGroup; size: WidthClass; clicks: Clicks }): React.ReactElement {
  const off = v.state === "disabled";
  const wide = size === "medium" || size === "full";
  return (
    <tr data-testid="which-row">
      <td>
        <VerbButton type="button" $off={off} data-testid={`which-verb-${v.verb}`} onClick={() => clicks.type(v.verb)}>
          {v.verb}
        </VerbButton>
      </td>
      <td>
        <SourceButton type="button" data-testid="which-source" onClick={() => clicks.send(`which #${g.source.id}`)}>
          {wide ? sourcePhrase(g.source) : g.source.handle}
        </SourceButton>
        {wide && off && v.reason ? (
          <div>
            <Muted>{v.reason}</Muted>
          </div>
        ) : null}
      </td>
      {size === "full" ? (
        <td>
          <Muted>{v.description}</Muted>{" "}
          <SourceButton type="button" data-testid={`which-help-${v.verb}`} onClick={() => clicks.send(`help ${v.verb}`)}>
            <Muted>(help)</Muted>
          </SourceButton>
        </td>
      ) : null}
    </tr>
  );
}

export function WhichBody({
  answer,
  size,
  onSendCommand,
}: {
  answer: WhichAnswer;
  size: WidthClass;
  onSendCommand: (text: string) => void;
}): React.ReactElement {
  const seed = useStore((s) => s.seedPrimaryDraft);
  const clicks: Clicks = { type: (verb) => seed(`${verb} `), send: onSendCommand };

  if (answer.relations) {
    const wide = size === "medium" || size === "full";
    return (
      <Table data-testid="which-relations">
        <tbody>
          {answer.relations.map((r) => (
            <tr key={r.name}>
              <td>
                <VerbButton type="button" onClick={() => clicks.type(`~${r.name}`)}>
                  ~{r.name}
                </VerbButton>
              </td>
              <td>
                {r.meaning}
                {wide && r.count !== undefined ? <Muted> — {r.count} in the world</Muted> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  }

  const narrowed = answer.ask.mode !== "all";
  return (
    <div data-testid="which-body">
      {narrowed ? (
        <SourceButton type="button" data-testid="which-everything" onClick={() => onSendCommand("which")}>
          <Muted>← everything</Muted>
        </SourceButton>
      ) : null}
      <Table>
        <tbody>
          {answer.groups.flatMap((g) => g.verbs.map((v) => <Row key={`${g.key}:${v.verb}`} v={v} g={g} size={size} clicks={clicks} />))}
        </tbody>
      </Table>
      {answer.common ? (
        <Details data-testid="which-common">
          <summary>anything you&apos;re carrying: {answer.common.verbs.join(", ")}</summary>
          <VerbChips verbs={answer.common.verbs} clicks={clicks} />
          <div>
            <Muted>{answer.common.sources.map(sourcePhrase).join(" · ")}</Muted>
          </div>
        </Details>
      ) : null}
      {answer.usual && answer.usual.verbs.length > 0 ? (
        <Details data-testid="which-usual" open={narrowed}>
          <summary>the usual ({answer.usual.verbs.length}) — you</summary>
          <VerbChips verbs={answer.usual.verbs} clicks={clicks} />
        </Details>
      ) : null}
    </div>
  );
}
