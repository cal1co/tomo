import React, { useCallback, useEffect, useRef, useState } from "react";
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, } from "@atlaskit/modal-dialog";
import Button from "@atlaskit/button/new";
import TextField from "@atlaskit/textfield";
import TextArea from "@atlaskit/textarea";
import Form, { Field, HelperMessage } from "@atlaskit/form";
import { AttachmentType, GroupType, NotificationType, tagStyleOptions, TagType, TicketType } from "../types";
import Tag from "./Tag";
import "../styles/ticket.css";
import { v4 as uuid } from "uuid";
import CrossIcon from "@atlaskit/icon/glyph/cross";
import { TagPicker } from "./TagPicker";
import SectionMessage from "@atlaskit/section-message";
import Select from "@atlaskit/select";

interface TicketViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: TicketType;
    onSave: (updatedTicket: TicketType) => void;
}

const TicketViewModal: React.FC<TicketViewModalProps> = ({
                                                             isOpen,
                                                             onClose,
                                                             ticket,
                                                             onSave,
                                                         }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [ticketData, setTicketData] = useState<TicketType>(ticket);
    const [availableTags, setAvailableTags] = useState<TagType[]>([]);
    const [availableGroups, setAvailableGroups] = useState<GroupType[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{
        type: NotificationType;
        message: string;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTicketData(ticket);
        setIsEditing(false);
    }, [ticket]);

    useEffect(() => {
        const loadTagsAndGroups = async () => {
            try {
                if (window.electron) {

                    const tagData = await window.electron.getTagsData();
                    if (tagData && Array.isArray(tagData)) {
                        setAvailableTags(tagData as TagType[]);
                    }

                    const groupData = await window.electron.getGroupsData();
                    if (groupData && Array.isArray(groupData)) {
                        const typedGroupData = groupData as GroupType[];
                        setAvailableGroups(typedGroupData);

                        if (ticket.number) {
                            const ticketPrefix = ticket.number.split('-')[0];
                            const matchingGroup = typedGroupData.find(g => g.name === ticketPrefix);
                            if (matchingGroup) {
                                setSelectedGroupId(matchingGroup.id);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading tags and groups:", error);
                setNotification({
                                    type: "error",
                                    message: "Failed to load tags and groups",
                                });
            }
        };

        if (isOpen) {
            loadTagsAndGroups();
        }
    }, [isOpen, ticket.number]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setTicketData(ticket);
        setIsEditing(false);
        setNotification(null);
    };

    const handleAddTag = (tag: TagType) => {
        if (!ticketData.tags.some((t) => t.id === tag.id)) {
            setTicketData({
                              ...ticketData,
                              tags: [...ticketData.tags, tag]
                          });
        }
    };

    const handleRemoveTag = (tagId: string) => {
        setTicketData({
                          ...ticketData,
                          tags: ticketData.tags.filter((tag) => tag.id !== tagId)
                      });
    };

    const handleFieldChange = (field: keyof TicketType, value: any) => {
        setTicketData({
                          ...ticketData,
                          [field]: value,
                      });
    };

    const handleTagChange = (selectedOptions: any) => {
        const selectedTags = selectedOptions
            ? selectedOptions.map((option: any) => option.tag)
            : [];

        setTicketData({
                          ...ticketData,
                          tags: selectedTags,
                      });
    };

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                addAttachment(files[0]);
            }
        },
        [ticketData]
    );

    const addAttachment = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;

            const newAttachment: AttachmentType = {
                id: uuid(),
                name: file.name,
                type: file.type,
                dataUrl: dataUrl,
            };

            const updatedAttachments = ticketData.attachments
                ? [...ticketData.attachments, newAttachment]
                : [newAttachment];

            setTicketData({
                              ...ticketData,
                              attachments: updatedAttachments,
                          });
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (dropAreaRef.current) {
            dropAreaRef.current.classList.add("drag-active");
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (dropAreaRef.current) {
            dropAreaRef.current.classList.remove("drag-active");
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (dropAreaRef.current) {
                dropAreaRef.current.classList.remove("drag-active");
            }

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith("image/")) {
                    addAttachment(file);
                }
            }
        },
        []
    );

    const removeAttachment = (attachmentId: string) => {
        if (ticketData.attachments) {
            const updatedAttachments = ticketData.attachments.filter(
                (attachment) => attachment.id !== attachmentId
            );

            setTicketData({
                              ...ticketData,
                              attachments: updatedAttachments,
                          });
        }
    };

    const handleSave = async () => {
        if (!ticketData.name.trim()) {
            setNotification({
                                type: "warning",
                                message: "Ticket name cannot be empty",
                            });
            return;
        }

        let ticketNumber = ticketData.number;

        if (!ticketNumber && selectedGroupId) {
            const selectedGroup = availableGroups.find(g => g.id === selectedGroupId);
            if (selectedGroup) {
                try {
                    if (window.electron) {
                        const nextNumber = await window.electron.getNextTicketNumber(selectedGroupId);
                        ticketNumber = `${ selectedGroup.name }-${ nextNumber }`;

                        await window.electron.incrementTicketNumber(selectedGroupId);
                    }
                } catch (error) {
                    console.error("Error generating ticket number:", error);
                    setNotification({
                                        type: "error",
                                        message: "Failed to generate ticket number",
                                    });
                    return;
                }
            }
        }

        if (!ticketNumber) {
            setNotification({
                                type: "warning",
                                message: "Please select a group for the ticket",
                            });
            return;
        }

        const updatedTicket: TicketType = {
            ...ticketData,
            name: ticketData.name.trim(),
            summary: ticketData.summary?.trim(),
            number: ticketNumber
        };

        onSave(updatedTicket);
        setIsEditing(false);
        setNotification(null);
    };

    const getTagOptions = () => {
        return availableTags.map((tag) => ({
            label: tag.name,
            value: tag.id,
            tag: tag,
        }));
    };

    if (!isOpen) return null;

    return (
        <Modal onClose={ onClose } width="large">
            <ModalHeader>
                <ModalTitle>{ isEditing ? "Edit Ticket" : ticketData.name }</ModalTitle>
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

                <div className="ticket-view-content">
                    { isEditing ? (
                        <Form onSubmit={ () => undefined }>
                            { ({formProps}) => (
                                <form { ...formProps }>
                                    <Field name="ticketName" label="Ticket Name">
                                        { ({fieldProps}) => (
                                            <TextField
                                                { ...fieldProps }
                                                value={ ticketData.name }
                                                onChange={ (e: React.ChangeEvent<HTMLInputElement>) =>
                                                    handleFieldChange("name", e.target.value)
                                                }
                                            />
                                        ) }
                                    </Field>

                                    { !ticketData.number && (
                                        <Field name="group" label="Group">
                                            { () => (
                                                <>
                                                    <Select
                                                        inputId="group-select"
                                                        className="single-select"
                                                        classNamePrefix="react-select"
                                                        options={ availableGroups.map(group => ({
                                                            label: `${ group.name } (Next: ${ group.name }-${ group.nextTicketNumber })`,
                                                            value: group.id
                                                        })) }
                                                        placeholder="Select a group"
                                                        value={ selectedGroupId ? {
                                                            label: availableGroups.find(g => g.id === selectedGroupId)?.name || "",
                                                            value: selectedGroupId
                                                        } : null }
                                                        onChange={ (option: any) => {
                                                            setSelectedGroupId(option ? option.value : null);
                                                        } }
                                                    />
                                                    <HelperMessage>
                                                        This will determine the ticket number (e.g., GROUP-1)
                                                    </HelperMessage>
                                                </>
                                            ) }
                                        </Field>
                                    ) }

                                    { ticketData.number && (
                                        <Field name="ticketNumber" label="Ticket Number">
                                            { ({fieldProps}) => (
                                                <TextField
                                                    { ...fieldProps }
                                                    value={ ticketData.number }
                                                    isDisabled={ true }
                                                />
                                            ) }
                                        </Field>
                                    ) }

                                    <Field name="tags" label="Tags">
                                        { () => (
                                            <>
                                                <div style={ {marginBottom: "8px"} }>
                                                    <TagPicker
                                                        availableTags={ availableTags }
                                                        onSelectTag={ handleAddTag }
                                                    />
                                                </div>
                                                <div style={ {display: "flex", flexWrap: "wrap", gap: "4px"} }>
                                                    { ticketData.tags.map((tag) => (
                                                        <div
                                                            key={ tag.id }
                                                            style={ {
                                                                display: "flex",
                                                                alignItems: "center",
                                                                backgroundColor: tag.color ? tagStyleOptions[tag.color].background : "#F4F5F7",
                                                                color: tag.color ? tagStyleOptions[tag.color].color : "#42526E",
                                                                padding: "2px 8px",
                                                                borderRadius: "3px",
                                                                fontSize: "12px",
                                                                margin: "2px",
                                                            } }
                                                        >
                                                            { tag.name }
                                                            <Button
                                                                appearance="subtle"
                                                                spacing="compact"
                                                                iconBefore={ CrossIcon }
                                                                onClick={ () => handleRemoveTag(tag.id) }
                                                            >
                                                                { "" }
                                                            </Button>
                                                        </div>
                                                    )) }
                                                </div>
                                            </>
                                        ) }
                                    </Field>

                                    <Field name="summary" label="Summary">
                                        { ({fieldProps}) => (
                                            <TextArea
                                                { ...fieldProps }
                                                value={ ticketData.summary || "" }
                                                onChange={ (e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                                    handleFieldChange("summary", e.target.value)
                                                }
                                                minimumRows={ 5 }
                                            />
                                        ) }
                                    </Field>

                                    <div className="attachment-section">
                                        <h4>Attachments</h4>
                                        <div
                                            className="drop-area"
                                            ref={ dropAreaRef }
                                            onDragOver={ handleDragOver }
                                            onDragLeave={ handleDragLeave }
                                            onDrop={ handleDrop }
                                        >
                                            <p>Drag and drop images here</p>
                                            <Button
                                                appearance="primary"
                                                onClick={ () => fileInputRef.current?.click() }
                                            >
                                                or Select File
                                            </Button>
                                            <input
                                                type="file"
                                                ref={ fileInputRef }
                                                style={ {display: "none"} }
                                                accept="image/*"
                                                onChange={ handleFileSelect }
                                            />
                                        </div>

                                        { ticketData.attachments &&
                                            ticketData.attachments.length > 0 && (
                                                <div className="attachments-preview">
                                                    { ticketData.attachments.map((attachment) => (
                                                        <div
                                                            key={ attachment.id }
                                                            className="attachment-item"
                                                        >
                                                            <img
                                                                src={ attachment.dataUrl }
                                                                alt={ attachment.name }
                                                                className="attachment-thumb"
                                                            />
                                                            <div className="attachment-info">
                                                                <div>{ attachment.name }</div>
                                                                <Button
                                                                    appearance="subtle"
                                                                    onClick={ () =>
                                                                        removeAttachment(attachment.id)
                                                                    }
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )) }
                                                </div>
                                            ) }
                                    </div>
                                </form>
                            ) }
                        </Form>
                    ) : (
                        <div className="ticket-view-readonly">
                            <div className="ticket-header">
                                <div className="ticket-number">{ ticketData.number }</div>
                                <div className="ticket-tags">
                                    { ticketData.tags.map((tag) => (
                                        <Tag
                                            key={ tag.id }
                                            id={ tag.id }
                                            name={ tag.name }
                                            color={ tag.color }
                                        />
                                    )) }
                                </div>
                            </div>

                            <div className="ticket-summary">
                                <h4>Summary</h4>
                                <p>{ ticketData.summary || "No summary provided." }</p>
                            </div>

                            { ticketData.attachments && ticketData.attachments.length > 0 && (
                                <div className="ticket-attachments">
                                    <h4>Attachments</h4>
                                    <div className="attachments-gallery">
                                        { ticketData.attachments.map((attachment) => (
                                            <div key={ attachment.id } className="attachment-item">
                                                <img
                                                    src={ attachment.dataUrl }
                                                    alt={ attachment.name }
                                                    className="attachment-image"
                                                />
                                            </div>
                                        )) }
                                    </div>
                                </div>
                            ) }
                        </div>
                    ) }
                </div>
            </ModalBody>
            <ModalFooter>
                { isEditing ? (
                    <>
                        <Button appearance="subtle" onClick={ handleCancel }>
                            Cancel
                        </Button>
                        <Button appearance="primary" onClick={ handleSave }>
                            Save Changes
                        </Button>
                    </>
                ) : (
                    <>
                        <Button appearance="subtle" onClick={ onClose }>
                            Close
                        </Button>
                        <Button appearance="primary" onClick={ handleEdit }>
                            Edit
                        </Button>
                    </>
                ) }
            </ModalFooter>
        </Modal>
    );
};

export default TicketViewModal;