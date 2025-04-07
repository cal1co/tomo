import { createContext, useContext } from "react";
import invariant from "tiny-invariant";
import type { CleanupFn } from "@atlaskit/pragmatic-drag-and-drop/types";
import { ColumnType, TicketType, Trigger } from "../../types";
import { ColumnEntry } from "./registery";

export type BoardContextValue = {
  getColumns: () => ColumnType[];
  reorderColumn: (args: {
    startIndex: number;
    finishIndex: number;
    trigger?: Trigger;
  }) => void;
  reorderCard: (args: {
    columnId: string;
    startIndex: number;
    finishIndex: number;
    trigger?: Trigger;
  }) => void;
  moveCard: (args: {
    startColumnId: string;
    finishColumnId: string;
    itemIndexInStartColumn: number;
    itemIndexInFinishColumn?: number;
    trigger?: Trigger;
  }) => void;
  deleteCard: (args: {
    columnId: string;
    ticketId: string;
    trigger?: Trigger;
  }) => void;
  addCard: (args: {
    columnId: string;
    ticket: Omit<TicketType, "ticketId">;
    trigger?: Trigger;
  }) => void;
  updateCard: (args: {
    columnId: string;
    ticketId: string;
    updatedTicket: TicketType;
    trigger?: Trigger;
  }) => void;
  registerCard: (args: {
    cardId: string;
    entry: {
      element: HTMLElement;
      actionMenuTrigger: HTMLElement;
    };
  }) => CleanupFn;
  registerColumn: (args: { columnId: string; entry: ColumnEntry }) => CleanupFn;
  instanceId: symbol;
};

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext(): BoardContextValue {
  const value = useContext(BoardContext);
  invariant(value, "cannot find BoardContext provider");
  return value;
}
