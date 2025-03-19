// BOARD


// TICKET


// TAG

type TagStyle = {
    background: string;
    color: string;
};

const tagStyleOptions = {
    green: {
        background: "#D4EDBC",
        color: "#11734B",
    },
    purple: {
        background: "#352C63",
        color: "#B8ACF6",
    },
    blue: {
        background: "#BFE1F6",
        color: "#0A53A8",
    },
} as const;

type TagStyleOptions = typeof tagStyleOptions;

export type TagColor = keyof TagStyleOptions;

export const getTagStyle = (color: TagColor): TagStyle => tagStyleOptions[color];

export interface TagType {
    name: string;
    color: TagColor;
    id: string;
}