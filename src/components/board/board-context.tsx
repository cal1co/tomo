import { createContext, useContext } from "react";
import invariant from "tiny-invariant";
import type { CleanupFn } from "@atlaskit/pragmatic-drag-and-drop/types";
import { TagType } from "../../types/BoardTypes";

export type TicketType = {
  name: string;
  number: string;
  tags: TagType[];
  ticketId: string;
};

export type ColumnType = {
  title: string;
  columnId: string;
  items: TicketType[];
};

export type BoardContextValue = {
  getColumns: () => ColumnType[];
  reorderColumn: (args: {
    startIndex: number;
    finishIndex: number;
    trigger?: "pointer" | "keyboard";
  }) => void;
  reorderCard: (args: {
    columnId: string;
    startIndex: number;
    finishIndex: number;
    trigger?: "pointer" | "keyboard";
  }) => void;
  moveCard: (args: {
    startColumnId: string;
    finishColumnId: string;
    itemIndexInStartColumn: number;
    itemIndexInFinishColumn?: number;
    trigger?: "pointer" | "keyboard";
  }) => void;
  registerCard: (args: {
    cardId: string;
    entry: {
      element: HTMLElement;
      actionMenuTrigger: HTMLElement;
    };
  }) => CleanupFn;
  registerColumn: (args: {
    columnId: string;
    entry: {
      element: HTMLElement;
    };
  }) => CleanupFn;
  instanceId: symbol;
};

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext(): BoardContextValue {
  const value = useContext(BoardContext);
  invariant(value, "cannot find BoardContext provider");
  return value;
}
