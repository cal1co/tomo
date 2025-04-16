import { createContext, useContext } from "react";
import invariant from "tiny-invariant";

export type ColumnContextProps = {
  columnId: string;
  getCardIndex: (ticketId: string) => number;
  getNumCards: () => number;
  getOriginalIndex: (ticketId: string) => number;
  getVisibleIndex: (ticketId: string) => number;
  isFiltered: boolean;
};

export const ColumnContext = createContext<ColumnContextProps | null>(null);

export function useColumnContext(): ColumnContextProps {
  const value = useContext(ColumnContext);
  invariant(value, "cannot find ColumnContext provider");
  return value;
}
