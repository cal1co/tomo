import React, { useState } from "react";
import Popup from "@atlaskit/popup";
import Button from "@atlaskit/button/new";
import TextField from "@atlaskit/textfield";
import { tagStyleOptions, TagType } from "../types";

interface TagPickerProps {
    availableTags: TagType[];
    onSelectTag: (tag: TagType) => void;
}

export const TagPicker: React.FC<TagPickerProps> = ({
                                                        availableTags,
                                                        onSelectTag,
                                                    }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredTags = searchTerm
        ? availableTags.filter((tag) =>
                                   tag.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : availableTags;

    const handleSelectTag = (tag: TagType) => {
        onSelectTag(tag);
        setIsOpen(false);
    };

    return (
        <Popup
            isOpen={ isOpen }
            onClose={ () => setIsOpen(false) }
            placement="bottom-start"
            content={ () => (
                <div
                    style={ {
                        backgroundColor: "white",
                        borderRadius: "4px",
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                        padding: "8px",
                        width: "250px",
                        maxHeight: "300px",
                        overflowY: "auto",
                    } }
                >
                    <div style={ {marginBottom: "8px"} }>
                        <TextField
                            isCompact
                            placeholder="Search tags..."
                            value={ searchTerm }
                            onChange={ (e: React.ChangeEvent<HTMLInputElement>) =>
                                setSearchTerm(e.target.value)
                            }
                            autoFocus
                        />
                    </div>
                    { filteredTags.length === 0 ? (
                        <div style={ {padding: "8px", color: "#6B778C"} }>
                            { searchTerm ? "No matching tags found" : "No tags available" }
                        </div>
                    ) : (
                        <div>
                            { filteredTags.map((tag) => (
                                <div
                                    key={ tag.id }
                                    style={ {
                                        padding: "6px 8px",
                                        cursor: "pointer",
                                        borderRadius: "3px",
                                        display: "flex",
                                        alignItems: "center",
                                        margin: "2px 0",
                                    } }
                                    onClick={ () => handleSelectTag(tag) }
                                    onMouseEnter={ (e) => {
                                        e.currentTarget.style.backgroundColor = "#F4F5F7";
                                    } }
                                    onMouseLeave={ (e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                    } }
                                >
                                    <div
                                        style={ {
                                            backgroundColor: tagStyleOptions[tag.color].background,
                                            color: tagStyleOptions[tag.color].color,
                                            padding: "2px 8px",
                                            borderRadius: "3px",
                                            fontSize: "12px",
                                            marginRight: "8px",
                                        } }
                                    >
                                        { tag.name }
                                    </div>
                                </div>
                            )) }
                        </div>
                    ) }
                </div>
            ) }
            trigger={ (triggerProps) => (
                <Button
                    { ...triggerProps }
                    appearance="default"
                    onClick={ () => setIsOpen(!isOpen) }
                >
                    Add Tag
                </Button>
            ) }
        />
    );
};