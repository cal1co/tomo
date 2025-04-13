import React, {
  forwardRef,
  Fragment,
  memo,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import invariant from "tiny-invariant";
import { IconButton } from "@atlaskit/button/new";
import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
} from "@atlaskit/dropdown-menu";
import Tooltip from "@atlaskit/tooltip";
import mergeRefs from "@atlaskit/ds-lib/merge-refs";
import MoreIcon from "@atlaskit/icon/utility/migration/show-more-horizontal--editor-more";
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
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";

import "../styles/ticket";
import Tag from "./Tag";
import { TagType, TicketType } from "../types";
import { useBoardContext } from "./board/board-context";
import { useColumnContext } from "./board/column-context";
import TicketViewModal from "./TicketViewModal";

type State =
  | { type: "idle" }
  | { type: "preview"; container: HTMLElement; rect: DOMRect }
  | { type: "dragging" };

const idleState: State = { type: "idle" };
const draggingState: State = { type: "dragging" };

type TicketPrimitiveProps = {
  closestEdge: Edge | null;
  name: string;
  number: string;
  tags: TagType[];
  ticketId: string;
  state: State;
  actionMenuTriggerRef?: Ref<HTMLButtonElement>;
  onClick?: () => void;
};

function MoveToOtherColumnItem({
  targetColumn,
  startIndex,
}: {
  targetColumn: any;
  startIndex: number;
}) {
  const { moveCard } = useBoardContext();
  const { columnId } = useColumnContext();

  const onClick = useCallback(() => {
    moveCard({
      startColumnId: columnId,
      finishColumnId: targetColumn.columnId,
      itemIndexInStartColumn: startIndex,
    });
  }, [columnId, moveCard, startIndex, targetColumn.columnId]);

  return <DropdownItem onClick={onClick}>{targetColumn.title}</DropdownItem>;
}

function LazyDropdownItems({ ticketId }: { ticketId: string }) {
  const { getColumns, deleteCard } = useBoardContext();
  const { columnId, getCardIndex } = useColumnContext();

  const startIndex = getCardIndex(ticketId);

  const deleteTicket = useCallback(() => {
    deleteCard({ columnId, ticketId });
  }, [columnId, deleteCard, ticketId]);

  const moveColumnOptions = getColumns().filter(
    (column) => column.columnId !== columnId
  );

  return (
    <Fragment>
      <DropdownItemGroup title="">
        <DropdownItem onClick={deleteTicket}>Delete</DropdownItem>
      </DropdownItemGroup>
      {moveColumnOptions.length ? (
        <DropdownItemGroup title="Move to">
          {moveColumnOptions.map((column) => (
            <MoveToOtherColumnItem
              key={column.columnId}
              targetColumn={column}
              startIndex={startIndex}
            />
          ))}
        </DropdownItemGroup>
      ) : null}
    </Fragment>
  );
}

const TicketPrimitive = forwardRef<HTMLDivElement, TicketPrimitiveProps>(
  function TicketPrimitive(
    {
      closestEdge,
      name,
      number,
      tags,
      ticketId,
      state,
      actionMenuTriggerRef,
      onClick,
    },
    ref
  ) {
    const handleClick = (e: React.MouseEvent) => {
      // Prevent opening modal when clicking on action menu
      if ((e.target as HTMLElement).closest(".ticket-actions")) {
        return;
      }

      if (onClick) {
        onClick();
      }
    };

    return (
      <div
        ref={ref}
        className="ticket-group"
        data-testid={`ticket-${ticketId}`}
        style={{
          position: "relative",
          cursor: state.type === "idle" ? "grab" : "default",
          opacity: state.type === "dragging" ? 0.4 : 1,
          boxShadow: state.type !== "preview" ? "var(--shadow-raised)" : "none",
        }}
        onClick={handleClick}
      >
        <div className="ticket-title">{name}</div>
        <div className="ticket-tags">
          {tags.map((tag) => (
            <Tag key={tag.id} name={tag.name} color={tag.color} id={tag.id} />
          ))}
        </div>
        <div className="ticket-number">{number}</div>
        <div className="ticket-actions">
          <DropdownMenu
            trigger={({ triggerRef, ...triggerProps }) => (
              <IconButton
                ref={
                  actionMenuTriggerRef
                    ? mergeRefs([triggerRef, actionMenuTriggerRef])
                    : mergeRefs([triggerRef])
                }
                icon={MoreIcon}
                label={`Actions for ${name}`}
                appearance="default"
                spacing="compact"
                {...triggerProps}
              />
            )}
          >
            <LazyDropdownItems ticketId={ticketId} />
          </DropdownMenu>
        </div>
        {closestEdge && <DropIndicator edge={closestEdge} gap="4px" />}
      </div>
    );
  }
);

export const Ticket = memo(function Ticket({
  name,
  number,
  tags,
  ticketId,
}: {
  name: string;
  number: string;
  tags: TagType[];
  ticketId: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
  const [state, setState] = useState<State>(idleState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCmdHover, setIsCmdHover] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const { getColumns, moveCard } = useBoardContext();
  const { columnId, getCardIndex } = useColumnContext();

  const actionMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const { instanceId, registerCard } = useBoardContext();

  const getTicketData = useCallback((): TicketType | null => {
    const columns = getColumns();
    for (const column of columns) {
      const ticket = column.items.find((item) => item.ticketId === ticketId);
      if (ticket) {
        return ticket;
      }
    }
    return null;
  }, [getColumns, ticketId]);

  const [ticketData, setTicketData] = useState<TicketType | null>(null);

  // Handler for Cmd/Ctrl + Click
  const handleCmdClick = useCallback(
    (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();

        // Set moving state for visual feedback
        setIsMoving(true);

        // Get the current index of this ticket
        const currentIndex = getCardIndex(ticketId);

        // Get all columns to find the opposite one
        const columns = getColumns();
        const oppositeColumn = columns.find((col) => col.columnId !== columnId);

        if (oppositeColumn) {
          // Move the card to the top (index 0) of the opposite column
          moveCard({
            startColumnId: columnId,
            finishColumnId: oppositeColumn.columnId,
            itemIndexInStartColumn: currentIndex,
            itemIndexInFinishColumn: 0, // Top of the column
            trigger: "keyboard",
          });

          // Reset the moving state after a short delay
          setTimeout(() => {
            setIsMoving(false);
          }, 300);
        }
      }
    },
    [columnId, ticketId, getCardIndex, getColumns, moveCard]
  );

  // Track command key state for hover effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setIsCmdHover(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setIsCmdHover(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const data = getTicketData();
    setTicketData(data);
  }, [getTicketData]);

  const handleOpenModal = useCallback(() => {
    if (state.type === "idle") {
      const data = getTicketData();
      setTicketData(data);
      setIsModalOpen(true);
    }
  }, [state.type, getTicketData]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Get the updateCard function from context
  const { updateCard } = useBoardContext();

  const handleSaveTicket = useCallback(
    (updatedTicket: TicketType) => {
      updateCard({
        columnId,
        ticketId,
        updatedTicket,
      });

      setIsModalOpen(false);
    },
    [updateCard, columnId, ticketId]
  );

  // Add click event listener for the Cmd/Ctrl + Click feature
  useEffect(() => {
    const element = ref.current;
    if (element) {
      element.addEventListener("click", handleCmdClick);

      return () => {
        element.removeEventListener("click", handleCmdClick);
      };
    }
  }, [handleCmdClick]);

  useEffect(() => {
    invariant(actionMenuTriggerRef.current);
    invariant(ref.current);
    return registerCard({
      cardId: ticketId,
      entry: {
        element: ref.current,
        actionMenuTrigger: actionMenuTriggerRef.current,
      },
    });
  }, [registerCard, ticketId]);

  useEffect(() => {
    const element = ref.current;
    invariant(element);
    return combine(
      draggable({
        element: element,
        getInitialData: () => ({ type: "card", itemId: ticketId, instanceId }),
        onGenerateDragPreview: ({ location, source, nativeSetDragImage }) => {
          const rect = source.element.getBoundingClientRect();

          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: preserveOffsetOnSource({
              element,
              input: location.current.input,
            }),
            render({ container }) {
              setState({ type: "preview", container, rect });
              return () => setState(draggingState);
            },
          });
        },
        onDragStart: () => setState(draggingState),
        onDrop: () => setState(idleState),
      }),
      dropTargetForElements({
        element: element,
        canDrop: ({ source }) => {
          return (
            source.data.instanceId === instanceId && source.data.type === "card"
          );
        },
        getIsSticky: () => true,
        getData: ({ input, element }) => {
          const data = { type: "card", itemId: ticketId };

          return attachClosestEdge(data, {
            input,
            element,
            allowedEdges: ["top", "bottom"],
          });
        },
        onDragEnter: (args) => {
          if (args.source.data.itemId !== ticketId) {
            setClosestEdge(extractClosestEdge(args.self.data));
          }
        },
        onDrag: (args) => {
          if (args.source.data.itemId !== ticketId) {
            setClosestEdge(extractClosestEdge(args.self.data));
          }
        },
        onDragLeave: () => {
          setClosestEdge(null);
        },
        onDrop: () => {
          setClosestEdge(null);
        },
      })
    );
  }, [instanceId, ticketId]);

  const availableTags: TagType[] = [
    { color: "purple", name: "tag", id: "1" },
    { color: "green", name: "tag", id: "2" },
    { color: "blue", name: "tag", id: "3" },
  ];

  // Determine CSS classes based on state
  const getTicketClassName = () => {
    let className = "ticket-group";

    if (isCmdHover && !isMoving) {
      className += " cmd-hover";
    }

    if (isMoving) {
      className += " cmd-clicked";
    }

    return className;
  };

  // Create the tooltip content based on current column
  const tooltipContent = `⌘+Click to move to ${
    columnId === "todo" ? "Done" : "TODO"
  }`;

  return (
    <Fragment>
      <Tooltip content={isCmdHover ? tooltipContent : null} position="top">
        <div
          ref={ref}
          className={getTicketClassName()}
          data-testid={`ticket-${ticketId}`}
          style={{
            position: "relative",
            cursor: state.type === "idle" ? "grab" : "default",
            opacity: state.type === "dragging" ? 0.4 : 1,
            boxShadow:
              state.type !== "preview" ? "var(--shadow-raised)" : "none",
          }}
          onClick={(e) => {
            // Check if Command key (Mac) or Ctrl key (Windows/Linux) is pressed
            if (e.metaKey || e.ctrlKey) {
              return; // handleCmdClick will handle this
            }

            // Prevent opening modal when clicking on action menu
            if ((e.target as HTMLElement).closest(".ticket-actions")) {
              return;
            }

            handleOpenModal();
          }}
        >
          <div className="ticket-title">{name}</div>
          <div className="ticket-tags">
            {tags.map((tag) => (
              <Tag key={tag.id} name={tag.name} color={tag.color} id={tag.id} />
            ))}
          </div>
          <div className="ticket-number">{number}</div>
          <div className="ticket-actions">
            <DropdownMenu
              trigger={({ triggerRef, ...triggerProps }) => (
                <IconButton
                  ref={
                    actionMenuTriggerRef
                      ? mergeRefs([triggerRef, actionMenuTriggerRef])
                      : mergeRefs([triggerRef])
                  }
                  icon={MoreIcon}
                  label={`Actions for ${name}`}
                  appearance="default"
                  spacing="compact"
                  {...triggerProps}
                />
              )}
            >
              <LazyDropdownItems ticketId={ticketId} />
            </DropdownMenu>
          </div>
          {closestEdge && <DropIndicator edge={closestEdge} gap="4px" />}
        </div>
      </Tooltip>

      {state.type === "preview" &&
        ReactDOM.createPortal(
          <div
            style={{
              boxSizing: "border-box",
              width: state.rect.width,
              height: state.rect.height,
            }}
          >
            <div
              className="ticket-group"
              style={{
                position: "relative",
                opacity: 1,
              }}
            >
              <div className="ticket-title">{name}</div>
              <div className="ticket-tags">
                {tags.map((tag) => (
                  <Tag
                    key={tag.id}
                    name={tag.name}
                    color={tag.color}
                    id={tag.id}
                  />
                ))}
              </div>
              <div className="ticket-number">{number}</div>
            </div>
          </div>,
          state.container
        )}
      {isModalOpen && ticketData && (
        <TicketViewModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          ticket={ticketData}
          availableTags={availableTags}
          onSave={handleSaveTicket}
        />
      )}
    </Fragment>
  );
});

export default Ticket;
