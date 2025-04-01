import React, { useEffect, useState } from "react";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@atlaskit/modal-dialog";
import Button from "@atlaskit/button/new";
import { CheckboxField } from "@atlaskit/form";
import { Checkbox } from "@atlaskit/checkbox";
import SectionMessage from "@atlaskit/section-message";

const SettingsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isICloudAvailable, setIsICloudAvailable] = useState<boolean>(false);
  const [isICloudEnabled, setIsICloudEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (window.electron) {
      window.electron.onOpenSettings(() => {
        setIsOpen(true);
      });
    }
  }, []);

  useEffect(() => {
    const checkICloudStatus = async () => {
      if (window.electron) {
        const available = await window.electron.isICloudAvailable();
        const enabled = await window.electron.isICloudEnabled();

        setIsICloudAvailable(available);
        setIsICloudEnabled(enabled);
      }
    };

    if (isOpen) {
      checkICloudStatus();
    }
  }, [isOpen]);

  const handleICloudToggle = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const enabled = event.target.checked;

    if (window.electron) {
      const success = await window.electron.toggleICloud(enabled);
      if (success) {
        setIsICloudEnabled(enabled);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={handleClose}>
      <ModalHeader>
        <ModalTitle>Settings</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ marginBottom: "20px" }}>
          <h4>Data Sync</h4>

          {isICloudAvailable ? (
            <CheckboxField name="icloud-sync">
              {({ fieldProps }) => (
                <Checkbox
                  {...fieldProps}
                  label="Enable iCloud Sync"
                  isChecked={isICloudEnabled}
                  onChange={handleICloudToggle}
                />
              )}
            </CheckboxField>
          ) : (
            <SectionMessage appearance="warning" title="iCloud Not Available">
              <p>
                iCloud sync is only available on macOS devices with iCloud Drive
                enabled.
              </p>
            </SectionMessage>
          )}

          <div style={{ marginTop: "12px" }}>
            <p style={{ fontSize: "12px", color: "#6B778C" }}>
              When enabled, your board data will be synced across all your
              devices using iCloud.
            </p>
          </div>
        </div>

        {/* You can add more settings sections here */}
      </ModalBody>
      <ModalFooter>
        <Button appearance="primary" onClick={handleClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default SettingsModal;
