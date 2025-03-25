import React, { useState } from "react";
import Button from "@atlaskit/button/new";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@atlaskit/modal-dialog";
import TextField from "@atlaskit/textfield";
import Form, { Field } from "@atlaskit/form";
import { TagType, TicketType } from "../types";
import Select, { OptionType } from "@atlaskit/select";
import { v4 as uuid } from "uuid";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticket: TicketType) => void;
  columnTitle: string;
  availableTags: TagType[];
  columnId: string;
}

// TODO:
// GROUPS (ticket number)
// TAG OPTIONS - FOR NOW JUST HAVE DEFAULT TAG OPTIONS UNTIL WE DO TAGS

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  columnTitle,
  availableTags,
}) => {
  const [ticketName, setTicketName] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onSubmit({
      name: ticketName,
      number: ticketNumber,
      tags: selectedTags,
      ticketId: uuid(),
    });

    setTicketName("");
    setTicketNumber("");
    setSelectedTags([]);

    onClose();
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
    <Modal onClose={onClose}>
      <ModalHeader hasCloseButton>
        <ModalTitle>Add Ticket to {columnTitle}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <Form onSubmit={handleSubmit}>
          {({ formProps }) => (
            <form {...formProps} id="ticket-modal-form">
              <Field name="ticketName" label="Ticket Name">
                {({ fieldProps }) => (
                  <TextField
                    {...fieldProps}
                    value={ticketName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTicketName(e.target.value)
                    }
                    placeholder="Enter ticket name"
                    isRequired
                  />
                )}
              </Field>
              <Field name="ticketNumber" label="Ticket Number">
                {({ fieldProps }) => (
                  <TextField
                    {...fieldProps}
                    value={ticketNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTicketNumber(e.target.value)
                    }
                    placeholder="e.g. TODO"
                    isRequired
                  />
                )}
              </Field>
              <Field name="tags" label="Tags">
                {({ fieldProps }) => (
                  <Select<OptionType, true>
                    {...fieldProps}
                    menuPosition="fixed"
                    isMulti
                    options={getTagOptions()}
                    placeholder="Select tags"
                    onChange={(options: any) => {
                      setSelectedTags(
                        options ? options.map((option: any) => option.tag) : []
                      );
                    }}
                  />
                )}
              </Field>
            </form>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={handleSubmit}
          isDisabled={!ticketName || !ticketNumber}
        >
          Add Ticket
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateTicketModal;
