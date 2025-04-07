import { TicketType } from './ticket';

export interface ColumnType {
  title: string;
  columnId: string;
  items: TicketType[];
}

export type ColumnReorderOutcome = {
  type: "column-reorder";
  columnId: string;
  startIndex: number;
  finishIndex: number;
};

export type CardReorderOutcome = {
  type: "card-reorder";
  columnId: string;
  startIndex: number;
  finishIndex: number;
};

export type CardMoveOutcome = {
  type: "card-move";
  finishColumnId: string;
  itemIndexInStartColumn: number;
  itemIndexInFinishColumn: number;
};

export type CardDeleteOutcome = {
  type: "card-delete";
  columnId: string;
  ticketId: string;
  deletedCard: TicketType;
  deletedIndex: number;
};

export type CardAddOutcome = {
  type: "card-add";
  columnId: string;
  ticket: TicketType;
};

export type Outcome = 
| ColumnReorderOutcome
| CardReorderOutcome
| CardMoveOutcome
| CardDeleteOutcome
| CardAddOutcome
| CardUpdateOutcome;

export type Trigger = "pointer" | "keyboard" | "undo";

export type Operation = {
  trigger: Trigger;
  outcome: Outcome;
};

export type BoardState = {
  columnMap: Record<string, ColumnType>;
  orderedColumnIds: string[];
  lastOperation: Operation | null;
};

export type HistoryEntry = {
  state: BoardState;
  timestamp: number;
};

export type CardUpdateOutcome = {
  type: 'card-update';
  columnId: string;
  ticketId: string;
  updatedTicket: TicketType;
};