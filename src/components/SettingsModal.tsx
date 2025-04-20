import React, { useEffect, useState } from "react";
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, } from "@atlaskit/modal-dialog";
import Button from "@atlaskit/button/new";
import { CheckboxField } from "@atlaskit/form";
import Checkbox from "@atlaskit/checkbox";
import SectionMessage from "@atlaskit/section-message";
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import TextField from "@atlaskit/textfield";
import InfoIcon from "@atlaskit/icon/glyph/info";
import Tooltip from "@atlaskit/tooltip";
import { NotificationType } from "../types";

interface Shortcut {
    id: string;
    name: string;
    description: string;
    defaultShortcut: string;
    currentShortcut: string;
}

const SettingsModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isICloudAvailable, setIsICloudAvailable] = useState<boolean>(false);
    const [isICloudEnabled, setIsICloudEnabled] = useState<boolean>(false);
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
    const [isRecording, setIsRecording] = useState<string | null>(null);
    const [notification, setNotification] = useState<{
        type: NotificationType;
        message: string;
    } | null>(null);

    useEffect(() => {
        if (window.electron) {
            window.electron.onOpenSettings(() => {
                setIsOpen(true);
            });
        }
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            if (window.electron) {
                try {

                    const available = await window.electron.isICloudAvailable();
                    const enabled = await window.electron.isICloudEnabled();
                    setIsICloudAvailable(available);
                    setIsICloudEnabled(enabled);

                    const savedShortcuts = await window.electron.getKeyboardShortcuts();
                    if (savedShortcuts) {
                        setShortcuts(savedShortcuts);
                    } else {

                        setShortcuts([
                                         {
                                             id: "openTray",
                                             name: "Open Tray Popup",
                                             description: "Show the tray popup window",
                                             defaultShortcut: "Alt+Space",
                                             currentShortcut: "Alt+Space",
                                         },
                                         {
                                             id: "createTicket",
                                             name: "Create New Ticket",
                                             description: "Create a new ticket from tray",
                                             defaultShortcut: "Alt+N",
                                             currentShortcut: "Alt+N",
                                         }
                                     ]);
                    }
                } catch (error) {
                    console.error("Error loading settings:", error);
                    setNotification({
                                        type: "error",
                                        message: "Failed to load settings. Please try again."
                                    });
                }
            }
        };

        if (isOpen) {
            loadSettings();
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
                setNotification({
                                    type: "success",
                                    message: enabled ? "iCloud sync enabled" : "iCloud sync disabled"
                                });
            } else {
                setNotification({
                                    type: "error",
                                    message: "Failed to change iCloud sync setting"
                                });
            }
        }
    };

    const handleShortcutClick = (shortcutId: string) => {
        setIsRecording(shortcutId);
    };

    const handleShortcutKeyDown = async (e: React.KeyboardEvent, shortcutId: string) => {
        e.preventDefault();

        if (e.key === "Escape") {
            setIsRecording(null);
            return;
        }

        let shortcut = "";

        if (e.ctrlKey) shortcut += "Ctrl+";
        if (e.altKey) shortcut += "Alt+";
        if (e.shiftKey) shortcut += "Shift+";
        if (e.metaKey) shortcut += "Cmd+";

        const key = e.key === " " ? "Space" : e.key;
        shortcut += key.charAt(0).toUpperCase() + key.slice(1);

        const updatedShortcuts = shortcuts.map(s =>
                                                   s.id === shortcutId ? {...s, currentShortcut: shortcut} : s
        );

        setShortcuts(updatedShortcuts);
        setIsRecording(null);

        if (window.electron) {
            try {
                await window.electron.saveKeyboardShortcuts(updatedShortcuts);
                setNotification({
                                    type: "success",
                                    message: "Keyboard shortcut updated"
                                });
            } catch (error) {
                console.error("Error saving shortcuts:", error);
                setNotification({
                                    type: "error",
                                    message: "Failed to save keyboard shortcut"
                                });
            }
        }
    };

    const resetShortcutToDefault = async (shortcutId: string) => {
        const shortcut = shortcuts.find(s => s.id === shortcutId);
        if (!shortcut) return;

        const updatedShortcuts = shortcuts.map(s =>
                                                   s.id === shortcutId ? {...s, currentShortcut: s.defaultShortcut} : s
        );

        setShortcuts(updatedShortcuts);

        if (window.electron) {
            try {
                await window.electron.saveKeyboardShortcuts(updatedShortcuts);
                setNotification({
                                    type: "success",
                                    message: "Keyboard shortcut reset to default"
                                });
            } catch (error) {
                console.error("Error saving shortcuts:", error);
                setNotification({
                                    type: "error",
                                    message: "Failed to reset keyboard shortcut"
                                });
            }
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setNotification(null);
        setIsRecording(null);
    };

    if (!isOpen) return null;

    return (
        <Modal onClose={ handleClose }>
            <ModalHeader>
                <ModalTitle>Settings</ModalTitle>
            </ModalHeader>
            <ModalBody>
                { notification && (
                    <SectionMessage
                        appearance={ notification.type }
                        title={ notification.type === "error" ? "Error" :
                            notification.type === "warning" ? "Warning" :
                                notification.type === "success" ? "Success" : "Info" }
                    >
                        { notification.message }
                    </SectionMessage>
                ) }

                <Tabs id="settings-tabs">
                    <TabList>
                        <Tab>General</Tab>
                        <Tab>Shortcuts</Tab>
                    </TabList>

                    <TabPanel>
                        <div style={ {marginBottom: "20px"} }>
                            <h4>Data Sync</h4>

                            { isICloudAvailable ? (
                                <CheckboxField name="icloud-sync">
                                    { ({fieldProps}) => (
                                        <Checkbox
                                            { ...fieldProps }
                                            label="Enable iCloud Sync"
                                            isChecked={ isICloudEnabled }
                                            onChange={ handleICloudToggle }
                                        />
                                    ) }
                                </CheckboxField>
                            ) : (
                                <SectionMessage appearance="warning" title="iCloud Not Available">
                                    <p>
                                        iCloud sync is only available on macOS devices with iCloud Drive
                                        enabled.
                                    </p>
                                </SectionMessage>
                            ) }

                            <div style={ {marginTop: "12px"} }>
                                <p style={ {fontSize: "12px", color: "#6B778C"} }>
                                    When enabled, your board data will be synced across all your
                                    devices using iCloud.
                                </p>
                            </div>
                        </div>
                    </TabPanel>

                    <TabPanel>
                        <div style={ {marginBottom: "20px"} }>
                            <h4>Keyboard Shortcuts</h4>
                            <p style={ {fontSize: "14px", color: "#6B778C", marginBottom: "16px"} }>
                                Configure keyboard shortcuts for quick actions
                            </p>

                            <div style={ {display: "flex", flexDirection: "column", gap: "16px"} }>
                                { shortcuts.map((shortcut) => (
                                    <div key={ shortcut.id }
                                         style={ {display: "flex", alignItems: "center", gap: "8px"} }>
                                        <div style={ {flex: 1} }>
                                            <div style={ {fontWeight: 500} }>{ shortcut.name }</div>
                                            <div style={ {
                                                fontSize: "12px",
                                                color: "#6B778C",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px"
                                            } }>
                                                { shortcut.description }
                                                <Tooltip
                                                    content="Click the input field and press the keys you want to use for this shortcut">
                                                    <InfoIcon size="small" label="Info"/>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        <div style={ {width: "160px"} }>
                                            <TextField
                                                isReadOnly
                                                value={ isRecording === shortcut.id ? "Press keys..." : shortcut.currentShortcut }
                                                onClick={ () => handleShortcutClick(shortcut.id) }
                                                onKeyDown={ (e) => isRecording === shortcut.id && handleShortcutKeyDown(e, shortcut.id) }
                                            />
                                        </div>
                                        <Button
                                            appearance="subtle"
                                            onClick={ () => resetShortcutToDefault(shortcut.id) }
                                            isDisabled={ shortcut.currentShortcut === shortcut.defaultShortcut }
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                )) }
                            </div>
                        </div>
                    </TabPanel>
                </Tabs>
            </ModalBody>
            <ModalFooter>
                <Button appearance="primary" onClick={ handleClose }>
                    Close
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default SettingsModal;