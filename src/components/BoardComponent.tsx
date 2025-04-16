import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import invariant from "tiny-invariant";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import * as liveRegion from "@atlaskit/pragmatic-drag-and-drop-live-region";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";

import "../styles/board";
import {
  TagType,
  BoardState,
  ColumnType,
  TicketType,
  Trigger,
  HistoryEntry,
  CardReorderOutcome,
  CardMoveOutcome,
  CardDeleteOutcome,
  CardAddOutcome,
  CardUpdateOutcome,
} from "../types";
import Board from "./board/Board";
import { BoardContext, type BoardContextValue } from "./board/board-context";
import { Column } from "./board/Column";
import { createRegistry } from "./board/registery";
import BoardUtilsPanel from "./BoardUtilsPanel";
import { SearchProvider, useSearch } from "./search/search-context";

const MAX_HISTORY = 20;

interface BoardProps {
  isTrayWindow?: boolean;
}

const getInitialData = (): Pick<
  BoardState,
  "columnMap" | "orderedColumnIds"
> => {
  const todoColumn: ColumnType = {
    title: "TODO",
    columnId: "todo",
    items: [],
  };

  const doneColumn: ColumnType = {
    title: "Done",
    columnId: "done",
    items: [],
  };

  return {
    columnMap: {
      [todoColumn.columnId]: todoColumn,
      [doneColumn.columnId]: doneColumn,
    },
    orderedColumnIds: [todoColumn.columnId, doneColumn.columnId],
  };
};

// BoardContent component separates the content to use the search context
const BoardContent: React.FC<BoardProps> = ({ isTrayWindow }) => {
  const [initialStateLoaded, setInitialStateLoaded] = useState<boolean>(false);
  const [data, setData] = useState<BoardState>(() => ({
    ...getInitialData(),
    lastOperation: null,
  }));

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [instanceId] = useState(() => Symbol("instance-id"));
  const [registry] = useState(createRegistry);

  const stableData = useRef(data);
  const { lastOperation } = data;

  // Get search functions to update the index
  const {
    resetSearchIndex,
    addToSearchIndex,
    updateSearchIndex,
    removeFromSearchIndex,
  } = useSearch();

  useEffect(() => {
    stableData.current = data;
  }, [data]);

  // Initialize search index with all tickets when data changes
  useEffect(() => {
    const allTickets: TicketType[] = [];
    Object.values(data.columnMap).forEach((column) => {
      column.items.forEach((ticket) => {
        allTickets.push(ticket);
      });
    });
    resetSearchIndex(allTickets);
  }, [data.columnMap, resetSearchIndex]);

  useEffect(() => {
    const loadInitialState = async () => {
      if (window.electron?.getBoardState) {
        console.log("Attempting to load saved board state...");
        try {
          const savedState = await window.electron.getBoardState();
          if (savedState && savedState.boardData) {
            console.log("Found saved board state!", savedState.boardData);

            const hasItems = Object.values(savedState.boardData.columnMap).some(
              (column: any) => column.items && column.items.length > 0
            );

            if (hasItems) {
              console.log("Setting board to saved state with items");
              setData(savedState.boardData);
            } else {
              console.log(
                "Saved state exists but has no items, using default state"
              );
            }
          } else {
            console.log("No saved board state found, using default state");
          }
        } catch (error) {
          console.error("Error loading saved board state:", error);
        }
      } else {
        console.log("getBoardState method not available, using default state");
      }
      setInitialStateLoaded(true);
    };

    loadInitialState();
  }, []);

  useEffect(() => {
    if (data.lastOperation && data.lastOperation.trigger !== "undo") {
      setHistory((prevHistory) => {
        const newEntry = {
          state: data,
          timestamp: Date.now(),
        };

        return [newEntry, ...prevHistory].slice(0, MAX_HISTORY);
      });
    }
  }, [data]);

  const syncState = useCallback((newState: { boardData: BoardState }): void => {
    console.log("Syncing state to main process:", newState);
    if (window.electron?.send) {
      window.electron.send("sync-state", newState);
    }
  }, []);

  useEffect(() => {
    if (window.electron?.receive) {
      window.electron.receive("sync-state-update", (state) => {
        console.log("Received state update from main process:", state);
        if (state && state.boardData) {
          setData(state.boardData);
        }
      });
    }

    return () => {
      if (window.electron?.removeListener) {
        window.electron.removeListener("sync-state-update");
      }
    };
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) {
      liveRegion.announce("Nothing to undo");
      return;
    }

    const [lastState, ...remainingHistory] = history;

    let restoredState = { ...lastState.state };

    if (lastState.state.lastOperation?.outcome.type === "card-delete") {
      const { columnId, deletedCard, deletedIndex } =
        lastState.state.lastOperation.outcome;

      if (restoredState.columnMap[columnId]) {
        const updatedItems = [...restoredState.columnMap[columnId].items];
        const insertPosition = Math.min(deletedIndex, updatedItems.length);
        updatedItems.splice(insertPosition, 0, deletedCard);

        restoredState = {
          ...restoredState,
          columnMap: {
            ...restoredState.columnMap,
            [columnId]: {
              ...restoredState.columnMap[columnId],
              items: updatedItems,
            },
          },
        };
      }
    }

    if (restoredState.lastOperation) {
      restoredState.lastOperation = {
        ...restoredState.lastOperation,
        trigger: "undo",
      };
    }

    setData(restoredState);
    setHistory(remainingHistory);

    syncState({ boardData: restoredState });
    liveRegion.announce("Undo completed");
  }, [history, syncState]);

  useEffect(() => {
    const handleUndoCommand = () => {
      handleUndo();
    };

    if (window.electron?.receive) {
      window.electron.receive("perform-undo", handleUndoCommand);
    }

    return () => {
      if (window.electron?.removeListener) {
        window.electron.removeListener("perform-undo");
      }
    };
  }, [handleUndo]);

  useEffect(() => {
    if (!lastOperation) return;

    const { outcome, trigger } = lastOperation;
    const isKeyboardTriggered = trigger === "keyboard";

    switch (outcome.type) {
      case "card-reorder": {
        if (!isKeyboardTriggered) return;

        const { columnId, startIndex, finishIndex } = outcome;
        const { columnMap } = stableData.current;
        const column = columnMap[columnId];
        const item = column.items[finishIndex];

        liveRegion.announce(
          `You've moved ${item.name} from position ${
            startIndex + 1
          } to position ${finishIndex + 1} of ${column.items.length} in the ${
            column.title
          } column.`
        );
        break;
      }

      case "card-move": {
        if (!isKeyboardTriggered) return;

        const {
          finishColumnId,
          itemIndexInStartColumn,
          itemIndexInFinishColumn,
        } = outcome;

        const currentData = stableData.current;

        if (!currentData.columnMap || !currentData.columnMap[finishColumnId]) {
          console.log(`Destination column ${finishColumnId} not found`);
          return;
        }

        const destinationColumn = currentData.columnMap[finishColumnId];

        if (
          !destinationColumn.items ||
          itemIndexInFinishColumn < 0 ||
          itemIndexInFinishColumn >= destinationColumn.items.length
        ) {
          console.log(
            `Invalid item index ${itemIndexInFinishColumn} for column ${finishColumnId}`
          );
          return;
        }

        const item = destinationColumn.items[itemIndexInFinishColumn];
        if (
          !item ||
          typeof item.ticketId !== "string" ||
          typeof item.name !== "string"
        ) {
          console.log("Item is missing required properties", item);
          return;
        }

        const finishPosition = itemIndexInFinishColumn + 1;

        try {
          const entry = registry.getCard(item.ticketId);
          if (entry && entry.actionMenuTrigger) {
            entry.actionMenuTrigger.focus();
          }
        } catch (error) {
          console.error("Error focusing card:", error);
        }

        liveRegion.announce(
          `You've moved ${item.name} from position ${
            itemIndexInStartColumn + 1
          } to position ${finishPosition} in the ${
            destinationColumn.title
          } column.`
        );
        break;
      }

      case "card-delete": {
        if (!isKeyboardTriggered) return;

        const { columnId, ticketId, deletedCard } = outcome;
        const { columnMap } = stableData.current;
        const column = columnMap[columnId];

        // Remove from search index when deleting
        removeFromSearchIndex(ticketId);

        liveRegion.announce(
          `You've deleted ticket ${deletedCard.name} from the ${column.title} column.`
        );
        break;
      }

      case "card-add": {
        if (!isKeyboardTriggered) return;

        const { columnId, ticket } = outcome;
        const { columnMap } = stableData.current;
        const column = columnMap[columnId];

        // Add to search index
        addToSearchIndex(ticket);

        liveRegion.announce(
          `Added ticket ${ticket.name} to the ${column.title} column.`
        );
        break;
      }

      case "card-update": {
        if (!isKeyboardTriggered) return;

        const { columnId, ticketId, updatedTicket } = outcome;
        const { columnMap } = stableData.current;
        const column = columnMap[columnId];

        // Update in search index
        updateSearchIndex(updatedTicket);

        liveRegion.announce(
          `Updated ticket ${updatedTicket.name} in the ${column.title} column.`
        );
        break;
      }
    }
  }, [
    lastOperation,
    registry,
    addToSearchIndex,
    updateSearchIndex,
    removeFromSearchIndex,
  ]);

  useEffect(() => {
    return liveRegion.cleanup();
  }, []);

  const getColumns = useCallback((): ColumnType[] => {
    const { columnMap, orderedColumnIds } = stableData.current;
    return orderedColumnIds.map((columnId) => columnMap[columnId]);
  }, []);

  const reorderCard = useCallback(
    ({
      columnId,
      startIndex,
      finishIndex,
      trigger = "keyboard",
    }: {
      columnId: string;
      startIndex: number;
      finishIndex: number;
      trigger?: Trigger;
    }): void => {
      setData((data) => {
        const sourceColumn = data.columnMap[columnId];
        const updatedItems = reorder({
          list: sourceColumn.items,
          startIndex,
          finishIndex,
        });

        const updatedSourceColumn: ColumnType = {
          ...sourceColumn,
          items: updatedItems,
        };

        const outcome: CardReorderOutcome = {
          type: "card-reorder",
          columnId,
          startIndex,
          finishIndex,
        };

        const newData = {
          ...data,
          columnMap: {
            ...data.columnMap,
            [columnId]: updatedSourceColumn,
          },
          lastOperation: {
            trigger,
            outcome,
          },
        };

        syncState({ boardData: newData });
        return newData;
      });
    },
    [syncState]
  );

  const moveCard = useCallback(
    ({
      startColumnId,
      finishColumnId,
      itemIndexInStartColumn,
      itemIndexInFinishColumn,
      trigger = "keyboard",
    }: {
      startColumnId: string;
      finishColumnId: string;
      itemIndexInStartColumn: number;
      itemIndexInFinishColumn?: number;
      trigger?: Trigger;
    }): void => {
      if (startColumnId === finishColumnId) return;

      setData((data) => {
        const sourceColumn = data.columnMap[startColumnId];
        const destinationColumn = data.columnMap[finishColumnId];

        if (!sourceColumn) {
          console.error(`Source column ${startColumnId} not found`);
          return data;
        }

        if (!destinationColumn) {
          console.error(`Destination column ${finishColumnId} not found`);
          return data;
        }

        if (!sourceColumn.items || !Array.isArray(sourceColumn.items)) {
          console.error(`Source column ${startColumnId} has no items array`);
          return data;
        }

        if (
          itemIndexInStartColumn < 0 ||
          itemIndexInStartColumn >= sourceColumn.items.length
        ) {
          console.error(
            `Invalid item index ${itemIndexInStartColumn} for source column`
          );
          return data;
        }

        const item = sourceColumn.items[itemIndexInStartColumn];

        if (!item || typeof item.ticketId !== "string") {
          console.error("Invalid item or missing ticketId", item);
          return data;
        }

        const destinationItems = Array.isArray(destinationColumn.items)
          ? [...destinationColumn.items]
          : [];

        const newIndexInDestination = itemIndexInFinishColumn ?? 0;

        destinationItems.splice(newIndexInDestination, 0, item);

        const filteredSourceItems = Array.isArray(sourceColumn.items)
          ? sourceColumn.items.filter((i) => i && i.ticketId !== item.ticketId)
          : [];

        const outcome: CardMoveOutcome = {
          type: "card-move",
          finishColumnId,
          itemIndexInStartColumn,
          itemIndexInFinishColumn: newIndexInDestination,
        };

        const newData = {
          ...data,
          columnMap: {
            ...data.columnMap,
            [startColumnId]: {
              ...sourceColumn,
              items: filteredSourceItems,
            },
            [finishColumnId]: {
              ...destinationColumn,
              items: destinationItems,
            },
          },
          lastOperation: {
            outcome,
            trigger,
          },
        };

        syncState({ boardData: newData });
        return newData;
      });
    },
    [syncState]
  );

  const addCard = useCallback(
    ({
      columnId,
      ticket,
      trigger = "keyboard",
    }: {
      columnId: string;
      ticket: TicketType;
      trigger?: Trigger;
    }): void => {
      setData((data) => {
        const column = data.columnMap[columnId];

        if (!column) return data;

        const newTicket: TicketType = {
          ...ticket,
        };

        // Insert at the beginning of the array instead of the end
        const updatedItems = [newTicket, ...column.items];

        const updatedColumn: ColumnType = {
          ...column,
          items: updatedItems,
        };

        const outcome: CardAddOutcome = {
          type: "card-add",
          columnId,
          ticket: newTicket,
        };

        const newData = {
          ...data,
          columnMap: {
            ...data.columnMap,
            [columnId]: updatedColumn,
          },
          lastOperation: {
            trigger,
            outcome,
          },
        };

        syncState({ boardData: newData });
        return newData;
      });
    },
    [syncState]
  );

  const updateCard = useCallback(
    ({
      columnId,
      ticketId,
      updatedTicket,
      trigger = "keyboard",
    }: {
      columnId: string;
      ticketId: string;
      updatedTicket: TicketType;
      trigger?: Trigger;
    }): void => {
      setData((data) => {
        const column = data.columnMap[columnId];
        if (!column) return data;

        const itemIndex = column.items.findIndex(
          (item) => item.ticketId === ticketId
        );

        if (itemIndex === -1) return data;

        const updatedItems = [...column.items];
        updatedItems[itemIndex] = updatedTicket;

        const outcome: CardUpdateOutcome = {
          type: "card-update",
          columnId,
          ticketId,
          updatedTicket,
        };

        const newData = {
          ...data,
          columnMap: {
            ...data.columnMap,
            [columnId]: {
              ...column,
              items: updatedItems,
            },
          },
          lastOperation: {
            trigger,
            outcome,
          },
        };

        syncState({ boardData: newData });
        return newData;
      });
    },
    [syncState]
  );

  const deleteCard = useCallback(
    ({
      columnId,
      ticketId,
      trigger = "keyboard",
    }: {
      columnId: string;
      ticketId: string;
      trigger?: Trigger;
    }): void => {
      setData((data) => {
        const column = data.columnMap[columnId];
        const deletedIndex = column.items.findIndex(
          (item) => item.ticketId === ticketId
        );

        if (deletedIndex === -1) return data;

        const deletedCard = column.items[deletedIndex];
        const updatedItems = column.items.filter(
          (item) => item.ticketId !== ticketId
        );

        const outcome: CardDeleteOutcome = {
          type: "card-delete",
          columnId,
          ticketId,
          deletedCard,
          deletedIndex,
        };

        const newData = {
          ...data,
          columnMap: {
            ...data.columnMap,
            [columnId]: {
              ...column,
              items: updatedItems,
            },
          },
          lastOperation: {
            trigger,
            outcome,
          },
        };

        syncState({ boardData: newData });
        return newData;
      });
    },
    [syncState]
  );

  useEffect(() => {
    return combine(
      monitorForElements({
        canMonitor({ source }) {
          return source.data.instanceId === instanceId;
        },
        onDrop(args) {
          const { location, source } = args;
          if (!location.current.dropTargets.length) return;

          if (source.data.type === "card") {
            handleCardDrop(source, location);
          }
        },
      })
    );

    function handleCardDrop(source: any, location: any) {
      const itemId = source.data.itemId;
      invariant(typeof itemId === "string");

      const [, startColumnRecord] = location.initial.dropTargets;
      const sourceId = startColumnRecord.data.columnId;
      invariant(typeof sourceId === "string");

      const sourceColumn = data.columnMap[sourceId];
      const itemIndex = sourceColumn.items.findIndex(
        (item) => item.ticketId === itemId
      );

      // When dropping on a column (no card target)
      if (location.current.dropTargets.length === 1) {
        const [destinationColumnRecord] = location.current.dropTargets;
        const destinationId = destinationColumnRecord.data.columnId;
        invariant(typeof destinationId === "string");

        const destinationColumn = data.columnMap[destinationId];
        invariant(destinationColumn);

        if (sourceColumn === destinationColumn) {
          // For reordering within the same column, put at the end
          reorderCard({
            columnId: sourceColumn.columnId,
            startIndex: itemIndex,
            finishIndex: sourceColumn.items.length - 1, // End of column
            trigger: "pointer",
          });
          return;
        }

        // For moving to another column, put at the end
        moveCard({
          itemIndexInStartColumn: itemIndex,
          startColumnId: sourceColumn.columnId,
          finishColumnId: destinationColumn.columnId,
          itemIndexInFinishColumn: destinationColumn.items.length, // End of column
          trigger: "pointer",
        });
        return;
      }

      // When dropping on a card within a column
      if (location.current.dropTargets.length === 2) {
        const [destinationCardRecord, destinationColumnRecord] =
          location.current.dropTargets;
        const destinationColumnId = destinationColumnRecord.data.columnId;
        invariant(typeof destinationColumnId === "string");

        const destinationColumn = data.columnMap[destinationColumnId];
        const indexOfTarget = destinationColumn.items.findIndex(
          (item) => item.ticketId === destinationCardRecord.data.itemId
        );

        const closestEdgeOfTarget: Edge | null = extractClosestEdge(
          destinationCardRecord.data
        );

        if (sourceColumn === destinationColumn) {
          const destinationIndex = getReorderDestinationIndex({
            startIndex: itemIndex,
            indexOfTarget,
            closestEdgeOfTarget,
            axis: "vertical",
          });

          reorderCard({
            columnId: sourceColumn.columnId,
            startIndex: itemIndex,
            finishIndex: destinationIndex,
            trigger: "pointer",
          });
          return;
        }

        const destinationIndex =
          closestEdgeOfTarget === "bottom" ? indexOfTarget + 1 : indexOfTarget;

        moveCard({
          itemIndexInStartColumn: itemIndex,
          startColumnId: sourceColumn.columnId,
          finishColumnId: destinationColumn.columnId,
          itemIndexInFinishColumn: destinationIndex,
          trigger: "pointer",
        });
      }
    }
  }, [data, instanceId, moveCard, reorderCard]);

  const contextValue: BoardContextValue = useMemo(
    () => ({
      getColumns,
      // Keep reorderColumn in the interface but make it a no-op function
      reorderColumn: () => {},
      reorderCard,
      moveCard,
      deleteCard,
      addCard,
      updateCard,
      registerCard: registry.registerCard,
      registerColumn: registry.registerColumn,
      instanceId,
    }),
    [
      getColumns,
      reorderCard,
      moveCard,
      deleteCard,
      addCard,
      updateCard,
      registry,
      instanceId,
    ]
  );

  return (
    <BoardContext.Provider value={contextValue}>
      <div className="board-window-parent">
        <div className="board-window">
          <BoardUtilsPanel />
          <Board>
            {data.orderedColumnIds.map((columnId) => (
              <Column column={data.columnMap[columnId]} key={columnId} />
            ))}
          </Board>
        </div>
      </div>
    </BoardContext.Provider>
  );
};

// Main BoardComponent with SearchProvider wrapper
const BoardComponent: React.FC<BoardProps> = ({ isTrayWindow }) => {
  return (
    <SearchProvider>
      <BoardContent isTrayWindow={isTrayWindow} />
    </SearchProvider>
  );
};

export default BoardComponent;
