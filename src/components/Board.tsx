import React, { useState, useEffect } from "react";
import Ticket from "./Ticket";
import "../styles/board";

interface BoardProps {
  isTrayWindow: boolean;
}

const Board: React.FC<BoardProps> = ({ isTrayWindow }) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedOption, setSelectedOption] = useState("option1");
  const [checkboxState, setCheckboxState] = useState(false);

  useEffect(() => {
    if (window.electron && window.electron.receive) {
      window.electron.receive("sync-state-update", (state) => {
        console.log("Received state update:", state);
        setInputValue(state.inputValue);
        setSelectedOption(state.selectedOption);
        setCheckboxState(state.checkboxState);
      });
    }

    return () => {
      if (window.electron && window.electron.removeListener) {
        window.electron.removeListener("sync-state-update");
      }
    };
  }, []);

  const syncState = (newState: any) => {
    if (window.electron && window.electron.send) {
      window.electron.send("sync-state", newState);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    syncState({ inputValue: newValue, selectedOption, checkboxState });
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSelectedOption(newValue);
    syncState({ inputValue, selectedOption: newValue, checkboxState });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setCheckboxState(newValue);
    syncState({ inputValue, selectedOption, checkboxState: newValue });
  };

  return (
    <div className="board-component">
      <div className="board-title">TODO</div>
      <div className="todo-group">
        <Ticket />
        <Ticket />
        <Ticket />

        {/* <label htmlFor="shared-input">Input Field:</label>
        <input
          id="shared-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Type something..."
        /> */}
      </div>
      {/* 
      <div className="done-group">
        <label>Radio Options:</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="options"
              value="option1"
              checked={selectedOption === "option1"}
              onChange={handleRadioChange}
            />
            Option 1
          </label>
          <label>
            <input
              type="radio"
              name="options"
              value="option2"
              checked={selectedOption === "option2"}
              onChange={handleRadioChange}
            />
            Option 2
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={checkboxState}
            onChange={handleCheckboxChange}
          />
          Toggle this checkbox
        </label>
      </div>

      <div className="state-display">
        <p>Current State:</p>
        <pre>
          {JSON.stringify(
            { inputValue, selectedOption, checkboxState },
            null,
            2
          )}
        </pre>
        <p>Component in: {isTrayWindow ? "Tray Window" : "Main Window"}</p>
      </div>

      <style>{`
        .shared-component {
          padding: ${isTrayWindow ? "10px" : "20px"};
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: #f9f9f9;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: ${isTrayWindow ? "normal" : "bold"};
        }
        
        input[type="text"] {
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        
        .radio-group {
          display: flex;
          gap: 15px;
        }
        
        .radio-group label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: normal;
        }
        
        .state-display {
          margin-top: 20px;
          padding: 10px;
          background-color: #eee;
          border-radius: 4px;
        }
        
        pre {
          background-color: #f0f0f0;
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
        }
      `}</style>
      */}
    </div>
  );
};

export default Board;
