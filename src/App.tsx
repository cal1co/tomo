import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import SettingsModal from "./components/SettingsModal";
import Board from "./components/BoardComponent";
import Notification from "./components/Notification";

type NotificationData = {
  type: "success" | "error" | "info" | "warning";
  message: string;
};

const App: React.FC = () => {
  const [isTrayWindow, setIsTrayWindow] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationData | null>(
    null
  );
  const [isInitialStateLoaded, setIsInitialStateLoaded] =
    useState<boolean>(false);

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

  useEffect(() => {
    const loadInitialState = async () => {
      console.log("App: Checking for saved state...");
      try {
        if (
          window.electron &&
          typeof window.electron.getBoardState === "function"
        ) {
          const state = await window.electron.getBoardState();
          if (state) {
            console.log("App: Initial state loaded from storage");
          } else {
            console.log("App: No saved state found");
          }
        } else {
          console.log("App: getBoardState method not available");
        }
      } catch (error) {
        console.error("App: Error loading initial state:", error);
      } finally {
        setIsInitialStateLoaded(true);
      }
    };

    loadInitialState();
  }, []);

  useEffect(() => {
    if (window.electron && typeof window.electron.receive === "function") {
      window.electron.receive("show-message", (data: NotificationData) => {
        setNotification(data);
      });
    }

    return () => {
      if (
        window.electron &&
        typeof window.electron.removeListener === "function"
      ) {
        window.electron.removeListener("show-message");
      }
    };
  }, []);

  if (!isInitialStateLoaded) {
    return <div className="loading">Loading...</div>;
  }

  if (isTrayWindow) {
    return (
      <div className="tray-container">
        <div className="tray-content">
          <Board isTrayWindow={true} />
        </div>
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="app-content">
        <SettingsModal />
        <Board isTrayWindow={false} />
      </div>
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
};

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

export default App;
