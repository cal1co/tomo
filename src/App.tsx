import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import SettingsModal from "./components/SettingsModal";
import Board from "./components/Board";

const App: React.FC = () => {
  const [isTrayWindow, setIsTrayWindow] = useState<boolean>(false);

  useEffect(() => {
    const checkWindowType = async () => {
      try {
        if (
          window.electron &&
          typeof window.electron.isTrayWindow === "function"
        ) {
          const result = await window.electron.isTrayWindow();
          setIsTrayWindow(result);
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          setIsTrayWindow(urlParams.get("tray") === "true");
        }
      } catch (error) {
        console.error("Error checking window type:", error);
        const urlParams = new URLSearchParams(window.location.search);
        setIsTrayWindow(urlParams.get("tray") === "true");
      }
    };

    checkWindowType();
    if (isTrayWindow) {
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.overflow = "hidden";

      const rootElement = document.getElementById("root");
      if (rootElement) {
        rootElement.style.margin = "0";
        rootElement.style.padding = "0";
        rootElement.style.height = "100%";
      }
    }
  }, [isTrayWindow]);

  if (isTrayWindow) {
    return (
      <div className="tray-container">
        <div className="tray-header">
          <h3>Tray Menu</h3>
        </div>
        <div className="tray-content">
          <Board isTrayWindow={true} />

          <div className="tray-actions">
            <button onClick={() => window.electron.send("show-main-app", null)}>
              Show Main App
            </button>
            <button onClick={() => window.electron.send("quit-app", null)}>
              Quit
            </button>
          </div>
        </div>

        <style>{`
          .tray-container {
            margin: 0;
            padding: 0;
            height: 100vh;
            width: 100vw;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            background-color: #f8f8f8;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          }
          
          .tray-header {
            background-color: #e8e8e8;
            padding: 8px 12px;
            border-bottom: 1px solid #ddd;
          }
          
          .tray-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 500;
          }
          
          .tray-content {
            flex: 1;
            padding: 10px;
            overflow-y: auto;
          }
          
          .tray-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
          }
          
          .tray-actions button {
            padding: 5px 10px;
            background-color: #e0e0e0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          
          .tray-actions button:hover {
            background-color: #d0d0d0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div className="app-content">
        <h2>Hello from React!</h2>
        <SettingsModal />
        {/* <Board /> */}
        <Board isTrayWindow={false} />
      </div>
    </>
  );
};

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

export default App;
