import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import invariant from "tiny-invariant";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

import "../../styles/board";
import Ticket from "../Ticket";
import CreateTicketModal from "../CreateTicketModal";
import { ColumnType, TagType, TicketType } from "../../types";
import { useBoardContext } from "./board-context";
import { ColumnContext, type ColumnContextProps } from "./column-context";
import { useSearch } from "../search/search-context";

type State = { type: "idle" } | { type: "is-card-over" };

const idle: State = { type: "idle" };
const isCardOver: State = { type: "is-card-over" };

// Dummy tags
const dummyTags: TagType[] = [
  { color: "purple", name: "tag", id: "1" },
  { color: "green", name: "tag", id: "2" },
  { color: "blue", name: "tag", id: "3" },
  { color: "blue", name: "TEST", id: "3" },
];

export const Column = memo(function Column({ column }: { column: ColumnType }) {
  const columnId = column.columnId;
  const columnRef = useRef<HTMLDivElement | null>(null);
  const columnInnerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<State>(idle);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);

  const { instanceId, registerColumn, moveCard, getColumns, addCard } =
    useBoardContext();

  // Get search context
  const { isTicketVisible, isFiltered, addToSearchIndex } = useSearch();

  const stableData = useRef<{ columnMap: Record<string, ColumnType> }>({
    columnMap: {},
  });

  useEffect(() => {
    const columns = getColumns();
    const columnMap: any = {};
    columns.forEach((col) => {
      columnMap[col.columnId] = col;
    });
    stableData.current = { columnMap };
  }, [getColumns]);

  // Get visible items (filtered or all)
  const visibleItems = useMemo(() => {
    if (!isFiltered) {
      return column.items;
    }
    return column.items.filter((item) => isTicketVisible(item.ticketId));
  }, [column.items, isFiltered, isTicketVisible]);

  // Get original index in full items array
  const getOriginalIndex = useCallback(
    (ticketId: string) => {
      return column.items.findIndex((item) => item.ticketId === ticketId);
    },
    [column.items]
  );

  // Get visible index in filtered items array
  const getVisibleIndex = useCallback(
    (ticketId: string) => {
      return visibleItems.findIndex((item) => item.ticketId === ticketId);
    },
    [visibleItems]
  );

  useEffect(() => {
    invariant(columnRef.current);
    invariant(columnInnerRef.current);
    invariant(headerRef.current);
    invariant(scrollableRef.current);
    return combine(
      registerColumn({
        columnId,
        entry: {
          element: columnRef.current,
        },
      }),
      dropTargetForElements({
        element: columnInnerRef.current,
        getData: () => ({ columnId }),
        canDrop: ({ source }) => {
          return (
            source.data.instanceId === instanceId && source.data.type === "card"
          );
        },
        getIsSticky: () => true,
        onDragEnter: () => {
          if (column.items.length > 0) {
            setShowBottomIndicator(true);
          } else {
            setState(isCardOver);
          }
        },
        onDragLeave: () => {
          setShowBottomIndicator(false);
          setState(idle);
        },
        onDrop: () => {
          setShowBottomIndicator(false);
          setState(idle);
        },
      }),
      autoScrollForElements({
        element: scrollableRef.current,
        canScroll: ({ source }) =>
          source.data.instanceId === instanceId && source.data.type === "card",
      })
    );
  }, [columnId, registerColumn, instanceId, moveCard, column.items.length]);

  // Keep stable items reference for context
  const stableItems = useRef(column.items);
  const stableVisibleItems = useRef(visibleItems);

  useEffect(() => {
    stableItems.current = column.items;
  }, [column.items]);

  useEffect(() => {
    stableVisibleItems.current = visibleItems;
  }, [visibleItems]);

  // Get card index in the complete items list
  const getCardIndex = useCallback((ticketId: string) => {
    return stableItems.current.findIndex((item) => item.ticketId === ticketId);
  }, []);

  // Get number of cards (visible if filtered)
  const getNumCards = useCallback(() => {
    return isFiltered
      ? stableVisibleItems.current.length
      : stableItems.current.length;
  }, [isFiltered]);

  const contextValue: ColumnContextProps = useMemo(() => {
    return {
      columnId,
      getCardIndex,
      getNumCards,
      getOriginalIndex,
      getVisibleIndex,
      isFiltered,
    };
  }, [
    columnId,
    getCardIndex,
    getNumCards,
    getOriginalIndex,
    getVisibleIndex,
    isFiltered,
  ]);

  const getColumnClassName = () => {
    let className = "column-component";

    if (state.type === "is-card-over") {
      className += " card-over";
    }

    return className;
  };

  const handleAddTicket = (ticketData: TicketType) => {
    // Add to search index when creating a new ticket
    addToSearchIndex(ticketData);

    addCard({
      columnId,
      ticket: ticketData,
      trigger: "keyboard",
    });
  };

  return (
    <ColumnContext.Provider value={contextValue}>
      <div
        data-testid={`column-${columnId}`}
        ref={columnRef}
        className={getColumnClassName()}
      >
        <div
          className="column-inner"
          ref={columnInnerRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="column-content">
            <div
              className="column-header"
              ref={headerRef}
              data-testid={`column-header-${columnId}`}
            >
              <span
                className="column-title"
                data-testid={`column-header-title-${columnId}`}
              >
                {column.title}
              </span>
              <span className="column-count">
                {isFiltered
                  ? `${visibleItems.length}/${column.items.length}`
                  : column.items.length}
              </span>
            </div>
            <div className="column-scrollable" ref={scrollableRef}>
              <div className="column-tickets">
                {visibleItems.map((item) => (
                  <Ticket
                    key={item.ticketId}
                    name={item.name}
                    number={item.number}
                    tags={item.tags}
                    ticketId={item.ticketId}
                  />
                ))}
                {visibleItems.length === 0 && (
                  <div className="empty-column-drop-area">
                    {isFiltered && column.items.length > 0 ? (
                      <div className="no-results-message">
                        No matching tickets
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <div className="column-footer">
              {isHovered && column.title.toLowerCase() !== "done" && (
                <div
                  className="add-item"
                  onClick={() => setIsAddModalOpen(true)}
                  style={{ cursor: "pointer" }}
                >
                  + Add Item
                </div>
              )}
            </div>
          </div>
        </div>
        {showBottomIndicator && visibleItems.length > 0 && (
          <DropIndicator edge="bottom" gap="4px" />
        )}
      </div>

      <CreateTicketModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddTicket}
        columnTitle={column.title}
        columnId={columnId}
        availableTags={dummyTags}
      />
    </ColumnContext.Provider>
  );
});

export default Column;
