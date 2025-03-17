import React, { useEffect, useState } from "react";

const SettingsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    window.electron.onOpenSettings(() => {
      setIsOpen(true);
    });
  }, []);

  return isOpen ? (
    <div className="modal">
      <div className="modal-content">
        <h2>Settings</h2>
        <button onClick={() => setIsOpen(false)}>Close</button>
      </div>
    </div>
  ) : null;
};

export default SettingsModal;
