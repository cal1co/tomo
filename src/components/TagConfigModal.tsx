import React, { useEffect, useState } from "react";
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, } from "@atlaskit/modal-dialog";
import Button, { IconButton } from "@atlaskit/button/new";
import TextField from "@atlaskit/textfield";
import { Field } from "@atlaskit/form";
import TrashIcon from "@atlaskit/icon/glyph/trash";
import EditorEditIcon from "@atlaskit/icon/glyph/editor/edit";
import { TagColor, tagStyleOptions, TagType } from "../types";
import SectionMessage from "@atlaskit/section-message";

interface TagConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TagConfigModal: React.FC<TagConfigModalProps> = ({isOpen, onClose}) => {
    const [tags, setTags] = useState<TagType[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState<TagColor>("green");
    const [editTagName, setEditTagName] = useState("");
    const [editTagColor, setEditTagColor] = useState<TagColor>("green");
    const [notification, setNotification] = useState<{
        type: "success" | "error" | "information" | "warning";
        message: string;
    } | null>(null);

    useEffect(() => {
        const loadTags = async () => {
            try {
                if (window.electron) {
                    const tagData = await window.electron.getTagsData();
                    if (tagData && Array.isArray(tagData)) {
                        setTags(tagData);
                    } else {
                        setTags([]);
                    }
                }
            } catch (error) {
                console.error("Error loading tags:", error);
                setNotification({
                                    type: "error",
                                    message: "Failed to load tags. Please try again.",
                                });
            }
        };

        if (isOpen) {
            loadTags();
        }
    }, [isOpen]);

    const saveTagsToStorage = async (updatedTags: TagType[]) => {
        try {
            if (window.electron) {
                await window.electron.saveTagsData(updatedTags);
            }
        } catch (error) {
            console.error("Error saving tags:", error);
            setNotification({
                                type: "error",
                                message: "Failed to save tags. Please try again.",
                            });
        }
    };

    const handleCreateTag = () => {
        if (!newTagName.trim()) {
            setNotification({
                                type: "warning",
                                message: "Tag name cannot be empty",
                            });
            return;
        }

        if (tags.some(tag => tag.name.toLowerCase() === newTagName.toLowerCase())) {
            setNotification({
                                type: "warning",
                                message: "A tag with this name already exists",
                            });
            return;
        }

        const newTag: TagType = {
            id: `tag-${ Date.now() }`,
            name: newTagName.trim(),
            color: newTagColor,
        };

        const updatedTags = [...tags, newTag];
        setTags(updatedTags);
        saveTagsToStorage(updatedTags);

        setNewTagName("");
        setNewTagColor("green");

        setNotification({
                            type: "success",
                            message: `Tag "${ newTag.name }" created successfully`,
                        });
    };

    const handleEditTag = (tagId: string) => {
        const tag = tags.find(t => t.id === tagId);
        if (tag) {
            setIsEditing(tagId);
            setEditTagName(tag.name);
            setEditTagColor(tag.color);
        }
    };

    const handleSaveEdit = (tagId: string) => {
        if (!editTagName.trim()) {
            setNotification({
                                type: "warning",
                                message: "Tag name cannot be empty",
                            });
            return;
        }

        if (tags.some(tag => tag.id !== tagId && tag.name.toLowerCase() === editTagName.toLowerCase())) {
            setNotification({
                                type: "warning",
                                message: "Another tag with this name already exists",
                            });
            return;
        }

        const updatedTags = tags.map(tag =>
                                         tag.id === tagId
                                             ? {...tag, name: editTagName.trim(), color: editTagColor}
                                             : tag
        );

        setTags(updatedTags);
        saveTagsToStorage(updatedTags);
        setIsEditing(null);

        setNotification({
                            type: "success",
                            message: "Tag updated successfully",
                        });
    };

    const handleDeleteTag = (tagId: string) => {
        const tagToDelete = tags.find(tag => tag.id === tagId);
        if (!tagToDelete) return;

        const updatedTags = tags.filter(tag => tag.id !== tagId);
        setTags(updatedTags);
        saveTagsToStorage(updatedTags);

        setNotification({
                            type: "success",
                            message: `Tag "${ tagToDelete.name }" deleted successfully`,
                        });
    };

    const handleClose = () => {
        setIsEditing(null);
        setNewTagName("");
        setNewTagColor("green");
        setNotification(null);
        onClose();
    };

    const colorOptions = Object.keys(tagStyleOptions) as TagColor[];

    return (
        <Modal onClose={ handleClose } width="medium">
            <ModalHeader>
                <ModalTitle>Configure Tags</ModalTitle>
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
                    <h4>Create New Tag</h4>
                    <div style={ {display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px"} }>
                        <div style={ {flex: 1} }>
                            <Field name="newTagName" label="Tag Name">
                                { () => (
                                    <TextField
                                        name="newTagName"
                                        placeholder="Enter tag name"
                                        value={ newTagName }
                                        onChange={ (e: React.ChangeEvent<HTMLInputElement>) => setNewTagName(e.target.value) }
                                    />
                                ) }
                            </Field>
                        </div>
                        <div style={ {width: "150px"} }>
                            <Field name="newTagColor" label="Color">
                                { () => (
                                    <select
                                        style={ {
                                            width: "100%",
                                            padding: "8px",
                                            borderRadius: "3px",
                                            border: "2px solid #DFE1E6",
                                            outline: "none",
                                            height: "40px",
                                        } }
                                        value={ newTagColor }
                                        onChange={ (e) => setNewTagColor(e.target.value as TagColor) }
                                    >
                                        { colorOptions.map((color) => (
                                            <option key={ color } value={ color }>
                                                { color.charAt(0).toUpperCase() + color.slice(1) }
                                            </option>
                                        )) }
                                    </select>
                                ) }
                            </Field>
                        </div>
                        <div style={ {alignSelf: "flex-end", paddingBottom: "2px"} }>
                            <Button appearance="primary" onClick={ handleCreateTag }>
                                Add Tag
                            </Button>
                        </div>
                    </div>
                </div>

                <div>
                    <h4>Existing Tags</h4>
                    { tags.length === 0 ? (
                        <p>No tags created yet.</p>
                    ) : (
                        <div>
                            { tags.map((tag) => (
                                <div
                                    key={ tag.id }
                                    style={ {
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "8px",
                                        margin: "4px 0",
                                        borderRadius: "3px",
                                        border: "1px solid #DFE1E6",
                                    } }
                                >
                                    { isEditing === tag.id ? (
                                        <>
                                            <div style={ {flex: 1, marginRight: "8px"} }>
                                                <TextField
                                                    value={ editTagName }
                                                    onChange={ (e: React.ChangeEvent<HTMLInputElement>) => setEditTagName(e.target.value) }
                                                />
                                            </div>
                                            <div style={ {width: "100px", marginRight: "8px"} }>
                                                <select
                                                    style={ {
                                                        width: "100%",
                                                        padding: "6px",
                                                        borderRadius: "3px",
                                                        border: "2px solid #DFE1E6",
                                                    } }
                                                    value={ editTagColor }
                                                    onChange={ (e) => setEditTagColor(e.target.value as TagColor) }
                                                >
                                                    { colorOptions.map((color) => (
                                                        <option key={ color } value={ color }>
                                                            { color.charAt(0).toUpperCase() + color.slice(1) }
                                                        </option>
                                                    )) }
                                                </select>
                                            </div>
                                            <Button
                                                appearance="primary"
                                                onClick={ () => handleSaveEdit(tag.id) }
                                            >
                                                Save
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div
                                                style={ {
                                                    backgroundColor: tagStyleOptions[tag.color].background,
                                                    color: tagStyleOptions[tag.color].color,
                                                    padding: "4px 8px",
                                                    borderRadius: "3px",
                                                    marginRight: "12px",
                                                } }
                                            >
                                                { tag.name }
                                            </div>
                                            <div style={ {marginLeft: "auto", display: "flex"} }>
                                                <IconButton
                                                    icon={ EditorEditIcon }
                                                    appearance="subtle"
                                                    onClick={ () => handleEditTag(tag.id) }
                                                    label={ `Edit tag ${ tag.name }` }
                                                />
                                                <IconButton
                                                    icon={ TrashIcon }
                                                    appearance="subtle"
                                                    onClick={ () => handleDeleteTag(tag.id) }
                                                    label={ `Delete tag ${ tag.name }` }
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

export default TagConfigModal;