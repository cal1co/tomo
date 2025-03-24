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
  ColumnReorderOutcome,
  CardReorderOutcome,
  CardMoveOutcome,
  CardDeleteOutcome,
} from "../types";
import Board from "./board/Board";
import { BoardContext, type BoardContextValue } from "./board/board-context";
import { Column } from "./board/Column";
import { createRegistry } from "./board/registery";

const MAX_HISTORY = 20;

interface BoardProps {
  isTrayWindow?: boolean;
}

const getInitialData = (): Pick<
  BoardState,
  "columnMap" | "orderedColumnIds"
> => {
  const dummyTags: TagType[] = [
    { color: "purple", name: "tag", id: "1" },
    { color: "green", name: "tag", id: "2" },
    { color: "blue", name: "tag", id: "3" },
  ];

  const todoColumn: ColumnType = {
    title: "TODO",
    columnId: "todo",
    items: Array.from({ length: 25 }, (_, i) => ({
      name: `Ticket ${i + 1}`,
      number: `TODO-${i + 1}`,
      tags: dummyTags,
      ticketId: `todo-${i + 1}`,
    })),
  };

  const doneColumn: ColumnType = {
    title: "Done",
    columnId: "done",
    items: Array.from({ length: 2 }, (_, i) => ({
      name: `Done ${i + 1}`,
      number: `DONE-${i + 1}`,
      tags: dummyTags,
      ticketId: `done-${i + 1}`,
    })),
  };

  return {
    columnMap: {
      [todoColumn.columnId]: todoColumn,
      [doneColumn.columnId]: doneColumn,
    },
    orderedColumnIds: [todoColumn.columnId, doneColumn.columnId],
  };
};

const BoardComponent: React.FC<BoardProps> = ({ isTrayWindow = false }) => {
  const [data, setData] = useState<BoardState>(() => ({
    ...getInitialData(),
    lastOperation: null,
  }));

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [instanceId] = useState(() => Symbol("instance-id"));
  const [registry] = useState(createRegistry);

  const stableData = useRef(data);
  const { lastOperation } = data;

  useEffect(() => {
    stableData.current = data;
  }, [data]);

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
    if (window.electron?.send) {
      window.electron.send("sync-state", newState);
    }
  }, []);

  useEffect(() => {
    if (window.electron?.receive) {
      window.electron.receive("sync-state-update", (state) => {
        setData(state.boardData);
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
      case "column-reorder": {
        const { startIndex, finishIndex } = outcome;
        const { columnMap, orderedColumnIds } = stableData.current;
        const sourceColumn = columnMap[orderedColumnIds[finishIndex]];

        liveRegion.announce(
          `You've moved ${sourceColumn.title} from position ${
            startIndex + 1
          } to position ${finishIndex + 1} of ${orderedColumnIds.length}.`
        );
        break;
      }

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
        const data = stableData.current;
        const destinationColumn = data.columnMap[finishColumnId];
        const item = destinationColumn.items[itemIndexInFinishColumn];
        const finishPosition = itemIndexInFinishColumn + 1;

        const entry = registry.getCard(item.ticketId);
        entry.actionMenuTrigger.focus();

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

        const { columnId, ticketId } = outcome;
        const { columnMap } = stableData.current;
        const column = columnMap[columnId];

        liveRegion.announce(
          `You've deleted ticket ${ticketId} from the ${column.title} column.`
        );
        break;
      }
    }
  }, [lastOperation, registry]);

  useEffect(() => {
    return liveRegion.cleanup();
  }, []);

  const getColumns = useCallback((): ColumnType[] => {
    const { columnMap, orderedColumnIds } = stableData.current;
    return orderedColumnIds.map((columnId) => columnMap[columnId]);
  }, []);

  const reorderColumn = useCallback(
    ({
      startIndex,
      finishIndex,
      trigger = "keyboard",
    }: {
      startIndex: number;
      finishIndex: number;
      trigger?: Trigger;
    }): void => {
      setData((data) => {
        const outcome: ColumnReorderOutcome = {
          type: "column-reorder",
          columnId: data.orderedColumnIds[startIndex],
          startIndex,
          finishIndex,
        };

        const newData = {
          ...data,
          orderedColumnIds: reorder({
            list: data.orderedColumnIds,
            startIndex,
            finishIndex,
          }),
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
        const item: TicketType = sourceColumn.items[itemIndexInStartColumn];

        const newIndexInDestination = itemIndexInFinishColumn ?? 0;
        const destinationItems = [...destinationColumn.items];
        destinationItems.splice(newIndexInDestination, 0, item);

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
              items: sourceColumn.items.filter(
                (i) => i.ticketId !== item.ticketId
              ),
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

          if (source.data.type === "column") {
            handleColumnDrop(source, location);
            return;
          }

          if (source.data.type === "card") {
            handleCardDrop(source, location);
          }
        },
      })
    );

    function handleColumnDrop(source: any, location: any) {
      const startIndex: number = data.orderedColumnIds.findIndex(
        (columnId) => columnId === source.data.columnId
      );

      const target = location.current.dropTargets[0];
      const indexOfTarget: number = data.orderedColumnIds.findIndex(
        (id) => id === target.data.columnId
      );
      const closestEdgeOfTarget: Edge | null = extractClosestEdge(target.data);

      const finishIndex = getReorderDestinationIndex({
        startIndex,
        indexOfTarget,
        closestEdgeOfTarget,
        axis: "horizontal",
      });

      reorderColumn({ startIndex, finishIndex, trigger: "pointer" });
    }

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

      if (location.current.dropTargets.length === 1) {
        const [destinationColumnRecord] = location.current.dropTargets;
        const destinationId = destinationColumnRecord.data.columnId;
        invariant(typeof destinationId === "string");

        const destinationColumn = data.columnMap[destinationId];
        invariant(destinationColumn);

        if (sourceColumn === destinationColumn) {
          const destinationIndex = getReorderDestinationIndex({
            startIndex: itemIndex,
            indexOfTarget: sourceColumn.items.length - 1,
            closestEdgeOfTarget: null,
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

        moveCard({
          itemIndexInStartColumn: itemIndex,
          startColumnId: sourceColumn.columnId,
          finishColumnId: destinationColumn.columnId,
          trigger: "pointer",
        });
        return;
      }

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
  }, [data, instanceId, moveCard, reorderCard, reorderColumn]);

  const contextValue: BoardContextValue = useMemo(
    () => ({
      getColumns,
      reorderColumn,
      reorderCard,
      moveCard,
      deleteCard,
      registerCard: registry.registerCard,
      registerColumn: registry.registerColumn,
      instanceId,
    }),
    [
      getColumns,
      reorderColumn,
      reorderCard,
      moveCard,
      deleteCard,
      registry,
      instanceId,
    ]
  );

  return (
    <BoardContext.Provider value={contextValue}>
      <Board>
        {data.orderedColumnIds.map((columnId) => (
          <Column column={data.columnMap[columnId]} key={columnId} />
        ))}
      </Board>
    </BoardContext.Provider>
  );
};

export default BoardComponent;
