import React, { useState, useRef, useCallback } from "react";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@atlaskit/modal-dialog";
import Button from "@atlaskit/button/new";
import TextField from "@atlaskit/textfield";
import TextArea from "@atlaskit/textarea";
import Form, { Field } from "@atlaskit/form";
import Select from "@atlaskit/select";
import { TagType, TicketType, AttachmentType } from "../types";
import Tag from "./Tag";
import "../styles/ticket";
import { v4 as uuid } from "uuid";

interface TicketViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketType | null;
  availableTags: TagType[];
  onSave: (updatedTicket: TicketType) => void;
}

const TicketViewModal: React.FC<TicketViewModalProps> = ({
  isOpen,
  onClose,
  ticket,
  availableTags,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [ticketData, setTicketData] = useState<TicketType | null>(ticket);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setTicketData(ticket);
    setIsEditing(false);
  }, [ticket]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTicketData(ticket);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (ticketData) {
      onSave(ticketData);
      setIsEditing(false);
    }
  };

  const getTagOptions = () => {
    return availableTags.map((tag) => ({
      label: tag.name,
      value: tag.id,
      tag: tag,
    }));
  };

  const handleFieldChange = (field: keyof TicketType, value: any) => {
    if (ticketData) {
      setTicketData({
        ...ticketData,
        [field]: value,
      });
    }
  };

  const handleTagChange = (selectedOptions: any) => {
    if (ticketData) {
      const selectedTags = selectedOptions
        ? selectedOptions.map((option: any) => option.tag)
        : [];
      setTicketData({
        ...ticketData,
        tags: selectedTags,
      });
    }
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
      if (ticketData) {
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
      }
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
    [ticketData]
  );

  const removeAttachment = (attachmentId: string) => {
    if (ticketData && ticketData.attachments) {
      const updatedAttachments = ticketData.attachments.filter(
        (attachment) => attachment.id !== attachmentId
      );

      setTicketData({
        ...ticketData,
        attachments: updatedAttachments,
      });
    }
  };

  if (!isOpen || !ticketData) return null;

  return (
    <Modal onClose={onClose} width="large">
      <ModalHeader>
        <ModalTitle>{isEditing ? "Edit Ticket" : ticketData.name}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="ticket-view-content">
          {isEditing ? (
            <Form onSubmit={() => undefined}>
              {({ formProps }) => (
                <form {...formProps}>
                  <Field name="ticketName" label="Ticket Name">
                    {({ fieldProps }) => (
                      <TextField
                        {...fieldProps}
                        value={ticketData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleFieldChange("name", e.target.value)
                        }
                      />
                    )}
                  </Field>

                  <Field name="ticketNumber" label="Ticket Number">
                    {({ fieldProps }) => (
                      <TextField
                        {...fieldProps}
                        value={ticketData.number}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleFieldChange("number", e.target.value)
                        }
                      />
                    )}
                  </Field>

                  <Field name="tags" label="Tags">
                    {({ fieldProps }) => (
                      <Select
                        {...fieldProps}
                        menuPosition="fixed"
                        isMulti
                        options={getTagOptions()}
                        value={getTagOptions().filter((option) =>
                          ticketData.tags.some((tag) => tag.id === option.value)
                        )}
                        onChange={handleTagChange}
                      />
                    )}
                  </Field>

                  <Field name="summary" label="Summary">
                    {({ fieldProps }) => (
                      <TextArea
                        {...fieldProps}
                        value={ticketData.summary || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          handleFieldChange("summary", e.target.value)
                        }
                        minimumRows={5}
                      />
                    )}
                  </Field>

                  <div className="attachment-section">
                    <h4>Attachments</h4>
                    <div
                      className="drop-area"
                      ref={dropAreaRef}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <p>Drag and drop images here</p>
                      <Button
                        appearance="primary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        or Select File
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </div>

                    {ticketData.attachments &&
                      ticketData.attachments.length > 0 && (
                        <div className="attachments-preview">
                          {ticketData.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="attachment-item"
                            >
                              <img
                                src={attachment.dataUrl}
                                alt={attachment.name}
                                className="attachment-thumb"
                              />
                              <div className="attachment-info">
                                <div>{attachment.name}</div>
                                <Button
                                  appearance="subtle"
                                  onClick={() =>
                                    removeAttachment(attachment.id)
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </form>
              )}
            </Form>
          ) : (
            <div className="ticket-view-readonly">
              <div className="ticket-header">
                <div className="ticket-number">{ticketData.number}</div>
                <div className="ticket-tags">
                  {ticketData.tags.map((tag) => (
                    <Tag
                      key={tag.id}
                      id={tag.id}
                      name={tag.name}
                      color={tag.color}
                    />
                  ))}
                </div>
              </div>

              <div className="ticket-summary">
                <h4>Summary</h4>
                <p>{ticketData.summary || "No summary provided."}</p>
              </div>

              {ticketData.attachments && ticketData.attachments.length > 0 && (
                <div className="ticket-attachments">
                  <h4>Attachments</h4>
                  <div className="attachments-gallery">
                    {ticketData.attachments.map((attachment) => (
                      <div key={attachment.id} className="attachment-item">
                        <img
                          src={attachment.dataUrl}
                          alt={attachment.name}
                          className="attachment-image"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        {isEditing ? (
          <>
            <Button appearance="subtle" onClick={handleCancel}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSave}>
              Save Changes
            </Button>
          </>
        ) : (
          <>
            <Button appearance="subtle" onClick={onClose}>
              Close
            </Button>
            <Button appearance="primary" onClick={handleEdit}>
              Edit
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default TicketViewModal;
