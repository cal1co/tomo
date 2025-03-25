import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import invariant from "tiny-invariant";
import { IconButton } from "@atlaskit/button/new";
import DropdownMenu, {
  type CustomTriggerProps,
  DropdownItem,
  DropdownItemGroup,
} from "@atlaskit/dropdown-menu";
import mergeRefs from "@atlaskit/ds-lib/merge-refs";
import MoreIcon from "@atlaskit/icon/utility/migration/show-more-horizontal--editor-more";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { centerUnderPointer } from "@atlaskit/pragmatic-drag-and-drop/element/center-under-pointer";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";

import "../../styles/board";
import Ticket from "../Ticket";
import CreateTicketModal from "../CreateTicketModal";
import { ColumnType, TagType, TicketType } from "../../types";
import { useBoardContext } from "./board-context";
import {
  ColumnContext,
  type ColumnContextProps,
  useColumnContext,
} from "./column-context";

type State =
  | { type: "idle" }
  | { type: "is-card-over" }
  | { type: "is-column-over"; closestEdge: Edge | null }
  | { type: "generate-safari-column-preview"; container: HTMLElement }
  | { type: "generate-column-preview" };

const idle: State = { type: "idle" };
const isCardOver: State = { type: "is-card-over" };

// DELETE ME
const dummyTags: TagType[] = [
  { color: "purple", name: "tag", id: "1" },
  { color: "green", name: "tag", id: "2" },
  { color: "blue", name: "tag", id: "3" },
  { color: "blue", name: "TEST", id: "3" },
];

function SafariColumnPreview({ column }: { column: ColumnType }) {
  return (
    <div className="column-header-preview">
      <span className="column-title">{column.title}</span>
    </div>
  );
}

function ActionMenu() {
  return (
    <DropdownMenu trigger={DropdownMenuTrigger}>
      <ActionMenuItems />
    </DropdownMenu>
  );
}

function ActionMenuItems() {
  const { columnId } = useColumnContext();
  const { getColumns, reorderColumn } = useBoardContext();

  const columns = getColumns();
  const startIndex = columns.findIndex(
    (column) => column.columnId === columnId
  );

  const moveLeft = useCallback(() => {
    reorderColumn({
      startIndex,
      finishIndex: startIndex - 1,
    });
  }, [reorderColumn, startIndex]);

  const moveRight = useCallback(() => {
    reorderColumn({
      startIndex,
      finishIndex: startIndex + 1,
    });
  }, [reorderColumn, startIndex]);

  const isMoveLeftDisabled = startIndex === 0;
  const isMoveRightDisabled = startIndex === columns.length - 1;

  return (
    <DropdownItemGroup>
      <DropdownItem isDisabled={isMoveLeftDisabled}>Add Item</DropdownItem>
      <DropdownItem onClick={moveLeft} isDisabled={isMoveLeftDisabled}>
        Move left
      </DropdownItem>
      <DropdownItem onClick={moveRight} isDisabled={isMoveRightDisabled}>
        Move right
      </DropdownItem>
    </DropdownItemGroup>
  );
}

function DropdownMenuTrigger({
  triggerRef,
  ...triggerProps
}: CustomTriggerProps) {
  return (
    <IconButton
      ref={mergeRefs([triggerRef])}
      appearance="subtle"
      label="Actions"
      spacing="compact"
      icon={MoreIcon}
      {...triggerProps}
    />
  );
}

export const Column = memo(function Column({ column }: { column: ColumnType }) {
  const columnId = column.columnId;
  const columnRef = useRef<HTMLDivElement | null>(null);
  const columnInnerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<State>(idle);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const { instanceId, registerColumn, moveCard, getColumns, addCard } =
    useBoardContext();

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
      draggable({
        element: columnRef.current,
        dragHandle: headerRef.current,
        getInitialData: () => ({ columnId, type: "column", instanceId }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          const isSafari: boolean =
            navigator.userAgent.includes("AppleWebKit") &&
            !navigator.userAgent.includes("Chrome");

          if (!isSafari) {
            setState({ type: "generate-column-preview" });
            return;
          }
          setCustomNativeDragPreview({
            getOffset: centerUnderPointer,
            render: ({ container }) => {
              setState({
                type: "generate-safari-column-preview",
                container,
              });
              return () => setState(idle);
            },
            nativeSetDragImage,
          });
        },
        onDragStart: () => {
          setIsDragging(true);
        },
        onDrop() {
          setState(idle);
          setIsDragging(false);
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
        onDragEnter: () => setState(isCardOver),
        onDragLeave: () => setState(idle),
        onDragStart: () => setState(isCardOver),
        onDrag: () => {
          if (column.items.length === 0) {
            setState(isCardOver);
          }
        },
        onDrop: (args) => {
          if (column.items.length === 0 && args.source.data.type === "card") {
            const itemId = args.source.data.itemId;
            if (args.location.initial.dropTargets.length >= 2) {
              const [, startColumnRecord] = args.location.initial.dropTargets;
              const sourceId = startColumnRecord.data.columnId;

              if (typeof sourceId === "string" && typeof itemId === "string") {
                const sourceColumn = stableData.current.columnMap[sourceId];
                const itemIndex = sourceColumn.items.findIndex(
                  (item) => item.ticketId === itemId
                );

                moveCard({
                  itemIndexInStartColumn: itemIndex,
                  startColumnId: sourceId,
                  finishColumnId: columnId,
                  trigger: "pointer",
                });
              }
            }
          }
          setState(idle);
        },
      }),
      dropTargetForElements({
        element: columnRef.current,
        canDrop: ({ source }) => {
          return (
            source.data.instanceId === instanceId &&
            source.data.type === "column"
          );
        },
        getIsSticky: () => true,
        getData: ({ input, element }) => {
          const data = {
            columnId,
          };
          return attachClosestEdge(data, {
            input,
            element,
            allowedEdges: ["left", "right"],
          });
        },
        onDragEnter: (args) => {
          setState({
            type: "is-column-over",
            closestEdge: extractClosestEdge(args.self.data),
          });
        },
        onDrag: (args) => {
          setState((current) => {
            const closestEdge: Edge | null = extractClosestEdge(args.self.data);
            if (
              current.type === "is-column-over" &&
              current.closestEdge === closestEdge
            ) {
              return current;
            }
            return {
              type: "is-column-over",
              closestEdge,
            };
          });
        },
        onDragLeave: () => {
          setState(idle);
        },
        onDrop: () => {
          setState(idle);
        },
      }),
      autoScrollForElements({
        element: scrollableRef.current,
        canScroll: ({ source }) =>
          source.data.instanceId === instanceId && source.data.type === "card",
      })
    );
  }, [columnId, registerColumn, instanceId, moveCard]);

  const stableItems = useRef(column.items);
  useEffect(() => {
    stableItems.current = column.items;
  }, [column.items]);

  const getCardIndex = useCallback((ticketId: string) => {
    return stableItems.current.findIndex((item) => item.ticketId === ticketId);
  }, []);

  const getNumCards = useCallback(() => {
    return stableItems.current.length;
  }, []);

  const contextValue: ColumnContextProps = useMemo(() => {
    return { columnId, getCardIndex, getNumCards };
  }, [columnId, getCardIndex, getNumCards]);

  const getColumnClassName = () => {
    let className = "column-component";

    if (state.type === "is-card-over") {
      className += " card-over";
    }

    if (state.type === "generate-column-preview") {
      className += " preview-generating";
    }

    return className;
  };

  // Handle adding a new ticket
  const handleAddTicket = (ticketData: Omit<TicketType, "ticketId">) => {
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
          <div className={`column-content ${isDragging ? "dragging" : ""}`}>
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
              <ActionMenu />
            </div>
            <div className="column-scrollable" ref={scrollableRef}>
              <div className="column-tickets">
                {column.items.map((item) => (
                  <Ticket
                    key={item.ticketId}
                    name={item.name}
                    number={item.number}
                    tags={item.tags}
                    ticketId={item.ticketId}
                  />
                ))}
                {column.items.length === 0 && (
                  <div className="empty-column-drop-area"></div>
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
        {state.type === "is-column-over" && state.closestEdge && (
          <DropIndicator edge={state.closestEdge} gap="8px" />
        )}
      </div>
      {state.type === "generate-safari-column-preview"
        ? createPortal(<SafariColumnPreview column={column} />, state.container)
        : null}

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
