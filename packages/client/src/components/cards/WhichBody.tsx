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
import type { WhichAnswer, WhichGroup, WhichSource, WidthClass } from "@saxonberg/types";
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

const HelpLink = styled.button`
  background: none;
  border: none;
  padding: 0 0 0 2px;
  cursor: pointer;
  font-size: 0.8em;
  vertical-align: super;
  color: ${tokens.color.fgMuted};
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
  /**
   * ⭐ Every link shows its command in the status bar on hover (owner,
   * standing rule) — what it SENDS, or the text it TYPES.
   */
  hover: (command: string) => { onMouseEnter: () => void; onMouseLeave: () => void };
}

/** The word a player types for a group's source — its first kind's handle. */
function sourceWord(s: WhichSource): string {
  return s.handle.split(",")[0]!.trim();
}

/**
 * ⭐ Every verb is TWO links (owner, review): the verb itself — typed onto
 * your command line, never sent — and `?`, which runs `help <verb>`.
 */
function VerbLinks({
  verb,
  clicks,
  off,
  title,
}: {
  verb: string;
  clicks: Clicks;
  off?: boolean;
  title?: string;
}): React.ReactElement {
  return (
    <>
      <VerbButton
        type="button"
        $off={off}
        title={title}
        data-testid={`which-verb-${verb}`}
        onClick={() => clicks.type(verb)}
        {...clicks.hover(`${verb} `)}
      >
        {verb}
      </VerbButton>
      <HelpLink type="button" data-testid={`which-help-${verb}`} onClick={() => clicks.send(`help ${verb}`)} {...clicks.hover(`help ${verb}`)}>
        ?
      </HelpLink>
    </>
  );
}

function VerbChips({ verbs, clicks }: { verbs: readonly string[]; clicks: Clicks }): React.ReactElement {
  return (
    <>
      {verbs.map((v, i) => (
        <React.Fragment key={v}>
          {i > 0 ? ", " : null}
          <VerbLinks verb={v} clicks={clicks} />
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * ⭐ One source's row (owner, review: one row per SOURCE, as the terminal
 * groups — not the source repeated on every verb). Its verbs as chips; at
 * `medium` the source's place and a greyed verb's reason; at `full` each
 * verb's help line and link.
 */
function GroupRow({ g, size, clicks }: { g: WhichGroup; size: WidthClass; clicks: Clicks }): React.ReactElement {
  const wide = size === "medium" || size === "full";
  return (
    <tr data-testid="which-row">
      <td>
        {g.verbs.map((v, i) => (
          <React.Fragment key={v.verb}>
            {i > 0 ? ", " : null}
            <VerbLinks verb={v.verb} clicks={clicks} off={v.state === "disabled"} title={v.description} />
          </React.Fragment>
        ))}
        {wide
          ? g.verbs
              .filter((v) => v.state === "disabled" && v.reason)
              .map((v) => (
                <div key={`r:${v.verb}`}>
                  <Muted>
                    {v.verb}: {v.reason}
                  </Muted>
                </div>
              ))
          : null}
        {size === "full"
          ? g.verbs.map((v) => (
              <div key={`d:${v.verb}`}>
                <Muted>
                  {v.verb} — {v.description}
                </Muted>
              </div>
            ))
          : null}
      </td>
      <td>
        <SourceButton
          type="button"
          data-testid="which-source"
          onClick={() => clicks.send(`which ${sourceWord(g.source)}`)}
          {...clicks.hover(`which ${sourceWord(g.source)}`)}
        >
          {wide ? sourcePhrase(g.source) : g.source.handle}
        </SourceButton>
      </td>
    </tr>
  );
}

/** Words that mean two commands here, and the scope that picks each meaning. */
function Collisions({ answer, clicks }: { answer: WhichAnswer; clicks: Clicks }): React.ReactElement | null {
  const list = answer.collisions ?? [];
  if (list.length === 0) {
    return answer.ask.mode === "clashes" ? <Muted data-testid="which-no-clashes">No word here means two different commands.</Muted> : null;
  }
  return (
    <Details data-testid="which-collisions" open>
      <summary>one word, two commands ({list.length})</summary>
      {list.map((c) => (
        <div key={c.verb}>
          <strong>{c.verb}</strong>
          {c.meanings.map((m) => (
            <div key={m.scope}>
              <VerbButton type="button" data-testid={`which-scope-${m.scope}`} onClick={() => clicks.type(m.scope)} {...clicks.hover(`${m.scope} `)}>
                {m.scope}
              </VerbButton>{" "}
              <Muted>
                {m.description} — {m.sources.map(sourcePhrase).join(", ")}
              </Muted>
            </div>
          ))}
        </div>
      ))}
    </Details>
  );
}

export function WhichBody({
  answer,
  size,
  onSendCommand,
  onCommandPreview,
}: {
  answer: WhichAnswer;
  size: WidthClass;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}): React.ReactElement {
  const seed = useStore((s) => s.seedPrimaryDraft);
  const clicks: Clicks = {
    type: (verb) => seed(`${verb} `),
    send: onSendCommand,
    hover: (command) => ({
      onMouseEnter: () => onCommandPreview?.(command),
      onMouseLeave: () => onCommandPreview?.(null),
    }),
  };

  if (answer.relations) {
    const wide = size === "medium" || size === "full";
    return (
      <Table data-testid="which-relations">
        <tbody>
          {answer.relations.map((r) => (
            <tr key={r.name}>
              <td>
                <VerbButton type="button" onClick={() => clicks.type(`~${r.name}`)} {...clicks.hover(`~${r.name} `)}>
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
        <SourceButton type="button" data-testid="which-everything" onClick={() => onSendCommand("which")} {...clicks.hover("which")}>
          <Muted>← everything</Muted>
        </SourceButton>
      ) : null}
      <Table>
        <tbody>
          {answer.groups.map((g) => (
            <GroupRow key={g.key} g={g} size={size} clicks={clicks} />
          ))}
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
      <Collisions answer={answer} clicks={clicks} />
      {answer.usual && answer.usual.verbs.length > 0 ? (
        <Details data-testid="which-usual" open={narrowed}>
          <summary>the usual ({answer.usual.verbs.length}) — you</summary>
          <VerbChips verbs={answer.usual.verbs} clicks={clicks} />
        </Details>
      ) : null}
    </div>
  );
}
