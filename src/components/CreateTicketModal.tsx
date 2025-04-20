import React, { useEffect, useState } from "react";
import Button from "@atlaskit/button/new";
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, } from "@atlaskit/modal-dialog";
import TextField from "@atlaskit/textfield";
import Form, { Field, HelperMessage } from "@atlaskit/form";
import { GroupType, NotificationType, TagType, TicketType } from "../types";
import Select, { OptionType } from "@atlaskit/select";
import { v4 as uuid } from "uuid";
import SectionMessage from "@atlaskit/section-message";

interface CreateTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (ticket: TicketType) => void;
    columnTitle: string;
    columnId: string;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
                                                                 isOpen,
                                                                 onClose,
                                                                 onSubmit,
                                                                 columnTitle,
                                                             }) => {
    const [ticketName, setTicketName] = useState("");
    const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
    const [availableTags, setAvailableTags] = useState<TagType[]>([]);
    const [availableGroups, setAvailableGroups] = useState<GroupType[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<{
        type: NotificationType;
        message: string;
    } | null>(null);

    useEffect(() => {
        const loadTagsAndGroups = async () => {
            try {
                if (window.electron) {

                    const tagData = await window.electron.getTagsData();
                    if (tagData && Array.isArray(tagData)) {
                        setAvailableTags(tagData);
                    }

                    const groupData = await window.electron.getGroupsData();
                    if (groupData && Array.isArray(groupData)) {
                        setAvailableGroups(groupData);

                        if (groupData.length === 1) {
                            setSelectedGroupId(groupData[0].id);
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
    }, [isOpen]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!ticketName.trim()) {
            setNotification({
                                type: "warning",
                                message: "Ticket name cannot be empty",
                            });
            return;
        }

        if (!selectedGroupId) {
            setNotification({
                                type: "warning",
                                message: "Please select a group for the ticket",
                            });
            return;
        }

        setIsSubmitting(true);

        try {
            const selectedGroup = availableGroups.find(g => g.id === selectedGroupId);

            if (!selectedGroup) {
                throw new Error("Selected group not found");
            }

            let ticketNumber = "";
            if (window.electron) {
                const nextNumber = await window.electron.getNextTicketNumber(selectedGroupId);
                ticketNumber = `${ selectedGroup.name }-${ nextNumber }`;

                await window.electron.incrementTicketNumber(selectedGroupId);
            }

            const newTicket: TicketType = {
                name: ticketName.trim(),
                number: ticketNumber,
                tags: selectedTags,
                ticketId: uuid(),
            };

            onSubmit(newTicket);

            setTicketName("");
            setSelectedTags([]);
            setSelectedGroupId(availableGroups.length === 1 ? availableGroups[0].id : "");

            onClose();
        } catch (error) {
            console.error("Error creating ticket:", error);
            setNotification({
                                type: "error",
                                message: "Failed to create ticket. Please try again.",
                            });
        } finally {
            setIsSubmitting(false);
        }
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
        <Modal onClose={ onClose }>
            <ModalHeader hasCloseButton>
                <ModalTitle>Add Ticket to { columnTitle }</ModalTitle>
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

                <Form onSubmit={ handleSubmit }>
                    { ({formProps}) => (
                        <form { ...formProps } id="ticket-modal-form">
                            <Field name="ticketName" label="Ticket Name">
                                { ({fieldProps}) => (
                                    <TextField
                                        { ...fieldProps }
                                        value={ ticketName }
                                        onChange={ (e: React.ChangeEvent<HTMLInputElement>) =>
                                            setTicketName(e.target.value)
                                        }
                                        placeholder="Enter ticket name"
                                        isRequired
                                    />
                                ) }
                            </Field>

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
                                        { availableGroups.length === 0 && (
                                            <div style={ {color: "#DE350B", fontSize: "12px", marginTop: "4px"} }>
                                                No groups available. Please create a group in the Configure Groups menu.
                                            </div>
                                        ) }
                                    </>
                                ) }
                            </Field>

                            <Field name="tags" label="Tags">
                                { ({fieldProps}) => (
                                    <>
                                        <Select<OptionType, true>
                                            { ...fieldProps }
                                            menuPosition="fixed"
                                            isMulti
                                            options={ getTagOptions() }
                                            placeholder="Select tags"
                                            onChange={ (options: any) => {
                                                setSelectedTags(
                                                    options ? options.map((option: any) => option.tag) : []
                                                );
                                            } }
                                        />
                                        { availableTags.length === 0 && (
                                            <div style={ {color: "#0747A6", fontSize: "12px", marginTop: "4px"} }>
                                                No tags available. You can create tags in the Configure Tags menu.
                                            </div>
                                        ) }
                                    </>
                                ) }
                            </Field>
                        </form>
                    ) }
                </Form>
            </ModalBody>
            <ModalFooter>
                <Button appearance="subtle" onClick={ onClose }>
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={ handleSubmit }
                    isDisabled={ !ticketName || !selectedGroupId || isSubmitting }
                    isLoading={ isSubmitting }
                >
                    Add Ticket
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default CreateTicketModal;