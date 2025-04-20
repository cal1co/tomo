import React, { useCallback, useEffect, useRef, useState } from "react";
import TextField from "@atlaskit/textfield";
import SearchIcon from "@atlaskit/icon/core/search";
import CrossIcon from "@atlaskit/icon/core/cross-circle";
import { useSearch } from "./search/search-context";
import { IconButton } from "@atlaskit/button/new";
import MoreIcon from "@atlaskit/icon/utility/migration/show-more-horizontal--editor-more";
import DropdownMenu, { DropdownItem, DropdownItemGroup } from "@atlaskit/dropdown-menu";
import TagConfigModal from "./TagConfigModal";
import GroupConfigModal from "./GroupConfigModal";
import CreateTicketModal from "./CreateTicketModal";
import { useBoardContext } from "./board/board-context";
import { TicketType } from "../types";

const BoardUtilsPanel = () => {
    const {searchTerm, setSearchTerm} = useSearch();
    const [inputValue, setInputValue] = useState(searchTerm);
    const [isTagConfigOpen, setIsTagConfigOpen] = useState(false);
    const [isGroupConfigOpen, setIsGroupConfigOpen] = useState(false);
    const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const {addCard, getColumns} = useBoardContext();

    const updateSearchTermDebounced = useCallback(
        (value: string) => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                setSearchTerm(value);
                debounceTimerRef.current = null;
            }, 50);
        },
        [setSearchTerm]
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setInputValue(value);
            updateSearchTermDebounced(value);
        },
        [updateSearchTermDebounced]
    );

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (window.electron && typeof window.electron.receive === 'function') {
            const handleShowCreateTicket = () => {
                console.log('Received show-create-ticket event in BoardUtilsPanel');
                setIsCreateTicketOpen(true);
            };

            window.electron.receive('show-create-ticket', handleShowCreateTicket);

            return () => {
                if (window.electron && typeof window.electron.removeListener === 'function') {
                    window.electron.removeListener('show-create-ticket');
                }
            };
        }
    }, []);

    const clearSearch = useCallback(() => {
        setInputValue("");
        setSearchTerm("");

        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, 0);
    }, [setSearchTerm]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Escape") {
                clearSearch();
            }
        },
        [clearSearch]
    );

    const handleContainerClick = useCallback(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleOpenTagConfig = useCallback(() => {
        setIsTagConfigOpen(true);
    }, []);

    const handleCloseTagConfig = useCallback(() => {
        setIsTagConfigOpen(false);
    }, []);

    const handleOpenGroupConfig = useCallback(() => {
        setIsGroupConfigOpen(true);
    }, []);

    const handleCloseGroupConfig = useCallback(() => {
        setIsGroupConfigOpen(false);
    }, []);

    const handleCreateTicket = useCallback(() => {
        setIsCreateTicketOpen(true);
    }, []);

    const handleCloseCreateTicket = useCallback(() => {
        setIsCreateTicketOpen(false);
    }, []);

    const handleSubmitTicket = useCallback((ticket: TicketType) => {
        const columns = getColumns();
        if (columns.length > 0) {
            addCard({
                        columnId: columns[0].columnId,
                        ticket
                    });
        }
        setIsCreateTicketOpen(false);
    }, [addCard, getColumns]);

    const columns = getColumns();
    const columnTitle = columns.length > 0 ? columns[0].title : 'TODO';
    const columnId = columns.length > 0 ? columns[0].columnId : 'todo';

    return (
        <>
            <div className="board-utils">
                <div
                    className={ `search-field ${ searchTerm ? "active" : "" }` }
                    onClick={ handleContainerClick }
                >
                    <TextField
                        isCompact
                        appearance="standard"
                        label="Search tickets"
                        placeholder="Search tickets"
                        value={ inputValue }
                        onChange={ handleChange }
                        onKeyDown={ handleKeyDown }
                        ref={ inputRef }
                        elemBeforeInput={
                            <div className="search-input-icon">
                                <SearchIcon label="search"/>
                            </div>
                        }
                        elemAfterInput={
                            inputValue ? (
                                <div
                                    className="search-input-clear"
                                    onClick={ (e) => {
                                        e.stopPropagation();
                                        clearSearch();
                                    } }
                                >
                                    <CrossIcon label="clear search"/>
                                </div>
                            ) : null
                        }
                    />
                </div>

                <div className="board-utils-settings">
                    <DropdownMenu
                        trigger={ ({triggerRef, ...triggerProps}) => (
                            <IconButton
                                ref={ triggerRef }
                                icon={ MoreIcon }
                                label={ `Actions for board` }
                                appearance="default"
                                spacing="compact"
                                { ...triggerProps }
                            />
                        ) }
                    >
                        <DropdownItemGroup>
                            <DropdownItem onClick={ handleOpenTagConfig }>Configure Tags</DropdownItem>
                            <DropdownItem onClick={ handleOpenGroupConfig }>Configure Groups</DropdownItem>
                        </DropdownItemGroup>
                    </DropdownMenu>
                </div>
            </div>

            {/* Modals */ }
            { isTagConfigOpen && (
                <TagConfigModal
                    isOpen={ isTagConfigOpen }
                    onClose={ handleCloseTagConfig }
                />
            ) }

            { isGroupConfigOpen && (
                <GroupConfigModal
                    isOpen={ isGroupConfigOpen }
                    onClose={ handleCloseGroupConfig }
                />
            ) }

            { isCreateTicketOpen && (
                <CreateTicketModal
                    isOpen={ isCreateTicketOpen }
                    onClose={ handleCloseCreateTicket }
                    onSubmit={ handleSubmitTicket }
                    columnTitle={ columnTitle }
                    columnId={ columnId }
                />
            ) }
        </>
    );
};

export default BoardUtilsPanel;