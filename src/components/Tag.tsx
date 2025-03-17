import "../styles/Tag";

interface TagProps {
  name: string;
  color: TagColor;
}

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

type TagColor = keyof TagStyleOptions;

const getTagStyle = (color: TagColor): TagStyle => tagStyleOptions[color];

const Tag: React.FC<TagProps> = ({ name, color }) => {
  return (
    <div
      className="tag-group"
      style={{
        background: getTagStyle(color).background,
        color: getTagStyle(color).color,
      }}
    >
      {name}
    </div>
  );
};

export default Tag;
