import React, { useEffect, useState } from "react";
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, } from "@atlaskit/modal-dialog";
import Button, { IconButton } from "@atlaskit/button/new";
import TextField from "@atlaskit/textfield";
import { Field } from "@atlaskit/form";
import TrashIcon from "@atlaskit/icon/glyph/trash";
import EditorEditIcon from "@atlaskit/icon/glyph/editor/edit";
import SectionMessage from "@atlaskit/section-message";
import { GroupType } from "../types";

interface GroupConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GroupConfigModal: React.FC<GroupConfigModalProps> = ({isOpen, onClose}) => {
    const [groups, setGroups] = useState<GroupType[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [newGroupName, setNewGroupName] = useState("");
    const [editGroupName, setEditGroupName] = useState("");
    const [notification, setNotification] = useState<{
        type: "success" | "error" | "information" | "warning";
        message: string;
    } | null>(null);

    useEffect(() => {
        const loadGroups = async () => {
            try {
                if (window.electron) {
                    const groupData = await window.electron.getGroupsData();
                    if (groupData && Array.isArray(groupData)) {
                        setGroups(groupData);
                    } else {
                        setGroups([]);
                    }
                }
            } catch (error) {
                console.error("Error loading groups:", error);
                setNotification({
                                    type: "error",
                                    message: "Failed to load groups. Please try again.",
                                });
            }
        };

        if (isOpen) {
            loadGroups();
        }
    }, [isOpen]);

    const saveGroupsToStorage = async (updatedGroups: GroupType[]) => {
        try {
            if (window.electron) {
                await window.electron.saveGroupsData(updatedGroups);
            }
        } catch (error) {
            console.error("Error saving groups:", error);
            setNotification({
                                type: "error",
                                message: "Failed to save groups. Please try again.",
                            });
        }
    };

    const handleCreateGroup = () => {
        if (!newGroupName.trim()) {
            setNotification({
                                type: "warning",
                                message: "Group name cannot be empty",
                            });
            return;
        }

        const cleanGroupName = newGroupName.trim().toUpperCase();

        if (groups.some(group => group.name.toUpperCase() === cleanGroupName)) {
            setNotification({
                                type: "warning",
                                message: "A group with this name already exists",
                            });
            return;
        }

        const newGroup: GroupType = {
            id: `group-${ Date.now() }`,
            name: cleanGroupName,
            nextTicketNumber: 1,
        };

        const updatedGroups = [...groups, newGroup];
        setGroups(updatedGroups);
        saveGroupsToStorage(updatedGroups);

        setNewGroupName("");

        setNotification({
                            type: "success",
                            message: `Group "${ newGroup.name }" created successfully`,
                        });
    };

    const handleEditGroup = (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
            setIsEditing(groupId);
            setEditGroupName(group.name);
        }
    };

    const handleSaveEdit = async (groupId: string) => {
        if (!editGroupName.trim()) {
            setNotification({
                                type: "warning",
                                message: "Group name cannot be empty",
                            });
            return;
        }

        const cleanGroupName = editGroupName.trim().toUpperCase();

        if (groups.some(group => group.id !== groupId && group.name.toUpperCase() === cleanGroupName)) {
            setNotification({
                                type: "warning",
                                message: "Another group with this name already exists",
                            });
            return;
        }

        const originalGroup = groups.find(group => group.id === groupId);
        if (!originalGroup) return;

        const oldName = originalGroup.name;
        const newName = cleanGroupName;

        const updatedGroups = groups.map(group =>
                                             group.id === groupId
                                                 ? {...group, name: newName}
                                                 : group
        );

        setGroups(updatedGroups);

        try {
            await saveGroupsToStorage(updatedGroups);

            if (oldName !== newName && window.electron && typeof window.electron.updateGroupOnTickets === 'function') {
                const success = await window.electron.updateGroupOnTickets(groupId, oldName, newName);
                if (success) {
                    setNotification({
                                        type: "success",
                                        message: "Group updated and propagated to all tickets",
                                    });
                } else {
                    setNotification({
                                        type: "success",
                                        message: "Group updated successfully",
                                    });
                }
            } else {
                setNotification({
                                    type: "success",
                                    message: "Group updated successfully",
                                });
            }

            setIsEditing(null);
        } catch (error) {
            console.error("Error updating group:", error);
            setNotification({
                                type: "error",
                                message: "An error occurred while updating the group",
                            });
        }
    };

    const handleDeleteGroup = (groupId: string) => {
        const groupToDelete = groups.find(group => group.id === groupId);
        if (!groupToDelete) return;

        const updatedGroups = groups.filter(group => group.id !== groupId);
        setGroups(updatedGroups);
        saveGroupsToStorage(updatedGroups);

        setNotification({
                            type: "success",
                            message: `Group "${ groupToDelete.name }" deleted successfully`,
                        });
    };

    const handleClose = () => {
        setIsEditing(null);
        setNewGroupName("");
        setNotification(null);
        onClose();
    };

    return (
        <Modal onClose={ handleClose } width="medium">
            <ModalHeader>
                <ModalTitle>Configure Groups</ModalTitle>
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

                <div style={ {marginBottom: "24px"} }>
                    <h4>Create New Group</h4>
                    <div style={ {display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px"} }>
                        <div style={ {flex: 1} }>
                            <Field name="newGroupName" label="Group Name">
                                { () => (
                                    <TextField
                                        name="newGroupName"
                                        placeholder="Enter group name"
                                        value={ newGroupName }
                                        onChange={ (e: React.ChangeEvent<HTMLInputElement>) => setNewGroupName(e.target.value) }
                                    />
                                ) }
                            </Field>
                        </div>
                        <div style={ {alignSelf: "flex-end", paddingBottom: "2px"} }>
                            <Button appearance="primary" onClick={ handleCreateGroup }>
                                Add Group
                            </Button>
                        </div>
                    </div>
                    <p style={ {fontSize: "12px", color: "#6B778C", marginTop: "8px"} }>
                        Group names will be converted to uppercase and used as prefixes for ticket numbers (e.g.,
                        GROUP-1).
                    </p>
                </div>

                <div>
                    <h4>Existing Groups</h4>
                    { groups.length === 0 ? (
                        <p>No groups created yet.</p>
                    ) : (
                        <div>
                            { groups.map((group) => (
                                <div
                                    key={ group.id }
                                    style={ {
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "8px",
                                        margin: "4px 0",
                                        borderRadius: "3px",
                                        border: "1px solid #DFE1E6",
                                    } }
                                >
                                    { isEditing === group.id ? (
                                        <>
                                            <div style={ {flex: 1, marginRight: "8px"} }>
                                                <TextField
                                                    value={ editGroupName }
                                                    onChange={ (e: React.ChangeEvent<HTMLInputElement>) => setEditGroupName(e.target.value) }
                                                />
                                            </div>
                                            <Button
                                                appearance="primary"
                                                onClick={ () => handleSaveEdit(group.id) }
                                            >
                                                Save
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div style={ {flex: 1} }>
                                                <span style={ {fontWeight: 500} }>{ group.name }</span>
                                                <span style={ {marginLeft: '8px', color: '#6B778C', fontSize: '12px'} }>
                          Next: { group.name }-{ group.nextTicketNumber }
                        </span>
                                            </div>
                                            <div style={ {marginLeft: "auto", display: "flex"} }>
                                                <IconButton
                                                    icon={ EditorEditIcon }
                                                    appearance="subtle"
                                                    onClick={ () => handleEditGroup(group.id) }
                                                    label={ `Edit group ${ group.name }` }
                                                />
                                                <IconButton
                                                    icon={ TrashIcon }
                                                    appearance="subtle"
                                                    onClick={ () => handleDeleteGroup(group.id) }
                                                    label={ `Delete group ${ group.name }` }
                                                />
                                            </div>
                                        </>
                                    ) }
                                </div>
                            )) }
                        </div>
                    ) }
                </div>
            </ModalBody>
            <ModalFooter>
                <Button appearance="primary" onClick={ handleClose }>
                    Done
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default GroupConfigModal;