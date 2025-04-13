import TextField from "@atlaskit/textfield";
import SearchIcon from "@atlaskit/icon/core/search";
import { css, jsx } from "@compiled/react";
import { token } from "@atlaskit/tokens";

const BoardUtilsPanel = () => {
  return (
    <div className="board-utils">
      <div className="search-field">
        <TextField
          isCompact
          appearance="standard"
          label="Standard"
          placeholder="Search board"
          elemBeforeInput={
            <div className="search-input-icon">
              <SearchIcon label="search" />
            </div>
          }
        />
      </div>
    </div>
  );
};

export default BoardUtilsPanel;
