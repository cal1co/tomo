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

const BoardUtilsPanel: React.FC = () => {
	const {searchTerm, setSearchTerm} = useSearch();
	const [inputValue, setInputValue] = useState(searchTerm);
	const [isTagConfigOpen, setIsTagConfigOpen] = useState(false);
	const [isGroupConfigOpen, setIsGroupConfigOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
		</>
	);
};

export default BoardUtilsPanel;