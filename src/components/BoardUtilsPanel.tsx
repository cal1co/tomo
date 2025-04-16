import React, { useState, useCallback, useRef, useEffect } from "react";
import TextField from "@atlaskit/textfield";
import SearchIcon from "@atlaskit/icon/core/search";
import CrossIcon from "@atlaskit/icon/core/cross-circle";
import { useSearch } from "./search/search-context";

const BoardUtilsPanel: React.FC = () => {
  const { searchTerm, setSearchTerm, isFiltered } = useSearch();
  const [inputValue, setInputValue] = useState(searchTerm);
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
      }, 300);
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

  return (
    <div className="board-utils">
      <div
        className={`search-field ${searchTerm ? "active" : ""}`}
        onClick={handleContainerClick}
      >
        <TextField
          isCompact
          appearance="standard"
          label="Search tickets"
          placeholder="Search tickets"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          ref={inputRef}
          elemBeforeInput={
            <div className="search-input-icon">
              <SearchIcon label="search" />
            </div>
          }
          elemAfterInput={
            inputValue ? (
              <div
                className="search-input-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSearch();
                }}
              >
                <CrossIcon label="clear search" />
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
};

export default BoardUtilsPanel;
