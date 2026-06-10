/**
 * Inbound message dispatch — one file per subsystem, one entry per
 * top-level wire message type in `inboundHandlers`. Each handler
 * gets a `HandlerContext` carrying the resolved Interactive, the
 * Backend (for direct socket replies), and the Application (for
 * envelope-sending). Handlers return `void | Promise<void>`;
 * `Application.processUserMessage` catches promise rejections
 * uniformly so individual handlers don't have to.
 *
 * Growth direction (see `README.md`): new substrates add new
 * handler files. Don't fold related ops into a single envelope
 * unless the op count climbs past ~5 within the substrate.
 */

import type { Application } from '../Application';
import type { IBackend } from '../IBackend';
import type Interactive from '../../mud/obj/Interactive';

export interface HandlerContext {
  socketId: string;
  interactive: Interactive;
  backend: IBackend;
  application: Application;
}

export interface InboundClientMessage {
  type: string;
  payload?: unknown;
  id?: string;
}

export type InboundHandler = (
  ctx: HandlerContext,
  message: InboundClientMessage,
) => void | Promise<void>;

import { handlePing } from './ping';
import { handleCommand } from './command';
import {
  handleMqlSubscribe,
  handleMqlUnsubscribe,
  handleMqlQuery,
} from './mql';
import { handlePromptResponse, handlePromptCancel } from './prompt';
import { handleClientStateWrite } from './clientState';

export const inboundHandlers: Record<string, InboundHandler> = {
  ping: handlePing,
  command: handleCommand,
  'mql-subscribe': handleMqlSubscribe,
  'mql-unsubscribe': handleMqlUnsubscribe,
  'mql-query': handleMqlQuery,
  'prompt-response': handlePromptResponse,
  'prompt-cancel': handlePromptCancel,
  'client-state-write': handleClientStateWrite,
};
