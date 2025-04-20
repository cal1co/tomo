import React, { forwardRef, Fragment, memo, type Ref, useCallback, useEffect, useMemo, useRef, useState, } from "react";
import ReactDOM from "react-dom";
import invariant from "tiny-invariant";
import { IconButton } from "@atlaskit/button/new";
import DropdownMenu, { DropdownItem, DropdownItemGroup, } from "@atlaskit/dropdown-menu";
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
import { draggable, dropTargetForElements, } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";

import "../styles/ticket.css";
import Tag from "./Tag";
import { TagType, TicketType } from "../types";
import { useBoardContext } from "./board/board-context";
import { useColumnContext } from "./board/column-context";
import TicketViewModal from "./TicketViewModal";
import { useSearch } from "./search/search-context";

type State =
    | { type: "idle" }
    | { type: "preview"; container: HTMLElement; rect: DOMRect }
    | { type: "dragging" };

const idleState: State = {type: "idle"};
const draggingState: State = {type: "dragging"};

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
    const {moveCard} = useBoardContext();
    const {columnId, isFiltered, getOriginalIndex} = useColumnContext();

    const onClick = useCallback(() => {

        const actualIndex = startIndex;

        moveCard({
                     startColumnId: columnId,
                     finishColumnId: targetColumn.columnId,
                     itemIndexInStartColumn: actualIndex,
                 });
    }, [columnId, moveCard, startIndex, targetColumn.columnId]);

    return <DropdownItem onClick={ onClick }>{ targetColumn.title }</DropdownItem>;
}

function LazyDropdownItems({ticketId}: { ticketId: string }) {
    const {getColumns, deleteCard} = useBoardContext();
    const {columnId, getCardIndex, isFiltered, getOriginalIndex} =
        useColumnContext();

    const visibleIndex = getCardIndex(ticketId);
    const actualIndex = isFiltered ? getOriginalIndex(ticketId) : visibleIndex;

    const deleteTicket = useCallback(() => {
        deleteCard({columnId, ticketId});
    }, [columnId, deleteCard, ticketId]);

    const moveColumnOptions = getColumns().filter(
        (column) => column.columnId !== columnId
    );

    return (
        <Fragment>
            <DropdownItemGroup title="">
                <DropdownItem onClick={ deleteTicket }>Delete</DropdownItem>
            </DropdownItemGroup>
            { moveColumnOptions.length ? (
                <DropdownItemGroup title="Move to">
                    { moveColumnOptions.map((column) => (
                        <MoveToOtherColumnItem
                            key={ column.columnId }
                            targetColumn={ column }
                            startIndex={ actualIndex }
                        />
                    )) }
                </DropdownItemGroup>
            ) : null }
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

            if ((e.target as HTMLElement).closest(".ticket-actions")) {
                return;
            }

            if (onClick) {
                onClick();
            }
        };

        return (
            <div
                ref={ ref }
                className="ticket-group"
                data-testid={ `ticket-${ ticketId }` }
                style={ {
                    position: "relative",
                    cursor: state.type === "idle" ? "grab" : "default",
                    opacity: state.type === "dragging" ? 0.4 : 1,
                    boxShadow: state.type !== "preview" ? "var(--shadow-raised)" : "none",
                } }
                onClick={ handleClick }
            >
                <div className="ticket-title">{ name }</div>
                <div className="ticket-tags">
                    { tags.map((tag) => (
                        <Tag key={ tag.id } name={ tag.name } color={ tag.color } id={ tag.id }/>
                    )) }
                </div>
                <div className="ticket-number">{ number }</div>
                <div className="ticket-actions">
                    <DropdownMenu
                        trigger={ ({triggerRef, ...triggerProps}) => (
                            <IconButton
                                ref={
                                    actionMenuTriggerRef
                                        ? mergeRefs([triggerRef, actionMenuTriggerRef])
                                        : mergeRefs([triggerRef])
                                }
                                icon={ MoreIcon }
                                label={ `Actions for ${ name }` }
                                appearance="default"
                                spacing="compact"
                                { ...triggerProps }
                            />
                        ) }
                    >
                        <LazyDropdownItems ticketId={ ticketId }/>
                    </DropdownMenu>
                </div>
                { closestEdge && <DropIndicator edge={ closestEdge } gap="4px"/> }
            </div>
        );
    }
);

export const Ticket = memo(function Ticket({name, number, tags, ticketId}: {
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
    const [isHovered, setIsHovered] = useState(false);

    const {getColumns, moveCard} = useBoardContext();
    const {columnId, getCardIndex, isFiltered, getOriginalIndex} =
        useColumnContext();
    const {updateSearchIndex, removeFromSearchIndex} = useSearch();

    const actionMenuTriggerRef = useRef<HTMLButtonElement>(null);
    const {instanceId, registerCard} = useBoardContext();

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

    const handleCmdClick = useCallback(
        (e: MouseEvent) => {
            if (e.metaKey || e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();

                setIsMoving(true);

                const currentIndex = isFiltered
                    ? getOriginalIndex(ticketId)
                    : getCardIndex(ticketId);

                const columns = getColumns();
                const oppositeColumn = columns.find((col) => col.columnId !== columnId);

                if (oppositeColumn) {

                    moveCard({
                                 startColumnId: columnId,
                                 finishColumnId: oppositeColumn.columnId,
                                 itemIndexInStartColumn: currentIndex,
                                 itemIndexInFinishColumn: 0,
                                 trigger: "keyboard",
                             });

                    setTimeout(() => {
                        setIsMoving(false);
                    }, 300);
                }
            }
        },
        [
            columnId,
            ticketId,
            getCardIndex,
            getOriginalIndex,
            isFiltered,
            getColumns,
            moveCard,
        ]
    );

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

    const {updateCard} = useBoardContext();

    const handleSaveTicket = useCallback(
        (updatedTicket: TicketType) => {

            updateSearchIndex(updatedTicket);

            updateCard({
                           columnId,
                           ticketId,
                           updatedTicket,
                       });

            setIsModalOpen(false);
        },
        [updateCard, columnId, ticketId, updateSearchIndex]
    );

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
        if (ref.current && actionMenuTriggerRef.current) {
            return registerCard({
                                    cardId: ticketId,
                                    entry: {
                                        element: ref.current,
                                        actionMenuTrigger: actionMenuTriggerRef.current,
                                    },
                                });
        }

        if (ref.current) {
            return registerCard({
                                    cardId: ticketId,
                                    entry: {
                                        element: ref.current,

                                        actionMenuTrigger: document.createElement('button'),
                                    },
                                });
        }

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return () => {
        };
    }, [registerCard, ticketId, isHovered]);

    useEffect(() => {
        const element = ref.current;
        invariant(element);
        return combine(
            draggable({
                          element: element,
                          getInitialData: () => ({type: "card", itemId: ticketId, instanceId}),
                          onGenerateDragPreview: ({location, source, nativeSetDragImage}) => {
                              const rect = source.element.getBoundingClientRect();

                              setCustomNativeDragPreview({
                                                             nativeSetDragImage,
                                                             getOffset: preserveOffsetOnSource({
                                                                                                   element,
                                                                                                   input: location.current.input,
                                                                                               }),
                                                             render({container}) {
                                                                 setState({type: "preview", container, rect});
                                                                 return () => setState(draggingState);
                                                             },
                                                         });
                          },
                          onDragStart: () => setState(draggingState),
                          onDrop: () => setState(idleState),
                      }),
            dropTargetForElements({
                                      element: element,
                                      canDrop: ({source}) => {
                                          return (
                                              source.data.instanceId === instanceId && source.data.type === "card"
                                          );
                                      },
                                      getIsSticky: () => true,
                                      getData: ({input, element}) => {
                                          const data = {type: "card", itemId: ticketId};

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
        {color: "purple", name: "tag", id: "1"},
        {color: "green", name: "tag", id: "2"},
        {color: "blue", name: "tag", id: "3"},
    ];

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

    const tooltipContent = `⌘+Click to move to ${
        columnId === "todo" ? "Done" : "TODO"
    }`;

    const {searchTerm} = useSearch();

    const highlightedName = useMemo(() => {
        if (!searchTerm) return name;

        const regex = new RegExp(`(${searchTerm})`, "gi");
        return name.replace(regex, "<mark>$1</mark>");
    }, [name, searchTerm]);

    return (
        <Fragment>
            <Tooltip content={ isCmdHover ? tooltipContent : null } position="top">
                <div
                    ref={ ref }
                    className={ getTicketClassName() }
                    data-testid={ `ticket-${ ticketId }` }
                    style={ {
                        position: "relative",
                        cursor: state.type === "idle" ? "grab" : "default",
                        opacity: state.type === "dragging" ? 0.4 : 1,
                        boxShadow:
                            state.type !== "preview" ? "var(--shadow-raised)" : "none",
                    } }
                    onClick={ (e) => {

                        if (e.metaKey || e.ctrlKey) {
                            return;
                        }

                        if ((e.target as HTMLElement).closest(".ticket-actions")) {
                            return;
                        }

                        handleOpenModal();
                    } }
                    onMouseEnter={ () => setIsHovered(true) }
                    onMouseLeave={ () => setIsHovered(false) }
                >
                    <div
                        className="ticket-title"
                        dangerouslySetInnerHTML={ {__html: highlightedName} }
                    />
                    <div className="ticket-tags">
                        { tags.map((tag) => (
                            <Tag key={ tag.id } name={ tag.name } color={ tag.color } id={ tag.id }/>
                        )) }
                    </div>
                    <div className="ticket-number">{ number }</div>
                    { isHovered && (

                        <div className="ticket-actions">
                            <DropdownMenu
                                trigger={ ({triggerRef, ...triggerProps}) => (
                                    <IconButton
                                        ref={
                                            actionMenuTriggerRef
                                                ? mergeRefs([triggerRef, actionMenuTriggerRef])
                                                : mergeRefs([triggerRef])
                                        }
                                        icon={ MoreIcon }
                                        label={ `Actions for ${ name }` }
                                        appearance="default"
                                        spacing="compact"
                                        { ...triggerProps }
                                    />
                                ) }
                            >
                                <LazyDropdownItems ticketId={ ticketId }/>
                            </DropdownMenu>
                        </div>
                    ) }
                    { closestEdge && <DropIndicator edge={ closestEdge } gap="4px"/> }
                </div>
            </Tooltip>

            { state.type === "preview" &&
                ReactDOM.createPortal(
                    <div
                        style={ {
                            boxSizing: "border-box",
                            width: state.rect.width,
                            height: state.rect.height,
                        } }
                    >
                        <div
                            className="ticket-group"
                            style={ {
                                position: "relative",
                                opacity: 1,
                            } }
                        >
                            <div
                                className="ticket-title"
                                dangerouslySetInnerHTML={ {__html: highlightedName} }
                            />
                            <div className="ticket-tags">
                                { tags.map((tag) => (
                                    <Tag
                                        key={ tag.id }
                                        name={ tag.name }
                                        color={ tag.color }
                                        id={ tag.id }
                                    />
                                )) }
                            </div>
                            <div className="ticket-number">{ number }</div>
                        </div>
                    </div>,
                    state.container
                ) }
            { isModalOpen && ticketData && (
                <TicketViewModal
                    isOpen={ isModalOpen }
                    onClose={ handleCloseModal }
                    ticket={ ticketData }
                    onSave={ handleSaveTicket }
                />
            ) }
        </Fragment>
    );
});

export default Ticket;
